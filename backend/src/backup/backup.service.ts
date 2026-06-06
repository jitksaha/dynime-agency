import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getClientCredentials() {
    const clientId = process.env.GOOGLE_BACKUP_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_BACKUP_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'Google Backup Client ID and Secret must be configured in environment variables (GOOGLE_BACKUP_CLIENT_ID & GOOGLE_BACKUP_CLIENT_SECRET).',
      );
    }
    return { clientId, clientSecret };
  }

  private getRedirectUri(hostname: string) {
    const protocol = hostname.includes('localhost') || hostname.includes('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${hostname}/api/v1/backup/google/callback`;
  }

  private getFrontendRedirectUrl(hostname: string, status: string) {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return `http://localhost:5173/admin/settings?backup_connection=${status}`;
    }
    // E.g., api.dynime.com -> dynime.com
    const mainDomain = hostname.replace(/^api\./, '');
    return `https://${mainDomain}/admin/settings?backup_connection=${status}`;
  }

  async getAuthUrl(hostname: string) {
    const { clientId } = this.getClientCredentials();
    const redirectUri = this.getRedirectUri(hostname);
    
    return (
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=https://www.googleapis.com/auth/drive.file%20https://www.googleapis.com/auth/userinfo.email&` +
      `access_type=offline&` +
      `prompt=consent`
    );
  }

  async handleCallback(code: string, hostname: string, res: any) {
    try {
      const { clientId, clientSecret } = this.getClientCredentials();
      const redirectUri = this.getRedirectUri(hostname);

      // 1. Exchange Auth Code for Tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errText}`);
      }

      const tokens = await tokenResponse.json();
      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        throw new Error('No refresh token received. Please remove Dynime app access from Google Account and try again.');
      }

      // 2. Fetch User Email Info
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      let email = 'Unknown Account';
      if (userinfoResponse.ok) {
        const userInfo = await userinfoResponse.json();
        email = userInfo.email || email;
      }

      // 3. Save Settings in Database
      const settingsVal = {
        connected: true,
        refresh_token: refreshToken,
        email,
        last_backup_status: 'never',
        last_backup_time: null,
      };

      await this.prisma.site_settings.upsert({
        where: { key: 'google_backup_settings' },
        create: {
          key: 'google_backup_settings',
          value: settingsVal as any,
        },
        update: {
          value: settingsVal as any,
        },
      });

      this.logger.log(`Google Drive backup successfully connected to ${email}`);
      res.redirect(this.getFrontendRedirectUrl(hostname, 'success'));
    } catch (err: any) {
      this.logger.error(`Google Drive OAuth error: ${err.message}`);
      res.redirect(this.getFrontendRedirectUrl(hostname, 'error'));
    }
  }

  async getStatus() {
    const setting = await this.prisma.site_settings.findUnique({
      where: { key: 'google_backup_settings' },
    });
    
    if (!setting || !setting.value) {
      return { connected: false };
    }

    const val = setting.value as any;
    return {
      connected: val.connected === true,
      email: val.email,
      lastBackupTime: val.last_backup_time,
      lastBackupStatus: val.last_backup_status,
      hasClientConfig: !!(process.env.GOOGLE_BACKUP_CLIENT_ID && process.env.GOOGLE_BACKUP_CLIENT_SECRET),
    };
  }

  async disconnect() {
    await this.prisma.site_settings.deleteMany({
      where: { key: 'google_backup_settings' },
    });
    return { success: true };
  }

  private async refreshAccessToken(refreshToken: string): Promise<string> {
    const { clientId, clientSecret } = this.getClientCredentials();
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to refresh Google token: ${text}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async runBackup() {
    // 1. Get Google Settings
    const setting = await this.prisma.site_settings.findUnique({
      where: { key: 'google_backup_settings' },
    });

    if (!setting || !setting.value) {
      throw new BadRequestException('Google Drive backup is not connected.');
    }

    const val = setting.value as any;
    if (!val.connected || !val.refresh_token) {
      throw new BadRequestException('Google Drive backup is disconnected.');
    }

    this.logger.log('>>> Launching backup.sh script to create local archive...');
    
    // 2. Trigger the backup.sh shell script locally to create the archive
    const projectRoot = path.resolve(__dirname, '../../..');
    const backupScript = path.join(projectRoot, 'scripts/backup.sh');
    
    try {
      await execAsync(`bash "${backupScript}"`);
    } catch (err: any) {
      this.logger.error(`Local backup script failed: ${err.message}`);
      await this.updateBackupStatus(val, 'failed');
      throw new Error(`Backup script execution failed: ${err.message}`);
    }

    // 3. Find the latest backup archive
    const backupDir = '/tmp/dynime-backups';
    if (!fs.existsSync(backupDir)) {
      throw new Error('Local backup directory /tmp/dynime-backups does not exist after script execution.');
    }

    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith('dynime-backup-') && f.endsWith('.tar.gz'))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        stat: fs.statSync(path.join(backupDir, f)),
      }))
      .sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());

    if (files.length === 0) {
      throw new Error('No backup archive (.tar.gz) was found in /tmp/dynime-backups.');
    }

    const latestBackup = files[0];
    this.logger.log(`Found latest local backup archive: ${latestBackup.name} (${(latestBackup.stat.size / 1024 / 1024).toFixed(2)} MB)`);

    // 4. Upload to Google Drive using Drive API
    try {
      const accessToken = await this.refreshAccessToken(val.refresh_token);
      
      // Get or Create Dynime-Backups folder ID
      const folderId = await this.getOrCreateFolderId(accessToken, 'Dynime-Backups');
      const dailyFolderId = await this.getOrCreateFolderId(accessToken, 'daily', folderId);

      this.logger.log(`Uploading backup to Google Drive folder 'Dynime-Backups/daily'...`);
      await this.uploadResumableFile(accessToken, latestBackup.path, latestBackup.name, dailyFolderId);

      this.logger.log('✔ Backup uploaded to Google Drive successfully!');
      
      // Update DB status
      await this.updateBackupStatus(val, 'success');

      // 5. Cleanup the local backup file to save disk space
      fs.unlinkSync(latestBackup.path);
      
      return { success: true, fileName: latestBackup.name };
    } catch (err: any) {
      this.logger.error(`Google Drive upload failed: ${err.message}`);
      await this.updateBackupStatus(val, 'failed');
      throw err;
    }
  }

  private async updateBackupStatus(currentVal: any, status: 'success' | 'failed') {
    const updatedVal = {
      ...currentVal,
      last_backup_status: status,
      last_backup_time: new Date(),
    };
    await this.prisma.site_settings.update({
      where: { key: 'google_backup_settings' },
      data: { value: updatedVal as any },
    });
  }

  private async getOrCreateFolderId(accessToken: string, folderName: string, parentId?: string): Promise<string> {
    let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Folder not found, create it
    const createBody: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      createBody.parents = [parentId];
    }

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(`Failed to create Google Drive folder '${folderName}': ${errText}`);
    }

    const folder = await createResponse.json();
    return folder.id;
  }

  private async uploadResumableFile(accessToken: string, filePath: string, fileName: string, folderId: string): Promise<void> {
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;

    // 1. Initiate Resumable Upload
    const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/gzip',
        'X-Upload-Content-Length': fileSize.toString(),
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    });

    if (!initResponse.ok) {
      const errText = await initResponse.text();
      throw new Error(`Failed to initiate Google Drive resumable session: ${errText}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('Google Drive did not return a Location header for resumable upload.');
    }

    // 2. Upload the file buffer
    const fileStream = fs.createReadStream(filePath);
    
    // We can upload the stream by passing it directly to fetch
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': 'application/gzip',
      },
      body: fileStream as any,
    });

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      throw new Error(`Google Drive resumable upload failed: ${errText}`);
    }
  }
}
