import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as pdf from 'pdf-parse';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import { createCanvas } from 'canvas';

@Injectable()
export class OcrBaseService {
  protected readonly logger = new Logger(OcrBaseService.name);
  protected readonly tempDir = path.join(os.tmpdir(), 'ocr-processing');

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

  /**
   * HYBRID EXTRACTION: Combines PDF text layer + OCR for best results
   */
  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      this.logger.log('Starting hybrid PDF processing...');

      let textLayerContent = '';
      let ocrContent = '';

      // Step 1: Extract from PDF text layer (has vehicle data)
      try {
        const pdfData = await pdf(buffer);
        textLayerContent = pdfData.text || '';
        this.logger.log(`📄 Text layer: ${textLayerContent.length} characters`);
      } catch (error) {
        this.logger.warn('Could not extract text layer:', error.message);
      }

      // Step 2: Always perform OCR for better structure
      this.logger.log('🔍 Performing OCR for document structure...');
      ocrContent = await this.performOcr(buffer);
      this.logger.log(`🖼️  OCR extracted: ${ocrContent.length} characters`);

      // Step 3: Decide which to use or merge
      let finalText: string;

      if (!textLayerContent || textLayerContent.trim().length < 100) {
        // No text layer, use OCR only
        this.logger.log('✓ Using OCR only (no text layer)');
        finalText = ocrContent;
      } else if (!ocrContent || ocrContent.trim().length < 100) {
        // OCR failed, use text layer only
        this.logger.log('✓ Using text layer only (OCR failed)');
        finalText = textLayerContent;
      } else {
        // Both available - merge them!
        this.logger.log('🔄 Merging text layer + OCR...');
        finalText = this.mergeTextSources(textLayerContent, ocrContent);
      }

      // Log quality
      this.logOcrQuality(finalText);

