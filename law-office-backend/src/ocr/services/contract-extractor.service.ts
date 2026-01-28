import { Injectable } from '@nestjs/common';
import { OcrBaseService } from './ocr-base.service';
import { ContractDto } from '../dto/contract.dto';

@Injectable()
export class ContractExtractorService extends OcrBaseService {
  async extractContract(text: string): Promise<ContractDto> {
    // --- Preprocess OCR text to fix common glue issues ---------------------
    let raw = text || '';
    raw = raw.replace(
      /([^\s])(?=(?:الفريق|الطرف|المؤجر|المستأجر|البائع|المشتري|البند))/g,
      '$1 ',
    );
    raw = raw.replace(/:\s*/g, ': ').replace(/\s{2,}/g, ' ');
    raw = raw.replace(/الأول(?=الفريق)/gi, 'الأول ');
    raw = raw.replace(/الثاني(?=الفريق)/gi, 'الثاني ');
    raw = raw.replace(/البنده|البنداألول/gi, 'البند');

    const result: ContractDto = {
      documentCategory: 'contract',
      extractedAt: new Date(),
      rawText: raw,
      extractionQuality: { score: 0, issues: [] },
    };

    let score = 0;
    const total = 15;

    // Document Type - ORDER MATTERS! Check specific types first
    if (
      raw.match(/[اإأﺁ]يجار\s*سيار[ةه]/i) ||
      raw.includes('ايجار سيارة') ||
      raw.includes('إيجار سيارة') ||
      raw.includes('أجار سيارة')
    ) {
      result.documentType = 'Contract - Car Rental';
      score++;
    } else if (
      raw.match(/عقد\s*بيع\s*مركبة/i) ||
      raw.match(/عقدبيعمركبة/i) ||
      raw.includes('بيع مركبة') ||
      raw.includes('بيعمركبة') ||
      (raw.includes('مركبة') &&
        (raw.includes('السيارة ذات الرقم') || raw.includes('المركبات')))
    ) {
      result.documentType = 'Contract - Vehicle Sale';
      score++;
    } else if (
      raw.includes('بيع') &&
      (raw.includes('شراء') ||
        raw.includes('المشتري') ||
        raw.includes('البائع')) &&
      (raw.includes('مسكن') ||
        raw.includes('عقار') ||
        /محل\s*تجاري/i.test(raw) ||
        raw.includes('قطعة'))
    ) {
      result.documentType = 'Contract - Sale and Purchase';
      score++;
    } else if (raw.match(/عقد/i)) {
      result.documentType = 'Contract - General';
      score++;
    }

    // Helper: Sanitize Names
    const sanitizeName = (s: string | undefined) => {
      if (!s) return s;
      let original = s;
      let name = s.replace(/^[\s\.\-:،]+/g, '').trim();

      // Remove role labels
      name = name
        .replace(/^(?:البائع|المشتري|المؤجر|المستأجر)\s*[:：]\s*/i, '')
        .trim();

      // FIRST: Cut at major markers (these are definitive endpoints)
      name = name
        .split(
          /\b(?:من\s*مواليد|رقم\s*وطني|رقمة\s*الوطني|تولد|تاريخ\s*الولادة|محل\s*و\s*تاريخ|رقم\s*الهوية)\b/i,
        )[0]
        .trim();

      // SECOND: Handle compound names (spouse names after "و")
      // Pattern: "محمد و عائشة" or "عدنان و نوال"
      // But preserve "ابن X و Y" patterns
      const hasIbnPattern = /ابن\s+\w+\s*و\s*\w+/i.test(name);
      if (!hasIbnPattern) {
        // Split at و followed by another name (Arabic letter or common name pattern)
        const waSplit = name.split(/\s+و\s+(?=[أ-يا-ي\u0600-\u06FF])/i);
        if (waSplit.length > 1) {
          // Take the first part (primary person's name)
          name = waSplit[0].trim();
        }
      }

      // Remove excessive digits
      name = name.replace(/[0-9٠-٩\/\-]{4,}/g, '').trim();

      // Remove trailing "و" if any
      name = name.replace(/\s*و\s*$/i, '').trim();

      // Collapse multiple spaces
      name = name.replace(/\s{2,}/g, ' ');

      // Limit to reasonable length
      return name.split(/\s+/).slice(0, 8).join(' ');
    };

    // Parties Extraction
    const secondMarker = raw.search(
      /الفريق\s*الثاني|الطرف\s*الثاني|المستأجر|المشتري/i,
    );
    let firstSlice = raw;
    let secondSlice = raw;
    if (secondMarker !== -1) {
      firstSlice = raw.slice(0, secondMarker);
      secondSlice = raw.slice(secondMarker);
    }

    // First Party
    const firstPartyPattern =
      /الفريق\s*(?:الأول|الاول|األول)\s*[:\-]?\s*([^\n\.،]+)/i;
    const firstMatch = firstSlice.match(firstPartyPattern);
    if (firstMatch && firstMatch[1]) {
      const candidate = firstMatch[1].trim();
      if (!/البند|بند/i.test(candidate)) {
        result.firstParty = {
          name: sanitizeName(candidate),
          role:
            result.documentType === 'Contract - Car Rental'
              ? 'Lessor (المؤجر)'
              : 'Seller (البائع)',
        };
        score++;
      }
    }

    if (!result.firstParty) {
      const lines = firstSlice
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      for (const ln of lines) {
        if (/الفريق\s*الأول|الطرف\s*الأول|عقد|موضوع/i.test(ln)) continue;
        if (ln.match(/\b(بند|البند|موضوع|محضر|سياره|رقم)\b/i)) continue;
        const words = ln.split(/\s+/).length;
        const digitRatio =
          (ln.match(/[0-9٠-٩]/g) || []).length / Math.max(1, ln.length);
        if (words >= 2 && digitRatio < 0.25) {
          result.firstParty = {
            name: sanitizeName(ln),
            role:
              result.documentType === 'Contract - Car Rental'
                ? 'Lessor (المؤجر)'
                : 'Seller (البائع)',
          };
          score++;
          break;
        }
      }
    }

    // Second Party
    const secondPartyPattern =
      /(?:الفريق|الطرف)\s*(?:الثاني|الثانى)?\s*[:\s\-]?\s*([^\n]+)/i;
    const secondMatch = secondSlice.match(secondPartyPattern);
    if (secondMatch && secondMatch[1]) {
      let rawName = secondMatch[1].trim();

      const birthMatch = rawName.match(/تولد\s*[^\s]*\s*([0-9٠-٩\/\-]{4,12})/i);
      if (birthMatch) {
        result.secondParty = result.secondParty || {};
        result.secondParty.birthDate = this.normalizeArabicNumbers(
          birthMatch[1],
        );
      }

      rawName = rawName.split(/تولد|رقم\s*وطني/i)[0].trim();

      result.secondParty = result.secondParty || {};
      result.secondParty.name = sanitizeName(rawName);
      result.secondParty.role =
        result.documentType === 'Contract - Car Rental'
          ? 'Tenant (المستأجر)'
          : 'Buyer (المشتري)';
      score++;
    }

    // Contract Amount
    let foundAmount = false;

    if (result.documentType === 'Contract - Sale and Purchase') {
      const saleAmountPattern =
        /(?:بدل\s*البيع|مبلغ\s*(?:وقدره|قدره)?)[^\d٠-٩]{0,40}?([٠-٩\d]+[,،٬.]?[٠-٩\d]*)\s*(?:دولار|دوالر|USD|\$|ليرة)/i;
      const saleMatch = raw.match(saleAmountPattern);
      if (saleMatch && saleMatch[1]) {
        let normalized = this.normalizeArabicNumbers(
          saleMatch[1].replace(/[,،٬.]/g, ''),
        );
        result.contractAmount = normalized;
        result.contractCurrency = /دولار|USD|\$|دوالر/i.test(saleMatch[0])
          ? 'USD'
          : 'SYP';
        foundAmount = true;
        score++;
      }
    } else if (result.documentType === 'Contract - Vehicle Sale') {
      // FIXED: For vehicle sales - look for amount in "ثانيا" section
      // The document structure often has: "395 ثانيا : لقد باع... بمبلغ اجمالي"
      // Pattern 1: Amount right before "ثانيا" section
      const vehicleAmountPattern1 =
        /([٠-٩\d]+)[\s\n]+ثانيا[\s\S]{0,200}?بمبلغ\s*(?:اجمالي|إجمالي)/i;
      let vehicleMatch = raw.match(vehicleAmountPattern1);

      // Pattern 2: Traditional "بمبلغ اجمالي وقدره فقط X مليون"
      if (!vehicleMatch) {
        const vehicleAmountPattern2 =
          /بمبلغ\s*(?:اجمالي|إجمالي|اجمالى)\s*(?:وقدره|قدره)?\s*(?:فقط)?[\s\n]*([٠-٩\d]+)[\s\n]*(مليون|ملايين|ماليين)/i;
        vehicleMatch = raw.match(vehicleAmountPattern2);
      }

      // Pattern 3: Broader search in "بمبلغ اجمالي" context
      if (!vehicleMatch) {
        const sectionMatch = raw.match(
          /بمبلغ\s*(?:اجمالي|إجمالي|اجمالى)[\s\S]{0,100}?([٠-٩\d]+)[\s\S]{0,30}?(مليون|ملايين|ماليين)/i,
        );
        if (sectionMatch) vehicleMatch = sectionMatch;
      }

      if (vehicleMatch && vehicleMatch[1]) {
        const amount = vehicleMatch[1];
        // Check if we have the unit (مليون) in the match
        const unit = vehicleMatch[2] || 'مليون'; // Default to million if not found
        result.contractAmount = `${this.normalizeArabicNumbers(amount)} ${unit}`;
        result.contractCurrency = 'SYP';
        foundAmount = true;
        score++;
      }

      // ADDED: Extract down payment separately for vehicle sales
      if (foundAmount) {
        const downPaymentPattern =
          /دفع\s*الفريق\s*الثاني[^\n]*?مبلغا?\s*(?:وقدره)?\s*([٠-٩\d]+)\s*(مليون|ملايين|ماليين)/i;
        const downMatch = raw.match(downPaymentPattern);

        if (downMatch && downMatch[1]) {
          const amount = downMatch[1];
          const unit = downMatch[2];
          result.downPayment = `${this.normalizeArabicNumbers(amount)} ${unit}`;
        }
      }
    }

    // For rental contracts OR if sale amount wasn't found
    if (!foundAmount) {
      const rentCandidates: { amount: string; idx: number }[] = [];
      // Pattern to find rental amounts - must be flexible for Arabic variations
      const rentRegex =
        /(البند\s*الثاني|ايجار|استئجار|إيجار|أجار|قام\s*الفريق\s*الاول\s*بايجار|بايجار|بمبلغ\s*(?:وقدره|قدره)?)[\s\S]{0,160}?([٠-٩\d]+)\s*(مليون|ملايين|ماليين|ألف|الاف|الف|آلاف)?/gi;
      let m;
      while ((m = rentRegex.exec(raw)) !== null) {
        const numPart = (m[2] || '').trim();
        const unitPart = (m[3] || '').trim();
        if (!numPart) continue;

        const amt = unitPart ? `${numPart} ${unitPart}` : numPart;
        const idx = m.index;
        const parsed = parseInt(this.normalizeArabicNumbers(numPart), 10);

        // Skip invalid numbers
        if (isNaN(parsed) || parsed < 1 || parsed > 1000000) continue;

        rentCandidates.push({ amount: amt, idx });
      }

      if (rentCandidates.length > 0) {
        const secondIdx = raw.search(/البند\s*الثاني/i);
        let chosen = rentCandidates[0];
        if (secondIdx !== -1) {
          chosen = rentCandidates.reduce((prev, curr) =>
            Math.abs(curr.idx - secondIdx) < Math.abs(prev.idx - secondIdx)
              ? curr
              : prev,
          );
        }

        result.contractAmount = this.normalizeArabicNumbers(chosen.amount);
        result.contractCurrency = /دولار|USD|\$|دوالر/i.test(raw)
          ? 'USD'
          : 'SYP';

        if (/شهري|شهريا|شهرياً/i.test(raw) && !result.contractDuration) {
          result.contractDuration = 'شهري';
        }
        foundAmount = true;
        score++;
      }
    }

    // Security Deposit
    const depositPattern =
      /(?:دفع|سدد)\s*الفريق\s*الثاني[^\n]*?(?:مبلغ|مبـلغ|مبلغا)[^\n]*?([٠-٩\d]+(?:\s*(?:مليون|ملايين|ماليين|ألف|الاف|الف|آلاف))?)[^\n]*?(?:عربون|تأمين|تامين|كتامين)/i;
    const saleDepositPattern =
      /(?:مبلغ\s*(?:قدره|وقدره)?)[^\n]*?([٠-٩\d]+[.,،٬]\d{3}(?:[.,،٬]\d{3})*|[٠-٩\d]{4,})[^\n]*?(?:دولار|دوالر|USD|\$)[^\n]*?(?:عربون|تأمين)/i;

    const depositMatch =
      raw.match(saleDepositPattern) ||
      raw.match(depositPattern) ||
      raw.match(
        /(?:عربون|تأمين|تامين|كتامين)[^\n]*?مبلغ[^\n]*?([٠-٩\d]+(?:\s*(?:مليون|ملايين|ماليين|ألف|الاف|الف|آلاف))?)/i,
      );

    if (depositMatch && depositMatch[1]) {
      let normalized = depositMatch[1].trim();
      if (/[.,،٬]/.test(normalized)) {
        normalized = normalized.replace(/[.,،٬]/g, '');
      }
      const swap = normalized.match(
        /(مليون|ملايين|ماليين|ألف|الاف|الف|آلاف)\s*([٠-٩\d]+)/i,
      );
      if (swap) normalized = `${swap[2]} ${swap[1]}`;

      result.securityDeposit = this.normalizeArabicNumbers(normalized);
      score++;
    }

    // Contract Duration
    const durationPatterns = [
      /مد[ةه]\s*العقد[:\s]*([^\n\.]+)/i,
      /(?:لمدة|المدة)[:\s]+([^\n\.]+)/i,
      /([٠-٩\d]+)\s*(?:سنة|سنوات|شهر|شهور|اشهر|يوم|ايام)/i,
    ];
    for (const ptn of durationPatterns) {
      const mm = raw.match(ptn);
      if (mm && mm[1]) {
        result.contractDuration = mm[1].trim();
        score++;
        break;
      }
    }

    // Contract Date - FIXED: Prioritize "حرر" (execution) dates at END of document
    const datePatterns = [
      // PRIORITY 1: Date on new line after "قبلهما في" or just after period
      /قبلهما\s*في\s*[\n\r]*\.?\s*([0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{4})/i,
      // PRIORITY 2: Date with period prefix (OCR artifact) near end - ".2023/9/13"
      /\.\s*([0-9٠-٩]{4}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2})\s+(?:الجمهورية|ملاحظات|شاهد)/i,
      // PRIORITY 3: Date after "في" near end of document
      /في\s+[\n\r]*\.?\s*([0-9٠-٩]{4}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2})\s*[\n\r]+\s*[:：]?\s*(?:ملاحظات|شاهد)/i,
      // PRIORITY 4: Explicit contract execution date with "حرر"
      /حرر\s*(?:وكل|هذا\s*العقد)?.*?(?:في|بتاريخ)\s*([0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{4})/i,
      /(?:والبيان\s*حرر|البيان.*?حرر).*?(?:في|بتاريخ)\s*([0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{4})/i,
      // PRIORITY 5: Standard date patterns (but these catch payment dates)
      /(?:بتاريخ|تاريخ)\s*([0-9٠-٩]{4}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2})/i,
      /(?:بتاريخ|حرر|في|تاريخ)\s*[:\-]?\s*([0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{4})/i,
    ];

    // IMPROVED: Search from the END of the document first for signature/execution date patterns
    const lastSection = raw.slice(-800); // Last 800 chars
    for (const ptn of datePatterns.slice(0, 5)) {
      const mm = lastSection.match(ptn);
      if (mm && mm[1]) {
        const dateStr = this.normalizeArabicNumbers(mm[1].replace(/\s/g, ''));
        if (/(?:19|20)\d{2}/.test(dateStr)) {
          result.contractDate = dateStr;
          score++;
          break;
        }
      }
    }

    // If not found in last section, try full document with remaining patterns
    if (!result.contractDate) {
      for (const ptn of datePatterns) {
        const mm = raw.match(ptn);
        if (mm && mm[1]) {
          const dateStr = this.normalizeArabicNumbers(mm[1].replace(/\s/g, ''));
          if (/(?:19|20)\d{2}/.test(dateStr)) {
            result.contractDate = dateStr;
            score++;
            break;
          }
        }
      }
    }

    if (!result.contractDate) {
      const endSection = raw.slice(-500);
      const allDates = endSection.match(
        /([0-9٠-٩]{2,4}[\/\-\.][0-9٠-٩]{1,2}[\/\-\.][0-9٠-٩]{2,4})/g,
      );
      if (allDates && allDates.length > 0) {
        for (let i = allDates.length - 1; i >= 0; i--) {
          const dateStr = this.normalizeArabicNumbers(
            allDates[i].replace(/\s/g, ''),
          );
          if (/(?:19|20)\d{2}/.test(dateStr)) {
            result.contractDate = dateStr;
            score++;
            break;
          }
        }
      }
    }

    // ------------------------
    // Property/Asset Details Extraction
    // ------------------------
    if (result.documentType === 'Contract - Sale and Purchase') {
      result.propertyDetails = {};

      // Property Type - common patterns
      const propertyTypePatterns = [
        { pattern: /مسكن|شقة|بيت|منزل/i, type: 'Residential (مسكن)' },
        { pattern: /محل\s*تجاري|محل/i, type: 'Commercial Shop (محل تجاري)' },
        { pattern: /أرض|ارض|قطعة\s*أرض/i, type: 'Land (أرض)' },
        { pattern: /مكتب/i, type: 'Office (مكتب)' },
        { pattern: /مستودع|مخزن/i, type: 'Warehouse (مستودع)' },
        { pattern: /عمارة|بناء/i, type: 'Building (عمارة)' },
      ];

      for (const { pattern, type } of propertyTypePatterns) {
        if (pattern.test(raw)) {
          result.propertyDetails.type = type;
          break;
        }
      }

      // Property Identifier - "مسكن رقم خمسه"
      const identifierPattern =
        /(?:مسكن|شقة|محل|أرض|قطعة)\s*رقم\s*([^\s]+(?:\s+[^\s]+)?)/i;
      const identMatch = raw.match(identifierPattern);
      if (identMatch && identMatch[1]) {
        let identifier = identMatch[1].trim();
        // Clean up common trailing words
        identifier = identifier
          .replace(/\s*(?:من|في|ال|من\s*ال)\s*$/i, '')
          .trim();
        result.propertyDetails.identifier = identifier;
      }

      // Plot/Record Number - "المحضر رقم 221"
      const plotPattern = /(?:المحضر|محضر)\s*رقم\s*([٠-٩\d]+)/i;
      const plotMatch = raw.match(plotPattern);
      if (plotMatch && plotMatch[1]) {
        result.propertyDetails.plotNumber = this.normalizeArabicNumbers(
          plotMatch[1],
        );
      }

      // Location - extract from "الكائن في..." or "في..."
      const locationPattern =
        /(?:الكائن\s*في|كائن\s*في)\s*([^\.،\n]{5,80}?)(?:\s*(?:محله|المحدود|والموصوف|بموجب|\.|،))/i;
      const locMatch = raw.match(locationPattern);
      if (locMatch && locMatch[1]) {
        result.propertyDetails.location = locMatch[1].trim();
      } else {
        // Fallback: look for location near البند الاول
        const firstTermMatch = raw.match(/البند\s*الاول[\s\S]{0,300}/i);
        if (firstTermMatch) {
          const fallbackLoc = firstTermMatch[0].match(
            /في\s*([أ-ي\s]{4,40}?)(?:\s*محله|\s*المحدود)/i,
          );
          if (fallbackLoc && fallbackLoc[1]) {
            result.propertyDetails.location = fallbackLoc[1].trim();
          }
        }
      }

      // Area/Size - "150 متر مربع" or similar
      const areaPattern =
        /([٠-٩\d]+(?:[.,][٠-٩\d]+)?)\s*(?:متر\s*مربع|م²|متر)/i;
      const areaMatch = raw.match(areaPattern);
      if (areaMatch && areaMatch[1]) {
        const normalizedArea = this.normalizeArabicNumbers(areaMatch[1]);
        const parsed = parseFloat(normalizedArea);
        // Only accept reasonable area values (10-100000 sqm)
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 100000) {
          result.propertyDetails.area = `${normalizedArea} متر مربع`;
        }
      }

      // Registry Zone - "المنطقه العقاريه انصار"
      const zonePattern = /المنطقه\s*العقاريه\s*([^\s\.،\n]+)/i;
      const zoneMatch = raw.match(zonePattern);
      if (zoneMatch && zoneMatch[1]) {
        result.propertyDetails.registryZone = zoneMatch[1].trim();
      }

      // Add score if we found property details
      if (
        result.propertyDetails.type ||
        result.propertyDetails.identifier ||
        result.propertyDetails.location
      ) {
        score += 2;
      }
    }

    // Vehicle Details (for rental AND sale contracts)
    if (
      result.documentType === 'Contract - Car Rental' ||
      result.documentType === 'Contract - Vehicle Sale'
    ) {
      // FIXED: Improved plate number extraction
      const platePattern =
        /(?:السيار[ةه]\s*ذات\s*(?:ال)?رقم|موضوع\s*العقد.*?رقم)\s*([٠-٩\d]{6,9})/i;
      const plateMatch = raw.match(platePattern);

      if (plateMatch && plateMatch[1]) {
        result.vehicleDetails = result.vehicleDetails || {};
        result.vehicleDetails.plateNumber = this.normalizeArabicNumbers(
          plateMatch[1],
        );
        score++;
      } else {
        // Fallback: look for 6-9 digit sequences near vehicle mentions
        const subjectMatch = raw.match(
          /(?:السيار[ةه]|سيار[ةه]|موضوع\s*العقد)[\s\S]{0,150}/i,
        );
        if (subjectMatch) {
          const digitSequences = subjectMatch[0].match(/[٠-٩\d]{6,9}/g);
          if (digitSequences && digitSequences.length > 0) {
            for (const seq of digitSequences) {
              // Skip years
              if (!/(?:19|20)\d{2}/.test(seq)) {
                result.vehicleDetails = result.vehicleDetails || {};
                result.vehicleDetails.plateNumber =
                  this.normalizeArabicNumbers(seq);
                score++;
                break;
              }
            }
          }
        }
      }

      // Vehicle type/make/model - enhanced patterns including table format
      // Pattern 1: Standard text format with spaces
      const vehicleTypePattern =
        /(مرسيدس(?:\s*ميكرو)?(?:\s*كونتي)?(?:\s+[^\s\.،\d]{1,20})?|ميكروباص(?:\s+[^\s\.،\d]{1,20})?|سيارة\s*ميكروباص|ميكروباص\s*هونداي|هونداي\s*ميكروباص|هونداي|تويوتا|كيا|هيونداي|بي\s*ام\s*دبليو|BMW|فورد)/i;
      let vt = raw.match(vehicleTypePattern);

      // Pattern 2: Compact table format (no spaces) - "مرسيدسميكرو" or "مرسيدسكونتي"
      if (!vt) {
        const compactPattern =
          /(مرسيدس(?:ميكرو|كونتي)|هونداي(?:ميكروباص)?|تويوتا(?:\w{3,10})?|كيا(?:\w{3,10})?)/i;
        vt = raw.match(compactPattern);
      }

      // Pattern 3: Split words glued together (common OCR issue) - "ميكرومرسيدس"
      if (!vt) {
        const reversedPattern = /(ميكرو(?:مرسيدس|هونداي)|كونتي(?:مرسيدس)?)/i;
        const rvt = raw.match(reversedPattern);
        if (rvt) {
          // Reverse the order
          vt = [rvt[0], rvt[1].replace(/(ميكرو|كونتي)(\w+)/, '$2 $1')];
        }
      }

      if (vt && vt[1]) {
        result.vehicleDetails = result.vehicleDetails || {};
        // Clean up the vehicle type
        let vehicleType = vt[1]
          .trim()
          .replace(/[\.،;:\d]+$/g, '')
          .trim();
        // Add space after مرسيدس if followed by ميكرو or كونتي
        vehicleType = vehicleType
          .replace(/مرسيدس(ميكرو|كونتي)/i, 'مرسيدس $1')
          .replace(/هونداي(ميكروباص)/i, 'هونداي $1');
        result.vehicleDetails.type = vehicleType;
        score++;
      }

      // For vehicle sale contracts, extract additional details
      if (result.documentType === 'Contract - Vehicle Sale') {
        // Color - IMPROVED pattern to handle both spaced and compact formats
        // Pattern 1: Standard format "لونها ابيض"
        const colorPattern1 =
          /(?:لونها|اللون|طراز\s+لونها)\s*[:：]?\s*([^\s\n\d\.،]{3,15})/i;
        // Pattern 2: Compact format "كونتيابيض" - extract color after model
        const colorPattern2 =
          /(?:كونتي|ميكرو|هونداي|تويوتا)(ابيض|اسود|ازرق|احمر|اخضر|رمادي|فضي|بني|اصفر)/i;

        let colorMatch = raw.match(colorPattern1);
        if (!colorMatch) {
          colorMatch = raw.match(colorPattern2);
        }

        if (
          colorMatch &&
          colorMatch[1] &&
          !['المسجلة', 'ماركة', 'طراز', 'رقم', 'ذات', 'الرقم'].includes(
            colorMatch[1],
          )
        ) {
          result.vehicleDetails = result.vehicleDetails || {};
          result.vehicleDetails.color = colorMatch[1].trim();
        }

        // Registration location - IMPROVED to handle compact format
        // Pattern 1: Standard "محافظة : حلب"
        const regPattern1 = /محافظة\s*[:：]\s*([^\s\n\d]{3,20})/i;
        // Pattern 2: Compact format "ابيضمحافظة:حلب" or "محافظة:حلب"
        const regPattern2 = /محافظة\s*[:：]?\s*([أ-ي]{3,15})/i;
        // Pattern 3: After color in compact format
        const regPattern3 =
          /(ابيض|اسود|ازرق|احمر)\s*محافظة\s*[:：]?\s*([أ-ي]{3,15})/i;

        let regMatch = raw.match(regPattern1) || raw.match(regPattern2);
        if (!regMatch) {
          const compactMatch = raw.match(regPattern3);
          if (compactMatch && compactMatch[2]) {
            regMatch = [compactMatch[0], compactMatch[2]];
          }
        }

        if (regMatch && regMatch[1] && !/\d{6,}|المركبات/.test(regMatch[1])) {
          result.vehicleDetails = result.vehicleDetails || {};
          result.vehicleDetails.registrationLocation = regMatch[1].trim();
        }
      }

      // Route/Line Information (for rentals) - "خط الاعظميه"
      if (result.documentType === 'Contract - Car Rental') {
        const routePattern = /خط\s*([^\s\.،\n]{3,30})/i;
        const routeMatch = raw.match(routePattern);
        if (routeMatch && routeMatch[1]) {
          result.vehicleDetails = result.vehicleDetails || {};
          result.vehicleDetails.route = routeMatch[1].trim();
        }

        // Additional identifier - "فانوس 165"
        const additionalIdPattern = /(?:فانوس|رقم\s*الفانوس)\s*([٠-٩\d]+)/i;
        const addIdMatch = raw.match(additionalIdPattern);
        if (addIdMatch && addIdMatch[1]) {
          result.vehicleDetails = result.vehicleDetails || {};
          result.vehicleDetails.additionalId = this.normalizeArabicNumbers(
            addIdMatch[1],
          );
        }
      }
    }

    // Terms Extraction - FIXED: Support both البند and word-based numbering
    const terms: string[] = [];

    // More comprehensive pattern that captures all البند variations
    const termPattern =
      /البند[هة]?\s*(?:ال)?(?:أول|اول|األول|ثاني|الثاني|ثالث|الثالث|رابع|الرابع|خامس|الخامس|سادس|السادس|سابع|السابع|ثامن|الثامن|تاسع|التاسع|عاشر|العاشر|حادي|الحادي)[:\s]*/gi;

    // First, try to extract using البند splitting
    const matches: Array<{ index: number; label: string }> = [];
    let match;
    const regex = new RegExp(termPattern.source, termPattern.flags);
    while ((match = regex.exec(raw)) !== null) {
      matches.push({ index: match.index, label: match[0] });
    }

    // Extract content between consecutive البند markers
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i].label.length;
      const end = matches[i + 1] ? matches[i + 1].index : raw.length;
      let segment = raw.substring(start, end).trim();

