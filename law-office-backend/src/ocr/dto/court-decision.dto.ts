import { BaseDocumentDto } from './base-document.dto';

export class CourtDecisionDto extends BaseDocumentDto {
  court?: string;
  caseNumber?: string;
  decisionNumber?: string;
  decisionDate?: string;
  judge?: string;

  plaintiff?: {
    name?: string;
    lawyer?: string;
  };

  defendant?: {
    name?: string;
    address?: string;
  };

  caseType?: string;
  verdict?: string;
  verdictSummary?: string;
  attendanceStatus?: string;
  appealable?: boolean;

  dowry?: {
    immediate?: string;
    deferred?: string;
    status?: string;
  };

  marriageDate?: string;
  nextSessionDate?: string;
  witnesses?: string[];
}
