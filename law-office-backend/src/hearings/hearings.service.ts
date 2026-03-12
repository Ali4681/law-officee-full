// DIAGNOSTIC VERSION - Replace your hearings.service.ts temporarily with this
// This will show exactly what's being received and processed

import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hearing, HearingDocument } from './hearing.schema';
import { CreateHearingDto, UpdateHearingDto } from './DTO/hearing.dto';
import { CasesService } from '../cases/cases.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HearingsService {
  private readonly logger = new Logger(HearingsService.name);

  constructor(
    @InjectModel(Hearing.name) private hearingModel: Model<HearingDocument>,
    @Inject(forwardRef(() => CasesService))
    private casesService: CasesService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  private combineDateTime(dateStr: string, timeStr?: string): Date {
    // 🔍 DIAGNOSTIC LOGGING
    this.logger.log(`🔍 combineDateTime called with:`);
    this.logger.log(`   dateStr: "${dateStr}" (type: ${typeof dateStr})`);
    this.logger.log(`   timeStr: "${timeStr}" (type: ${typeof timeStr})`);

    const date = new Date(dateStr);

    // 🔍 DIAGNOSTIC LOGGING
    this.logger.log(`   Parsed date: ${date.toISOString()}`);
    this.logger.log(`   Parsed year: ${date.getFullYear()}`);

    // ✅ VALIDATION: Check if date is valid
    if (isNaN(date.getTime())) {
      this.logger.error(`❌ Invalid date string: "${dateStr}"`);
      throw new BadRequestException(`Invalid date format: ${dateStr}`);
    }

    // ✅ VALIDATION: Check if year is reasonable
    const year = date.getFullYear();
    if (year < 2024 || year > 2100) {
      this.logger.error(`❌ Invalid year: ${year} from dateStr: "${dateStr}"`);
      throw new BadRequestException(
        `Invalid date year: ${year}. Please use format YYYY-MM-DD (e.g., 2025-02-15). Received: ${dateStr}`,
      );
    }

    if (timeStr) {
      // Parse time string (supports formats like "14:00", "2:00 PM", "2:00 م", etc.)
      const timePattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|ص|م)?$/i;
      const match = timeStr.trim().match(timePattern);

      if (match) {
        const [, hourStr, minuteStr, secondStr, ampm] = match;
        let hours = Number(hourStr);
        const minutes = Number(minuteStr);
        const seconds = Number(secondStr || '0');

        // 🔍 DIAGNOSTIC LOGGING
        this.logger.log(
          `   Time parsed: ${hours}:${minutes}:${seconds} ${ampm || '(24h)'}`,
        );

        // Handle both English (AM/PM) and Arabic (ص/م) time markers
        if (ampm) {
          const upper = ampm.toUpperCase();
          if ((upper === 'PM' || upper === 'م') && hours < 12) hours += 12;
          if ((upper === 'AM' || upper === 'ص') && hours === 12) hours = 0;
        }

        // 🔍 DIAGNOSTIC LOGGING
        this.logger.log(`   Adjusted hours: ${hours}`);

        date.setHours(hours, minutes, seconds, 0);
      } else {
        this.logger.warn(`⚠️ Could not parse time: "${timeStr}"`);
      }
    } else {
      // Default to 9:00 AM Syria time if no time provided
      this.logger.log(`   No time provided, defaulting to 9:00 AM`);
      date.setHours(9, 0, 0, 0);
    }

    // 🔍 FINAL DIAGNOSTIC
    this.logger.log(`   ✅ Final combined datetime: ${date.toISOString()}`);
    this.logger.log(`   ✅ Final year: ${date.getFullYear()}`);

    return date;
  }

  async create(
    createHearingDto: CreateHearingDto,
    userId: string,
    userRole: string,
  ): Promise<Hearing> {
    // 🔍 DIAGNOSTIC LOGGING - Log what we received
    this.logger.log(`════════════════════════════════════════`);
    this.logger.log(`🔍 CREATE HEARING REQUEST`);
    this.logger.log(
      `   DTO received: ${JSON.stringify(createHearingDto, null, 2)}`,
    );
    this.logger.log(`   User: ${userId} (${userRole})`);
    this.logger.log(`════════════════════════════════════════`);

    await this.casesService.findOne(createHearingDto.caseId, userId, userRole);

    // Combine date and time into a single Date object
    const combinedDateTime = this.combineDateTime(
      createHearingDto.date,
      createHearingDto.time,
    );

    const hearing = new this.hearingModel({
      ...createHearingDto,
      date: combinedDateTime,
    });

    // 🔍 DIAGNOSTIC LOGGING - Log what we're about to save
    this.logger.log(`🔍 About to save hearing:`);
    this.logger.log(`   caseId: ${hearing.caseId}`);
    this.logger.log(`   date: ${hearing.date.toISOString()}`);
    this.logger.log(`   location: ${hearing.location || 'none'}`);
    this.logger.log(`   notes: ${hearing.notes || 'none'}`);

    const savedHearing = await hearing.save();

    this.logger.log(`✅ Hearing saved with ID: ${(savedHearing as any)._id}`);

    // Notify client about new hearing
    await this.notifyClientAboutHearing(savedHearing, 'HEARING_CREATED');

    return savedHearing;
  }

  async findAll(userId: string, userRole: string): Promise<Hearing[]> {
    if (userRole === 'staff') {
      return this.hearingModel.find().populate('caseId').exec();
    }

    const cases = await this.casesService.findAll(userId, userRole);
    const caseIds = cases.map((c) => (c as any)._id);
    return this.hearingModel
      .find({ caseId: { $in: caseIds } })
      .populate('caseId')
      .exec();
  }

  async findOne(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<Hearing> {
    const hearing = await this.hearingModel
      .findById(id)
      .populate('caseId')
      .exec();
    if (!hearing) throw new NotFoundException('Hearing not found');

    await this.casesService.findOne(
      hearing.caseId.toString(),
      userId,
      userRole,
    );
    return hearing;
  }

  async findByCase(
    caseId: string,
    userId: string,
    userRole: string,
  ): Promise<Hearing[]> {
    await this.casesService.findOne(caseId, userId, userRole);
    return this.hearingModel.find({ caseId }).exec();
  }

  async update(
    id: string,
    updateHearingDto: UpdateHearingDto,
    userId: string,
    userRole: string,
  ): Promise<Hearing> {
    const hearing = await this.hearingModel.findById(id);
    if (!hearing) throw new NotFoundException('Hearing not found');
    await this.casesService.findOne(
      hearing.caseId.toString(),
      userId,
      userRole,
    );

    // Combine date and time if both are provided
    let updateData: any = { ...updateHearingDto };
    if (updateHearingDto.date || updateHearingDto.time) {
      const dateToUse = updateHearingDto.date || hearing.date.toISOString();
      const combinedDateTime = this.combineDateTime(
        dateToUse,
        updateHearingDto.time,
      );
      updateData.date = combinedDateTime;
      delete updateData.time; // Remove time field as it's combined into date
    }

    const updated = await this.hearingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Hearing not found');
    }

    // Notify client about updated hearing
    await this.notifyClientAboutHearing(updated, 'HEARING_UPDATED');

    return updated;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const hearing = await this.hearingModel.findById(id);
    if (!hearing) throw new NotFoundException('Hearing not found');

    await this.casesService.findOne(
      hearing.caseId.toString(),
      userId,
      userRole,
    );
    await this.hearingModel.findByIdAndDelete(id).exec();
  }

  private async notifyClientAboutHearing(
    hearing: Hearing,
    type: string,
  ): Promise<void> {
    try {
      const caseDoc = await this.casesService.findOne(
        hearing.caseId.toString(),
        'dummy',
        'staff',
      );
      const clientId = (caseDoc.clientId as any)._id?.toString();
      if (!clientId) return;

      // Use Syria timezone (Asia/Damascus) with Arabic locale
      const dateStr = new Date(hearing.date).toLocaleDateString('ar-SY', {
        timeZone: 'Asia/Damascus',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = new Date(hearing.date).toLocaleTimeString('ar-SY', {
        timeZone: 'Asia/Damascus',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const locationStr = hearing.location ? ` في ${hearing.location}` : '';
      const message =
        type === 'HEARING_CREATED'
          ? `تم جدولة جلسة استماع جديدة لقضيتك في ${dateStr} الساعة ${timeStr}${locationStr}.`
          : `تم تحديث جلسة الاستماع لقضيتك في ${dateStr} الساعة ${timeStr}${locationStr}.`;

      await this.notificationsService.sendToUser(clientId, type, message, {
        hearingId: (hearing as any)._id,
        caseId: hearing.caseId,
        date: hearing.date,
        location: hearing.location,
        notes: hearing.notes,
        result: hearing.result,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify client about hearing ${(hearing as any)._id}`,
        error as any,
      );
    }
  }
}