      return finalText;
    } catch (error) {
      this.logger.error('Error processing document:', error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * SMART MERGE: Combines text layer (has data) + OCR (has structure)
   */
  private mergeTextSources(textLayer: string, ocrText: string): string {
    // Start with OCR (better structure)
    let result = ocrText;

    // Check if vehicle details are in text layer but missing in OCR
    const textHasVehicles = this.hasVehicleData(textLayer);
    const ocrHasVehicles = this.hasVehicleData(ocrText);

    if (textHasVehicles && !ocrHasVehicles) {
      this.logger.log(
        '💡 Found vehicle data in text layer, missing in OCR - injecting...',
      );
      result = this.injectVehicleData(ocrText, textLayer);
    } else if (textHasVehicles && ocrHasVehicles) {
      this.logger.log('✓ Both sources have vehicle data - using OCR');
    } else if (!textHasVehicles && !ocrHasVehicles) {
      this.logger.warn('⚠️  No vehicle data in either source!');
    }

    return result;
  }

  /**
   * Check if text contains vehicle details
   */
  private hasVehicleData(text: string): boolean {
    const patterns = [/مرسيدس/i, /هونداي/i, /تويوتا/i, /كيا/i, /ميكروباص/i];

    return patterns.some((p) => p.test(text));
  }

  /**
   * Inject vehicle data from text layer into OCR output
   */
  private injectVehicleData(ocrText: string, textLayer: string): string {
    // Find the table marker in OCR
    const tableMarkerPattern =
      /(السيارة ذات الرقم.*?المركبات[\s\S]{0,100}?[٠-٩\d]{6,9})/i;
    const ocrTableMatch = ocrText.match(tableMarkerPattern);

    if (!ocrTableMatch) {
      this.logger.warn('Could not find table marker in OCR');
      return ocrText;
    }

    // Extract vehicle details from text layer
    const vehicleData = this.extractVehicleDataFromText(textLayer);

    if (!vehicleData) {
      this.logger.warn('Could not extract vehicle data from text layer');
      return ocrText;
    }

    // Create enhanced table section
    const enhancedTable = this.buildEnhancedTableSection(
      ocrTableMatch[0],
      vehicleData,
    );

    // Replace in OCR text
    const result = ocrText.replace(ocrTableMatch[0], enhancedTable);

    this.logger.log('✅ Successfully injected vehicle data');
    return result;
  }

  /**
   * Extract vehicle details from text layer
   */
  private extractVehicleDataFromText(text: string): any {
    const data: any = {};

    // Extract make/model
    const makePatterns = [
      /مرسيدس\s*ميكرو/i,
      /مرسيدسميكرو/i,
      /هونداي\s*ميكروباص/i,
      /تويوتا/i,
      /كيا/i,
    ];

    for (const pattern of makePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.make = match[0].replace(/([أ-ي])(مرسيدس|هونداي)/gi, '$1 $2');
        break;
      }
    }

    // Extract model
    const modelMatch = text.match(/كونتي/i);
    if (modelMatch) {
      data.model = modelMatch[0];
    }

    // Extract color
    const colorMatch = text.match(/(ابيض|اسود|ازرق|احمر|اخضر|رمادي|فضي)/i);
    if (colorMatch) {
      data.color = colorMatch[1];
    }

    // Extract registration location
    const locationMatch = text.match(/محافظة\s*[:：]?\s*([أ-ي]{3,15})/i);
    if (locationMatch) {
      data.location = locationMatch[1];
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  /**
   * Build enhanced table section with injected data
   */
  private buildEnhancedTableSection(
    originalTable: string,
    vehicleData: any,
  ): string {
    let enhanced = originalTable;

    // If we have make, inject it after plate number
    if (vehicleData.make) {
      // Find plate number
      const plateMatch = enhanced.match(/([٠-٩\d]{6,9})/);
      if (plateMatch) {
        const insertAfter = plateMatch[0];
        enhanced = enhanced.replace(
          insertAfter,
          `${insertAfter}\n${vehicleData.make}${vehicleData.model ? ' ' + vehicleData.model : ''}`,
        );
      }
    }

    // Add color and location if available
    if (vehicleData.color) {
      enhanced += `\nاللون: ${vehicleData.color}`;
    }

    if (vehicleData.location) {
      enhanced += `\nمحافظة: ${vehicleData.location}`;
    }

    return enhanced;
  }

  private async performOcr(buffer: Buffer): Promise<string> {
    const sessionId = uuidv4();
    const imageFiles: string[] = [];

    try {
      this.logger.log('Converting PDF to images using pdfjs-dist...');

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      });
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;

      this.logger.log(`PDF has ${numPages} page(s)`);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const scale = 3;
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        const imagePath = path.join(
          this.tempDir,
          `${sessionId}-page${pageNum}.png`,
        );
        const imageBuffer = canvas.toBuffer('image/png');
        await fs.writeFile(imagePath, imageBuffer);
        imageFiles.push(imagePath);

        this.logger.log(`Converted page ${pageNum}/${numPages} to image`);
      }

      const allText: string[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        this.logger.log(
          `Processing page ${i + 1}/${imageFiles.length} with OCR...`,
        );

        // Use optimized OCR settings
        const ocrOptions: any = {
          preserve_interword_spaces: '1',
          tessedit_psr_mode: '6',
          logger: (m) => {
            if (m.status === 'recognizing text') {
              this.logger.debug(
                `Page ${i + 1} OCR Progress: ${Math.round(m.progress * 100)}%`,
              );
            }
          },
        };

        const result = await Tesseract.recognize(
          imageFiles[i],
          'ara+eng',
          ocrOptions,
        );

        const pageText = result.data.text;
        allText.push(pageText);

        this.logger.log(
          `Extracted ${pageText.length} characters from page ${i + 1}`,
        );
      }

      await this.cleanupTempFiles(imageFiles);

      return allText.join('\n\n');
    } catch (error) {
      this.logger.error('OCR processing failed:', error);

      try {
        await this.cleanupTempFiles(imageFiles);
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup temp files:', cleanupError);
      }

      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  private logOcrQuality(text: string) {
    const stats = {
      totalChars: text.length,
      totalWords: text.split(/\s+/).filter((w) => w.length > 0).length,
      arabicChars: (text.match(/[\u0600-\u06FF]/g) || []).length,
      hasVehicleKeywords: /مرسيدس|تويوتا|هونداي|مركبة|سيارة|ميكروباص/.test(
        text,
      ),
      hasTableKeywords: /ماركة|طراز|لونها/.test(text),
      hasContractKeywords: /الفريق|البائع|المشتري|بمبلغ/.test(text),
    };

    const arabicRatio = stats.arabicChars / Math.max(stats.totalChars, 1);

    this.logger.log('======= OCR Quality Report =======');
    this.logger.log(`📄 Total characters: ${stats.totalChars}`);
    this.logger.log(`📝 Total words: ${stats.totalWords}`);
    this.logger.log(`🔤 Arabic ratio: ${(arabicRatio * 100).toFixed(1)}%`);
    this.logger.log(
      `🚗 Vehicle keywords: ${stats.hasVehicleKeywords ? '✅' : '❌'}`,
    );
    this.logger.log(
      `📊 Table keywords: ${stats.hasTableKeywords ? '✅' : '❌'}`,
    );
    this.logger.log(
      `📋 Contract keywords: ${stats.hasContractKeywords ? '✅' : '❌'}`,
    );
    this.logger.log('==================================');

    if (stats.totalWords < 50) {
      this.logger.warn('⚠️  Very short OCR output - possible failure');
    }
    if (stats.hasTableKeywords && !stats.hasVehicleKeywords) {
      this.logger.warn('⚠️  Table headers found but no vehicle data');
    }
    if (!stats.hasContractKeywords) {
      this.logger.warn('⚠️  Missing contract keywords - OCR quality very low');
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

  protected normalizeArabicNumbers(text: string): string {
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

  protected extractNumber(pattern: RegExp, text: string): string | null {
    const normalizedText = this.normalizeArabicNumbers(text);
    const match = normalizedText.match(pattern);
    if (match) {
      return match[1].trim();
    }

    const originalMatch = text.match(pattern);
    if (originalMatch) {
      return this.normalizeArabicNumbers(originalMatch[1].trim());
    }

    return null;
  }

  detectDocumentType(text: string): 'court_decision' | 'contract' | 'other' {
    const lower = text.toLowerCase();

    if (
      lower.includes('المحكمة') ||
      lower.includes('القاضي') ||
      lower.includes('حكم صادر')
    ) {
      return 'court_decision';
    }

    if (
      lower.includes('عقد') ||
      lower.includes('الفريق') ||
      lower.includes('البند')
    ) {
      return 'contract';
    }

    return 'other';
  }
}
