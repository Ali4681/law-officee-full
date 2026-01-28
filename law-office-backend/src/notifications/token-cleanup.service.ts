import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);
  private invalidTokensCache: Set<string> = new Set();

  constructor(private readonly usersService: UsersService) {}

  /**
   * Mark token as invalid (called by push service)
   */
  markTokenAsInvalid(token: string): void {
    this.invalidTokensCache.add(token);
    this.logger.warn(
      `📌 Marked token as invalid: ${token.substring(0, 30)}...`,
    );
  }

  /**
   * Get count of invalid tokens in cache
   */
  getInvalidTokenCount(): number {
    return this.invalidTokensCache.size;
  }

  /**
   * Run cleanup job every day at 3 AM
   * Removes tokens that failed during push notifications
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupInvalidTokens(): Promise<void> {
    this.logger.log('🧹 Starting automatic token cleanup job...');

    try {
      const invalidTokens = Array.from(this.invalidTokensCache);

      if (invalidTokens.length === 0) {
        this.logger.log('✅ No invalid tokens to clean up');
        return;
      }

      this.logger.log(`Found ${invalidTokens.length} invalid tokens to remove`);

      // Remove invalid tokens from database
      const cleanedCount =
        await this.usersService.cleanupInvalidTokens(invalidTokens);

      // Clear the cache
      this.invalidTokensCache.clear();

      this.logger.log(
        `✅ Cleanup complete: removed ${cleanedCount} invalid tokens`,
      );
    } catch (error) {
      this.logger.error('❌ Token cleanup failed', error);
    }
  }

  /**
   * Remove duplicate tokens (run weekly)
   */
  @Cron('0 0 * * 0') // Every Sunday at midnight
  async removeDuplicateTokens(): Promise<void> {
    this.logger.log('🧹 Starting duplicate token cleanup...');

    try {
      const cleanedCount = await this.usersService.removeDuplicateTokens();
      this.logger.log(
        `✅ Duplicate cleanup complete: cleaned ${cleanedCount} users`,
      );
    } catch (error) {
      this.logger.error('❌ Duplicate cleanup failed', error);
    }
  }

  /**
   * Manual cleanup trigger (for testing)
   */
  async triggerManualCleanup(): Promise<{
    invalidTokensRemoved: number;
    duplicatesRemoved: number;
  }> {
    this.logger.log('🔧 Manual cleanup triggered...');

    const invalidTokens = Array.from(this.invalidTokensCache);
    const invalidTokensRemoved =
      await this.usersService.cleanupInvalidTokens(invalidTokens);
    this.invalidTokensCache.clear();

    const duplicatesRemoved = await this.usersService.removeDuplicateTokens();

    this.logger.log(`✅ Manual cleanup complete`);

    return { invalidTokensRemoved, duplicatesRemoved };
  }
}
