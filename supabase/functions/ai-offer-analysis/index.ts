import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse numeric value from various formats (e.g., "AED 15,000" -> 15000)
function parseNumericValue(value: any): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (!value) return 0;
  
  // Convert to string and clean
  const str = String(value)
    .replace(/[A-Za-z$€£¥₹,\s]/g, '') // Remove currency symbols, letters, commas, spaces
    .replace(/[^\d.-]/g, '') // Keep only digits, dots, and minus
    .trim();
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Check if a string looks like a reference code rather than a company name
function looksLikeReferenceCode(str: string): boolean {
  if (!str || str.length < 3) return true;
  const normalized = str.trim();
  
  // Patterns that indicate reference codes
  const refPatterns = [
    /^[A-Z]{0,3}-?\d{2,}/i,        // QT-855, RFQ-2024, Q-123
    /^\d{3,}/,                      // Pure numbers like 855123
    /^REF[-\s]?\d/i,                // REF-001
    /^Q[-\s]?\d/i,                  // Q-001
    /^RFQ[-\s]?\d/i,                // RFQ-001
    /^QUOTE[-\s]?\d/i,              // QUOTE-001
    /^INV[-\s]?\d/i,                // INV-001
    /^PO[-\s]?\d/i,                 // PO-001
  ];
  
  // If matches any reference pattern, it's likely a reference
  if (refPatterns.some(p => p.test(normalized))) {
    // But if it also has company-like words, might be valid
    const companyWords = ['ltd', 'llc', 'inc', 'corp', 'co.', 'company', 'trading', 'enterprise', 'group', 'services'];
    const hasCompanyWord = companyWords.some(w => normalized.toLowerCase().includes(w));
    if (!hasCompanyWord) return true;
  }
  
  // Too short to be a company name (less than 3 words and under 10 chars)
  const words = normalized.split(/\s+/);
  if (words.length < 2 && normalized.length < 10 && /\d/.test(normalized)) {
    return true;
  }
  
  return false;
}

