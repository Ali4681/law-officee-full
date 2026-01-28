// src/documents/documents.service.ts
import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentModel, DocumentEntity } from './document.schema';
import { CreateDocumentDto, UpdateDocumentDto } from './DTO/document.dto';
import { CasesService } from '../cases/cases.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentModel.name) private docModel: Model<DocumentEntity>,
    @Inject(forwardRef(() => CasesService))
    private casesService: CasesService,
  ) {}

  async create(
    createDto: CreateDocumentDto,
    userId: string,
    userRole: string,
  ): Promise<DocumentModel> {
    await this.casesService.findOne(createDto.caseId, userId, userRole);
    const doc = new this.docModel(createDto);
    return doc.save();
  }

  async findAll(userId: string, userRole: string): Promise<DocumentModel[]> {
    if ( userRole === 'staff') {
      return this.docModel.find().populate('caseId uploaderId').exec();
    }

    if (userRole === 'lawyer' || userRole === 'client') {
      const cases = await this.casesService.findAll(userId, userRole);
      const caseIds = cases.map((c) => (c as any)._id);
      return this.docModel
        .find({ caseId: { $in: caseIds } })
        .populate('caseId uploaderId')
        .exec();
    }

    return [];
  }

  async findOne(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<DocumentModel> {
    const doc = await this.docModel
      .findById(id)
      .populate('caseId uploaderId')
      .exec();

    if (!doc) throw new NotFoundException('Document not found');
    await this.casesService.findOne(doc.caseId.toString(), userId, userRole);
    return doc;
  }

  async findByCase(
    caseId: string,
    userId: string,
    userRole: string,
  ): Promise<DocumentModel[]> {
    await this.casesService.findOne(caseId, userId, userRole);
    return this.docModel.find({ caseId }).populate('uploaderId').exec();
  }

  async update(
    id: string,
    updateDto: UpdateDocumentDto,
    userId: string,
    userRole: string,
  ): Promise<DocumentModel> {
    const doc = await this.docModel.findById(id);
    if (!doc) throw new NotFoundException('Document not found');
    await this.casesService.findOne(doc.caseId.toString(), userId, userRole);

    const updated = await this.docModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Document not found');
    }
    return updated;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const doc = await this.docModel.findById(id);
    if (!doc) throw new NotFoundException('Document not found');

    await this.casesService.findOne(doc.caseId.toString(), userId, userRole);
    await this.docModel.findByIdAndDelete(id).exec();
  }

  async createWithExtractedData(
    data: {
      caseId: string;
      uploaderId: string;
      fileUrl: string;
      fileType: string;
      extractedData: any;
      documentType: 'court_decision' | 'contract';
    },
    userId: string,
    userRole: string,
  ): Promise<any> {
    await this.casesService.findOne(data.caseId, userId, userRole);

    const doc = new this.docModel({
      caseId: data.caseId,
      uploaderId: data.uploaderId,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      extractedData: data.extractedData,
      documentType: data.documentType,
    });
    const savedDoc = await doc.save();

    return {
      document: savedDoc,
      extractedData: data.extractedData,
      documentType: data.documentType,
      message: 'Document saved with extracted data successfully',
    };
  }
}
