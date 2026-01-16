import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// PHASE 3: Locale-aware numeric parsing
// Handles: 1,234.56 (US), 1.234,56 (EU), 15.000 (thousands), etc.
// ============================================================================
function parseNumericValue(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (!value) return 0;
  
  let str = String(value).trim();
  
  // Remove currency symbols and letters
  str = str.replace(/[A-Za-z$€£¥₹\s]/g, '');
  
  // If empty after cleaning, return 0
  if (!str) return 0;
  
  // Detect format pattern
  // Pattern 1: US format - commas as thousands, dot as decimal (1,234.56)
  // Pattern 2: EU format - dots as thousands, comma as decimal (1.234,56)
  // Pattern 3: No separators or single separator
  
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');
  
  // If both exist, the LAST one is the decimal separator
  if (lastComma > 0 && lastDot > 0) {
    if (lastComma > lastDot) {
      // EU format: 1.234,56 -> comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> dot is decimal
      str = str.replace(/,/g, '');
    }
  } else if (lastComma > 0 && lastDot < 0) {
    // Only commas: could be "1,234" (thousands) or "1,5" (decimal)
    const afterComma = str.substring(lastComma + 1);
    if (afterComma.length === 3 && !str.includes(',', str.indexOf(',') + 1)) {
      // Single comma with 3 digits after = thousands (1,234)
      str = str.replace(',', '');
    } else if (afterComma.length <= 2) {
      // Comma with 1-2 digits after = decimal (1,5 or 1,50)
      str = str.replace(',', '.');
    } else {
      // Multiple commas = thousands separators
      str = str.replace(/,/g, '');
    }
  } else if (lastDot > 0 && lastComma < 0) {
    // Only dots: could be "1.234" (thousands) or "1.5" (decimal) or "1.234.567" (thousands)
    const dotCount = (str.match(/\./g) || []).length;
    const afterLastDot = str.substring(lastDot + 1);
    
    if (dotCount > 1) {
      // Multiple dots = thousands separators (1.234.567)
      str = str.replace(/\./g, '');
    } else if (afterLastDot.length === 3 && str.length > 4) {
      // Single dot with exactly 3 digits after AND total length > 4 = likely thousands (15.000 = 15000)
      str = str.replace('.', '');
    }
    // Otherwise keep as decimal (1.5 or 123.45)
  }
  
  // Remove any remaining non-numeric chars except minus and dot
  str = str.replace(/[^\d.-]/g, '');
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Check if a string looks like a reference code rather than a company name
function looksLikeReferenceCode(str: string): boolean {
  if (!str || str.length < 3) return true;
  const normalized = str.trim();
  
  const refPatterns = [
    /^[A-Z]{0,3}-?\d{2,}/i,
    /^\d{3,}/,
    /^REF[-\s]?\d/i,
    /^Q[-\s]?\d/i,
    /^RFQ[-\s]?\d/i,
    /^QUOTE[-\s]?\d/i,
    /^INV[-\s]?\d/i,
    /^PO[-\s]?\d/i,
  ];
  
  if (refPatterns.some(p => p.test(normalized))) {
    const companyWords = ['ltd', 'llc', 'inc', 'corp', 'co.', 'company', 'trading', 'enterprise', 'group', 'services'];
    const hasCompanyWord = companyWords.some(w => normalized.toLowerCase().includes(w));
    if (!hasCompanyWord) return true;
  }
  
  const words = normalized.split(/\s+/);
  if (words.length < 2 && normalized.length < 10 && /\d/.test(normalized)) {
    return true;
  }
  
  return false;
}

// Repair malformed JSON from AI responses
function repairJSON(jsonStr: string): string {
  return jsonStr
    .replace(/'/g, '"')
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/^\uFEFF/, '')
    .trim();
}

// Safe JSON parse with repair fallback
function safeJSONParse(content: string, fileName: string): any | null {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`No JSON object found in response for ${fileName}`);
    return null;
  }

  let jsonStr = jsonMatch[0];
  
  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.log(`JSON parse failed for ${fileName}, attempting repair...`);
  }
  
  try {
    const repaired = repairJSON(jsonStr);
    const result = JSON.parse(repaired);
    console.log(`✓ JSON repaired successfully for ${fileName}`);
    return result;
  } catch (repairError) {
    console.error(`JSON repair also failed for ${fileName}:`, repairError);
  }
  
  return null;
}

// ============================================================================
// PHASE 2: Item normalization - merge continuations, remove non-items, dedupe
// ============================================================================
interface NormalizedItem {
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NormalizationDiagnostics {
  rawItemCount: number;
  normalizedItemCount: number;
  mergedContinuations: number;
  removedNonItemRows: number;
  dedupedRows: number;
}

// Patterns for rows that are NOT actual line items
const NON_ITEM_PATTERNS = [
  /^(sub)?total\b/i,
  /^grand\s*total\b/i,
  /^amount\s*(payable|due)?\b/i,
  /^vat\b/i,
  /^tax\b/i,
  /^discount\b/i,
  /^shipping\b/i,
  /^delivery\b/i,
  /^freight\b/i,
  /^terms?\s*(and|&)?\s*conditions?\b/i,
  /^payment\s*terms?\b/i,
  /^bank\s*(details|account)\b/i,
  /^note[s]?\s*:/i,
  /^remark[s]?\s*:/i,
  /^validity\b/i,
  /^quotation\s*(ref|number|no\.?)\b/i,
  /^\*+\s*$/,
  /^[-=_]+$/,
];

function isNonItemRow(description: string): boolean {
  const trimmed = description.trim();
  if (trimmed.length < 3) return true;
  return NON_ITEM_PATTERNS.some(pattern => pattern.test(trimmed));
}

function isContinuationLine(item: any): boolean {
  // A continuation line typically has description but no prices/quantities
  const hasDescription = item.description && item.description.trim().length > 0;
  const hasQuantity = parseNumericValue(item.quantity) > 0;
  const hasUnitPrice = parseNumericValue(item.unitPrice) > 0;
  const hasTotalPrice = parseNumericValue(item.totalPrice) > 0;
  
  return hasDescription && !hasQuantity && !hasUnitPrice && !hasTotalPrice;
}

function normalizeDescription(desc: string): string {
  return (desc || '')
    .toLowerCase()
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function areSimilarItems(desc1: string, desc2: string): boolean {
  const norm1 = normalizeDescription(desc1);
  const norm2 = normalizeDescription(desc2);
  
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for near-duplicates)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    const longer = norm1.length >= norm2.length ? norm1 : norm2;
    // If the shorter is at least 80% of the longer, consider similar
    if (shorter.length / longer.length > 0.8) return true;
  }
  
  // Jaccard similarity for word overlap
  const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return false;
  
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  
  return intersection / union > 0.85;
}

