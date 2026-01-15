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

    // Helper function to extract quotation from a single file
    const extractQuotation = async (file: any, index: number): Promise<any> => {
      console.log(`Processing file ${index + 1}/${files.length}: ${file.name}`);
      
      const extractionPrompt = `You are an expert procurement analyst. Extract ALL data from this supplier quotation document.

CRITICAL REQUIREMENTS:
1. Extract EXACT numeric values from the document - no estimates or defaults
2. Remove currency symbols and commas from prices (e.g., "AED 15,000" → 15000)
3. If a value is not found, use empty string "" for text or 0 for numbers
4. Read the ENTIRE document carefully - prices are often in tables or at the bottom

EXTRACT THESE FIELDS:

SUPPLIER INFORMATION:
- Company name (look for letterhead, header, or "From:" section)
- Full address
- Contact person name
- Phone number
- Email address

QUOTATION DETAILS:
- Reference/Quote number
- Date (format: YYYY-MM-DD)
- Validity period in days

LINE ITEMS (extract ALL items from the quotation):
For each item find:
- Item number
- Description (full product/service description)
- Unit of measure (EA, PC, SET, etc.)
- Quantity
- Unit price (NUMERIC ONLY)
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
        // This is the same approach used in extract-company-document
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
        return { error: `No content available for ${file.name}`, supplier: { name: file.name.replace(/\.[^/.]+$/, ''), address: '', contact: '', phone: '', email: '' }, quotation: { reference: '', date: '', validityDays: 0 }, items: [], commercial: { subtotal: 0, tax: 0, total: 0, currency: companySettings?.currency || 'AED', deliveryTerms: '', paymentTerms: '', deliveryDays: 0 }, technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' } };
      }

      try {
        // Use stronger model for better extraction with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for larger files

        const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash', // Stronger model for accurate extraction
            max_completion_tokens: 4000,
            messages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!extractionResponse.ok) {
          const errorText = await extractionResponse.text();
          console.error(`AI extraction error for ${file.name}:`, extractionResponse.status, errorText);
          return { error: `Extraction failed: ${extractionResponse.status}`, supplier: { name: file.name.replace(/\.[^/.]+$/, ''), address: '', contact: '', phone: '', email: '' }, quotation: { reference: '', date: '', validityDays: 0 }, items: [], commercial: { subtotal: 0, tax: 0, total: 0, currency: companySettings?.currency || 'AED', deliveryTerms: '', paymentTerms: '', deliveryDays: 0 }, technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' } };
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
          return { error: 'JSON parse failed', supplier: { name: file.name.replace(/\.[^/.]+$/, ''), address: '', contact: '', phone: '', email: '' }, quotation: { reference: '', date: '', validityDays: 0 }, items: [], commercial: { subtotal: 0, tax: 0, total: 0, currency: companySettings?.currency || 'AED', deliveryTerms: '', paymentTerms: '', deliveryDays: 0 }, technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' } };
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error(`Extraction timeout for ${file.name} (90s exceeded)`);
          return { error: 'Extraction timeout', supplier: { name: file.name.replace(/\.[^/.]+$/, ''), address: '', contact: '', phone: '', email: '' }, quotation: { reference: '', date: '', validityDays: 0 }, items: [], commercial: { subtotal: 0, tax: 0, total: 0, currency: companySettings?.currency || 'AED', deliveryTerms: '', paymentTerms: '', deliveryDays: 0 }, technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' } };
        } else {
          console.error(`Failed to process ${file.name}:`, e.message);
          return { error: e.message, supplier: { name: file.name.replace(/\.[^/.]+$/, ''), address: '', contact: '', phone: '', email: '' }, quotation: { reference: '', date: '', validityDays: 0 }, items: [], commercial: { subtotal: 0, tax: 0, total: 0, currency: companySettings?.currency || 'AED', deliveryTerms: '', paymentTerms: '', deliveryDays: 0 }, technical: { specifications: [], brand: '', model: '', warranty: '', compliance: [], origin: '' } };
        }
      }
    };

    // Process all files in PARALLEL for speed
    console.log(`Starting parallel extraction of ${files.length} files...`);
    const extractionPromises = files.map((file: any, i: number) => extractQuotation(file, i));
    const extractedQuotations = await Promise.all(extractionPromises);
    console.log(`Parallel extraction complete for ${extractedQuotations.length} files`);

    console.log(`Extracted data from ${extractedQuotations.length} quotations`);

    // Validate and normalize all extracted quotations using parseNumericValue
    const validatedQuotations = extractedQuotations.map((q, index) => {
      // Parse items with proper numeric handling
      const items = Array.isArray(q?.items) ? q.items.map((item: any, idx: number) => ({
        itemNo: item?.itemNo || idx + 1,
        description: item?.description || '',
        materialCode: item?.materialCode || '',
        unit: item?.unit || 'EA',
        quantity: parseNumericValue(item?.quantity) || 1,
        unitPrice: parseNumericValue(item?.unitPrice),
        totalPrice: parseNumericValue(item?.totalPrice),
        discount: parseNumericValue(item?.discount),
        vat: parseNumericValue(item?.vat)
      })) : [];
      
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
      
      return {
        supplier: {
          name: q?.supplier?.name || `Supplier ${index + 1}`,
          address: q?.supplier?.address || '',
          contact: q?.supplier?.contact || '',
          phone: q?.supplier?.phone || '',
          email: q?.supplier?.email || ''
        },
        quotation: {
          reference: q?.quotation?.reference || `Q-${index + 1}`,
          date: q?.quotation?.date || new Date().toISOString().split('T')[0],
          validityDays: parseNumericValue(q?.quotation?.validityDays) || 30
        },
        items,
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
        }
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

    // Build reliable item comparison matrix with fuzzy matching for item descriptions
    const buildItemComparisonMatrix = (quotations: any[]) => {
      const supplierNames = quotations.map(q => q.supplier.name);
      
      // Normalize description for matching
      const normalizeDesc = (desc: string): string => {
        return (desc || '')
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      // Calculate similarity between two descriptions (Jaccard + prefix)
      const similarity = (a: string, b: string): number => {
        const tokensA = new Set(normalizeDesc(a).split(' ').filter(t => t.length > 2));
        const tokensB = new Set(normalizeDesc(b).split(' ').filter(t => t.length > 2));
        if (tokensA.size === 0 || tokensB.size === 0) return 0;
        
        const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
        const union = new Set([...tokensA, ...tokensB]);
        const jaccard = intersection.size / union.size;
        
        // Prefix bonus
        const normA = normalizeDesc(a);
        const normB = normalizeDesc(b);
        const prefixLen = Math.min(normA.length, normB.length, 30);
        const prefixMatch = normA.substring(0, prefixLen) === normB.substring(0, prefixLen) ? 0.2 : 0;
        
        return Math.min(jaccard + prefixMatch, 1);
      };
      
      // Canonical items with fuzzy matching
      const canonicalItems: Array<{
        description: string;
        normalizedKey: string;
        unit: string;
        suppliers: Record<string, { unitPrice: number; quantity: number; total: number; unit?: string }>;
      }> = [];
      
      const SIMILARITY_THRESHOLD = 0.65;
      
      quotations.forEach(q => {
        const supplierName = q.supplier.name;
        (q.items || []).forEach((item: any) => {
          const rawDesc = (item.description || '').trim();
          if (!rawDesc) return;
          
          const itemUnit = (item.unit || 'EA').toUpperCase();
          const unitPrice = parseNumericValue(item.unitPrice);
          const quantity = parseNumericValue(item.quantity) || 1;
          const total = parseNumericValue(item.totalPrice) || (unitPrice * quantity);
          
          // Find best matching canonical item
          let bestMatch = -1;
          let bestScore = 0;
          for (let i = 0; i < canonicalItems.length; i++) {
            const score = similarity(rawDesc, canonicalItems[i].description);
            if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
              bestScore = score;
              bestMatch = i;
            }
          }
          
          if (bestMatch >= 0) {
            // Add to existing canonical item
            canonicalItems[bestMatch].suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            // Use longer description as canonical
            if (rawDesc.length > canonicalItems[bestMatch].description.length) {
              canonicalItems[bestMatch].description = rawDesc.substring(0, 100);
            }
          } else {
            // Create new canonical item
            const newItem = {
              description: rawDesc.substring(0, 100),
              normalizedKey: normalizeDesc(rawDesc),
              unit: itemUnit,
              suppliers: Object.fromEntries(supplierNames.map(n => [n, { unitPrice: 0, quantity: 0, total: 0, unit: 'EA' }]))
            };
            newItem.suppliers[supplierName] = { unitPrice, quantity, total, unit: itemUnit };
            canonicalItems.push(newItem);
          }
        });
      });
      
      // Convert to result array with lowest/avg calculations
      return canonicalItems.map(data => {
        const quantities = Object.values(data.suppliers).map(s => s.quantity).filter(q => q > 0);
        const quantity = quantities.length > 0 ? quantities[0] : 1;
        
        const lineTotals = Object.values(data.suppliers)
          .map(s => s.unitPrice > 0 ? (quantity * s.unitPrice) : 0)
          .filter(t => t > 0);
        
        const lowestTotal = lineTotals.length > 0 ? Math.min(...lineTotals) : 0;
        const averageTotal = lineTotals.length > 0 ? lineTotals.reduce((a, b) => a + b, 0) / lineTotals.length : 0;
        
        const lowestSupplier = Object.entries(data.suppliers)
          .find(([_, v]) => v.unitPrice > 0 && (quantity * v.unitPrice) === lowestTotal)?.[0] || '';
        
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
    console.log(`Built item comparison matrix with ${itemComparisonMatrix.length} items`);

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

function createPlaceholderQuotation(fileName: string, index: number, companySettings: any) {
  return {
    supplier: { 
      name: fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '), 
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
    }
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
      notes: ['AI analysis completed', 'Manual verification recommended', 'Verify all prices and specifications'],
      actionItems: ['Verify extracted data against original documents', 'Compare specifications in detail', 'Negotiate with preferred supplier']
    }
  };
}
