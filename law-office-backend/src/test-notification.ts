import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { NotificationsService } from './notifications/notifications.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const notificationsService = app.get(NotificationsService);

  // 1️⃣ Pick a test user ID (must exist in your DB)
  const testUserId = '68d01999e4ce172924e598cc';

  // 2️⃣ Assign a fake device token
  await usersService.updateDeviceToken(testUserId, 'TEST_FAKE_TOKEN_123');
  console.log('✅ Fake device token assigned');

  // 3️⃣ Create a test notification
  const notification = await notificationsService.create({
    userId: testUserId,
    type: 'test_notification',
    message: 'This is a test notification!',
    data: { test: 'yes' }, // optional extra data
  });

  console.log('✅ Notification created:', notification);

  // 4️⃣ Optional: fetch all notifications for this user
  const allNotifications =
    await notificationsService.findAllForUser(testUserId);
  console.log(`📄 User now has ${allNotifications.length} notifications`);

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Test failed', err);
});
