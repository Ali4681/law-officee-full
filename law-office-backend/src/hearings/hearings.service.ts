// src/hearings/hearings.service.ts
import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
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

  async create(
    createHearingDto: CreateHearingDto,
    userId: string,
    userRole: string,
  ): Promise<Hearing> {
    await this.casesService.findOne(createHearingDto.caseId, userId, userRole);
    const hearing = new this.hearingModel(createHearingDto);
    const savedHearing = await hearing.save();

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

    const updated = await this.hearingModel
      .findByIdAndUpdate(id, updateHearingDto, { new: true })
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

      const dateStr = new Date(hearing.date).toLocaleDateString('ar-SA');
      const locationStr = hearing.location ? ` في ${hearing.location}` : '';
      const message =
        type === 'HEARING_CREATED'
          ? `تم جدولة جلسة استماع جديدة لقضيتك في ${dateStr}${locationStr}.`
          : `تم تحديث جلسة الاستماع لقضيتك في ${dateStr}${locationStr}.`;

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
