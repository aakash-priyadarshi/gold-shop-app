import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private configService: ConfigService,
    private mailService: MailService,
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing dynamic backup schedules...');
    await this.loadSchedules();
  }

  async loadSchedules() {
    // Clear existing dynamic jobs that start with "backup_schedule_"
    const existingJobs = this.schedulerRegistry.getCronJobs();
    existingJobs.forEach((job, key) => {
      if (key.startsWith('backup_schedule_')) {
        this.schedulerRegistry.deleteCronJob(key);
      }
    });

    // Load from database
    const schedules = await this.prisma.backupSchedule.findMany({
      where: { isActive: true },
    });

    for (const schedule of schedules) {
      try {
        const job = new CronJob(schedule.cronExp, async () => {
          this.logger.log(`Executing dynamic backup job: ${schedule.name}`);
          await this.createBackupAndNotify();
        });

        const jobName = `backup_schedule_${schedule.id}`;
        this.schedulerRegistry.addCronJob(jobName, job);
        job.start();
        this.logger.log(`Started backup job "${schedule.name}" with cron: ${schedule.cronExp}`);
      } catch (e) {
        this.logger.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExp}`);
      }
    }
  }

  async createBackupAndNotify(): Promise<void> {
    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      this.logger.error('DATABASE_URL is not configured for pg_dump.');
      return;
    }

    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Daily datestring format for sorting
    const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `db-backup-${dateStr}.sql`;
    const filePath = path.join(backupDir, fileName);

    const command = `pg_dump --clean --if-exists --no-owner "${dbUrl}" > "${filePath}"`;

    try {
      this.logger.log(`Executing pg_dump to ${filePath}`);
      await execAsync(command);
      this.logger.log('pg_dump completed successfully.');

      const adminEmail = 'admin@orivraa.com';
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://orivraa.com';
      const downloadLink = `${frontendUrl}/dashboard/admin/performance`;

      await this.mailService.sendAdminAlert(adminEmail, {
        alertType: 'info',
        title: `Database Backup Created (${dateStr})`,
        message: `A database backup has been automatically generated and securely stored. File: ${fileName}. Because Railway Hobby plans do not have automatic data retention, it is highly advised that you download this backup to your local hard drive regularly.`,
        actionUrl: downloadLink,
        actionText: 'Manage Backups',
      });

      this.cleanupOldBackups(backupDir);
    } catch (error: any) {
      this.logger.error(`Error generating backup via pg_dump: ${error.message}`);
      throw error;
    }
  }

  getAvailableBackups() {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) return [];

    return fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async triggerManualBackup() {
    await this.createBackupAndNotify();
  }

  deleteBackup(filename: string) {
    const backupDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    throw new NotFoundException('Backup file not found');
  }

  private cleanupOldBackups(backupDir: string) {
    const MAX_BACKUPS = 7;
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    
    if (files.length > MAX_BACKUPS) {
      const sorted = files.sort((a, b) => {
        return fs.statSync(path.join(backupDir, a)).birthtimeMs - fs.statSync(path.join(backupDir, b)).birthtimeMs;
      });
      const toDelete = sorted.slice(0, files.length - MAX_BACKUPS);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(path.join(backupDir, file));
          this.logger.log(`Deleted stale backup: ${file}`);
        } catch (err) {
          this.logger.error(`Failed to delete old backup ${file}`);
        }
      });
    }
  }

  // --- Schedule Management ---
  async getSchedules() {
    return this.prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSchedule(data: { name: string, cronExp: string }) {
    // Validate cron
    try {
      new CronJob(data.cronExp, () => {});
    } catch (e) {
      throw new Error('Invalid cron expression');
    }
    const schedule = await this.prisma.backupSchedule.create({ data });
    await this.loadSchedules();
    return schedule;
  }

  async toggleSchedule(id: string, isActive: boolean) {
    const schedule = await this.prisma.backupSchedule.update({
      where: { id },
      data: { isActive }
    });
    await this.loadSchedules();
    return schedule;
  }

  async deleteSchedule(id: string) {
    await this.prisma.backupSchedule.delete({ where: { id } });
    await this.loadSchedules();
    return { success: true };
  }
}
