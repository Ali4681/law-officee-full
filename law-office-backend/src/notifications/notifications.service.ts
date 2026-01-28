// src/notifications/notifications.service.ts
import {
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './notification.schema';
import { CreateNotificationDto } from './DTO/notification.dto';
import { UsersService } from '../users/users.service';
import { PushService } from './push.service';
import { TokenCleanupService } from './token-cleanup.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
    private readonly tokenCleanupService: TokenCleanupService,
  ) {}

  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const user = await this.usersService.findByIdOrNull(createDto.userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.notificationModel
      .findOne({
        userId: createDto.userId,
        type: createDto.type,
        message: createDto.message,
        'data.caseId': createDto.data?.caseId || null,
      })
      .exec();

    if (existing) return existing;

    const notification = new this.notificationModel(createDto);
    const saved = await notification.save();

    if (user.deviceTokens?.length) {
      try {
        const result = await this.pushService.sendToDevices(
          user.deviceTokens,
          createDto.type,
          createDto.message,
          {
            userId: String(createDto.userId),
            notificationId: String(saved._id),
            ...(createDto.data || {}),
          },
        );

        if (result.invalidTokens && result.invalidTokens.length > 0) {
          for (const token of result.invalidTokens) {
            this.tokenCleanupService.markTokenAsInvalid(token);
          }
          this.logger.warn(
            `⚠️ ${result.invalidTokens.length} invalid token(s) detected for user ${createDto.userId}`,
          );
        }

        this.logger.log(`✅ Push sent to user ${createDto.userId}`);
      } catch (error) {
        this.logger.error(
          `❌ Push failed for user ${createDto.userId}`,
          error as any,
          'NotificationsService',
        );
      }
    } else {
      this.logger.warn(`⚠️ User ${createDto.userId} has no device tokens`);
    }

    return saved;
  }

  async sendToUser(
    userId: string,
    type: string,
    message: string,
    extraData: Record<string, any> = {},
  ): Promise<Notification> {
    const user = await this.usersService.findByIdOrNull(userId);
    if (!user) throw new NotFoundException('User not found');

    const dto: CreateNotificationDto = {
      userId,
      type,
      message,
      data: extraData,
    };

    return this.create(dto);
  }

  async notifyExtractionComplete(
    userId: string,
    documentType: string,
    extractedData: any,
    documentId?: string,
  ): Promise<Notification> {
    const notificationMessage = this.buildExtractionMessage(
      documentType,
      extractedData,
    );

    return this.create({
      userId,
      type: 'EXTRACTION_COMPLETE',
      message: notificationMessage,
      data: {
        documentType,
        documentId,
        extractionScore: extractedData.extractionQuality?.score,
        confidence: extractedData.confidence,
        ...this.getKeyFields(documentType, extractedData),
      },
      documentId: documentId as any,
    });
  }

  async notifyExtractionFailed(
    userId: string,
    documentType: string,
    error: string,
    documentId?: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: 'EXTRACTION_FAILED',
      message: `Failed to extract ${documentType}. Error: ${error}`,
      data: {
        documentType,
        documentId,
        error,
      },
      documentId: documentId as any,
    });
  }

  private buildExtractionMessage(
    documentType: string,
    extractedData: any,
  ): string {
    switch (documentType) {
      case 'court_decision':
        const caseNum = extractedData.caseNumber || 'Unknown';
        const decisionNum = extractedData.decisionNumber || 'N/A';
        return `Court decision processed successfully! Case ${caseNum}, Decision ${decisionNum}`;
      case 'contract':
        const contractType = extractedData.contractType || 'Unknown';
        return `Contract extraction complete! Type: ${contractType}`;
      default:
        return `Document extraction completed successfully`;
    }
  }

  private getKeyFields(documentType: string, extractedData: any): any {
    if (documentType === 'court_decision') {
      return {
        caseNumber: extractedData.caseNumber,
        decisionNumber: extractedData.decisionNumber,
        court: extractedData.court,
        decisionDate: extractedData.decisionDate,
        documentSubType: extractedData.documentType,
      };
    }

    if (documentType === 'contract') {
      return {
        contractType: extractedData.contractType,
        parties: extractedData.parties,
        effectiveDate: extractedData.effectiveDate,
      };
    }

    return {};
  }

  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(id).exec();
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return notification;
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findUnreadForUser(userId: string): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId, read: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(id: string): Promise<Notification> {
    const updated = await this.notificationModel
      .findByIdAndUpdate(id, { read: true }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Notification ${id} not found`);
    return updated;
  }

  async markAllAsReadForUser(
    userId: string,
  ): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true } },
    );
    return { modifiedCount: result.modifiedCount };
  }

  async remove(id: string): Promise<void> {
    const result = await this.notificationModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Notification ${id} not found`);
  }
}