function normalizeQuotationItems(items: any[]): { normalizedItems: NormalizedItem[]; diagnostics: NormalizationDiagnostics } {
  const diagnostics: NormalizationDiagnostics = {
    rawItemCount: items.length,
    normalizedItemCount: 0,
    mergedContinuations: 0,
    removedNonItemRows: 0,
    dedupedRows: 0,
  };
  
  if (!items || items.length === 0) {
    return { normalizedItems: [], diagnostics };
  }
  
  const processedItems: NormalizedItem[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const description = (item.description || '').trim();
    
    // Skip non-item rows (SUBTOTAL, TOTAL, etc.)
    if (isNonItemRow(description)) {
      diagnostics.removedNonItemRows++;
      continue;
    }
    
    // Check if this is a continuation line
    if (isContinuationLine(item) && processedItems.length > 0) {
      // Append description to previous item
      const prevItem = processedItems[processedItems.length - 1];
      prevItem.description = `${prevItem.description} ${description}`.trim();
      diagnostics.mergedContinuations++;
      continue;
    }
    
    // Parse numeric values
    let unitPrice = parseNumericValue(item.unitPrice);
    let totalPrice = parseNumericValue(item.totalPrice);
    const quantity = parseNumericValue(item.quantity) || 1;
    
    // Derive missing prices
    if (unitPrice === 0 && totalPrice > 0 && quantity > 0) {
      unitPrice = totalPrice / quantity;
    }
    if (totalPrice === 0 && unitPrice > 0 && quantity > 0) {
      totalPrice = unitPrice * quantity;
    }
    
    // Check for duplicate within already processed items
    let isDuplicate = false;
    for (let j = 0; j < processedItems.length; j++) {
      if (areSimilarItems(description, processedItems[j].description)) {
        // If this one has better data (higher prices), replace
        if (unitPrice > processedItems[j].unitPrice) {
          processedItems[j] = {
            itemNo: processedItems[j].itemNo,
            description: description.length > processedItems[j].description.length ? description : processedItems[j].description,
            unit: item.unit || processedItems[j].unit || 'EA',
            quantity,
            unitPrice,
            totalPrice,
          };
        }
        isDuplicate = true;
        diagnostics.dedupedRows++;
        break;
      }
    }
    
    if (!isDuplicate) {
      processedItems.push({
        itemNo: processedItems.length + 1,
        description,
        unit: item.unit || 'EA',
        quantity,
        unitPrice,
        totalPrice,
      });
    }
  }
  
  // Re-number items
  processedItems.forEach((item, idx) => {
    item.itemNo = idx + 1;
  });
  
  diagnostics.normalizedItemCount = processedItems.length;
  
  return { normalizedItems: processedItems, diagnostics };
}

// ============================================================================
// PHASE 3: Total reconciliation with mismatch detection
// ============================================================================
interface ReconciliationResult {
  reconciled: {
    subtotal: number;
    tax: number;
    total: number;
  };
  mismatchPct: number;
  warnings: string[];
  usedItemsSum: boolean;
}

function reconcileTotals(items: NormalizedItem[], commercial: any): ReconciliationResult {
  const warnings: string[] = [];
  
  // Calculate sum from items
  const itemsSum = items.reduce((sum, item) => {
    const lineTotal = item.totalPrice > 0 ? item.totalPrice : (item.unitPrice * item.quantity);
    return sum + lineTotal;
  }, 0);
  
  const extractedTotal = parseNumericValue(commercial?.total);
  const extractedSubtotal = parseNumericValue(commercial?.subtotal);
  const extractedTax = parseNumericValue(commercial?.tax);
  
  let finalTotal = extractedTotal;
  let usedItemsSum = false;
  let mismatchPct = 0;
  
  // If both exist, calculate mismatch
  if (itemsSum > 0 && extractedTotal > 0) {
    mismatchPct = Math.abs(itemsSum - extractedTotal) / Math.max(itemsSum, extractedTotal) * 100;
    
    if (mismatchPct > 5) {
      warnings.push(`Total mismatch: Items sum to ${itemsSum.toFixed(2)} but extracted total is ${extractedTotal.toFixed(2)} (${mismatchPct.toFixed(1)}% difference)`);
      
      // Choose the more reliable one
      // If extracted total is suspiciously small (formatting issue), prefer itemsSum
      if (extractedTotal < itemsSum * 0.1) {
        finalTotal = itemsSum;
        usedItemsSum = true;
        warnings.push(`Using items sum (${itemsSum.toFixed(2)}) as total appears misread`);
      } else if (itemsSum < extractedTotal * 0.5) {
        // Items sum is too low - probably missing items, keep extracted
        warnings.push(`Keeping extracted total - items may be incomplete`);
      }
    }
  } else if (itemsSum > 0 && extractedTotal === 0) {
    finalTotal = itemsSum;
    usedItemsSum = true;
  }
  
  // Reconcile subtotal and tax
  let finalSubtotal = extractedSubtotal;
  let finalTax = extractedTax;
  
  if (finalSubtotal === 0 && finalTotal > 0) {
    finalSubtotal = finalTotal - finalTax;
  }
  
  return {
    reconciled: {
      subtotal: finalSubtotal,
      tax: finalTax,
      total: finalTotal,
    },
    mismatchPct,
    warnings,
    usedItemsSum,
  };
}

