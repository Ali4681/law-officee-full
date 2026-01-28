export interface PropertyDetails {
  type?: string; // Property type: Residential, Commercial, Land, etc.
  identifier?: string; // Property identifier (e.g., "رقم خمسه")
  plotNumber?: string; // Plot/Record number (e.g., "221")
  location?: string; // Location description
  area?: string; // Area with unit (e.g., "150 متر مربع")
  registryZone?: string; // Registry zone (e.g., "انصار")
}

export interface VehicleDetails {
  plateNumber?: string; // Vehicle plate number
  type?: string; // Vehicle type/make/model
  route?: string; // Route/Line (for rentals)
  additionalId?: string; // Additional identifier (for rentals)
  color?: string; // Vehicle color (for sales)
  registrationLocation?: string; // Registration location (for sales)
}

export class ContractDto {
  documentCategory: 'contract' | 'court_decision' | 'other';
  extractedAt: Date;
  rawText: string;
  extractionQuality?: {
    score: number;
    issues?: string[];
  };

  // Document identification
  documentType?: string;
  confidence?: 'high' | 'medium' | 'low';

  // Parties
  firstParty?: {
    name?: string;
    role?: string;
    nationalId?: string;
  };
  secondParty?: {
    name?: string;
    role?: string;
    nationalId?: string;
    birthDate?: string;
  };

  // Financial details
  contractAmount?: string; // Total contract amount
  contractCurrency?: string; // Currency (USD, SYP, etc.)
  securityDeposit?: string; // Security deposit or earnest money (عربون/تأمين)
  downPayment?: string; // Initial/down payment (for installment contracts) - ADDED

  // Temporal details
  contractDate?: string;
  contractDuration?: string;

  // Asset details
  vehicleDetails?: VehicleDetails; // For vehicle rental/sale contracts
  propertyDetails?: PropertyDetails; // For property sale contracts

  // Contract content
  contractTerms?: string[];
}
