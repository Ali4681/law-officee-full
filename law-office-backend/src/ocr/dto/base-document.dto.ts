export interface ExtractionQuality {
  score: number;
  issues?: string[];
}

export class BaseDocumentDto {
  documentType?: string;
  documentCategory?: 'court_decision' | 'contract' | 'other';
  confidence?: 'high' | 'medium' | 'low';
  extractionQuality?: ExtractionQuality;
  rawText?: string;
  extractedAt: Date;
}