// Evaluate extraction quality
function evaluateExtractionQuality(extracted: any): { quality: 'good' | 'suspicious' | 'bad'; reasons: string[] } {
  const reasons: string[] = [];
  
  const itemsCount = Array.isArray(extracted?.items) ? extracted.items.length : 0;
  const pricedItemsCount = itemsCount > 0 
    ? extracted.items.filter((item: any) => 
        parseNumericValue(item?.unitPrice) > 0 || parseNumericValue(item?.totalPrice) > 0
      ).length 
    : 0;
  const hasCommercialTotal = parseNumericValue(extracted?.commercial?.total) > 0;
  const supplierName = extracted?.supplier?.name || '';
  const supplierNameIsSuspicious = looksLikeReferenceCode(supplierName);
  
  if (itemsCount === 0) {
    reasons.push('No items extracted');
  }
  if (pricedItemsCount === 0 && !hasCommercialTotal) {
    reasons.push('No prices found (neither line items nor commercial total)');
  }
  if (itemsCount > 0 && pricedItemsCount === 0) {
    reasons.push('Items extracted but no unit prices found');
  }
  if (supplierNameIsSuspicious) {
    reasons.push(`Supplier name "${supplierName}" looks like a reference code`);
  }
  
  if (itemsCount === 0 || (pricedItemsCount === 0 && !hasCommercialTotal)) {
    return { quality: 'bad', reasons };
  }
  if (pricedItemsCount < itemsCount * 0.2 || supplierNameIsSuspicious) {
    return { quality: 'suspicious', reasons };
  }
  
  return { quality: 'good', reasons: [] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, companySettings } = await req.json();

    if (!files || files.length < 1) {
      return new Response(
        JSON.stringify({ error: 'At least 1 quotation file is required for analysis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing ${files.length} quotation files...`);

    // Enhanced extraction prompt
    const createExtractionPrompt = (isRetry: boolean, previousIssues?: string[], useOCRMode = false) => {
      let prompt = `You are an expert procurement analyst. Extract ALL data from this supplier quotation document.

CRITICAL REQUIREMENTS:
1. Extract EXACT numeric values from the document - no estimates or defaults
2. Remove currency symbols and commas from prices (e.g., "AED 15,000" → 15000)
3. If a value is not found, use empty string "" for text or 0 for numbers
4. Read the ENTIRE document carefully - prices are often in tables or at the bottom
5. IMPORTANT: Each TABLE ROW should be ONE item. Do NOT split wrapped descriptions into multiple items.`;

      if (useOCRMode) {
        prompt += `

⚠️ OCR MODE - SCANNED DOCUMENT EXTRACTION:
This document may be SCANNED, handwritten, or have unusual formatting. Apply these special techniques:

1. READ ALL VISIBLE TEXT even if blurry, skewed, or at angles
2. TABLES may be hand-drawn or poorly aligned - extract data row by row
3. NUMBERS may use different formats: 15.000 vs 15,000 vs 15000 (interpret based on context)
4. Company letterhead/stamps often contain the supplier name - look for logos and headers
5. Look for HANDWRITTEN annotations that may contain prices or notes
6. Prices might be CIRCLED, HIGHLIGHTED, or written in margin notes
7. If text is unclear, make your best interpretation based on context
8. Check EVERY page - totals are often on the last page
9. A description spanning multiple lines is STILL ONE ITEM - combine them`;
      }

      if (isRetry && previousIssues) {
        prompt += `

⚠️ PREVIOUS EXTRACTION FAILED - PAY SPECIAL ATTENTION:
${previousIssues.map(i => `- ${i}`).join('\n')}

CRITICAL: 
- The SUPPLIER NAME must be the COMPANY NAME from letterhead/header - NOT a quotation reference number
- Extract ALL line items from ANY tables in the document
- Unit prices MUST be extracted for each item if available
- Do NOT create separate items for description continuation lines`;
      }

      prompt += `

ITEM EXTRACTION RULES (VERY IMPORTANT):
- Count the actual NUMBER OF ROWS in the quotation table
- Each row with a price = one item
- If a description wraps to multiple lines, it is STILL ONE ITEM
- Do NOT include SUBTOTAL, TOTAL, VAT, DELIVERY rows as items
- The number of extracted items should match the line count in the original table

EXTRACT THESE FIELDS:

SUPPLIER INFORMATION (CRITICAL - must be the company name, NOT quote reference):
- Company name (look for letterhead, header, company logo, or "From:" section - NOT the quotation number)
- Full address
- Contact person name
- Phone number
- Email address

QUOTATION DETAILS:
- Reference/Quote number (THIS is where quote numbers like "QT-855" belong)
- Date (format: YYYY-MM-DD)
- Validity period in days

LINE ITEMS (extract EXACTLY the items from the quotation table):
For each ACTUAL item row find:
- Item number
- Description (full product/service description - combine wrapped lines)
- Unit of measure (EA, PC, SET, etc.)
- Quantity
- Unit price (NUMERIC ONLY - extract from Rate/Price column)
- Total price (NUMERIC ONLY, or calculate as quantity × unit price)

COMMERCIAL TERMS:
- Subtotal (before tax, NUMERIC ONLY)
- Tax/VAT amount (NUMERIC ONLY)
- Grand Total (NUMERIC ONLY - this is the most important value)
- Currency (AED, USD, EUR, etc.)
- Payment terms (e.g., "30 days net", "50% advance")
- Delivery terms (e.g., "Ex-Works", "DDP Dubai")
- Delivery period in days

TECHNICAL SPECIFICATIONS:
- Brand name
- Model number
- Warranty period (e.g., "2 years")
- Certifications/Standards (ISO, CE, etc.)
- Country of origin
- Any technical specifications mentioned

Return ONLY this JSON structure:
{
  "supplier": { "name": "", "address": "", "contact": "", "phone": "", "email": "" },
  "quotation": { "reference": "", "date": "", "validityDays": 0 },
  "items": [{ "itemNo": 1, "description": "", "unit": "EA", "quantity": 0, "unitPrice": 0, "totalPrice": 0 }],
  "commercial": { "subtotal": 0, "tax": 0, "total": 0, "currency": "${companySettings?.currency || 'AED'}", "deliveryTerms": "", "paymentTerms": "", "deliveryDays": 0 },
  "technical": { "specifications": [], "brand": "", "model": "", "warranty": "", "compliance": [], "origin": "" }
}`;

      return prompt;
    };

    // Categorize error for user-friendly messages
    const categorizeError = (errorMessage: string): string => {
      const msg = String(errorMessage || '').toLowerCase();
      
      if (msg.includes('timeout') || msg.includes('aborted') || msg.includes('exceeded')) {
        return 'Document too complex or large - processing timed out';
      }
      if (msg.includes('429') || msg.includes('rate limit')) {
        return 'Rate limit reached - please try again in a few minutes';
      }
      if (msg.includes('402') || msg.includes('payment') || msg.includes('credit')) {
        return 'AI credits exhausted - please add credits to continue';
      }
      if (msg.includes('no content') || msg.includes('empty')) {
        return 'File appears to be empty or corrupted';
      }
      if (msg.includes('json') || msg.includes('parse')) {
        return 'Could not understand document format';
      }
      if (msg.includes('no items')) {
        return 'No line items could be found in the quotation';
      }
      
      return 'Extraction failed - document format not recognized';
    };

    // Helper function to extract quotation from a single file
    const extractQuotation = async (file: any, index: number, retryLevel = 0, previousIssues?: string[]): Promise<any> => {
      const retryLabels = ['', ' (RETRY with enhanced model)', ' (RETRY with OCR mode)'];
      const attemptLabel = retryLabels[retryLevel] || '';
      console.log(`Processing file ${index + 1}/${files.length}: ${file.name}${attemptLabel}`);
      
      const useOCRMode = retryLevel >= 2;
      const isRetry = retryLevel >= 1;
      const extractionPrompt = createExtractionPrompt(isRetry, previousIssues, useOCRMode);

      const messages: any[] = [
        { 
          role: 'system', 
          content: useOCRMode 
            ? 'You are a procurement OCR specialist. Read EVERY visible character from this scanned document. Extract data even from poor quality scans. Return ONLY valid JSON.'
            : 'You are a procurement data extraction specialist. Extract data EXACTLY as it appears in the document. Each table row = one item. Return ONLY valid JSON - no explanations or markdown.' 
        },
      ];

      if (file.type?.includes('image') || file.data?.startsWith('data:image')) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt },
            { type: 'image_url', image_url: { url: file.data } }
          ]
        });
      } else if (file.text) {
        messages.push({
          role: 'user',
          content: `${extractionPrompt}\n\nDocument "${file.name}":\n${file.text.substring(0, 80000)}`
        });
      } else if (file.data) {
        const dataUrl = file.data.startsWith('data:') 
          ? file.data 
          : `data:application/pdf;base64,${file.data}`;
        
        console.log(`Processing ${file.name}: ${(file.data.length / 1024).toFixed(1)}KB using vision mode${useOCRMode ? ' (OCR)' : ''}`);
        
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        });
      } else {
        console.error(`No content available for ${file.name}`);
        return createPlaceholderQuotation(file.name, index, companySettings, 'No content available');
      }

      try {
        const model = retryLevel >= 1 ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
        const timeout = retryLevel >= 2 ? 150000 : (retryLevel >= 1 ? 120000 : 90000);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_completion_tokens: 4000,
            messages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!extractionResponse.ok) {
          const errorText = await extractionResponse.text();
          console.error(`AI extraction error for ${file.name}:`, extractionResponse.status, errorText);
          const userError = categorizeError(`${extractionResponse.status} ${errorText}`);
          return createPlaceholderQuotation(file.name, index, companySettings, userError);
        }

        const extractionData = await extractionResponse.json();
        const content = extractionData.choices?.[0]?.message?.content || '';
        
        const extracted = safeJSONParse(content, file.name);
        if (extracted) {
          console.log(`✓ Extracted from ${file.name}: Supplier="${extracted.supplier?.name}", Total=${extracted.commercial?.total}, Items=${extracted.items?.length || 0}`);
          return extracted;
        } else {
          console.error(`Failed to parse response for ${file.name}. Response preview:`, content.substring(0, 200));
          return createPlaceholderQuotation(file.name, index, companySettings, categorizeError('JSON parse failed'));
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error(`Extraction timeout for ${file.name} (exceeded limit)`);
          return createPlaceholderQuotation(file.name, index, companySettings, categorizeError('Extraction timeout'));
        } else {
          console.error(`Failed to process ${file.name}:`, e.message);
          return createPlaceholderQuotation(file.name, index, companySettings, categorizeError(e.message));
        }
      }
    };

    // Process all files in PARALLEL for speed
    console.log(`Starting parallel extraction of ${files.length} files...`);
    const extractionPromises = files.map((file: any, i: number) => extractQuotation(file, i, 0));
    let extractedQuotations = await Promise.all(extractionPromises);
    console.log(`Initial extraction complete for ${extractedQuotations.length} files`);

    // Phase 1: Quality check and multi-strategy retry for suspicious extractions
    for (let i = 0; i < extractedQuotations.length; i++) {
      const extraction = extractedQuotations[i];
      const quality = evaluateExtractionQuality(extraction);
      
      if (quality.quality !== 'good') {
        console.log(`⚠️ File ${i + 1} has ${quality.quality} extraction quality: ${quality.reasons.join('; ')}`);
        
        console.log(`🔄 Retry 1 for file ${i + 1}: Enhanced model...`);
        let retryResult = await extractQuotation(files[i], i, 1, quality.reasons);
        let retryQuality = evaluateExtractionQuality(retryResult);
        
        if (retryQuality.quality === 'good' || 
            (retryResult.items?.length || 0) > (extraction.items?.length || 0) ||
            parseNumericValue(retryResult.commercial?.total) > parseNumericValue(extraction.commercial?.total)) {
          console.log(`✓ Retry 1 improved extraction for file ${i + 1}`);
          extractedQuotations[i] = retryResult;
        } else {
          console.log(`🔄 Retry 2 for file ${i + 1}: OCR mode...`);
          const ocrResult = await extractQuotation(files[i], i, 2, quality.reasons);
          const ocrQuality = evaluateExtractionQuality(ocrResult);
          
          if (ocrQuality.quality === 'good' ||
              (ocrResult.items?.length || 0) > (retryResult.items?.length || 0) ||
              (ocrResult.items?.length || 0) > (extraction.items?.length || 0) ||
              parseNumericValue(ocrResult.commercial?.total) > parseNumericValue(retryResult.commercial?.total)) {
            console.log(`✓ OCR mode improved extraction for file ${i + 1}`);
            extractedQuotations[i] = ocrResult;
          } else {
            console.log(`⚠️ All retries failed for file ${i + 1}, keeping best result`);
            const results = [extraction, retryResult, ocrResult];
            const best = results.reduce((a, b) => {
              const aScore = (a.items?.length || 0) + (parseNumericValue(a.commercial?.total) > 0 ? 10 : 0);
              const bScore = (b.items?.length || 0) + (parseNumericValue(b.commercial?.total) > 0 ? 10 : 0);
              return bScore > aScore ? b : a;
            });
            extractedQuotations[i] = best;
            
            if (evaluateExtractionQuality(best).quality === 'bad') {
              extractedQuotations[i]._extractionIssue = 'No items could be extracted from this quotation';
            }
          }
        }
      }
    }

    console.log(`Extracted data from ${extractedQuotations.length} quotations`);

    // =========================================================================
    // PHASE 2 & 3: Normalize items and reconcile totals for each quotation
    // =========================================================================
    const validatedQuotations = extractedQuotations.map((q, index) => {
      // PHASE 2: Normalize items
      const rawItems = Array.isArray(q?.items) ? q.items : [];
      const { normalizedItems, diagnostics } = normalizeQuotationItems(rawItems);
      
      console.log(`File ${index + 1} normalization: ${diagnostics.rawItemCount} raw → ${diagnostics.normalizedItemCount} normalized (merged: ${diagnostics.mergedContinuations}, removed: ${diagnostics.removedNonItemRows}, deduped: ${diagnostics.dedupedRows})`);
      
      // PHASE 3: Reconcile totals
      const reconciliation = reconcileTotals(normalizedItems, q?.commercial);
      
      if (reconciliation.warnings.length > 0) {
        console.log(`File ${index + 1} total reconciliation warnings:`, reconciliation.warnings);
      }
      
      // Clean supplier name
      let supplierName = q?.supplier?.name || '';
      let quotationRef = q?.quotation?.reference || '';
      
      if (looksLikeReferenceCode(supplierName)) {
        if (!quotationRef) {
          quotationRef = supplierName;
        }
        const fileName = files[index]?.name || '';
        const cleanFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        if (cleanFileName && !looksLikeReferenceCode(cleanFileName) && cleanFileName.length > 5) {
          supplierName = cleanFileName;
        } else {
          supplierName = `Supplier ${index + 1} (${quotationRef || 'Unknown'})`;
        }
      }
      
      // Build extraction warnings array
      const extractionWarnings: string[] = [];
      if (q?._extractionIssue) {
        extractionWarnings.push(q._extractionIssue);
      }
      if (diagnostics.mergedContinuations > 3) {
        extractionWarnings.push(`Merged ${diagnostics.mergedContinuations} continuation lines`);
      }
      if (reconciliation.mismatchPct > 5) {
        extractionWarnings.push(`Total mismatch: ${reconciliation.mismatchPct.toFixed(1)}%`);
      }
      
      return {
        supplier: {
          name: supplierName,
          address: q?.supplier?.address || '',
          contact: q?.supplier?.contact || '',
          phone: q?.supplier?.phone || '',
          email: q?.supplier?.email || ''
        },
        quotation: {
          reference: quotationRef || `Q-${index + 1}`,
          date: q?.quotation?.date || new Date().toISOString().split('T')[0],
          validityDays: parseNumericValue(q?.quotation?.validityDays) || 30
        },
        items: normalizedItems,
        itemsExtracted: normalizedItems.length,
        pricedItemsCount: normalizedItems.filter((i: any) => i.unitPrice > 0).length,
        commercial: {
          subtotal: reconciliation.reconciled.subtotal,
          tax: reconciliation.reconciled.tax,
          total: reconciliation.reconciled.total,
          currency: q?.commercial?.currency || companySettings?.currency || 'AED',
          deliveryTerms: q?.commercial?.deliveryTerms || '',
          paymentTerms: q?.commercial?.paymentTerms || '',
          deliveryDays: parseNumericValue(q?.commercial?.deliveryDays),
          incoterms: q?.commercial?.incoterms || ''
        },
        technical: {
          specifications: Array.isArray(q?.technical?.specifications) ? q.technical.specifications : [],
          brand: q?.technical?.brand || '',
          model: q?.technical?.model || '',
          warranty: q?.technical?.warranty || '',
          compliance: Array.isArray(q?.technical?.compliance) ? q.technical.compliance : [],
          origin: q?.technical?.origin || '',
          deviations: Array.isArray(q?.technical?.deviations) ? q.technical.deviations : [],
          remarks: q?.technical?.remarks || ''
        },
        _extractionIssue: q?._extractionIssue || null,
        _extractionWarnings: extractionWarnings.length > 0 ? extractionWarnings : undefined,
        _normalizationDiagnostics: diagnostics,
        _totalReconciliation: {
          mismatchPct: reconciliation.mismatchPct,
          usedItemsSum: reconciliation.usedItemsSum,
        }
      };
    });

    // =========================================================================
    // Consensus check: flag suppliers with unusually high item counts
    // =========================================================================
    const itemCounts = validatedQuotations.map(q => q.itemsExtracted).filter(c => c > 0);
    if (itemCounts.length > 1) {
      const sortedCounts = [...itemCounts].sort((a, b) => a - b);
      const medianCount = sortedCounts[Math.floor(sortedCounts.length / 2)];
      
      validatedQuotations.forEach((q, idx) => {
        if (q.itemsExtracted > medianCount * 1.5 && q.itemsExtracted > 5) {
          const warning = `Item count (${q.itemsExtracted}) is significantly higher than median (${medianCount}) - possible row splitting`;
          console.log(`⚠️ File ${idx + 1}: ${warning}`);
          q._extractionWarnings = q._extractionWarnings || [];
          q._extractionWarnings.push(warning);
        }
      });
    }

    // Generate comprehensive comparison analysis
    const supplierNames = validatedQuotations.map(q => 
      q.supplier.name
        .replace(/"/g, "'")
        .replace(/\\/g, '')
        .replace(/[\n\r\t]/g, ' ')
        .trim()
        .substring(0, 50)
    );
    const numSuppliers = supplierNames.length;
    const supplierIndexMap = supplierNames.map((name, idx) => `Supplier${idx + 1}`);
    
    const comparisonPrompt = `You are an expert procurement analyst. Generate a COMPREHENSIVE global-standard comparative analysis for these ${numSuppliers} supplier quotation(s).

SUPPLIER MAPPING:
${supplierNames.map((name, idx) => `Supplier${idx + 1} = "${name}"`).join('\n')}

QUOTATION DATA:
${JSON.stringify(validatedQuotations, null, 2)}

ANALYSIS REQUIREMENTS:

1. TECHNICAL COMPARISON - Evaluate each supplier on:
   - Brand Quality & Reputation (score 0-100)
   - Model/Specification Match (score 0-100)
   - Warranty Terms (score 0-100)
   - Compliance & Certifications (score 0-100)
   - Country of Origin (score 0-100)
   - Technical Deviations (score 0-100, higher = fewer deviations)

2. COMMERCIAL COMPARISON - Compare:
   - Total Price (identify LOWEST)
   - Unit Price Analysis
   - Payment Terms (favorability)
   - Delivery Time (identify FASTEST)
   - Delivery Terms/Incoterms
   - Validity Period
   - Tax/VAT implications

3. RANKING:
   - Calculate weighted overall score (Technical 40%, Commercial 60%)
   - Rank all suppliers
   - Identify: Lowest Price, Best Value, Technical Leader

4. RECOMMENDATION:
   - Clear recommendation with justification
   - Risk factors for each supplier
   - Negotiation points
   - Action items

IMPORTANT: Use supplier indices (Supplier1, Supplier2, etc.) as keys to avoid JSON parsing issues.

Return this EXACT JSON structure:
{
  "technicalComparison": [
    { "criteria": "Brand Quality", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } },
    { "criteria": "Specifications Match", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } },
    { "criteria": "Warranty Terms", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } },
    { "criteria": "Certifications", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } },
    { "criteria": "Country of Origin", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } },
    { "criteria": "Technical Deviations", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "details", "score": 0 }`).join(', ')} } }
  ],
  "commercialComparison": [
    { "criteria": "Total Price", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "amount with currency", "isLowest": false }`).join(', ')} } },
    { "criteria": "Payment Terms", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "terms" }`).join(', ')} } },
    { "criteria": "Delivery Days", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "X days", "isFastest": false }`).join(', ')} } },
    { "criteria": "Delivery Terms", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "incoterms" }`).join(', ')} } },
    { "criteria": "Validity Period", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "X days" }`).join(', ')} } },
    { "criteria": "Tax/VAT", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "value": "amount" }`).join(', ')} } }
  ],
  "itemComparison": [],
  "ranking": [
    { 
      "rank": 1,
      "supplierIndex": "Supplier1",
      "supplierName": "actual name", 
      "technicalScore": 0, 
      "commercialScore": 0, 
      "overallScore": 0, 
      "recommendation": "best_value", 
      "strengths": ["strength1", "strength2"],
      "risks": ["risk1", "risk2"],
      "negotiationPoints": ["point1"]
    }
  ],
  "summary": {
    "lowestEvaluated": "supplier name with lowest total price",
    "bestValue": "supplier name with best value (price + quality)",
    "technicalLeader": "supplier name with highest technical score",
    "fastestDelivery": "supplier name with quickest delivery",
    "recommendation": "Detailed recommendation paragraph explaining why this supplier should be selected...",
    "savingsPotential": "If negotiating with X supplier, potential savings of Y%",
    "notes": ["Important note 1", "Important note 2", "Risk consideration"],
    "actionItems": ["Action 1", "Action 2"]
  },
  "supplierMapping": { ${supplierIndexMap.map((s, idx) => `"${s}": "${supplierNames[idx].replace(/"/g, "'")}"`).join(', ')} }
}

