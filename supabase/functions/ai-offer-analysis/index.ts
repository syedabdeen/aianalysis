import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Process each file and extract data using AI
    const extractedQuotations: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      const extractionPrompt = `You are an expert procurement analyst specializing in quotation analysis. Analyze this supplier quotation document thoroughly and extract ALL information with maximum detail.

CRITICAL: Extract every piece of data visible in the document. Do not skip any items or details.

Extract and structure the following:

1. SUPPLIER INFORMATION:
   - Company/Supplier name (exact as written)
   - Full address
   - Contact person name
   - Phone/Fax numbers
   - Email address
   - Website if available

2. QUOTATION DETAILS:
   - Quotation/Reference number
   - Date of quotation
   - Validity period (in days)
   - Revision number if any

3. LINE ITEMS (Extract EVERY item):
   - Item/Line number
   - Full description (include all specs in description)
   - Material/Part code if mentioned
   - Unit of measure
   - Quantity
   - Unit price (numeric value only)
   - Total price per line
   - Any discount mentioned
   - VAT/Tax per item if shown

4. COMMERCIAL TERMS:
   - Subtotal before tax
   - Tax/VAT amount
   - Grand Total
   - Currency (detect from document or use ${companySettings?.currency || 'AED'})
   - Delivery terms (FOB, CIF, EXW, DDP, etc.)
   - Payment terms (Net 30, LC, etc.)
   - Estimated delivery time in days
   - Incoterms if mentioned

5. TECHNICAL SPECIFICATIONS:
   - All specifications mentioned
   - Brand name
   - Model number
   - Warranty period and terms
   - Certifications/Compliance (ISO, CE, etc.)
   - Country of origin
   - Any deviations from requirements
   - Technical notes/remarks

Return ONLY a valid JSON object with this exact structure:
{
  "supplier": { 
    "name": "supplier company name", 
    "address": "full address", 
    "contact": "contact person", 
    "phone": "phone number",
    "email": "email address" 
  },
  "quotation": { 
    "reference": "quote number", 
    "date": "YYYY-MM-DD", 
    "validityDays": 30 
  },
  "items": [
    { 
      "itemNo": 1, 
      "description": "full item description with specs", 
      "materialCode": "part code if any", 
      "unit": "EA/PC/SET/etc", 
      "quantity": 1, 
      "unitPrice": 0.00, 
      "totalPrice": 0.00, 
      "discount": 0, 
      "vat": 0 
    }
  ],
  "commercial": { 
    "subtotal": 0.00, 
    "tax": 0.00, 
    "total": 0.00, 
    "currency": "AED", 
    "deliveryTerms": "FOB/CIF/etc", 
    "paymentTerms": "payment terms", 
    "deliveryDays": 0,
    "incoterms": "if mentioned"
  },
  "technical": { 
    "specifications": ["spec1", "spec2"], 
    "brand": "brand name", 
    "model": "model number", 
    "warranty": "warranty details", 
    "compliance": ["ISO 9001", "CE"], 
    "origin": "country",
    "deviations": ["any deviations from requirements"],
    "remarks": "additional technical notes"
  }
}`;

      const messages: any[] = [
        { role: 'system', content: 'You are an expert procurement document analyzer with extensive experience in extracting data from supplier quotations. Extract ALL data accurately and completely. Never skip items or abbreviate information.' },
      ];

      // Handle different file types
      if (file.type.includes('image') || file.data.startsWith('data:image')) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: extractionPrompt },
            { type: 'image_url', image_url: { url: file.data } }
          ]
        });
      } else {
        // For non-image files, extract text content
        messages.push({
          role: 'user',
          content: `${extractionPrompt}\n\nDocument content from file "${file.name}":\n${file.data}`
        });
      }

      try {
        const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages,
          }),
        });

        if (!extractionResponse.ok) {
          const errorText = await extractionResponse.text();
          console.error(`AI extraction error for ${file.name}:`, errorText);
          // Continue with placeholder instead of failing
          extractedQuotations.push(createPlaceholderQuotation(file.name, i + 1, companySettings));
          continue;
        }

        const extractionData = await extractionResponse.json();
        const content = extractionData.choices?.[0]?.message?.content || '';
        
        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          extractedQuotations.push(extracted);
          console.log(`Successfully extracted data from ${file.name}`);
        } else {
          console.error(`No JSON found in response for ${file.name}`);
          extractedQuotations.push(createPlaceholderQuotation(file.name, i + 1, companySettings));
        }
      } catch (e) {
        console.error(`Failed to process ${file.name}:`, e);
        extractedQuotations.push(createPlaceholderQuotation(file.name, i + 1, companySettings));
      }
    }

    console.log(`Extracted data from ${extractedQuotations.length} quotations`);

    // Validate and normalize all extracted quotations
    const validatedQuotations = extractedQuotations.map((q, index) => ({
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
        validityDays: q?.quotation?.validityDays || 30
      },
      items: Array.isArray(q?.items) ? q.items.map((item: any, idx: number) => ({
        itemNo: item?.itemNo || idx + 1,
        description: item?.description || '',
        materialCode: item?.materialCode || '',
        unit: item?.unit || 'EA',
        quantity: Number(item?.quantity) || 0,
        unitPrice: Number(item?.unitPrice) || 0,
        totalPrice: Number(item?.totalPrice) || 0,
        discount: Number(item?.discount) || 0,
        vat: Number(item?.vat) || 0
      })) : [],
      commercial: {
        subtotal: Number(q?.commercial?.subtotal) || 0,
        tax: Number(q?.commercial?.tax) || 0,
        total: Number(q?.commercial?.total) || 0,
        currency: q?.commercial?.currency || companySettings?.currency || 'AED',
        deliveryTerms: q?.commercial?.deliveryTerms || '',
        paymentTerms: q?.commercial?.paymentTerms || '',
        deliveryDays: Number(q?.commercial?.deliveryDays) || 0,
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
    }));

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
