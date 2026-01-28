import { forwardRef, Module } from '@nestjs/common';
import { OcrController } from './ocr.controller';
import { OcrBaseService } from './services/ocr-base.service';
import { CourtExtractorService } from './services/court-extractor.service';
import { ContractExtractorService } from './services/contract-extractor.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    forwardRef(() => NotificationsModule), // Add this
    DocumentsModule,
  ],
  controllers: [OcrController],
  providers: [OcrBaseService, CourtExtractorService, ContractExtractorService],
  exports: [OcrBaseService, CourtExtractorService, ContractExtractorService],
})
export class OcrModule {}