Provide accurate scores, identify the best options clearly, and give actionable recommendations.`;

    console.log('Generating comparison analysis...');

    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_completion_tokens: 8000,
        messages: [
          { role: 'system', content: 'You are a senior procurement analyst providing comprehensive quotation analysis following international procurement standards. Return ONLY valid JSON without any markdown formatting or code blocks. Be thorough but concise.' },
          { role: 'user', content: comparisonPrompt }
        ],
      }),
    });

    let analysis: any;

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error('AI analysis error:', errorText);
      analysis = createDefaultAnalysis(validatedQuotations);
    } else {
      const analysisData = await analysisResponse.json();
      const analysisContent = analysisData.choices?.[0]?.message?.content || '';

      try {
        let jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0];
          
          jsonString = jsonString
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\x00-\x1F\x7F]/g, ' ');
          
          analysis = JSON.parse(jsonString);
          
          if (analysis.supplierMapping) {
            if (analysis.technicalComparison) {
              analysis.technicalComparison = analysis.technicalComparison.map((item: any) => {
                const newSuppliers: any = {};
                Object.entries(item.suppliers || {}).forEach(([key, value]) => {
                  const actualName = analysis.supplierMapping[key] || key;
                  newSuppliers[actualName] = value;
                });
                return { ...item, suppliers: newSuppliers };
              });
            }
            
            if (analysis.commercialComparison) {
              analysis.commercialComparison = analysis.commercialComparison.map((item: any) => {
                const newSuppliers: any = {};
                Object.entries(item.suppliers || {}).forEach(([key, value]) => {
                  const actualName = analysis.supplierMapping[key] || key;
                  newSuppliers[actualName] = value;
                });
                return { ...item, suppliers: newSuppliers };
              });
            }
            
            if (analysis.itemComparison) {
              analysis.itemComparison = analysis.itemComparison.map((item: any) => {
                const newSuppliers: any = {};
                Object.entries(item.suppliers || {}).forEach(([key, value]) => {
                  const actualName = analysis.supplierMapping[key] || key;
                  newSuppliers[actualName] = value;
                });
                return { ...item, suppliers: newSuppliers };
              });
            }
          }
          
          console.log('Analysis parsed successfully');
        } else {
          console.error('No JSON found in analysis response');
          analysis = createDefaultAnalysis(validatedQuotations);
        }
      } catch (e) {
        console.error('Failed to parse analysis:', e);
        analysis = createDefaultAnalysis(validatedQuotations);
      }
    }

    console.log('Analysis complete');

    // =========================================================================
    // PHASE 1: FIXED AI-POWERED ITEM MATCHING
    // No batching for ≤200 items, two-stage merge for larger lists
    // =========================================================================
    
    interface ItemComparisonRow {
      item: string;
      quantity: number;
      unit: string;
      suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
      lowestSupplier: string;
      lowestTotal: number;
      averageTotal: number;
    }
    
    interface CollectedItem {
      idx: number;
      supplier: string;
      description: string;
      unit: string;
      unitPrice: number;
      quantity: number;
      total: number;
    }
    
    const collectAllItems = (quotations: any[]): CollectedItem[] => {
      const allItems: CollectedItem[] = [];
      
      quotations.forEach(q => {
        (q.items || []).forEach((item: any) => {
          const desc = (item.description || '').trim();
          if (!desc) return;
          
          const unitPrice = parseNumericValue(item.unitPrice);
          const quantity = parseNumericValue(item.quantity) || 1;
          const total = parseNumericValue(item.totalPrice) || (unitPrice * quantity);
          
          allItems.push({
            idx: allItems.length,
            supplier: q.supplier.name,
            description: desc,
            unit: item.unit || 'EA',
            unitPrice,
            quantity,
            total
          });
        });
      });
      
      return allItems;
    };
    
    // Two-stage AI grouping for large item lists
    const mergeGroupsAcrossBatches = async (batchGroups: any[][]): Promise<any[]> => {
      if (batchGroups.length <= 1) {
        return batchGroups[0] || [];
      }
      
      // Collect canonical descriptions from all batches
      const allCanonicals = batchGroups.flat().map((g, idx) => ({
        batchGroupId: idx,
        description: g.canonicalDescription,
        itemIds: g.itemIds,
        unit: g.standardUnit,
      }));
      
      console.log(`Merging ${allCanonicals.length} groups across ${batchGroups.length} batches...`);
      
      // Use AI to merge similar canonical descriptions
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          max_completion_tokens: 4000,
          messages: [{
            role: 'system',
            content: `You merge procurement item groups that represent the SAME product.
