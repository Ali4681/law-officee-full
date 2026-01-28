// src/ocr/ocr.controller.ts
import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrBaseService } from './services/ocr-base.service';
import { CourtExtractorService } from './services/court-extractor.service';
import { ContractExtractorService } from './services/contract-extractor.service';
import { BaseDocumentDto } from './dto/base-document.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { DocumentsService } from '../documents/documents.service';

interface AsyncOcrMetadata {
  caseId?: string;
  fileUrl?: string;
  fileType?: string;
  hearingDate?: string;
  hearingLocation?: string;
  hearingNotes?: string;
}
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorator/roles.decorator';

@Controller('ocr')
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(
    private readonly ocrBase: OcrBaseService,
    private readonly courtExtractor: CourtExtractorService,
    private readonly contractExtractor: ContractExtractorService,
    private readonly notificationsService: NotificationsService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post('extract')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async extractDocument(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    data?: BaseDocumentDto;
    message?: string;
    warning?: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    const userRole = req.user.role;

    try {
      this.logger.log(`📄 Processing document: ${file.originalname}`);

      let text = await this.ocrBase.extractTextFromPdf(file.buffer);
      this.logger.log(`📝 Extracted text length: ${text.length} characters`);

      text = this.cleanOcrErrors(text);

      const docType = this.ocrBase.detectDocumentType(text);
      this.logger.log(`🔍 Detected document type: ${docType}`);

      if (docType === 'court_decision' && userRole === 'staff') {
        this.logger.warn(`⚠️ Staff attempted to extract court decision`);

        await this.notificationsService.create({
          userId,
          type: 'EXTRACTION_BLOCKED',
          message:
            'Court decision detected. Only lawyers can process court decisions. Please assign this to a lawyer.',
          data: {
            documentType: 'court_decision',
            fileName: file.originalname,
          },
        });

        return {
          success: false,
          message:
            'Court decision detected. Only lawyers can process court decisions.',
          warning:
            'This document requires lawyer review. It has been flagged for assignment.',
        };
      }

      let result: BaseDocumentDto;

      if (docType === 'court_decision') {
        result = await this.courtExtractor.extractCourtDecision(text);
      } else if (docType === 'contract') {
        result = await this.contractExtractor.extractContract(text);
      } else {
        return {
          success: false,
          message: 'Unknown document type. Unable to extract structured data.',
        };
      }

      this.logger.log(
        `✅ Extraction complete - Quality: ${result.extractionQuality?.score}%`,
      );

      return {
        success: true,
        data: result,
        message: 'Extraction complete. Please review the data before saving.',
      };
    } catch (error) {
      this.logger.error(`❌ Extraction failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process: ${error.message}`);
    }
  }

  @Post('extract/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('lawyer', 'staff')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Only PDF files allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  async extractDocumentAsync(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: AsyncOcrMetadata,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    status: string;
    processingId?: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user.sub;
    const userRole = req.user.role;

    this.logger.log(
      `⏳ Starting async extraction for user ${userId}: ${file.originalname}`,
    );

    const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.processExtractionInBackground(
      file,
      userId,
      userRole,
      processingId,
      metadata,
    ).catch((error) => {
      this.logger.error(
        `❌ Background extraction failed for ${processingId}:`,
        error,
      );
    });

    return {
      success: true,
      message:
        'Extraction started. You will be notified when processing is complete.',
      status: 'processing',
      processingId,
    };
  }

  private async processExtractionInBackground(
    file: Express.Multer.File,
    userId: string,
    userRole: string,
    processingId: string,
    metadata: AsyncOcrMetadata,
  ): Promise<void> {
    try {
      this.logger.log(`🔄 Processing ${processingId} in background...`);
      const requestMetadata = metadata ?? {};

      let text = await this.ocrBase.extractTextFromPdf(file.buffer);
      text = this.cleanOcrErrors(text);

      const docType = this.ocrBase.detectDocumentType(text);
      this.logger.log(`🔍 ${processingId} - Detected type: ${docType}`);

      if (docType === 'court_decision' && userRole === 'staff') {
        await this.notificationsService.create({
          userId,
          type: 'EXTRACTION_BLOCKED',
          message:
            'Court decision detected. Only lawyers can process this document.',
          data: {
            documentType: 'court_decision',
            fileName: file.originalname,
            processingId,
          },
        });

        this.logger.warn(
          `⚠️ ${processingId} - Staff blocked from court decision`,
        );
        return;
      }

      let result: BaseDocumentDto;

      if (docType === 'court_decision') {
        result = await this.courtExtractor.extractCourtDecision(text);

        await this.persistExtractedDocument(
          requestMetadata,
          userId,
          userRole,
          file,
          result,
          'court_decision',
          processingId,
        );

        await this.notificationsService.notifyExtractionComplete(
          userId,
          'court_decision',
          result,
          processingId,
        );

        this.logger.log(
          `✅ ${processingId} - Court decision extracted successfully`,
        );
      } else if (docType === 'contract') {
        result = await this.contractExtractor.extractContract(text);

        await this.persistExtractedDocument(
          requestMetadata,
          userId,
          userRole,
          file,
          result,
          'contract',
          processingId,
        );

        await this.notificationsService.notifyExtractionComplete(
          userId,
          'contract',
          result,
          processingId,
        );

        this.logger.log(`✅ ${processingId} - Contract extracted successfully`);
      } else {
        await this.notificationsService.notifyExtractionFailed(
          userId,
          'unknown',
          'Unable to determine document type.',
          processingId,
        );

        this.logger.warn(`⚠️ ${processingId} - Unknown document type`);
      }
    } catch (error) {
      this.logger.error(
        `❌ ${processingId} - Extraction failed:`,
        error.message,
        error.stack,
      );

      await this.notificationsService.notifyExtractionFailed(
        userId,
        'document',
        error.message,
        processingId,
      );
    }
  }

  private async persistExtractedDocument(
    metadata: AsyncOcrMetadata,
    userId: string,
    userRole: string,
    file: Express.Multer.File,
    result: BaseDocumentDto,
    documentType: 'court_decision' | 'contract',
    processingId: string,
  ) {
    const metadataValues = metadata ?? {};

    if (!metadataValues.caseId) {
      this.logger.warn(
        `⚠️ ${processingId} - Missing caseId, skipping document persistence`,
      );
      return;
    }

    const fileUrl =
      metadataValues.fileUrl || file.originalname || `ocr-${processingId}`;
    const fileType =
      metadataValues.fileType || file.mimetype || 'application/pdf';

    try {
      await this.documentsService.createWithExtractedData(
        {
          caseId: metadataValues.caseId,
          uploaderId: userId,
          fileUrl,
          fileType,
          extractedData: result,
          documentType,
        },
        userId,
        userRole,
      );
      this.logger.log(
        `✅ ${processingId} - Saved extracted document for case ${metadata.caseId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ ${processingId} - Failed to persist extracted document`,
        error as any,
      );
    }
  }

  private cleanOcrErrors(text: string): string {
    let clean = text;

    clean = clean.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
    clean = clean.replace(/dhe/gi, 'عطل');
    clean = clean.replace(/dhc/gi, 'عطل');
    clean = clean.replace(/dha/gi, 'عطل');
    clean = clean.replace(/\s+/g, ' ');
    clean = clean.replace(/\u200B/g, '');

    return clean.trim();
  }

  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{
    status: string;
    services: {
      ocrBase: boolean;
      courtExtractor: boolean;
      contractExtractor: boolean;
      notifications: boolean;
    };
  }> {
    return {
      status: 'ok',
      services: {
        ocrBase: !!this.ocrBase,
        courtExtractor: !!this.courtExtractor,
        contractExtractor: !!this.contractExtractor,
        notifications: !!this.notificationsService,
      },
    };
  }
}
