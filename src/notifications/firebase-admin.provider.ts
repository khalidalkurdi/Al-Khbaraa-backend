import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  cert,
  getApps,
  initializeApp,
  ServiceAccount,
} from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminProvider implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminProvider.name);
  private initialized = false;
  private fcmEnabled = false;
  private initError: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const credentialsJson = this.configService.get<string>(
      'fcm.credentialsJson',
    );

    if (!credentialsJson?.trim()) {
      this.initError = 'FCM_CREDENTIALS_JSON is missing';
      this.logger.error(this.initError);
      return;
    }

    try {
      const credentials = JSON.parse(credentialsJson) as ServiceAccount;
      if (getApps().length === 0) {
        initializeApp({
          credential: cert(credentials),
        });
      }
      this.fcmEnabled = true;
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.initialized = false;
      this.fcmEnabled = false;
      this.initError = `FCM_CREDENTIALS_JSON is malformed: ${message}`;
      this.logger.error(this.initError);
    }
  }

  isEnabled(): boolean {
    return this.fcmEnabled;
  }

  getError(): string | null {
    return this.initError;
  }

  getMessaging(): Messaging | null {
    if (!this.fcmEnabled) {
      return null;
    }

    return getMessaging();
  }
}
