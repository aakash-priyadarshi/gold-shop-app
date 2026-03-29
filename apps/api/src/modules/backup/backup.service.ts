import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  @Cron(CronExpression.EVERY_WEEKEND) // Runs every Sunday at midnight
  async handleWeeklyBackup() {
    this.logger.log('Starting automated weekly database backup...');
    try {
      await this.createBackupAndNotify();
    } catch (error) {
      this.logger.error(`Automated backup failed: ${(error as Error).message}`);
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

    // Using pg_dump to export the database (requires postgresql-client installed in host/container)
    // We export using plaintext because it's easier to restore via pure SQL scripts or DBeaver.
    const command = `pg_dump --clean --if-exists --no-owner "${dbUrl}" > "${filePath}"`;

    try {
      this.logger.log(`Executing pg_dump to ${filePath}`);
      await execAsync(command);
      this.logger.log('pg_dump completed successfully.');

      // Send email to the system administrator informing them to download the backup locally.
      const adminEmail = 'admin@orivraa.com';
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://orivraa.com';
      const downloadLink = `${frontendUrl}/dashboard/admin/backups`; // New admin UI view we will build or they can download directly

      await this.mailService.sendAdminAlert(adminEmail, {
        alertType: 'info',
        title: `Weekly Database Backup Available (${dateStr})`,
        message: `Your weekly database backup has been automatically generated and securely stored. File: ${fileName}. Because Railway Hobby plans do not have automatic data retention, it is highly advised that you download this backup to your local hard drive every week.`,
        actionUrl: downloadLink,
        actionText: 'Download Backup in Admin Dashboard',
      });

      this.logger.log(`Automated Backup email sent to ${adminEmail}`);

      // Optional: Cleanup old backups automatically to prevent server disk bloat.
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

  private cleanupOldBackups(backupDir: string) {
    const MAX_BACKUPS = 5;
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sql'));
    
    if (files.length > MAX_BACKUPS) {
      // Sort oldest to newest
      const sorted = files.sort((a, b) => {
        return fs.statSync(path.join(backupDir, a)).birthtimeMs - fs.statSync(path.join(backupDir, b)).birthtimeMs;
      });
      // Delete the oldest ones
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
}
