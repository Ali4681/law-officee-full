import { Injectable, Logger } from '@nestjs/common';
import { OcrBaseService } from './ocr-base.service';
import { CourtDecisionDto } from '../dto/court-decision.dto';

@Injectable()
export class CourtExtractorService extends OcrBaseService {
  protected readonly logger = new Logger(CourtExtractorService.name);

  /**
   * Extract court decision with enhanced logging and quality assessment
   * Returns extraction result that can be used for notifications
   */
  async extractCourtDecision(text: string): Promise<CourtDecisionDto> {
    this.logger.log('🔍 Starting court decision extraction...');

    const result: CourtDecisionDto = {
      documentCategory: 'court_decision',
      extractedAt: new Date(),
      rawText: text,
      extractionQuality: {
        score: 0,
        issues: [],
      },
    };

    // Clean and normalize text for better extraction
    const cleanedText = this.cleanOcrText(text);
    const normalizedText = this.normalizeArabicNumbers(cleanedText);

    let fieldsExtracted = 0;
    const totalFields = 15;

    // Extract document type with more patterns
    result.documentType = this.extractDocumentType(text);
    if (result.documentType) {
      fieldsExtracted++;
      this.logger.debug(`✓ Document type: ${result.documentType}`);
    }

    // Extract court name with improved pattern
    result.court = this.extractCourtName(text);
    if (result.court) {
      fieldsExtracted++;
      this.logger.debug(`✓ Court: ${result.court}`);
    }

    // Extract case number (أساس) with better handling
    result.caseNumber = this.extractCaseNumber(normalizedText);
    if (result.caseNumber) {
      fieldsExtracted++;
      this.logger.debug(`✓ Case number: ${result.caseNumber}`);
    }

    // Extract decision number (قرار)
    result.decisionNumber = this.extractDecisionNumber(normalizedText);
    if (result.decisionNumber) {
      fieldsExtracted++;
      this.logger.debug(`✓ Decision number: ${result.decisionNumber}`);
    }

    // Extract judge name with improved patterns
    result.judge = this.extractJudgeName(text);
    if (result.judge) {
      fieldsExtracted++;
      this.logger.debug(`✓ Judge: ${result.judge}`);
    }

    // Extract plaintiff information
    const plaintiffInfo = this.extractPlaintiffInfo(text);
    if (plaintiffInfo) {
      result.plaintiff = plaintiffInfo;
      fieldsExtracted++;
      this.logger.debug(`✓ Plaintiff: ${plaintiffInfo.name}`);
    }

    // Extract defendant information
    const defendantInfo = this.extractDefendantInfo(text);
    if (defendantInfo) {
      result.defendant = defendantInfo;
      fieldsExtracted++;
      this.logger.debug(`✓ Defendant: ${defendantInfo.name}`);
    }

    // Extract case type
    result.caseType = this.extractCaseType(text);
    if (result.caseType) {
      fieldsExtracted++;
      this.logger.debug(`✓ Case type: ${result.caseType}`);
    }

    // Extract dowry information
    const dowryInfo = this.extractDowryInfo(normalizedText);
    if (dowryInfo) {
      result.dowry = dowryInfo;
      fieldsExtracted++;
      this.logger.debug(`✓ Dowry extracted`);
    }

    // Extract marriage date
    result.marriageDate = this.extractMarriageDate(normalizedText);
    if (result.marriageDate) {
      fieldsExtracted++;
      this.logger.debug(`✓ Marriage date: ${result.marriageDate}`);
    }

    // Extract verdict/decision with context
    result.verdict = this.extractVerdict(text);
    if (result.verdict) {
      fieldsExtracted++;
      this.logger.debug(`✓ Verdict extracted`);
    }

    // Extract attendance status
    result.attendanceStatus = this.extractAttendanceStatus(text);
    if (result.attendanceStatus) {
      fieldsExtracted++;
      this.logger.debug(`✓ Attendance: ${result.attendanceStatus}`);
    }

    // Extract appealability
    const appealInfo = this.extractAppealability(text);
    if (appealInfo !== null) {
      result.appealable = appealInfo;
      fieldsExtracted++;
      this.logger.debug(`✓ Appealable: ${appealInfo}`);
    }

    // Extract decision date with better date parsing
    result.decisionDate = this.extractDecisionDate(normalizedText);
    if (result.decisionDate) {
      fieldsExtracted++;
      this.logger.debug(`✓ Decision date: ${result.decisionDate}`);
    }

    // Extract next session date
    result.nextSessionDate = this.extractNextSessionDate(normalizedText);
    if (result.nextSessionDate) {
      fieldsExtracted++;
      this.logger.debug(`✓ Next session: ${result.nextSessionDate}`);
    }

    // Extract witnesses
    const witnesses = this.extractWitnesses(text);
    if (witnesses && witnesses.length > 0) {
      result.witnesses = witnesses;
      fieldsExtracted++;
      this.logger.debug(`✓ Witnesses: ${witnesses.length}`);
    }

    // Generate verdict summary
    result.verdictSummary = this.generateVerdictSummary(result, text);

    // Calculate extraction quality score
    result.extractionQuality!.score = Math.round(
      (fieldsExtracted / totalFields) * 100,
    );

    // Determine confidence level and issues
    this.assessExtractionQuality(result, fieldsExtracted);

    // Log final extraction summary
    this.logger.log(
      `✅ Extraction complete: ${result.extractionQuality!.score}% (${fieldsExtracted}/${totalFields} fields)`,
    );
    this.logger.log(`📊 Confidence: ${result.confidence}`);

    if (
      result.extractionQuality!.issues &&
      result.extractionQuality!.issues.length > 0
    ) {
      this.logger.warn(
        `⚠️ Issues found: ${result.extractionQuality!.issues.join(', ')}`,
      );
    }

    return result;
  }