// Repair malformed JSON from AI responses
function repairJSON(jsonStr: string): string {
  return jsonStr
    // Replace single quotes with double quotes (common AI mistake)
    .replace(/'/g, '"')
    // Remove trailing commas before ] or }
    .replace(/,\s*([\]}])/g, '$1')
    // Fix unquoted property names: { key: value } -> { "key": value }
    .replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Remove control characters that break JSON
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    // Fix escaped single quotes in values
    .replace(/\\'/g, "'")
    // Remove BOM and other invisible chars
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
  
  // Try parsing as-is first
  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.log(`JSON parse failed for ${fileName}, attempting repair...`);
  }
  
  // Try with repaired JSON
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
  
  // Check for suspicious extraction
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
  
  // Determine quality level
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

    // Enhanced extraction prompt for retry attempts
    const createExtractionPrompt = (isRetry: boolean, previousIssues?: string[]) => {
      let prompt = `You are an expert procurement analyst. Extract ALL data from this supplier quotation document.

CRITICAL REQUIREMENTS:
1. Extract EXACT numeric values from the document - no estimates or defaults
2. Remove currency symbols and commas from prices (e.g., "AED 15,000" → 15000)
3. If a value is not found, use empty string "" for text or 0 for numbers
4. Read the ENTIRE document carefully - prices are often in tables or at the bottom`;

      if (isRetry && previousIssues) {
        prompt += `

⚠️ PREVIOUS EXTRACTION FAILED - PAY SPECIAL ATTENTION:
${previousIssues.map(i => `- ${i}`).join('\n')}

CRITICAL: 
- The SUPPLIER NAME must be the COMPANY NAME from letterhead/header - NOT a quotation reference number
- Extract ALL line items from ANY tables in the document
- Unit prices MUST be extracted for each item if available`;
      }

      prompt += `

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

LINE ITEMS (extract ALL items from the quotation - VERY IMPORTANT):
For each item find:
- Item number
- Description (full product/service description)
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

PRICE EXTRACTION RULES:
- Look for "Total", "Grand Total", "Amount Payable", "Net Amount"
- Check the last row of price tables
- Verify: total should be subtotal + tax
- If multiple totals exist, use the FINAL amount

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

    // Helper function to extract quotation from a single file
    const extractQuotation = async (file: any, index: number, isRetry = false, previousIssues?: string[]): Promise<any> => {
      const attemptLabel = isRetry ? ' (RETRY with stronger model)' : '';
      console.log(`Processing file ${index + 1}/${files.length}: ${file.name}${attemptLabel}`);
      
      const extractionPrompt = createExtractionPrompt(isRetry, previousIssues);

      const messages: any[] = [
        { role: 'system', content: 'You are a procurement data extraction specialist. Extract data EXACTLY as it appears in the document. Return ONLY valid JSON - no explanations or markdown.' },
      ];

      // Handle different file types
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
        // For PDFs and other binary files, use image_url format for vision AI
        const dataUrl = file.data.startsWith('data:') 
          ? file.data 
          : `data:application/pdf;base64,${file.data}`;
        
        console.log(`Processing ${file.name}: ${(file.data.length / 1024).toFixed(1)}KB using vision mode`);
        
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
        // Use stronger model for retry attempts
        const model = isRetry ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), isRetry ? 120000 : 90000);

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
          return createPlaceholderQuotation(file.name, index, companySettings, `Extraction failed: ${extractionResponse.status}`);
        }

        const extractionData = await extractionResponse.json();
        const content = extractionData.choices?.[0]?.message?.content || '';
        
        // Use safe JSON parse with repair fallback
        const extracted = safeJSONParse(content, file.name);
        if (extracted) {
          console.log(`✓ Extracted from ${file.name}: Supplier="${extracted.supplier?.name}", Total=${extracted.commercial?.total}, Items=${extracted.items?.length || 0}`);
          return extracted;
        } else {
          console.error(`Failed to parse response for ${file.name}. Response preview:`, content.substring(0, 200));
          return createPlaceholderQuotation(file.name, index, companySettings, 'JSON parse failed');
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error(`Extraction timeout for ${file.name} (exceeded limit)`);
          return createPlaceholderQuotation(file.name, index, companySettings, 'Extraction timeout');
        } else {
          console.error(`Failed to process ${file.name}:`, e.message);
          return createPlaceholderQuotation(file.name, index, companySettings, e.message);
        }
      }
    };

    // Process all files in PARALLEL for speed
    console.log(`Starting parallel extraction of ${files.length} files...`);
    const extractionPromises = files.map((file: any, i: number) => extractQuotation(file, i));
    let extractedQuotations = await Promise.all(extractionPromises);
    console.log(`Initial extraction complete for ${extractedQuotations.length} files`);

    // Phase 1: Quality check and retry for suspicious extractions
    for (let i = 0; i < extractedQuotations.length; i++) {
      const extraction = extractedQuotations[i];
      const quality = evaluateExtractionQuality(extraction);
      
      if (quality.quality !== 'good') {
        console.log(`⚠️ File ${i + 1} has ${quality.quality} extraction quality: ${quality.reasons.join('; ')}`);
        
        // Retry with stronger model
        console.log(`🔄 Retrying extraction for file ${i + 1} with enhanced model...`);
        const retryResult = await extractQuotation(files[i], i, true, quality.reasons);
        
        // Evaluate retry quality
        const retryQuality = evaluateExtractionQuality(retryResult);
        if (retryQuality.quality === 'good' || 
            (retryResult.items?.length || 0) > (extraction.items?.length || 0) ||
            parseNumericValue(retryResult.commercial?.total) > parseNumericValue(extraction.commercial?.total)) {
          console.log(`✓ Retry improved extraction for file ${i + 1}`);
          extractedQuotations[i] = retryResult;
        } else {
          console.log(`⚠️ Retry did not improve extraction for file ${i + 1}, keeping original`);
          // Mark as having extraction issues
          if (quality.quality === 'bad') {
            extractedQuotations[i]._extractionIssue = 'No items could be extracted from this quotation';
          }
        }
      }
    }

    console.log(`Extracted data from ${extractedQuotations.length} quotations`);

    // Validate and normalize all extracted quotations using parseNumericValue
    const validatedQuotations = extractedQuotations.map((q, index) => {
      // Parse items with proper numeric handling and derive missing values
      const items = Array.isArray(q?.items) ? q.items.map((item: any, idx: number) => {
        let unitPrice = parseNumericValue(item?.unitPrice);
        let totalPrice = parseNumericValue(item?.totalPrice);
        const quantity = parseNumericValue(item?.quantity) || 1;
        
        // Phase 2: Numeric fallbacks - derive missing prices
        if (unitPrice === 0 && totalPrice > 0 && quantity > 0) {
          unitPrice = totalPrice / quantity;
        }
        if (totalPrice === 0 && unitPrice > 0 && quantity > 0) {
          totalPrice = unitPrice * quantity;
        }
        
        return {
          itemNo: item?.itemNo || idx + 1,
          description: item?.description || '',
          materialCode: item?.materialCode || '',
          unit: item?.unit || 'EA',
          quantity,
          unitPrice,
          totalPrice,
          discount: parseNumericValue(item?.discount),
          vat: parseNumericValue(item?.vat)
        };
      }) : [];
      
      // Parse commercial values with proper numeric handling
      let subtotal = parseNumericValue(q?.commercial?.subtotal);
      let tax = parseNumericValue(q?.commercial?.tax);
      let total = parseNumericValue(q?.commercial?.total);
      
      // Fallback: If total is 0 but items have prices, calculate from items
      if (total === 0 && items.length > 0) {
        const itemsTotal = items.reduce((sum: number, item: any) => {
          const lineTotal = item.totalPrice > 0 ? item.totalPrice : (item.unitPrice * item.quantity);
          return sum + lineTotal;
        }, 0);
        if (itemsTotal > 0) {
          total = itemsTotal;
          console.log(`Calculated total from items for ${q?.supplier?.name}: ${total}`);
        }
      }
      
      // Fallback: Calculate subtotal if missing
      if (subtotal === 0 && total > 0) {
        subtotal = total - tax;
      }
      
      // Phase 3: Clean supplier name - use quotation reference as fallback displayName
      let supplierName = q?.supplier?.name || '';
      let quotationRef = q?.quotation?.reference || '';
      
      // If supplier name looks like a reference, try to use file name or mark appropriately
      if (looksLikeReferenceCode(supplierName)) {
        // The name might actually be the quotation reference
        if (!quotationRef) {
          quotationRef = supplierName;
        }
        // Try to get a better name from file or use generic
        const fileName = files[index]?.name || '';
        const cleanFileName = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        if (cleanFileName && !looksLikeReferenceCode(cleanFileName) && cleanFileName.length > 5) {
          supplierName = cleanFileName;
        } else {
          supplierName = `Supplier ${index + 1} (${quotationRef || 'Unknown'})`;
        }
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
        items,
        itemsExtracted: items.length,
        pricedItemsCount: items.filter((i: any) => i.unitPrice > 0).length,
        commercial: {
          subtotal,
          tax,
          total,
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
        _extractionIssue: q?._extractionIssue || null
      };
    });

    // Generate comprehensive comparison analysis
    // Sanitize supplier names to prevent JSON parsing issues
    const supplierNames = validatedQuotations.map(q => 
      q.supplier.name
        .replace(/"/g, "'")
        .replace(/\\/g, '')
        .replace(/[\n\r\t]/g, ' ')
        .trim()
        .substring(0, 50)
    );
    const numSuppliers = supplierNames.length;
    
    // Create supplier index mapping for cleaner JSON template
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

3. LINE ITEM COMPARISON (if multiple suppliers):
   - Compare prices for matching items across suppliers
   - Identify which supplier is cheapest for each item
   - Calculate potential savings

4. RANKING:
   - Calculate weighted overall score (Technical 40%, Commercial 60%)
   - Rank all suppliers
   - Identify: Lowest Price, Best Value, Technical Leader

5. RECOMMENDATION:
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
  "itemComparison": [
    { "item": "item description", "suppliers": { ${supplierIndexMap.map(s => `"${s}": { "unitPrice": 0, "quantity": 0, "total": 0 }`).join(', ')} }, "lowestSupplier": "Supplier1" }
  ],
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
        // Try to extract and clean JSON from response
        let jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0];
          
          // Clean common JSON issues
          jsonString = jsonString
            .replace(/,\s*}/g, '}')  // Remove trailing commas before }
            .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
            .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters
          
          analysis = JSON.parse(jsonString);
          
          // Map supplier indices back to actual names in the analysis
          if (analysis.supplierMapping) {
            // Replace SupplierX keys with actual names in technicalComparison
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
            
            // Replace in commercialComparison
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
            
            // Replace in itemComparison
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
          console.error('Response preview:', analysisContent.substring(0, 500));
          analysis = createDefaultAnalysis(validatedQuotations);
        }
      } catch (e) {
        console.error('Failed to parse analysis:', e);
        console.error('Response preview:', analysisContent.substring(0, 500));
        analysis = createDefaultAnalysis(validatedQuotations);
      }
    }

    console.log('Analysis complete');

    // Build reliable item comparison matrix with STRICT matching to prevent false merges
    const buildItemComparisonMatrix = (quotations: any[]) => {
      const supplierNames = quotations.map(q => q.supplier.name);
      
      // Normalize description for matching - extract critical identifiers
      const normalizeDesc = (desc: string): string => {
        return (desc || '')
          .toLowerCase()
          .replace(/[^\w\s\d.-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      // Extract critical tokens (part numbers, dimensions, specifications)
      const extractCriticalTokens = (desc: string): Set<string> => {
        const normalized = normalizeDesc(desc);
        const tokens = new Set<string>();
        
        // Extract alphanumeric codes (like 1CX70, 4CX300, ISO9001)
        const codeMatches = normalized.match(/\b[a-z]*\d+[a-z\d]*\b/gi) || [];
        codeMatches.forEach(m => tokens.add(m.toLowerCase()));
        
        // Extract dimension patterns (like 70mm, 300sqmm, 2x4)
        const dimMatches = normalized.match(/\d+(?:\.\d+)?(?:mm|cm|m|sqmm|kv|awg|x\d+)/gi) || [];
        dimMatches.forEach(m => tokens.add(m.toLowerCase()));
        
        return tokens;
      };
      
      // Calculate similarity - STRICT matching with high threshold
      const calculateSimilarity = (descA: string, descB: string): { score: number; exactCritical: boolean } => {
        const normA = normalizeDesc(descA);
        const normB = normalizeDesc(descB);
        
        // Exact match
        if (normA === normB) return { score: 1.0, exactCritical: true };
        
        // Critical tokens must match for technical items
        const criticalA = extractCriticalTokens(descA);
        const criticalB = extractCriticalTokens(descB);
        
        // If either has critical tokens, they must overlap significantly
        if (criticalA.size > 0 && criticalB.size > 0) {
          const intersection = new Set([...criticalA].filter(x => criticalB.has(x)));
          const union = new Set([...criticalA, ...criticalB]);
          const criticalOverlap = intersection.size / union.size;
          
          // If critical tokens don't match well, don't merge
          if (criticalOverlap < 0.7) {
            return { score: criticalOverlap * 0.5, exactCritical: false };
          }
        }
        
        // Token-based Jaccard similarity (words only)
        const wordsA = new Set(normA.split(' ').filter(t => t.length > 2));
        const wordsB = new Set(normB.split(' ').filter(t => t.length > 2));
        if (wordsA.size === 0 || wordsB.size === 0) return { score: 0, exactCritical: false };
        
        const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
        const union = new Set([...wordsA, ...wordsB]);
        const jaccard = intersection.size / union.size;
        
        return { score: jaccard, exactCritical: criticalA.size > 0 && criticalB.size > 0 };
      };
      
      // Canonical items with STRICT matching - high threshold to prevent false merges
      const canonicalItems: Array<{
        description: string;
        unit: string;
        criticalTokens: Set<string>;
        suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
      }> = [];
      
      // VERY HIGH threshold - only merge near-exact matches
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
          
          // Find best matching canonical item (STRICT)
          let bestMatch = -1;
          let bestScore = 0;
          
          for (let i = 0; i < canonicalItems.length; i++) {
            // Skip if supplier already has this item (don't overwrite)
            if (canonicalItems[i].suppliers[supplierName]?.unitPrice > 0) continue;
            
            const { score } = calculateSimilarity(rawDesc, canonicalItems[i].description);
            
            // Only match if score meets threshold
            if (score >= SIMILARITY_THRESHOLD && score > bestScore) {
              bestScore = score;
              bestMatch = i;
            }
          }
          
          if (bestMatch >= 0 && bestScore >= SIMILARITY_THRESHOLD) {
            // Add to existing canonical item
            canonicalItems[bestMatch].suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            // Use longer/more descriptive description as canonical
            if (rawDesc.length > canonicalItems[bestMatch].description.length) {
              canonicalItems[bestMatch].description = rawDesc;
            }
          } else {
            // Create NEW canonical item (don't merge if uncertain)
            const newItem = {
              description: rawDesc,
              unit: itemUnit,
              criticalTokens: extractCriticalTokens(rawDesc),
              suppliers: Object.fromEntries(supplierNames.map(n => [n, { unitPrice: 0, quantity: 0, total: 0, unit: 'EA' }]))
            };
            newItem.suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            canonicalItems.push(newItem);
          }
        });
      });
      
      console.log(`Created ${canonicalItems.length} canonical items from quotations`);
      
      // Convert to result array with lowest/avg calculations
      return canonicalItems.map(data => {
        // Use max quantity from any supplier for consistency
        const quantities = Object.values(data.suppliers).map(s => s.quantity).filter(q => q > 0);
        const quantity = quantities.length > 0 ? Math.max(...quantities) : 1;
        
        // Calculate line totals for suppliers who quoted
        const lineTotals = Object.values(data.suppliers)
          .map(s => s.unitPrice > 0 ? (quantity * s.unitPrice) : 0)
          .filter(t => t > 0);
        
        const lowestTotal = lineTotals.length > 0 ? Math.min(...lineTotals) : 0;
        const averageTotal = lineTotals.length > 0 ? lineTotals.reduce((a, b) => a + b, 0) / lineTotals.length : 0;
        
        // Find supplier with lowest total
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
    
    const itemComparisonMatrix = buildItemComparisonMatrix(validatedQuotations);
    console.log(`Built item comparison matrix with ${itemComparisonMatrix.length} items (from ${validatedQuotations.reduce((sum, q) => sum + (q.items?.length || 0), 0)} total extracted items)`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedQuotations: validatedQuotations,
        analysis,
        itemComparisonMatrix, // Reliable item-wise comparison built from extracted data
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
