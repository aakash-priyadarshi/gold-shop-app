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
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private s3Client: S3Client | null = null;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private mailService: MailService,
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
  ) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'backups';

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('Cloudflare R2 S3Client initialized.');
    } else {
      this.logger.warn('Cloudflare R2 credentials missing. Backups will fail.');
    }
  }

  async onModuleInit() {
    this.logger.log('Initializing dynamic backup schedules...');
    await this.loadSchedules();
  }

  async loadSchedules() {
    const existingJobs = this.schedulerRegistry.getCronJobs();
    existingJobs.forEach((job, key) => {
      if (key.startsWith('backup_schedule_')) {
        this.schedulerRegistry.deleteCronJob(key);
      }
    });

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
        this.schedulerRegistry.addCronJob(jobName, job as any);
        job.start();
        this.logger.log(`Started backup job "${schedule.name}" with cron: ${schedule.cronExp}`);
      } catch (e) {
        this.logger.error(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cronExp}`);
      }
    }
  }

  async createBackupAndNotify(): Promise<void> {
    if (!this.s3Client) {
      this.logger.error('S3 Client is not initialized. Check R2 credentials.');
      return;
    }

    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      this.logger.error('DATABASE_URL is not configured for pg_dump.');
      return;
    }

    const backupDir = path.join(process.cwd(), 'tmp_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `db-backup-${dateStr}.sql`;
    const filePath = path.join(backupDir, fileName);

    const command = `pg_dump --clean --if-exists --no-owner "${dbUrl}" > "${filePath}"`;

    try {
      this.logger.log(`Executing pg_dump to ${filePath}`);
      await execAsync(command);
      this.logger.log('pg_dump completed successfully. Uploading to R2...');

      const fileContent = fs.readFileSync(filePath);
      
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: 'application/sql',
      });

      await this.s3Client.send(uploadCommand);
      this.logger.log(`Successfully uploaded ${fileName} to R2.`);

      // Clean up local temp file
      fs.unlinkSync(filePath);

      const adminEmail = 'admin@orivraa.com';
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://orivraa.com';
      const downloadLink = `${frontendUrl}/dashboard/admin/performance`;

      await this.mailService.sendAdminAlert(adminEmail, {
        alertType: 'info',
        title: `Database Backup Created (${dateStr})`,
        message: `A database backup has been automatically generated and securely stored in Cloudflare R2. File: ${fileName}.`,
        actionUrl: downloadLink,
        actionText: 'Manage Backups',
      });

      await this.cleanupOldBackups();
    } catch (error: any) {
      this.logger.error(`Error generating backup: ${error.message}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async getAvailableBackups() {
    if (!this.s3Client) return [];

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
      });
      const response = await this.s3Client.send(command);
      
      if (!response.Contents) return [];

      return response.Contents
        .filter(obj => obj.Key?.endsWith('.sql'))
        .map(obj => ({
          filename: obj.Key!,
          sizeBytes: obj.Size || 0,
          createdAt: obj.LastModified || new Date(),
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (err: any) {
      this.logger.error(`Failed to list backups from R2: ${err.message}`);
      return [];
    }
  }

  async getDownloadUrl(filename: string): Promise<string> {
    if (!this.s3Client) throw new NotFoundException('S3 client not initialized');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });
      
      // Presign URL valid for 1 hour
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (err: any) {
      this.logger.error(`Failed to generate signed URL for ${filename}: ${err.message}`);
      throw new NotFoundException('Failed to generate download URL');
    }
  }

  async triggerManualBackup() {
    await this.createBackupAndNotify();
  }

  /**
   * Mandatory safety backup before applying Prisma migrations.
   * Same R2 destination + 7-backup retention as scheduled backups.
   */
  async createPreMigrationBackup(): Promise<{ filename: string }> {
    if (!this.s3Client) {
      throw new Error('S3 Client is not initialized. Check R2 credentials before migrating.');
    }

    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not configured for pg_dump.');
    }

    const backupDir = path.join(process.cwd(), 'tmp_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const fileName = `pre-migrate-db-backup-${dateStr}.sql`;
    const filePath = path.join(backupDir, fileName);
    const command = `pg_dump --clean --if-exists --no-owner "${dbUrl}" > "${filePath}"`;

    try {
      this.logger.log(`Pre-migration backup: executing pg_dump to ${filePath}`);
      await execAsync(command);
      const fileContent = fs.readFileSync(filePath);
      if (fileContent.length < 1000) {
        throw new Error(`Pre-migration backup looks empty/corrupt (${fileContent.length} bytes)`);
      }

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: fileContent,
          ContentType: 'application/sql',
        }),
      );
      this.logger.log(`Pre-migration backup uploaded: ${fileName}`);
      fs.unlinkSync(filePath);
      await this.cleanupOldBackups();
      return { filename: fileName };
    } catch (error: any) {
      this.logger.error(`Pre-migration backup failed: ${error.message}`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  async deleteBackup(filename: string) {
    if (!this.s3Client) throw new NotFoundException('S3 client not initialized');

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
      });
      await this.s3Client.send(command);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to delete backup ${filename} from R2: ${err.message}`);
      throw new NotFoundException('Failed to delete backup');
    }
  }

  private async cleanupOldBackups() {
    if (!this.s3Client) return;
    const MAX_BACKUPS = 7;
    const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

    try {
      const backups = await this.getAvailableBackups();
      const now = Date.now();
      const staleByAge = backups.filter(
        (b) => now - new Date(b.createdAt).getTime() > MAX_AGE_MS,
      );
      const excessByCount =
        backups.length - staleByAge.length > MAX_BACKUPS
          ? backups
              .filter((b) => !staleByAge.includes(b))
              .slice(MAX_BACKUPS)
          : [];

      const toDelete = [...staleByAge, ...excessByCount];
      const seen = new Set<string>();
      for (const backup of toDelete) {
        if (seen.has(backup.filename)) continue;
        seen.add(backup.filename);
        try {
          await this.deleteBackup(backup.filename);
          this.logger.log(`Deleted stale backup from R2: ${backup.filename}`);
        } catch (err) {
          this.logger.error(`Failed to delete stale backup ${backup.filename}`);
        }
      }
    } catch (e: any) {
      this.logger.error(`Cleanup failed: ${e.message}`);
    }
  }

  // --- Schedule Management ---
  async getSchedules() {
    return this.prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSchedule(data: { name: string, cronExp: string }) {
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