  /**
   * 🆕 Get extraction summary for notifications
   */
  getExtractionSummary(result: CourtDecisionDto): string {
    const parts: string[] = [];

    if (result.caseNumber) {
      parts.push(`Case ${result.caseNumber}`);
    }

    if (result.decisionNumber) {
      parts.push(`Decision ${result.decisionNumber}`);
    }

    if (result.documentType) {
      parts.push(`Type: ${result.documentType}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Court decision extracted';
  }

  /**
   * 🆕 Check if extraction needs manual review
   */
  needsManualReview(result: CourtDecisionDto): boolean {
    // Low quality score
    if (result.extractionQuality!.score < 60) {
      return true;
    }

    // Missing critical fields
    const criticalFieldsMissing =
      !result.caseNumber ||
      !result.decisionNumber ||
      !result.decisionDate ||
      !result.judge;

    if (criticalFieldsMissing) {
      return true;
    }

    // OCR errors detected
    if (result.marriageDate?.includes('[OCR_ERROR:')) {
      return true;
    }

    return false;
  }

  private cleanOcrText(text: string): string {
    // Remove common OCR artifacts
    return text
      .replace(/\u0640+/g, '') // Remove tatweel (ـ)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[#@]/g, '') // Remove special chars that are OCR errors
      .trim();
  }

  private extractDocumentType(text: string): string | undefined {
    const types = [
      { pattern: /تثبيت\s+زواج/i, type: 'Marriage Registration' },
      { pattern: /طلاق/i, type: 'Divorce' },
      { pattern: /حضانة/i, type: 'Custody' },
      { pattern: /نفقة/i, type: 'Alimony' },
      { pattern: /رؤية/i, type: 'Visitation Rights' },
      { pattern: /نسب/i, type: 'Paternity' },
      { pattern: /ميراث/i, type: 'Inheritance' },
      { pattern: /وصية/i, type: 'Will' },
    ];

    for (const { pattern, type } of types) {
      if (pattern.test(text)) {
        return type;
      }
    }
    return undefined;
  }

  private extractCourtName(text: string): string | undefined {
    const patterns = [
      /المحكمة\s+الشرعية\s+([^\n]+?)(?:بحلب|في|القاضي|\s{2,})/i,
      /محكمة\s+([^\n]+?الشرعية[^\n]*?)(?:بحلب|في|القاضي|\s{2,})/i,
      /المحكمة\s+([^\n]+?)(?:بحلب|في|القاضي|\s{2,})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim().replace(/[:\s]+$/, '');
      }
    }
    return undefined;
  }

  private extractCaseNumber(text: string): string | undefined {
    // Normalize text first
    const normalized = this.normalizeArabicNumbers(text);

    // Priority 1: Standard patterns with Arabic-Indic numerals
    const patterns = [
      // اساس : 123 لعام 2024 or اساس : 123/2024
      /اساس\s*[:\s]*(\d+)\s*(?:لعام|\/)\s*(\d+)/i,
      /أساس\s*[:\s]*(\d+)\s*(?:لعام|\/)\s*(\d+)/i,

      // اساس رقم 123/2024
      /اساس\s*رقم\s*[:\s]*(\d+)\s*[\/\-]\s*(\d+)/i,
      /أساس\s*رقم\s*[:\s]*(\d+)\s*[\/\-]\s*(\d+)/i,

      // رقم الأساس: 123/2024
      /رقم\s*الأساس\s*[:\s]*(\d+)\s*[\/\-]\s*(\d+)/i,

      // More flexible: look for "اساس" followed by numbers
      /اساس[^\d]*?(\d+)[^\d]*?(?:لعام|\/)[^\d]*?(\d+)/i,
      /أساس[^\d]*?(\d+)[^\d]*?(?:لعام|\/)[^\d]*?(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1] && match[2]) {
        const caseNum = match[1].trim();
        const year = match[2].trim();

        // Validate: case number should be reasonable (1-9999)
        const caseNumInt = parseInt(caseNum);
        const yearInt = parseInt(year);

        if (
          caseNumInt > 0 &&
          caseNumInt < 10000 &&
          yearInt > 2000 &&
          yearInt < 2100
        ) {
          this.logger.debug(`✓ Case number found: ${caseNum}/${year}`);
          return `${caseNum}/${year}`;
        }
      }
    }

    // Priority 2: Try to find just numbers after "اساس"
    const flexiblePattern = /اساس[^\d]{0,20}(\d{1,4})[^\d]{0,10}(\d{4})/i;
    const flexMatch = normalized.match(flexiblePattern);
    if (flexMatch && flexMatch[1] && flexMatch[2]) {
      const caseNum = flexMatch[1];
      const year = flexMatch[2];
      const yearInt = parseInt(year);

      if (yearInt > 2000 && yearInt < 2100) {
        this.logger.debug(`✓ Case number found (flexible): ${caseNum}/${year}`);
        return `${caseNum}/${year}`;
      }
    }

    this.logger.warn(
      `⚠️ Case number not found. Text sample: ${text.substring(0, 200)}`,
    );
    return undefined;
  }

  private extractDecisionNumber(text: string): string | undefined {
    // Normalize text first
    const normalized = this.normalizeArabicNumbers(text);

    // Priority 1: Standard patterns
    const patterns = [
      // قرار : 456 لعام ( 2024 ) or قرار : 456/2024
      /قرار\s*[:\s]*(\d+)\s*\#?\s*لعام\s*[()]*\s*(\d+)\s*[()]*/i,

      // قرار رقم : 456 لعام 2024
      /قرار\s*رقم\s*[:\s]*(\d+)\s*(?:لعام|\/)\s*(\d+)/i,

      // قرار : 456/2024
      /قرار\s*[:\s]*(\d+)\s*[\/\-]\s*(\d+)/i,

      // رقم القرار: 456/2024
      /رقم\s*القرار\s*[:\s]*(\d+)\s*[\/\-]\s*(\d+)/i,

      // More flexible: قرار followed by numbers
      /قرار[^\d]*?(\d+)[^\d]*?(?:لعام|\/)[^\d]*?(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1] && match[2]) {
        const decisionNum = match[1].trim();
        const year = match[2].trim();

        // Validate: decision number should be reasonable
        const decisionNumInt = parseInt(decisionNum);
        const yearInt = parseInt(year);

        if (
          decisionNumInt > 0 &&
          decisionNumInt < 10000 &&
          yearInt > 2000 &&
          yearInt < 2100
        ) {
          this.logger.debug(`✓ Decision number found: ${decisionNum}/${year}`);
          return `${decisionNum}/${year}`;
        }
      }
    }

    // Priority 2: Try to find just numbers after "قرار"
    const flexiblePattern = /قرار[^\d]{0,20}(\d{1,4})[^\d]{0,10}(\d{4})/i;
    const flexMatch = normalized.match(flexiblePattern);
    if (flexMatch && flexMatch[1] && flexMatch[2]) {
      const decisionNum = flexMatch[1];
      const year = flexMatch[2];
      const yearInt = parseInt(year);

      if (yearInt > 2000 && yearInt < 2100) {
        this.logger.debug(
          `✓ Decision number found (flexible): ${decisionNum}/${year}`,
        );
        return `${decisionNum}/${year}`;
      }
    }

    this.logger.warn(
      `⚠️ Decision number not found. Text sample: ${text.substring(0, 200)}`,
    );
    return undefined;
  }

  /**
   * Enhanced Arabic number normalization
   * Converts both Arabic-Indic (٠-٩) and Eastern Arabic (۰-۹) to Western (0-9)
   */
  protected normalizeArabicNumbers(text: string): string {
    const arabicIndicMap: { [key: string]: string } = {
      '٠': '0',
      '۰': '0',
      '١': '1',
      '۱': '1',
      '٢': '2',
      '۲': '2',
      '٣': '3',
      '۳': '3',
      '٤': '4',
      '۴': '4',
      '٥': '5',
      '۵': '5',
      '٦': '6',
      '۶': '6',
      '٧': '7',
      '۷': '7',
      '٨': '8',
      '۸': '8',
      '٩': '9',
      '۹': '9',
    };

    return text.replace(/[٠-٩۰-۹]/g, (match) => arabicIndicMap[match] || match);
  }

  /**
   * 🆕 Extract all numbers from text for debugging
   */
  private extractAllNumbers(text: string): {
    arabicIndic: string[];
    western: string[];
    afterAsas: string[];
    afterQarar: string[];
  } {
    return {
      arabicIndic: text.match(/[٠-٩۰-۹]+/g) || [],
      western: text.match(/\d+/g) || [],
      afterAsas: text.match(/اساس[^\d]*?(\d+)/gi) || [],
      afterQarar: text.match(/قرار[^\d]*?(\d+)/gi) || [],
    };
  }
  private extractJudgeName(text: string): string | undefined {
    const patterns = [
      /القاضي\s+السيد\s*[:\s]*([^\n]+?)(?:\s+ا|\s*المساعد|$)/i,
      /القَاضي\s+السيد\s*[:\s]*([^\n]+?)(?:\s+ا|\s*المساعد|$)/i,
      /القاضي\s*[:\s]*([^\n]+?)(?:\s+ا|\s*المساعد|$)/i,
      /برئاسة\s*[:\s]*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1]
          .trim()
          .replace(/\s+ا$/, '')
          .replace(/[:\s]+$/, '');
      }
    }
    return undefined;
  }

  private extractPlaintiffInfo(text: string):
    | {
        name?: string;
        lawyer?: string;
      }
    | undefined {
    const namePattern = /الجهة\s+المدعية\s*[:\s]*([^.]+?)(?:\.|يمثلها)/i;
    const nameMatch = text.match(namePattern);

    if (!nameMatch) return undefined;

    const plaintiff: {
      name?: string;
      lawyer?: string;
    } = {
      name: nameMatch[1].trim(),
    };

    const lawyerPattern = /يمثلها\s+المحامي\s*[:\s]*([^\n.]+)/i;
    const lawyerMatch = text.match(lawyerPattern);
    if (lawyerMatch) {
      plaintiff.lawyer = lawyerMatch[1].trim().replace(/\s*\.$/, '');
    }

    return plaintiff;
  }

  private extractDefendantInfo(text: string):
    | {
        name?: string;
        address?: string;
      }
    | undefined {
    const namePattern =
      /الجهة\s+المدعى\s+عليها?\s*[:\s]*([^.\n]+?)(?:\s*\.\s*\.|حلب\s*[-\s])/i;
    const nameMatch = text.match(namePattern);

    if (!nameMatch) return undefined;

    const defendant: {
      name?: string;
      address?: string;
    } = {
      name: nameMatch[1].trim(),
    };

    const fullDefendantSection = text.match(
      /الجهة\s+المدعى\s+عليها?\s*[:\s]*[^.]+?\.\s*\.\s*(حلب[^\n]+?)(?:\.|\n)/i,
    );

    if (fullDefendantSection) {
      defendant.address = fullDefendantSection[1].trim();
    } else {
      const addressPattern =
        /الجهة\s+المدعى\s+عليها?[^\n]*?\.\s*\.\s*(حلب[^\n]+?)(?:\.|الدعوى)/i;
      const addressMatch = text.match(addressPattern);
      if (addressMatch) {
        defendant.address = addressMatch[1].trim();
      }
    }

    return defendant;
  }

  private extractCaseType(text: string): string | undefined {
    const pattern = /الدعوى\s*[:\s]*([^\n:]+)/i;
    const match = text.match(pattern);
    return match ? match[1].trim().replace(/\s*:$/, '') : undefined;
  }

  private extractDowryInfo(text: string):
    | {
        immediate?: string;
        deferred?: string;
        status?: string;
      }
    | undefined {
    const verdictSectionPattern =
      /1-\s*تثبيت\s+زواج[^]*?مهر\s+معجله\s+([^\n]+?)\s*ليرة\s+سورية\s+(غير\s+مقبوضة)?\s*ومؤجله\s+([^\n]+?)\s*ليرة\s+سورية\s+باقية/i;
    const verdictMatch = text.match(verdictSectionPattern);

    if (verdictMatch) {
      return {
        immediate: verdictMatch[1].trim() + ' ليرة سورية',
        deferred: verdictMatch[3].trim() + ' ليرة سورية',
        status: verdictMatch[2] ? 'unpaid' : 'paid',
      };
    }

    const fullPattern =
      /مهر\s+معجله?\s+([^ل]+?)\s*ليرة\s+سورية\s+(غير\s+مقبوضة|مقبوضة)?\s*ومؤجله?\s+([^ل]+?)\s*ليرة\s+سورية/i;
    const fullMatch = text.match(fullPattern);

    if (fullMatch) {
      const dowry: {
        immediate?: string;
        deferred?: string;
        status?: string;
      } = {
        immediate: fullMatch[1].trim() + ' ليرة سورية',
        deferred: fullMatch[3].trim() + ' ليرة سورية',
        status: 'unpaid',
      };

      if (fullMatch[2]) {
        if (/غير\s+مقبوضة/i.test(fullMatch[2])) {
          dowry.status = 'unpaid';
        } else if (/مقبوضة/i.test(fullMatch[2])) {
          dowry.status = 'paid';
        }
      } else if (/غير\s+مقبوضة/i.test(text)) {
        dowry.status = 'unpaid';
      }

      return dowry;
    }

    const flexiblePattern =
      /مهر\s+معجله?\s+([^ل]+?)\s*(?:ليرة\s+سورية|[a-z]{2,6}\s+[a-z]{2})\s+(غير\s+مقبوضة|مقبوضة)?\s*ومؤجله?\s+([^\s]+(?:\s+[^\s]+){0,2})\s*(?:ليرة\s+سورية|[a-z]{2,6}\s+[a-z]{2})\s*باقية/i;
    const flexMatch = text.match(flexiblePattern);

    if (flexMatch) {
      return {
        immediate: flexMatch[1].trim() + ' ليرة سورية',
        deferred: flexMatch[3].trim() + ' ليرة سورية',
        status:
          flexMatch[2] && /غير\s+مقبوضة/i.test(flexMatch[2])
            ? 'unpaid'
            : 'paid',
      };
    }

    const simplePattern = /مهر\s+معجله?\s+([^\n]+?)\s*ليرة\s+سورية/i;
    const simpleMatch = text.match(simplePattern);
    if (simpleMatch) {
      return {
        immediate: simpleMatch[1].trim() + ' ليرة سورية',
        status: text.includes('غير مقبوضة') ? 'unpaid' : 'paid',
      };
    }

    return undefined;
  }

  private extractMarriageDate(text: string): string | undefined {
    const arabicIndicPatterns = [
      /حاصلا\s+في\s+[^\n]*?بتاريخ\s+([\d٠-٩]{1,4}\/[\d٠-٩]{1,2}\/[\d٠-٩]{1,4})/i,
      /زواجهما\s+حاصلا[^\n]*?بتاريخ\s+([\d٠-٩]{1,4}\/[\d٠-٩]{1,2}\/[\d٠-٩]{1,4})/i,
      /وذلك\s+بتاريخ\s+([\d٠-٩]{1,4}\/[\d٠-٩]{1,2}\/[\d٠-٩]{1,4})/i,
      /بتاريخ\s+([\d٠-٩]{1,4}\/[\d٠-٩]{1,2}\/[\d٠-٩]{1,4})م?\s+في\s+محافظة/i,
    ];

    for (const pattern of arabicIndicPatterns) {
      const match = text.match(pattern);
      if (match) {
        const normalizedDate = this.convertArabicIndicToWestern(match[1]);
        return this.normalizeDateFormat(normalizedDate);
      }
    }

    const westernPatterns = [
      /حاصلا\s+في\s+[^\n]*?بتاريخ\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /زواجهما\s+حاصلا[^\n]*?بتاريخ\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /وذلك\s+بتاريخ\s+(\d{1,2}\/\d{1,2}\/\d{2,4})م/i,
      /بتاريخ\s+(\d{1,2}\/\d{1,2}\/\d{2,4})م\s+في\s+محافظة/i,
    ];

    for (const pattern of westernPatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.normalizeDateFormat(match[1]);
      }
    }

    const corruptedPattern =
      /حاصلا\s+في\s+[^\n]*?بتاريخ\s+([^\s]+(?:\s+[^\s]+){0,3})\s+وتسجيله/i;
    const corruptedMatch = text.match(corruptedPattern);
    if (corruptedMatch) {
      const corruptedDate = corruptedMatch[1].trim();
      if (/[\d٠-٩a-zA-Z]+/.test(corruptedDate)) {
        return `[OCR_ERROR: ${corruptedDate}]`;
      }
    }

    return undefined;
  }

  private extractVerdict(text: string): string | undefined {
    const patterns = [
      /ثالثا\s*:\s*في\s+المناقشة[^]*?(?=رابعا|$)/i,
      /قررت\s+المحكمة\s*[:\s]*([^\n]+)/i,
      /حكمت\s+المحكمة\s*[:\s]*([^\n]+)/i,
      /الحكم\s*[:\s]*([^\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const verdictText = match[0] || match[1];
        return verdictText.trim().substring(0, 200);
      }
    }
    return undefined;
  }

  private extractAttendanceStatus(text: string): string | undefined {
    if (/وجاهي(?:ا)?\s+بحق\s+الجهة\s+المدعية/i.test(text)) {
      if (/بمثابة\s+الوجاهي\s+بحق\s+الجهة\s+المدعى\s+عليها/i.test(text)) {
        return 'وجاهي للمدعية وبمثابة الوجاهي للمدعى عليه';
      }
      return 'حضوري (Attended)';
    }

    if (/بمثابة\s+الوجاهي|كالوجاهي/i.test(text)) {
      return 'غيابي (In Absentia)';
    }

    if (/وجاهي/i.test(text)) {
      return 'حضوري (Attended)';
    }

    if (/غياب/i.test(text)) {
      return 'غيابي (In Absentia)';
    }

    return undefined;
  }

  private extractAppealability(text: string): boolean | null {
    if (/قابل\s+للطعن/i.test(text)) {
      return true;
    }
    if (/غير\s+قابل\s+للطعن/i.test(text)) {
      return false;
    }
    return null;
  }

  private extractDecisionDate(text: string): string | undefined {
    const patterns = [
      /(?:أفهم|صدر)\s+علنا[^\n]*?([\d٠-٩]{1,2}\/[\d٠-٩]{1,2}\/[\d٠-٩]{2,4})[^\n]*?ميلادي/i,
      /بتاريخ[^\n]*?([\d٠-٩]{1,2}\/[\d٠-٩]{1,2}\/[\d٠-٩]{2,4})[^\n]*?ميلادي/i,
      /هجري\s+([\d٠-٩]{1,2}\/[\d٠-٩]{1,2}\/[\d٠-٩]{2,4})[^\n]*?ميلادي/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const normalizedDate = this.convertArabicIndicToWestern(match[1]);
        return this.normalizeDateFormat(normalizedDate);
      }
    }
    return undefined;
  }

  private extractNextSessionDate(text: string): string | undefined {
    const patterns = [
      /الجلسة\s+القادمة[:\s]+([\d٠-٩]{1,2}[\/\-][\d٠-٩]{1,2}[\/\-][\d٠-٩]{2,4})/i,
      /موعد\s+الجلسة[:\s]+([\d٠-٩]{1,2}[\/\-][\d٠-٩]{1,2}[\/\-][\d٠-٩]{2,4})/i,
      /تأجل\s+(?:إلى|الى)[:\s]+([\d٠-٩]{1,2}[\/\-][\d٠-٩]{1,2}[\/\-][\d٠-٩]{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const normalizedDate = this.convertArabicIndicToWestern(match[1]);
        return this.normalizeDateFormat(normalizedDate);
      }
    }
    return undefined;
  }

  private extractWitnesses(text: string): string[] | undefined {
    const patterns = [
      /الشهود[^\(]*\(\s*([^)]+)\s*\)/i,
      /شهود\s+المدعية\s+وهم\s*\(\s*([^)]+)\s*\)/i,
      /الشهود\s*[:\s]*([^\.]+?)(?:\.|GIA)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const witnesses = match[1]
          .split(/[،؛,;]/)
          .map((w) => w.trim())
          .filter((w) => w.length > 2);
        return witnesses.length > 0 ? witnesses : undefined;
      }
    }
    return undefined;
  }

  private generateVerdictSummary(
    result: CourtDecisionDto,
    text: string,
  ): string | undefined {
    if (result.documentType === 'Marriage Registration') {
      if (/تثبيت\s+زواج/i.test(text)) {
        return 'Marriage registration approved and ordered to be recorded in civil registry';
      }
    }

    if (result.documentType === 'Divorce') {
      if (/إيقاع\s+الطلاق/i.test(text)) {
        return 'Divorce decree issued';
      }
    }

    if (result.documentType === 'Custody') {
      if (/حضانة/i.test(text)) {
        return 'Custody decision issued';
      }
    }

    return undefined;
  }

  private convertArabicIndicToWestern(text: string): string {
    const arabicIndicMap: { [key: string]: string } = {
      '٠': '0',
      '١': '1',
      '٢': '2',
      '٣': '3',
      '٤': '4',
      '٥': '5',
      '٦': '6',
      '٧': '7',
      '٨': '8',
      '٩': '9',
    };

    return text.replace(/[٠-٩]/g, (match) => arabicIndicMap[match] || match);
  }

  private normalizeDateFormat(date: string): string {
    return date.replace(/[\/\-]/g, '/').trim();
  }

  private assessExtractionQuality(
    result: CourtDecisionDto,
    fieldsExtracted: number,
  ): void {
    const score = result.extractionQuality!.score;

    if (score >= 75) {
      result.confidence = 'high';
    } else if (score >= 50) {
      result.confidence = 'medium';
      result.extractionQuality!.issues?.push(
        'Some fields could not be extracted',
      );
    } else {
      result.confidence = 'low';
      result.extractionQuality!.issues?.push(
        'Many fields could not be extracted',
      );
      result.extractionQuality!.issues?.push('OCR quality may be poor');
    }

    const criticalFields = [
      { field: result.caseNumber, name: 'Case number' },
      { field: result.decisionNumber, name: 'Decision number' },
      { field: result.judge, name: 'Judge name' },
      { field: result.plaintiff, name: 'Plaintiff information' },
      { field: result.defendant, name: 'Defendant information' },
      { field: result.decisionDate, name: 'Decision date' },
    ];

    for (const { field, name } of criticalFields) {
      if (!field) {
        result.extractionQuality!.issues?.push(`${name} not found`);
      }
    }

    // Check for OCR corruption indicators
    if (result.marriageDate?.includes('[OCR_ERROR:')) {
      result.extractionQuality!.issues?.push(
        'Marriage date appears corrupted by OCR - manual verification required',
      );
      result.confidence = 'medium';
    }

    // Check for OCR quality issues
    if (result.rawText && result.rawText.includes('CamScanner')) {
      result.extractionQuality!.issues?.push(
        'Document appears to be a scan - OCR quality may vary',
      );
    }
  }
}