      // Stop at major section breaks
      segment = segment.split(
        /(?=شاهد\s+شاهد|المؤجر\s*المستأجر|البائع\s*المشتري)/i,
      )[0];

      // Remove leading punctuation
      segment = segment.replace(/^[:\-\s\.،]+/, '').trim();

      // Smart truncation with sentence awareness
      if (segment.length > 250) {
        const sentences = segment.split(/\.\s+/);
        if (sentences.length > 1) {
          // Take first 1-2 complete sentences
          let accumulated = sentences[0];
          if (accumulated.length < 200 && sentences[1]) {
            accumulated += '. ' + sentences[1];
          }
          segment =
            accumulated.length > 250
              ? accumulated.substring(0, 200) + '...'
              : accumulated;
        } else {
          segment = segment.substring(0, 200) + '...';
        }
      }

      // Only add meaningful terms
      if (segment.length > 15 && !terms.includes(segment)) {
        terms.push(segment);
      }
    }

    // ADDED: Fallback for word-based numbering (أولا، ثانيا، etc.)
    if (terms.length < 3) {
      const wordBasedTermPattern =
        /(?:أولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا)\s*[:：]?\s*([^\n]+(?:\n(?!(?:أولا|ثانيا|ثالثا|رابعا|خامسا|سادسا|سابعا|ثامنا|تاسعا|عاشرا|شاهد))[^\n]+)*)/gi;

      let wmatch;
      while ((wmatch = wordBasedTermPattern.exec(raw)) !== null) {
        let segment = (wmatch[1] || '').trim();

        // Stop at witnesses or signatures
        segment = segment.split(/(?=شاهد|البائع\s+المشتري|مالحظات)/i)[0];

        // Remove leading punctuation
        segment = segment.replace(/^[:\-\s\.،]+/, '').trim();

        // Truncate if too long
        if (segment.length > 250) {
          const sentences = segment.split(/\.\s+/);
          if (sentences.length > 1) {
            let accumulated = sentences[0];
            if (accumulated.length < 200 && sentences[1]) {
              accumulated += '. ' + sentences[1];
            }
            segment =
              accumulated.length > 250
                ? accumulated.substring(0, 200) + '...'
                : accumulated;
          } else {
            segment = segment.substring(0, 200) + '...';
          }
        }

        if (segment.length > 15 && !terms.includes(segment)) {
          terms.push(segment);
        }
      }
    }

    // Additional fallback: if we got very few terms, try numbered patterns
    if (terms.length < 3) {
      const numberedPattern = /(?:^|\n)([٠-٩\d]+)[)\-\.]\s*([^\n]+)/g;
      let tmatch;
      while ((tmatch = numberedPattern.exec(raw)) !== null) {
        const t = (tmatch[2] || '').trim();
        if (t.length > 10 && !terms.includes(t)) {
          const limited = t.length > 200 ? t.substring(0, 200) + '...' : t;
          if (!terms.includes(limited)) {
            terms.push(limited);
          }
        }
      }
    }

    if (terms.length > 0) {
      result.contractTerms = terms;
      score += Math.min(3, terms.length);
    }

    // Witnesses
    const witnesses = raw.match(/شاهد|الشهود|اشهد/gi);
    if (witnesses && witnesses.length >= 2) score++;

    // Final Scoring
    // Adjust total based on contract type and what fields are applicable
    let adjustedTotal = total;
    if (result.documentType === 'Contract - Sale and Purchase') {
      // Sale contracts: exclude duration (N/A), vehicle details (N/A)
      // but include property details scoring
      adjustedTotal = 13; // Base 15 - duration(1) - vehicle(1) + property scoring already in
    } else if (result.documentType === 'Contract - Vehicle Sale') {
      // Vehicle sale: similar to property sale but with vehicle details instead
      adjustedTotal = 13; // Base 15 - duration(1) - property(1) + vehicle scoring already in
    } else if (result.documentType === 'Contract - Car Rental') {
      // Rental contracts: exclude property details (N/A) but include vehicle enhancements
      adjustedTotal = 15; // Standard total, vehicle enhancements already counted in base scoring
    }

    result.extractionQuality!.score = Math.round((score / adjustedTotal) * 100);
    if (result.extractionQuality!.score >= 70) result.confidence = 'high';
    else if (result.extractionQuality!.score >= 40)
      result.confidence = 'medium';
    else result.confidence = 'low';

    if (!result.firstParty)
      result.extractionQuality!.issues?.push('First party not found');
    if (!result.secondParty)
      result.extractionQuality!.issues?.push('Second party not found');
    if (!result.contractAmount)
      result.extractionQuality!.issues?.push('Contract amount not found');
    if (!result.contractDate) {
      if (/بتاريخ|حرر.*العقد|تاريخ.*العقد/i.test(raw)) {
        result.extractionQuality!.issues?.push(
          'Contract date not found (but likely exists)',
        );
      }
    }

    return result;
  }
}
