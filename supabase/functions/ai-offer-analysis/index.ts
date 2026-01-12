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
      
      const extractionPrompt = `You are an expert procurement analyst. Analyze this supplier quotation and extract ALL information.

CRITICAL: Extract NUMERIC values only for prices. No currency symbols or commas.

Extract:
1. SUPPLIER: name, address, contact, phone, email
2. QUOTATION: reference number, date (YYYY-MM-DD), validity days
3. LINE ITEMS: itemNo, description, unit, quantity, unitPrice (NUMERIC), totalPrice (NUMERIC)
4. COMMERCIAL: subtotal (NUMERIC), tax (NUMERIC), total (NUMERIC), currency, deliveryTerms, paymentTerms, deliveryDays
5. TECHNICAL: specifications, brand, model, warranty, compliance, origin

PRICE EXTRACTION RULES:
- Return 15000.00 NOT "AED 15,000"
- Return 1234.56 NOT "$1,234.56"
- If unknown, return 0

Return ONLY valid JSON:
{
  "supplier": { "name": "", "address": "", "contact": "", "phone": "", "email": "" },
  "quotation": { "reference": "", "date": "", "validityDays": 30 },
  "items": [{ "itemNo": 1, "description": "", "unit": "EA", "quantity": 1, "unitPrice": 0, "totalPrice": 0 }],
  "commercial": { "subtotal": 0, "tax": 0, "total": 0, "currency": "${companySettings?.currency || 'AED'}", "deliveryTerms": "", "paymentTerms": "", "deliveryDays": 0 },
  "technical": { "specifications": [], "brand": "", "model": "", "warranty": "", "compliance": [], "origin": "" }
}`;

      const messages: any[] = [
        { role: 'system', content: 'Extract quotation data accurately. Return ONLY valid JSON.' },
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
          content: `${extractionPrompt}\n\nDocument "${file.name}":\n${file.text.substring(0, 50000)}`
        });
      } else if (file.data) {
        // Limit base64 data to 150KB for faster processing
        const dataToUse = file.data.substring(0, 150000);
        messages.push({
          role: 'user',
          content: `${extractionPrompt}\n\nDocument "${file.name}":\n${dataToUse}`
        });
      } else {
        console.warn(`No content available for ${file.name}`);
        return createPlaceholderQuotation(file.name, index + 1, companySettings);
      }

      try {
        // Use faster model for extraction with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite', // Faster model for extraction
            max_completion_tokens: 3000,
            messages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!extractionResponse.ok) {
          const errorText = await extractionResponse.text();
          console.error(`AI extraction error for ${file.name}:`, errorText);
          return createPlaceholderQuotation(file.name, index + 1, companySettings);
        }

        const extractionData = await extractionResponse.json();
        const content = extractionData.choices?.[0]?.message?.content || '';
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          console.log(`Successfully extracted data from ${file.name}`);
          return extracted;
        } else {
          console.error(`No JSON found in response for ${file.name}`);
          return createPlaceholderQuotation(file.name, index + 1, companySettings);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          console.error(`Extraction timeout for ${file.name}`);
        } else {
          console.error(`Failed to process ${file.name}:`, e);
        }
        return createPlaceholderQuotation(file.name, index + 1, companySettings);
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

    return new Response(
      JSON.stringify({
        success: true,
        extractedQuotations: validatedQuotations,
        analysis,
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
