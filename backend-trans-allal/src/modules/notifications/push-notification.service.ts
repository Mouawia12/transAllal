import { Injectable, Logger } from '@nestjs/common';
import Expo, { type ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushNotificationService {
  private readonly expo = new Expo();
  private readonly logger = new Logger(PushNotificationService.name);

  async sendTripAssigned(
    pushToken: string | null | undefined,
    tripDetails: { origin: string; destination: string },
  ): Promise<void> {
    if (!pushToken || !Expo.isExpoPushToken(pushToken)) return;

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title: 'رحلة جديدة',
      body: `${tripDetails.origin} ← ${tripDetails.destination}`,
      data: { type: 'trip_assigned' },
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === 'error') {
            this.logger.warn(`Push notification error: ${ticket.message}`);
          }
        }
      }
    } catch (err) {
      this.logger.error('Failed to send push notification', err);
    }
  }
}