Groups with identical or near-identical descriptions should be merged.
Return merged groups with combined item IDs.`
          }, {
            role: 'user',
            content: `Merge these ${allCanonicals.length} item groups if they are the same product:
${JSON.stringify(allCanonicals.map(g => ({ id: g.batchGroupId, desc: g.description, unit: g.unit })), null, 2)}

Return merged groups.`
          }],
          tools: [{
            type: 'function',
            function: {
              name: 'merge_groups',
              description: 'Merge similar item groups',
              parameters: {
                type: 'object',
                properties: {
                  mergedGroups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        canonicalDescription: { type: 'string' },
                        standardUnit: { type: 'string' },
                        sourceGroupIds: { type: 'array', items: { type: 'number' } }
                      },
                      required: ['canonicalDescription', 'standardUnit', 'sourceGroupIds']
                    }
                  }
                },
                required: ['mergedGroups']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'merge_groups' } }
        })
      });
      
      if (!response.ok) {
        console.error('Group merge failed, returning unmerged');
        return batchGroups.flat();
      }
      
      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall?.function?.arguments) {
        return batchGroups.flat();
      }
      
      const { mergedGroups } = JSON.parse(toolCall.function.arguments);
      
      // Reconstruct groups with combined itemIds
      return mergedGroups.map((mg: any) => {
        const combinedItemIds: number[] = [];
        mg.sourceGroupIds.forEach((sgId: number) => {
          const sourceGroup = allCanonicals.find(g => g.batchGroupId === sgId);
          if (sourceGroup) {
            combinedItemIds.push(...sourceGroup.itemIds);
          }
        });
        
        return {
          canonicalDescription: mg.canonicalDescription,
          standardUnit: mg.standardUnit,
          itemIds: combinedItemIds,
        };
      });
    };
    
    const buildItemComparisonMatrixWithAI = async (quotations: any[]): Promise<ItemComparisonRow[]> => {
      const supplierNamesList = quotations.map(q => q.supplier.name);
      const allItems = collectAllItems(quotations);
      
      if (allItems.length === 0) return [];
      
      console.log(`AI Item Matching: Processing ${allItems.length} items from ${supplierNamesList.length} suppliers...`);
      
      // PHASE 1 FIX: For ≤200 items, NO BATCHING
      const MAX_SINGLE_BATCH = 200;
      
      let allGroups: any[] = [];
      
      if (allItems.length <= MAX_SINGLE_BATCH) {
        // Single batch - no risk of duplicate groups
        console.log(`Processing all ${allItems.length} items in single batch (no batching)...`);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-pro', // Use pro for better accuracy on full list
            max_completion_tokens: 8000,
            messages: [{
              role: 'system',
              content: `You are a procurement item matching expert. Group IDENTICAL products from different suppliers.

