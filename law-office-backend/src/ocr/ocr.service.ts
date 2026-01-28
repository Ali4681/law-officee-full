import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import { DocumentExtractDto } from './dto/document-extract.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly tempDir = path.join(os.tmpdir(), 'ocr-processing');

  constructor() {
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create temp directory:', error);
    }
  }

  async processPdfDocument(buffer: Buffer): Promise<DocumentExtractDto> {
    try {
      this.logger.log('Starting PDF processing...');

      let extractedText = '';
      try {
const pdfData = await (pdfParse as any).default(buffer);        extractedText = pdfData.text;
        this.logger.log('Extracted text from PDF text layer');
      } catch (error) {
        this.logger.warn('Could not extract text layer, will use OCR');
      }

      if (!extractedText || extractedText.trim().length < 50) {
        this.logger.log('Using OCR to process scanned document...');
        extractedText = await this.performOcr(buffer);
      }

      const extractedData = this.extractInformation(extractedText);

      return extractedData;
    } catch (error) {
      this.logger.error('Error processing document:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  private async performOcr(buffer: Buffer): Promise<string> {
    const sessionId = uuidv4();
    const imageFiles: string[] = [];

    try {
      this.logger.log('Converting PDF to images using pdfjs-dist...');

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      });
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;

      this.logger.log(`PDF has ${numPages} page(s)`);

      // Convert each page to image
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);

        // Set scale for better quality (2 = 144 DPI, 3 = 216 DPI, etc.)
        const scale = 3;
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        } as any;
        await page.render(renderContext as any).promise;

        // Save canvas as PNG
        const imagePath = path.join(
          this.tempDir,
          `${sessionId}-page${pageNum}.png`,
        );
        const imageBuffer = canvas.toBuffer('image/png');
        await fs.writeFile(imagePath, imageBuffer);
        imageFiles.push(imagePath);

        this.logger.log(`Converted page ${pageNum}/${numPages} to image`);
      }

      // Perform OCR on each page
      const allText: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        this.logger.log(
          `Processing page ${i + 1}/${imageFiles.length} with OCR...`,
        );

        const result = await Tesseract.recognize(imageFiles[i], 'ara+eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              this.logger.debug(
                `Page ${i + 1} OCR Progress: ${Math.round(m.progress * 100)}%`,
              );
            }
          },
        });

        allText.push(result.data.text);
      }

      // Clean up temp files
      await this.cleanupTempFiles(imageFiles);

      return allText.join('\n\n');
    } catch (error) {
      this.logger.error('OCR processing failed:', error);

      // Attempt cleanup on error
      try {
        await this.cleanupTempFiles(imageFiles);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup temp files:', cleanupError);
      }

      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  private async cleanupTempFiles(files: string[]) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        this.logger.warn(`Failed to delete temp file ${file}:`, error);
      }
    }
  }

  /**
   * Convert Arabic-Indic numerals to Western numerals
   */
  private normalizeArabicNumbers(text: string): string {
    const arabicToWestern: { [key: string]: string } = {
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
      // Eastern Arabic numerals (used in some regions)
      '۰': '0',
      '۱': '1',
      '۲': '2',
      '۳': '3',
      '۴': '4',
      '۵': '5',
      '۶': '6',
      '۷': '7',
      '۸': '8',
      '۹': '9',
    };

    return text.replace(
      /[٠-٩۰-۹]/g,
      (match) => arabicToWestern[match] || match,
    );
  }

  /**
   * Extract numbers from text (handles both Arabic and Western numerals)
   */
  private extractNumber(pattern: RegExp, text: string): string | null {
    // Try with normalized text first
    const normalizedText = this.normalizeArabicNumbers(text);
    const match = normalizedText.match(pattern);
    if (match) {
      return match[1].trim();
    }

    // If not found, try with original text
    const originalMatch = text.match(pattern);
    if (originalMatch) {
      return this.normalizeArabicNumbers(originalMatch[1].trim());
    }

    return null;
  }

  private extractInformation(text: string): DocumentExtractDto {
    const result: DocumentExtractDto = {
      extractedAt: new Date(),
      rawText: text,
      extractionQuality: {
        score: 0,
        issues: [],
      },
    };

    // Normalize Arabic numbers in the entire text for easier processing
    const normalizedText = this.normalizeArabicNumbers(text);

    let fieldsExtracted = 0;
    const totalFields = 15; // Approximate number of important fields

    // Extract document type
    if (text.includes('تثبيت زواج')) {
      result.documentType = 'Marriage Registration';
      fieldsExtracted++;
    } else if (text.includes('طلاق')) {
      result.documentType = 'Divorce';
      fieldsExtracted++;
    } else if (text.includes('حضانة')) {
      result.documentType = 'Custody';
      fieldsExtracted++;
    } else if (text.includes('نفقة')) {
      result.documentType = 'Alimony';
      fieldsExtracted++;
    }

    // Extract court name
    const courtPatterns = [
      /المحكمة\s+الشرعية\s+([^\n]+?)(?:بحلب|في|$)/,
      /محكمة\s+([^\n]+?)(?:بحلب|في|$)/,
    ];

    for (const pattern of courtPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.court = match[1].trim();
        fieldsExtracted++;
        break;
      }
    }

    // Extract case number (أساس) - handles Arabic numerals
    const caseNumberPatterns = [
      /اساس\s*[:\s]*(\d+)/i,
      /أساس\s*[:\s]*(\d+)/i,
      /رقم\s*القضية[:\s]+(\d+[\/\-]\d+[\/\-]?\d*)/,
      /القضية\s*رقم[:\s]+(\d+[\/\-]\d+[\/\-]?\d*)/,
    ];

    for (const pattern of caseNumberPatterns) {
      const extracted = this.extractNumber(pattern, text);
      if (extracted) {
        result.caseNumber = extracted;
        fieldsExtracted++;
        break;
      }
    }

    // Extract decision number (قرار) - handles Arabic numerals
    const decisionPattern = /قرار\s*[:\s]*(\d+)/i;
    const decisionExtracted = this.extractNumber(decisionPattern, text);
    if (decisionExtracted) {
      result.decisionNumber = decisionExtracted;
      fieldsExtracted++;
    }

    // Extract year from case number or decision
    const yearPattern = /لعام\s*(\d{4})/i;
    const yearExtracted = this.extractNumber(yearPattern, text);
    if (yearExtracted && result.caseNumber) {
      result.caseNumber += '/' + yearExtracted;
    }
    if (yearExtracted && result.decisionNumber) {
      result.decisionNumber += '/' + yearExtracted;
    }

    // Extract judge name
    const judgePatterns = [
      /القاضي\s+السيد\s*[:\s]+([^\n]+?)(?:\s+ا|$)/,
      /القَاضي\s+السيد\s*[:\s]+([^\n]+?)(?:\s+ا|$)/,
      /القاضي[:\s]+([^\n]+?)(?:\s+ا|$)/,
      /برئاسة[:\s]+([^\n]+)/,
    ];

    for (const pattern of judgePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.judge = match[1]
          .trim()
          .replace(/\s+ا$/, '')
          .replace(/\s+$/, '')
          .replace(/[:\s]+$/, '');
        fieldsExtracted++;
        break;
      }
    }

    // Extract plaintiff information
    const plaintiffPattern = /الجهة\s+المدعية\s*[:\s]+([^\.]+?)(?:\.|يمثلها)/;
    const plaintiffMatch = text.match(plaintiffPattern);
    if (plaintiffMatch) {
      result.plaintiff = {
        name: plaintiffMatch[1].trim(),
      };
      fieldsExtracted++;

      // Extract plaintiff's lawyer
      const lawyerPattern = /يمثلها\s+المحامي\s*[:\s]+([^\n\.]+)/;
      const lawyerMatch = text.match(lawyerPattern);
      if (lawyerMatch) {
        result.plaintiff.lawyer = lawyerMatch[1].trim();
      }
    }

    // Extract defendant information
    const defendantPattern =
      /الجهة\s+المدعى\s+عليها?\s*[:\s]+([^\.]+?)(?:\.|حلب)/;
    const defendantMatch = text.match(defendantPattern);
    if (defendantMatch) {
      result.defendant = {
        name: defendantMatch[1].trim(),
      };
      fieldsExtracted++;

      // Extract defendant's address
      const addressPattern = /حلب\s*-\s*([^\n]+)/;
      const addressMatch = text.match(addressPattern);
      if (addressMatch) {
        result.defendant.address = addressMatch[1].trim();
      }
    }

    // Extract case type
    const caseTypePattern = /الدعوى\s*[:\s]+([^\n]+)/;
    const caseTypeMatch = text.match(caseTypePattern);
    if (caseTypeMatch) {
      result.caseType = caseTypeMatch[1].trim();
      fieldsExtracted++;
    }

    // Extract dowry information (for marriage cases) - handles Arabic numerals
    const dowryPatterns = [
      /مهر\s+معجله\s+([^\n]+?)\s+ليرة\s+سورية\s+([^\n]+?)\s+ومؤجله\s+([^\n]+?)\s+ليرة\s+سورية/i,
      /معجله\s+([^\n]+?)\s+ليرة\s+سورية/i,
    ];

    for (const pattern of dowryPatterns) {
      const dowryMatch = text.match(pattern);
      if (dowryMatch) {
        const immediate = this.normalizeArabicNumbers(dowryMatch[1].trim());
        result.dowry = {
          immediate: immediate + ' ليرة سورية',
          status: text.includes('غير مقبوضة') ? 'unpaid' : 'paid',
        };

        if (dowryMatch[3]) {
          const deferred = this.normalizeArabicNumbers(dowryMatch[3].trim());
          result.dowry.deferred = deferred + ' ليرة سورية';
        }

        fieldsExtracted++;
        break;
      }
    }

    // Extract marriage date - handles Arabic numerals
    const marriageDatePatterns = [
      /بتاريخ\s*[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /في\s+تاريخ\s*[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    ];

    for (const pattern of marriageDatePatterns) {
      const extracted = this.extractNumber(pattern, text);
      if (extracted) {
        result.marriageDate = extracted;
        fieldsExtracted++;
        break;
      }
    }

    // Extract verdict/decision
    const verdictPatterns = [
      /الحكم[:\s]+([^\n]+)/,
      /قررت\s+المحكمة[:\s]+([^\n]+)/,
      /حكمت\s+المحكمة[:\s]+([^\n]+)/,
    ];

    for (const pattern of verdictPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.verdict = match[1].trim();
        fieldsExtracted++;
        break;
      }
    }

    // Extract attendance status
    if (text.includes('وجاهي')) {
      result.attendanceStatus = 'حضوري (Attended)';
      fieldsExtracted++;
    } else if (text.includes('بمثابة الوجاهي') || text.includes('غياب')) {
      result.attendanceStatus = 'غيابي (In Absentia)';
      fieldsExtracted++;
    }

    // Extract appealability
    if (text.includes('قابل للطعن')) {
      result.appealable = true;
      fieldsExtracted++;
    } else if (text.includes('غير قابل للطعن')) {
      result.appealable = false;
      fieldsExtracted++;
    }

    // Extract decision date - handles Arabic numerals
    const decisionDatePattern =
      /بتاريخ[^\n]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})[^\n]*?ميلادي/;
    const decisionDateExtracted = this.extractNumber(decisionDatePattern, text);
    if (decisionDateExtracted) {
      result.decisionDate = decisionDateExtracted;
      fieldsExtracted++;
    }

    // Extract next session date - handles Arabic numerals
    const nextSessionPatterns = [
      /الجلسة\s+القادمة[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /موعد\s+الجلسة[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /تأجل\s+(?:إلى|الى)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
    ];

    for (const pattern of nextSessionPatterns) {
      const extracted = this.extractNumber(pattern, text);
      if (extracted) {
        result.nextSessionDate = extracted;
        fieldsExtracted++;
        break;
      }
    }

    // Extract witnesses
    const witnessPattern = /الشهود[^\(]*\(\s*([^)]+)\s*\)/;
    const witnessMatch = text.match(witnessPattern);
    if (witnessMatch) {
      result.witnesses = witnessMatch[1]
        .split(/[،؛,;]/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0);
      fieldsExtracted++;
    }

    // Generate verdict summary based on document type
    if (result.documentType === 'Marriage Registration') {
      if (text.includes('تثبيت زواج')) {
        result.verdictSummary =
          'Marriage registration approved and ordered to be recorded in civil registry';
      }
    }

    // Calculate extraction quality score
    result.extractionQuality!.score = Math.round(
      (fieldsExtracted / totalFields) * 100,
    );

    // Determine confidence level
    if (result.extractionQuality!.score >= 70) {
      result.confidence = 'high';
    } else if (result.extractionQuality!.score >= 40) {
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

    // Add specific issues
    if (!result.caseNumber) {
      result.extractionQuality!.issues?.push('Case number not found');
    }
    if (!result.judge) {
      result.extractionQuality!.issues?.push('Judge name not found');
    }
    if (!result.plaintiff) {
      result.extractionQuality!.issues?.push('Plaintiff information not found');
    }

    return result;
  }

  validateExtractedData(data: DocumentExtractDto): boolean {
    if (!data.rawText || data.rawText.trim().length < 10) {
      return false;
    }

    // Consider valid if we have at least medium confidence or key fields
    return !!(
      data.confidence === 'high' ||
      data.confidence === 'medium' ||
      data.caseNumber ||
      data.court ||
      data.documentType
    );
  }
}
