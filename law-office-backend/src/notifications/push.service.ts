import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private configService: ConfigService) {
    if (!admin.apps.length) {
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      let privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.logger.log('✅ Firebase Admin initialized');
      } else {
        this.logger.error('❌ Missing Firebase credentials in env');
      }
    }
  }

  /**
   * Send push notifications to multiple devices
   * Returns array of invalid tokens for cleanup
   */
  async sendToDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ invalidTokens: string[] }> {
    if (!tokens || tokens.length === 0) {
      return { invalidTokens: [] };
    }

    const invalidTokens: string[] = [];

    for (const token of tokens) {
      try {
        if (token.startsWith('ExponentPushToken')) {
          const result = await this.sendExpoPush(token, title, body, data);
          if (result.invalid) {
            invalidTokens.push(token);
          }
        } else {
          const result = await this.sendFcmPush(token, title, body, data);
          if (result.invalid) {
            invalidTokens.push(token);
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to send to token: ${token.substring(0, 20)}...`,
          error,
        );
      }
    }

    return { invalidTokens };
  }

  /**
   * Send Expo push notification
   */
  private async sendExpoPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: boolean; invalid: boolean }> {
    const message = { to: token, sound: 'default', title, body, data };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const json: any = await response.json();

      // Check for errors
      if (json.data && json.data.status === 'error') {
        const errorType = json.data.details?.error;

        // Token is invalid or device unregistered
        if (errorType === 'DeviceNotRegistered') {
          this.logger.warn(`❌ Invalid Expo token (device not registered)`);
          return { success: false, invalid: true };
        }

        this.logger.error(`Expo push error: ${errorType}`);
        return { success: false, invalid: false };
      }

      this.logger.log(`📩 Expo push sent successfully`);
      return { success: true, invalid: false };
    } catch (err) {
      this.logger.error('❌ Expo push failed', err as any);
      return { success: false, invalid: false };
    }
  }

  /**
   * Send FCM push notification
   */
  private async sendFcmPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: boolean; invalid: boolean }> {
    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      data: { ...(data || {}) },
      android: { priority: 'high', notification: { sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    };

    try {
      await admin.messaging().send(message);
      this.logger.log(`📩 FCM push sent successfully`);
      return { success: true, invalid: false };
    } catch (err: any) {
      // Check for invalid token errors
      if (
        err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(`❌ Invalid FCM token: ${err.code}`);
        return { success: false, invalid: true };
      }

      this.logger.error(`❌ FCM push failed: ${err.code}`, err);
      return { success: false, invalid: false };
    }
  }
}