MATCHING RULES:
1. SAME ITEM = Same product with minor wording differences
2. SIZE MATTERS: 70mm ≠ 95mm, DN50 ≠ DN100
3. MATERIAL MATTERS: Copper ≠ Aluminium, PVC ≠ XLPE
4. TYPE MATTERS: Single Core ≠ Multi Core
5. Abbreviations are equivalent: SS = Stainless Steel, GI = Galvanized Iron
6. Unit normalization: MTR = Meter, EA = Each, PC = Piece

OUTPUT: The number of groups should be close to the ACTUAL number of unique products being quoted.
If suppliers are quoting the same BOQ of ~20 items, you should create ~20 groups, NOT 50+.`
            }, {
              role: 'user',
              content: `Group these ${allItems.length} quotation items by SAME PRODUCT. Each supplier is quoting similar items.

Items:
${JSON.stringify(allItems.map(it => ({
  id: it.idx,
  supplier: it.supplier,
  desc: it.description,
  unit: it.unit
})), null, 2)}

Create groups where each group contains items from DIFFERENT suppliers that are the SAME product.`
            }],
            tools: [{
              type: 'function',
              function: {
                name: 'group_items',
                description: 'Group quotation items that are the same product',
                parameters: {
                  type: 'object',
                  properties: {
                    groups: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          canonicalDescription: { type: 'string' },
                          standardUnit: { type: 'string' },
                          itemIds: { type: 'array', items: { type: 'number' } }
                        },
                        required: ['canonicalDescription', 'standardUnit', 'itemIds']
                      }
                    }
                  },
                  required: ['groups']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'group_items' } }
          })
        });
        
        if (!response.ok) {
          throw new Error(`AI grouping failed: ${response.status}`);
        }
        
        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        if (!toolCall?.function?.arguments) {
          throw new Error('No tool call in response');
        }
        
        allGroups = JSON.parse(toolCall.function.arguments).groups;
        console.log(`✓ Single-batch AI created ${allGroups.length} item groups`);
        
      } else {
        // Large list: batch + two-stage merge
        const BATCH_SIZE = 80;
        const batches: CollectedItem[][] = [];
        for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
          batches.push(allItems.slice(i, i + BATCH_SIZE));
        }
        
        console.log(`Processing ${allItems.length} items in ${batches.length} batches with two-stage merge...`);
        
        const batchGroups: any[][] = [];
        
        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];
          console.log(`Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} items)...`);
          
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              max_completion_tokens: 4000,
              messages: [{
                role: 'system',
                content: `You are a procurement item matching expert. Group IDENTICAL products.
