import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './user.schema';
import { CreateUserDto, UpdateUserDto } from './DTO/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // ✅ Create new user
  async create(createUserDto: CreateUserDto & { password: string }) {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  // ✅ Get all users
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // dY+ Pending lawyers
  async findPendingLawyers(): Promise<User[]> {
    return this.userModel
      .find({ role: 'lawyer', verificationStatus: 'pending' })
      .exec();
  }

  // ✅ Get user by ID
  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateVerificationStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected',
    removeCertificate = false,
  ): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    user.verificationStatus = status;
    if (removeCertificate) {
      user.certificateUrl = undefined;
    }

    return user.save();
  }

  // ✅ Get user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // ✅ Find user by ID or return null (for notifications)
  async findByIdOrNull(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIds(ids: string[]): Promise<UserDocument[]> {
    if (ids.length === 0) return [];
    const objectIds = ids.map((id) => new Types.ObjectId(id));
    return this.userModel.find({ _id: { $in: objectIds } }).exec();
  }

  // ========================================
  // 🔔 DEVICE TOKEN MANAGEMENT
  // ========================================

  /**
   * Register a device token for push notifications
   * Handles duplicates and limits tokens per user
   */
  async updateDeviceToken(
    userId: string,
    deviceToken: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Initialize deviceTokens array if doesn't exist
    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }

    // Check if token already exists
    if (user.deviceTokens.includes(deviceToken)) {
      this.logger.log(`Token already registered for user ${userId}`);
      return { success: true, message: 'Token already registered' };
    }

    // Limit: Max 5 devices per user (prevent abuse)
    const MAX_DEVICES = 1;
    if (user.deviceTokens.length >= MAX_DEVICES) {
      // Remove oldest token (FIFO)
      const removed = user.deviceTokens.shift();
      this.logger.warn(
        `User ${userId} reached max devices, removed oldest: ${removed}`,
      );
    }

    // Add new token
    user.deviceTokens.push(deviceToken);
    await user.save();

    this.logger.log(`✅ Device token registered for user ${userId}`);
    return { success: true, message: 'Device token registered successfully' };
  }

  /**
   * Remove a specific device token (e.g., on logout)
   */
  async removeDeviceToken(
    userId: string,
    deviceToken: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.deviceTokens || user.deviceTokens.length === 0) {
      return { success: true, message: 'No tokens to remove' };
    }

    const initialLength = user.deviceTokens.length;
    user.deviceTokens = user.deviceTokens.filter(
      (token) => token !== deviceToken,
    );

    if (user.deviceTokens.length < initialLength) {
      await user.save();
      this.logger.log(`✅ Device token removed for user ${userId}`);
      return { success: true, message: 'Device token removed successfully' };
    }

    return { success: true, message: 'Token not found' };
  }

  /**
   * Remove all device tokens for a user (e.g., security action)
   */
  async removeAllDeviceTokens(
    userId: string,
  ): Promise<{ success: boolean; count: number }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const count = user.deviceTokens?.length || 0;
    user.deviceTokens = [];
    await user.save();

    this.logger.log(`✅ Removed ${count} device tokens for user ${userId}`);
    return { success: true, count };
  }

  /**
   * Get all device tokens for a user
   */
  async getDeviceTokens(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user.deviceTokens || [];
  }

  /**
   * Clean up invalid/expired tokens (called by cleanup service)
   */
  async cleanupInvalidTokens(invalidTokens: string[]): Promise<number> {
    let cleanedCount = 0;

    for (const token of invalidTokens) {
      const result = await this.userModel.updateMany(
        { deviceTokens: token },
        { $pull: { deviceTokens: token } },
      );
      cleanedCount += result.modifiedCount;
    }

    this.logger.log(`✅ Cleaned up ${cleanedCount} invalid tokens`);
    return cleanedCount;
  }

  /**
   * Remove duplicate tokens from all users
   */
  async removeDuplicateTokens(): Promise<number> {
    const users = await this.userModel.find({
      deviceTokens: { $exists: true, $ne: [] },
    });

    let cleanedCount = 0;

    for (const user of users) {
      const uniqueTokens = [...new Set(user.deviceTokens)];

      if (uniqueTokens.length < user.deviceTokens.length) {
        user.deviceTokens = uniqueTokens;
        await user.save();
        cleanedCount++;
      }
    }

    this.logger.log(`✅ Removed duplicates from ${cleanedCount} users`);
    return cleanedCount;
  }

  // ========================================
  // 🔧 EXISTING METHODS (Keep as is)
  // ========================================

  // ✅ Update user safely
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    // Hash password if provided
    if (updateUserDto.password) {
      const hashedPassword = await bcrypt.hash(updateUserDto.password, 10);
      user.password = hashedPassword;
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = { firstName: '', lastName: '', phone: '' };
    }

    // Update profile fields if provided
    if (updateUserDto.profile) {
      user.profile.firstName =
        updateUserDto.profile.firstName ?? user.profile.firstName;
      user.profile.lastName =
        updateUserDto.profile.lastName ?? user.profile.lastName;
      user.profile.phone = updateUserDto.profile.phone ?? user.profile.phone;
    }

    // Update other fields
    if (updateUserDto.email) user.email = updateUserDto.email;
    if (updateUserDto.role) user.role = updateUserDto.role;
    if (updateUserDto.specialization !== undefined)
      user.specialization = updateUserDto.specialization;
    if (updateUserDto.deviceTokens)
      user.deviceTokens = updateUserDto.deviceTokens;
    // Allow clearing avatar (explicit undefined) or setting new URL
    if ('avatarUrl' in updateUserDto) {
      user.avatarUrl = updateUserDto.avatarUrl as any;
    }

    return user.save();
  }

  // ✅ Delete user
  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
