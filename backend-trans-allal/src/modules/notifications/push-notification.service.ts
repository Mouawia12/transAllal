import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const serviceAccountJson = this.config.get<string>(
      'FIREBASE_SERVICE_ACCOUNT_JSON',
    );

    if (!serviceAccountJson) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled',
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as Record<string, unknown>;

      // Validate required service-account fields before handing off to Firebase
      // so misconfiguration fails loudly at startup rather than silently at
      // the first send attempt.
      const required = ['type', 'project_id', 'private_key', 'client_email'] as const;
      const missing = required.filter((key) => !serviceAccount[key]);
      if (missing.length > 0) {
        this.logger.error(
          `FIREBASE_SERVICE_ACCOUNT_JSON is missing required fields: ${missing.join(', ')} — push notifications disabled`,
        );
        return;
      }

      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });
      }

      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin SDK', err);
    }
  }

  async sendTripAssigned(
    fcmToken: string | null | undefined,
    tripDetails: { origin: string; destination: string },
  ): Promise<void> {
    if (!fcmToken || !this.initialized) return;

    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'رحلة جديدة',
          body: `${tripDetails.origin} ← ${tripDetails.destination}`,
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        data: {
          type: 'trip_assigned',
          origin: tripDetails.origin,
          destination: tripDetails.destination,
        },
      });
    } catch (err) {
      this.logger.error('Failed to send FCM notification', err);
    }
  }
}
