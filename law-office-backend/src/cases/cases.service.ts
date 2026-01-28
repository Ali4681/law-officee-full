// src/cases/cases.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Court, CourtDocument } from '../court/court.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Case, CaseDocument } from './case.schema';
import { CreateCaseDto, RequestCaseDto, UpdateCaseDto } from './DTO/case.dto';

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    @InjectModel(Case.name) private caseModel: Model<CaseDocument>,
    @InjectModel(Court.name) private courtModel: Model<CourtDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // 🆕 CLIENT CREATES CASE REQUEST
  // ==========================================
  async createRequest(
    requestDto: RequestCaseDto,
    clientId: string,
  ): Promise<Case> {
    const courtDoc = await this.courtModel
      .findById(requestDto.court)
      .select('name')
      .lean();
    const courtName = courtDoc?.name ?? 'محكمة غير معروفة';
    // Create case with 'pending' status
    const caseRequest = new this.caseModel({
      title: requestDto.title,
      description: requestDto.description,
      clientId: new Types.ObjectId(clientId), // Convert to ObjectId
      court: requestDto.court || 'سيتم تحديدها',
      status: 'pending',
      // urgency: requestDto.urgency || 'normal',
      // caseType: requestDto.caseType,
      preferredLawyerId: requestDto.preferredLawyerId
        ? new Types.ObjectId(requestDto.preferredLawyerId)
        : undefined,
      lawyerIds: [], // Empty until lawyer accepts
      requestedAt: new Date(),
    });

    const saved = await caseRequest.save();

    return saved;
  }

  // ==========================================
  // 🆕 GET ALL PENDING CASE REQUESTS (Lawyer)
  // ==========================================
  async findPendingRequests(userId: string, userRole: string): Promise<Case[]> {
    if (userRole !== 'lawyer') {
      throw new ForbiddenException('المحامون فقط يمكنهم عرض الطلبات المعلقة');
    }

    return this.caseModel
      .find({
        status: 'pending',
        $or: [
          { preferredLawyerId: new Types.ObjectId(userId) },
          { preferredLawyerId: { $exists: false } },
          { preferredLawyerId: null },
        ],
      })
      .populate('clientId preferredLawyerId court')
      .sort({ urgency: -1, requestedAt: -1 }) // Urgent first, then by date
      .exec();
  }

  // ==========================================
  // 🆕 LAWYER ACCEPTS CASE REQUEST
  // ==========================================
  async acceptCase(
    caseId: string,
    lawyerId: string,
    userRole: string,
    fee?: number,
  ): Promise<Case> {
    this.ensureValidObjectId(caseId);

    if (userRole !== 'lawyer') {
      throw new ForbiddenException('المحامون فقط يمكنهم قبول القضايا');
    }

    const caseItem = await this.caseModel.findById(caseId);

    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    if (caseItem.status !== 'pending') {
      throw new BadRequestException('تمت معالجة هذه القضية بالفعل');
    }

    // Ensure the assigned lawyer is accepting
    if (
      caseItem.preferredLawyerId &&
      caseItem.preferredLawyerId.toString() !== lawyerId
    ) {
      throw new ForbiddenException('أنت غير مكلف بهذه القضية');
    }

    // Validate fee if provided
    if (fee !== undefined && (Number.isNaN(fee) || fee < 0)) {
      throw new BadRequestException('مبلغ الأتعاب غير صالح');
    }

    // Update case to pending client confirmation with assigned lawyer and fee
    caseItem.status = 'fee_proposed';
    caseItem.lawyerIds = [new Types.ObjectId(lawyerId)];
    caseItem.acceptedAt = new Date();
    if (fee !== undefined) {
      caseItem.lawyerFee = fee;
    }

    const saved = await caseItem.save();

    await this.notifyClientFeeProposal(saved, lawyerId);

    return saved;
  }

  async respondToFee(
    caseId: string,
    clientId: string,
    accept: boolean,
    note?: string,
  ): Promise<Case> {
    this.ensureValidObjectId(caseId);

    const caseItem = await this.caseModel.findById(caseId);
    if (!caseItem) {
      throw new NotFoundException('القضية غير موجودة');
    }

    if (caseItem.clientId.toString() !== clientId) {
      throw new ForbiddenException('يمكنك الرد على قضيتك الخاصة فقط');
    }

    if (caseItem.status !== 'fee_proposed') {
      throw new BadRequestException(
        'هذه القضية لا تنتظر تأكيد العميل',
      );
    }

    caseItem.status = accept ? 'active' : 'client_rejected';
    caseItem.clientResponseAt = new Date();
    caseItem.clientResponseNote = note;

    const saved = await caseItem.save();

    const lawyerId = caseItem.lawyerIds?.[0]?.toString();
    const clientNotificationId = caseItem.clientId?.toString();
    if (lawyerId) {
      const notificationType = accept
        ? 'CLIENT_ACCEPTED_CASE'
        : 'CLIENT_REJECTED_CASE';
      const notificationMessage = accept
        ? `قبل العميل عرض الأتعاب لـ "${caseItem.title}".`
        : `رفض العميل عرض الأتعاب لـ "${caseItem.title}"${note ? `: ${note}` : ''}`;

      try {
        await this.notificationsService.sendToUser(
          lawyerId,
          notificationType,
          notificationMessage,
          {
            caseId: caseItem.id,
            clientId: clientNotificationId,
            accept,
            note,
          },
        );
      } catch (notifyError) {
        this.logger.warn(
          `فشل في إشعار المحامي ${lawyerId} بشأن رد العميل`,
          notifyError as any,
        );
      }
    }

    return saved;
  }

  private async notifyClientFeeProposal(
    caseItem: CaseDocument,
    lawyerId: string,
  ): Promise<void> {
    const clientId = caseItem.clientId?.toString();
    if (!clientId) {
      return;
    }

    const feeText =
      caseItem.lawyerFee !== undefined ? ` بمبلغ ${caseItem.lawyerFee} دولار` : '';
    const message = `اقترح محاميك أتعابًا${feeText} لـ "${caseItem.title}".`;

    try {
      await this.notificationsService.sendToUser(
        clientId,
        'CASE_FEE_PROPOSED',
        message,
        {
          caseId: caseItem.id,
          lawyerId,
          fee: caseItem.lawyerFee,
        },
      );
    } catch (notifyError) {
      this.logger.warn(
        `فشل في إشعار العميل ${clientId} بشأن عرض الأتعاب`,
        notifyError as any,
      );
    }
  }

  // ==========================================
  // 🆕 LAWYER REQUESTS MORE INFO FROM CLIENT
  // ==========================================
  async requestMoreInfo(
    caseId: string,
    lawyerId: string,
    message: string,
  ): Promise<Case> {
    const caseItem = await this.caseModel.findById(caseId);

    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    if (caseItem.status !== 'pending') {
      throw new BadRequestException('يمكن طلب معلومات للقضايا المعلقة فقط');
    }

    // Add message to case notes/description
    caseItem.description += `\n\n[طلب المحامي معلومات إضافية]: ${message}`;
    caseItem.status = 'info_requested';

    return caseItem.save();
  }

  // ==========================================
  // 🆕 CLIENT UPDATES REQUEST WITH MORE INFO
  // ==========================================
  async updateRequest(
    caseId: string,
    clientId: string,
    additionalInfo: string,
  ): Promise<Case> {
    const caseItem = await this.caseModel.findById(caseId);

    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    if (caseItem.clientId.toString() !== clientId) {
      throw new ForbiddenException(
        'يمكنك تحديث طلبات قضاياك الخاصة فقط',
      );
    }

    if (caseItem.status !== 'info_requested') {
      throw new BadRequestException(
        'لم يتم طلب معلومات إضافية لهذه القضية',
      );
    }

    // Add client's response
    caseItem.description += `\n\n[رد العميل]: ${additionalInfo}`;
    caseItem.status = 'pending'; // Back to pending for lawyer review

    return caseItem.save();
  }

  // ==========================================
  // 🆕 LAWYER DECLINES CASE REQUEST
  // ==========================================
  async declineCase(
    caseId: string,
    lawyerId: string,
    reason: string,
  ): Promise<Case> {
    this.ensureValidObjectId(caseId);
    const caseItem = await this.caseModel.findById(caseId);

    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    if (caseItem.status !== 'pending') {
      throw new BadRequestException('يمكن رفض القضايا المعلقة فقط');
    }

    if (
      caseItem.preferredLawyerId &&
      caseItem.preferredLawyerId.toString() !== lawyerId
    ) {
      throw new ForbiddenException('أنت غير مكلف بهذه القضية');
    }

    caseItem.status = 'declined';
    caseItem.description = `${caseItem.description || ''}\n\n[مرفوض]: ${reason}`;

    return caseItem.save();
  }

  // ==========================================
  // 🔄 EXISTING: LAWYER CREATES CASE DIRECTLY (Keep for backward compatibility)
  // ==========================================
  async create(
    createCaseDto: CreateCaseDto,
    userId: string,
    userRole: string,
  ): Promise<Case> {
    const lawyerIds = createCaseDto.lawyerIds || [];

    const existing = await this.caseModel.findOne({
      title: createCaseDto.title,
      clientId: createCaseDto.clientId,
      lawyerIds: { $all: lawyerIds, $size: lawyerIds.length },
      court: createCaseDto.court,
    });

    if (existing) {
      throw new BadRequestException(
        'قضية بنفس العنوان والعميل والمحامين والمحكمة موجودة بالفعل.',
      );
    }

    const createdCase = new this.caseModel({
      ...createCaseDto,
      lawyerIds,
      status: 'pending', // require lawyer approval
      requestedAt: new Date(),
      acceptedAt: undefined,
    });

    const saved = await createdCase.save();

    return saved;
  }

  // ==========================================
  // 🔄 UPDATED: FIND ALL (with status filtering)
  // ==========================================
  async findAll(userId: string, role: string, includeStatus?: string[]) {
    const filter: any = {};

    // ----------------------------------------------------------------
    // CLIENT → يشوف فقط قضاياه بدون أي فلترة أخرى
    // ----------------------------------------------------------------
    const clientPopulate = {
      path: 'clientId',
      select: 'profile firstName lastName name fullName username',
    };

    if (role === 'client') {
      const cases = await this.caseModel
        .find({ clientId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .populate(clientPopulate)
        .lean();
      return cases.map((caseDoc) => this.enrichCaseWithClient(caseDoc));
    }

    // ----------------------------------------------------------------
    // LAWYER → يشوف فقط القضايا التي يعمل عليها
    // ----------------------------------------------------------------
    if (role === 'lawyer') {
      filter.lawyerIds = new Types.ObjectId(userId);

      if (includeStatus?.length) {
        filter.status = { $in: includeStatus };
      }

      const cases = await this.caseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate(clientPopulate)
        .lean();
      return cases.map((caseDoc) => this.enrichCaseWithClient(caseDoc));
    }

    // ----------------------------------------------------------------
    // STAFF / ADMIN → يشوفون كل شيء
    // ----------------------------------------------------------------
    if (role === 'staff' || role === 'admin') {
      if (includeStatus?.length) {
        filter.status = { $in: includeStatus };
      }

      const cases = await this.caseModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate(clientPopulate)
        .lean();
      return cases.map((caseDoc) => this.enrichCaseWithClient(caseDoc));
    }

    return [];
  }

  // ==========================================
  // 🆕 CLIENT VIEWS THEIR OWN REQUESTS
  // ==========================================
  async findMyRequests(clientId: string): Promise<Case[]> {
    return this.caseModel
      .find({
        clientId,
        status: {
          $in: [
            'pending',
            'info_requested',
            'declined',
            'fee_proposed',
            'active',
            'in_progress',
            'closed',
            'client_rejected',
          ],
        },
      })
      .populate('preferredLawyerId court')
      .sort({ requestedAt: -1 })
      .exec();
  }

  // ==========================================
  // EXISTING METHODS (unchanged)
  // ==========================================

  async findOne(id: string, userId: string, userRole: string): Promise<Case> {
    this.ensureValidObjectId(id);
    const caseItem = await this.caseModel
      .findById(id)
      .populate('clientId lawyerIds court')
      .exec();

    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    if (userRole === 'staff' || userRole === 'lawyer') {
      return caseItem;
    }

    if (userRole === 'client') {
      if (caseItem.clientId.toString() !== userId) {
        throw new ForbiddenException('يمكنك عرض قضاياك الخاصة فقط');
      }
    }

    return caseItem;
  }

  async update(
    id: string,
    updateCaseDto: UpdateCaseDto,
    userId: string,
    userRole: string,
  ): Promise<Case> {
    this.ensureValidObjectId(id);
    const caseItem = await this.caseModel.findById(id);
    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    Object.assign(caseItem, updateCaseDto);
    return caseItem.save();
  }

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    userRole: string,
  ): Promise<Case> {
    this.ensureValidObjectId(id);
    const caseItem = await this.caseModel.findById(id);
    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    caseItem.status = status;
    return caseItem.save();
  }

  async remove(id: string, userId: string, userRole: string): Promise<Case> {
    this.ensureValidObjectId(id);
    const caseItem = await this.caseModel.findById(id);
    if (!caseItem) throw new NotFoundException('القضية غير موجودة');

    const deletedCase = await this.caseModel.findByIdAndDelete(id);
    if (!deletedCase) {
      throw new NotFoundException('القضية غير موجودة');
    }
    return deletedCase;
  }

  private ensureValidObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف القضية غير صالح');
    }
  }

  private enrichCaseWithClient(caseDoc: any) {
    const client = caseDoc.clientId;
    const clientName =
      caseDoc.clientName || this.computeClientDisplayName(client);
    return {
      ...caseDoc,
      client,
      clientName: clientName || 'عميل غير معروف',
    };
  }

  private computeClientDisplayName(client: any): string | undefined {
    if (!client) return undefined;
    if (client.name) return client.name;
    if (client.fullName) return client.fullName;
    if (client.username) return client.username;
    const profile = client.profile;
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return undefined;
  }
}