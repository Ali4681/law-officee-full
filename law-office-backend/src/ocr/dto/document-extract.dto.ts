export class DocumentExtractDto {
  // Document Metadata
  documentType?: string; // e.g., "Marriage Registration", "Divorce", "Contract - Car Rental", "Contract - Sale"
  documentCategory?: 'court_decision' | 'contract' | 'other';
  court?: string;
  caseNumber?: string;
  decisionNumber?: string;
  decisionDate?: string;

  // Parties Involved (for court documents)
  judge?: string;
  plaintiff?: {
    name?: string;
    fatherName?: string;
    motherName?: string;
    birthDate?: string;
    civilId?: string;
    address?: string;
    lawyer?: string;
  };
  defendant?: {
    name?: string;
    fatherName?: string;
    motherName?: string;
    birthDate?: string;
    civilId?: string;
    address?: string;
    lawyer?: string;
  };

  // Contract Parties
  firstParty?: {
    name?: string;
    fatherName?: string;
    birthDate?: string;
    nationalId?: string;
    address?: string;
    role?: string; // "Lessor", "Seller", "Buyer", etc.
  };
  secondParty?: {
    name?: string;
    fatherName?: string;
    birthDate?: string;
    nationalId?: string;
    address?: string;
    role?: string;
  };

  // Contract Details
  contractSubject?: string;
  contractAmount?: string;
  contractCurrency?: string;
  paymentTerms?: string;
  contractDuration?: string;
  contractDate?: string;
  securityDeposit?: string;

  // Vehicle Details (for car rental contracts)
  vehicleDetails?: {
    plateNumber?: string;
    type?: string;
    route?: string;
    condition?: string;
  };

  // Property Details (for sale contracts)
  propertyDetails?: {
    propertyNumber?: string;
    location?: string;
    area?: string;
    recordNumber?: string;
  };

  // Case Details (for court documents)
  caseType?: string;
  caseDescription?: string;
  claimAmount?: string;

  // Decision & Outcome
  verdict?: string;
  verdictSummary?: string;
  attendanceStatus?: string;

  // Financial Details
  dowry?: {
    immediate?: string;
    deferred?: string;
    status?: string;
  };

  // Important Dates
  marriageDate?: string;
  nextSessionDate?: string;

  // Additional Info
  witnesses?: string[];
  courtFees?: string;
  appealable?: boolean;
  appealDeadline?: string;

  // Terms and Conditions
  contractTerms?: string[];

  // Processing Info
  confidence?: 'high' | 'medium' | 'low';
  extractionQuality?: {
    score: number;
    issues?: string[];
  };
  rawText?: string;
  extractedAt: Date;
}