SIZE MATTERS: Different sizes = different items.
MATERIAL MATTERS: Different materials = different items.`
              }, {
                role: 'user',
                content: `Group these ${batch.length} items by same product:
${JSON.stringify(batch.map(it => ({ id: it.idx, supplier: it.supplier, desc: it.description, unit: it.unit })), null, 2)}`
              }],
              tools: [{
                type: 'function',
                function: {
                  name: 'group_items',
                  description: 'Group quotation items that are the same product',
                  parameters: {
                    type: 'object',
                    properties: {
                      groups: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            canonicalDescription: { type: 'string' },
                            standardUnit: { type: 'string' },
                            itemIds: { type: 'array', items: { type: 'number' } }
                          },
                          required: ['canonicalDescription', 'standardUnit', 'itemIds']
                        }
                      }
                    },
                    required: ['groups']
                  }
                }
              }],
              tool_choice: { type: 'function', function: { name: 'group_items' } }
            })
          });
          
          if (!response.ok) {
            throw new Error(`Batch ${batchIdx + 1} failed`);
          }
          
          const data = await response.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            const groups = JSON.parse(toolCall.function.arguments).groups;
            batchGroups.push(groups);
            console.log(`Batch ${batchIdx + 1}: ${groups.length} groups`);
          }
        }
        
        // Two-stage merge
        allGroups = await mergeGroupsAcrossBatches(batchGroups);
        console.log(`✓ Two-stage merge complete: ${allGroups.length} final groups`);
      }
      
      console.log(`AI Item Matching: Created ${allGroups.length} total groups from ${allItems.length} items`);
      
      // Build comparison matrix from AI groups
      return allGroups.map(group => {
        const suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit: string }> = {};
        supplierNamesList.forEach(s => suppliers[s] = { unitPrice: 0, quantity: 0, total: 0, unit: 'EA' });
        
        let maxQuantity = 0;
        group.itemIds.forEach((id: number) => {
          const item = allItems.find(it => it.idx === id);
          if (!item) return;
          
          if (!suppliers[item.supplier].unitPrice || item.unitPrice > 0) {
            suppliers[item.supplier] = {
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              total: item.total || (item.unitPrice * item.quantity),
              unit: item.unit
            };
            maxQuantity = Math.max(maxQuantity, item.quantity);
          }
        });
        
        const lineTotals = Object.values(suppliers)
          .map(s => s.unitPrice > 0 ? (maxQuantity * s.unitPrice) : 0)
          .filter(t => t > 0);
        
        const lowestTotal = lineTotals.length > 0 ? Math.min(...lineTotals) : 0;
        const averageTotal = lineTotals.length > 0 ? lineTotals.reduce((a, b) => a + b, 0) / lineTotals.length : 0;
        
        const lowestSupplier = Object.entries(suppliers)
          .filter(([_, v]) => v.unitPrice > 0)
          .sort((a, b) => (maxQuantity * a[1].unitPrice) - (maxQuantity * b[1].unitPrice))[0]?.[0] || '';
        
        return {
          item: group.canonicalDescription,
          quantity: maxQuantity || 1,
          unit: group.standardUnit,
          suppliers,
          lowestSupplier,
          lowestTotal,
          averageTotal
        };
      });
    };
    
    // Fallback: Rule-based matching
    const buildItemComparisonMatrixRuleBased = (quotations: any[]): ItemComparisonRow[] => {
      const supplierNamesList = quotations.map(q => q.supplier.name);
      
      const normalizeDesc = (desc: string): string => {
        return (desc || '')
          .toLowerCase()
          .replace(/[^\w\s\d.-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const extractCriticalTokens = (desc: string): Set<string> => {
        const normalized = normalizeDesc(desc);
        const tokens = new Set<string>();
        const codeMatches = normalized.match(/\b[a-z]*\d+[a-z\d]*\b/gi) || [];
        codeMatches.forEach(m => tokens.add(m.toLowerCase()));
        const dimMatches = normalized.match(/\d+(?:\.\d+)?(?:mm|cm|m|sqmm|kv|awg|x\d+)/gi) || [];
        dimMatches.forEach(m => tokens.add(m.toLowerCase()));
        return tokens;
      };
      
      const calculateSimilarity = (descA: string, descB: string): { score: number; exactCritical: boolean } => {
        const normA = normalizeDesc(descA);
        const normB = normalizeDesc(descB);
        
        if (normA === normB) return { score: 1.0, exactCritical: true };
        
        const criticalA = extractCriticalTokens(descA);
        const criticalB = extractCriticalTokens(descB);
        
        if (criticalA.size > 0 && criticalB.size > 0) {
          const intersection = new Set([...criticalA].filter(x => criticalB.has(x)));
          const union = new Set([...criticalA, ...criticalB]);
          const criticalOverlap = intersection.size / union.size;
          if (criticalOverlap < 0.7) {
            return { score: criticalOverlap * 0.5, exactCritical: false };
          }
        }
        
        const wordsA = new Set(normA.split(' ').filter(t => t.length > 2));
        const wordsB = new Set(normB.split(' ').filter(t => t.length > 2));
        if (wordsA.size === 0 || wordsB.size === 0) return { score: 0, exactCritical: false };
        
        const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
        const union = new Set([...wordsA, ...wordsB]);
        const jaccard = intersection.size / union.size;
        
        return { score: jaccard, exactCritical: criticalA.size > 0 && criticalB.size > 0 };
      };
      
      const canonicalItems: Array<{
        description: string;
        unit: string;
        criticalTokens: Set<string>;
        suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
      }> = [];
      
      const SIMILARITY_THRESHOLD = 0.92;
      
      quotations.forEach(q => {
        const supplierName = q.supplier.name;
        (q.items || []).forEach((item: any) => {
          const rawDesc = (item.description || '').trim();
          if (!rawDesc) return;
          
          const itemUnit = (item.unit || 'EA').toUpperCase();
          const unitPrice = parseNumericValue(item.unitPrice);
          const quantity = parseNumericValue(item.quantity) || 1;
          const total = parseNumericValue(item.totalPrice) || (unitPrice * quantity);
          
          let bestMatch = -1;
          let bestScore = 0;
          
          for (let i = 0; i < canonicalItems.length; i++) {
            if (canonicalItems[i].suppliers[supplierName]?.unitPrice > 0) continue;
            
            const { score } = calculateSimilarity(rawDesc, canonicalItems[i].description);
            if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
              bestScore = score;
              bestMatch = i;
            }
          }
          
          if (bestMatch >= 0 && bestScore >= SIMILARITY_THRESHOLD) {
            canonicalItems[bestMatch].suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            if (rawDesc.length > canonicalItems[bestMatch].description.length) {
              canonicalItems[bestMatch].description = rawDesc;
            }
          } else {
            const newItem = {
              description: rawDesc,
              unit: itemUnit,
              criticalTokens: extractCriticalTokens(rawDesc),
              suppliers: Object.fromEntries(supplierNamesList.map(n => [n, { unitPrice: 0, quantity: 0, total: 0, unit: 'EA' }]))
            };
            newItem.suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            canonicalItems.push(newItem);
          }
        });
      });
      
      console.log(`Rule-based matching: Created ${canonicalItems.length} canonical items`);
      
      return canonicalItems.map(data => {
        const quantities = Object.values(data.suppliers).map(s => s.quantity).filter(q => q > 0);
        const quantity = quantities.length > 0 ? Math.max(...quantities) : 1;
        
        const lineTotals = Object.values(data.suppliers)
          .map(s => s.unitPrice > 0 ? (quantity * s.unitPrice) : 0)
          .filter(t => t > 0);
        
        const lowestTotal = lineTotals.length > 0 ? Math.min(...lineTotals) : 0;
        const averageTotal = lineTotals.length > 0 ? lineTotals.reduce((a, b) => a + b, 0) / lineTotals.length : 0;
        
        const lowestSupplier = Object.entries(data.suppliers)
          .filter(([_, v]) => v.unitPrice > 0)
          .sort((a, b) => (quantity * a[1].unitPrice) - (quantity * b[1].unitPrice))[0]?.[0] || '';
        
        return {
          item: data.description,
          quantity,
          unit: data.unit,
          suppliers: data.suppliers,
          lowestSupplier,
          lowestTotal,
          averageTotal
        };
      });
    };
    
    // Use AI matching with fallback to rule-based
    let itemComparisonMatrix: ItemComparisonRow[];
    const totalItems = validatedQuotations.reduce((sum, q) => sum + (q.items?.length || 0), 0);
    
    try {
      console.log(`Attempting AI-powered semantic item matching for ${totalItems} items...`);
      itemComparisonMatrix = await buildItemComparisonMatrixWithAI(validatedQuotations);
      console.log(`✓ AI Item Matching succeeded: ${itemComparisonMatrix.length} unified item groups`);
    } catch (aiError) {
      console.error('AI Item Matching failed, falling back to rule-based matching:', aiError);
      itemComparisonMatrix = buildItemComparisonMatrixRuleBased(validatedQuotations);
      console.log(`Fallback: Rule-based matching created ${itemComparisonMatrix.length} items`);
    }
    
    console.log(`Built item comparison matrix with ${itemComparisonMatrix.length} items (from ${totalItems} total extracted items)`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedQuotations: validatedQuotations,
        analysis,
        itemComparisonMatrix,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-offer-analysis:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function createPlaceholderQuotation(fileName: string, index: number, companySettings: any, errorReason?: string) {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
  return {
    supplier: { 
      name: cleanName || `Supplier ${index + 1}`, 
      address: '', 
      contact: '', 
      phone: '',
      email: '' 
    },
    quotation: { 
      reference: `REF-${index}`, 
      date: new Date().toISOString().split('T')[0], 
      validityDays: 30 
    },
    items: [],
    itemsExtracted: 0,
    pricedItemsCount: 0,
    commercial: { 
      subtotal: 0, 
      tax: 0, 
      total: 0, 
      currency: companySettings?.currency || 'AED', 
      deliveryTerms: '', 
      paymentTerms: '', 
      deliveryDays: 0,
      incoterms: ''
    },
    technical: { 
      specifications: [], 
      brand: '', 
      model: '', 
      warranty: '', 
      compliance: [], 
      origin: '',
      deviations: [],
      remarks: ''
    },
    _extractionIssue: errorReason || 'Extraction failed'
  };
}

function createDefaultAnalysis(quotations: any[]) {
  const supplierNames = quotations.map(q => q.supplier.name);
  const totals = quotations.map(q => q.commercial.total);
  const lowestTotal = Math.min(...totals.filter(t => t > 0));
  const lowestIndex = totals.indexOf(lowestTotal);
  
  return {
    technicalComparison: [
      { criteria: 'Brand Quality', suppliers: Object.fromEntries(supplierNames.map(n => [n, { value: quotations.find(q => q.supplier.name === n)?.technical?.brand || 'Not specified', score: 70 }])) },
      { criteria: 'Warranty Terms', suppliers: Object.fromEntries(supplierNames.map(n => [n, { value: quotations.find(q => q.supplier.name === n)?.technical?.warranty || 'Not specified', score: 70 }])) },
      { criteria: 'Certifications', suppliers: Object.fromEntries(supplierNames.map(n => [n, { value: (quotations.find(q => q.supplier.name === n)?.technical?.compliance || []).join(', ') || 'Not specified', score: 70 }])) },
    ],
    commercialComparison: [
      { criteria: 'Total Price', suppliers: Object.fromEntries(supplierNames.map((n, i) => [n, { value: `${quotations[i].commercial.currency} ${quotations[i].commercial.total.toLocaleString()}`, isLowest: i === lowestIndex }])) },
      { criteria: 'Payment Terms', suppliers: Object.fromEntries(supplierNames.map(n => [n, { value: quotations.find(q => q.supplier.name === n)?.commercial?.paymentTerms || 'Not specified' }])) },
      { criteria: 'Delivery Days', suppliers: Object.fromEntries(supplierNames.map(n => [n, { value: `${quotations.find(q => q.supplier.name === n)?.commercial?.deliveryDays || 'N/A'} days` }])) },
    ],
    itemComparison: [],
    ranking: quotations.map((q, i) => ({
      rank: i + 1,
      supplierName: q.supplier.name,
      technicalScore: 70,
      commercialScore: i === lowestIndex ? 90 : 70,
      overallScore: i === lowestIndex ? 82 : 70,
      recommendation: i === lowestIndex ? 'lowest_price' : 'review_required',
      strengths: [],
      risks: ['Manual verification required'],
      negotiationPoints: []
    })),
    summary: {
      lowestEvaluated: lowestIndex >= 0 ? supplierNames[lowestIndex] : supplierNames[0] || 'N/A',
      bestValue: lowestIndex >= 0 ? supplierNames[lowestIndex] : supplierNames[0] || 'N/A',
      technicalLeader: supplierNames[0] || 'N/A',
      fastestDelivery: supplierNames[0] || 'N/A',
      recommendation: 'Review all quotations carefully. Automated extraction requires manual verification for accuracy.',
      savingsPotential: 'Calculate after verifying extracted data',
      notes: ['Extraction quality may vary', 'Manual review recommended'],
      actionItems: ['Verify extracted prices', 'Confirm supplier details']
    }
  };
}
