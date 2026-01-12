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
    const { inputType, textDescription, technicalSpecs, imageData, companySettings } = await req.json();

    if (inputType === 'text' && !textDescription) {
      return new Response(
        JSON.stringify({ error: 'Product description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (inputType === 'image' && !imageData) {
      return new Response(
        JSON.stringify({ error: 'Product image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const region = companySettings?.region || 'middle_east';
    const country = companySettings?.country || 'UAE';
    const currency = companySettings?.currency || 'AED';

    console.log(`Analyzing product for region: ${region}, country: ${country}`);

    // Build the analysis prompt
    const analysisPrompt = `You are an expert industrial product analyst and market researcher. Analyze the product and provide comprehensive market intelligence.

${inputType === 'text' ? `Product Description: ${textDescription}` : 'Product image provided.'}
${technicalSpecs ? `Additional Technical Specifications: ${technicalSpecs}` : ''}

Company Region: ${region}
Company Country: ${country}
Currency: ${currency}

Provide a detailed analysis in the following JSON format:
{
  "product": {
    "name": "Exact product name",
    "category": "Product category",
    "description": "Detailed product description"
  },
  "specifications": {
    "material": "Construction material",
    "dimensions": "Size/dimensions",
    "power": "Power requirements if applicable",
    "capacity": "Capacity/rating if applicable",
    "standards": ["ISO XXXX", "EN XXXX", "etc"],
    "alternatives": ["Alternative product 1", "Alternative product 2"]
  },
  "manufacturers": [
    {
      "name": "Company/Manufacturer name",
      "country": "Country",
      "address": "Full street address with city and postal code",
      "website": "https://www.example.com",
      "email": "sales@example.com",
      "phone": "+971 4 XXX XXXX",
      "mobile": "+971 50 XXX XXXX",
      "salesPerson": "John Smith / Sales Manager",
      "department": "Sales Department",
      "rating": 4.5,
      "isRegional": true
    }
  ],
  "suppliers": [
    {
      "name": "Supplier/Distributor name",
      "city": "City name",
      "address": "Full street address with building name, area, city",
      "website": "https://www.supplier.com",
      "email": "info@supplier.com",
      "phone": "+971 4 XXX XXXX",
      "mobile": "+971 55 XXX XXXX",
      "salesPerson": "Ahmed Hassan / Account Manager",
      "contactPerson": "Main contact name",
      "department": "Sales / Procurement",
      "isLocal": true
    }
  ],
  "marketSummary": {
    "priceRange": { "min": 0, "max": 0, "currency": "${currency}" },
    "availability": "high|medium|low",
    "leadTime": "X-Y weeks",
    "recommendation": "Detailed recommendation text",
    "risks": ["Risk 1", "Risk 2"]
  }
}

CRITICAL REQUIREMENTS:
1. Include at least 4-6 REAL global manufacturers with ACTUAL contact details (prioritize those with offices in ${region})
2. Include at least 4-6 REAL local/regional suppliers and distributors in ${country} or nearby GCC countries
3. Provide REALISTIC price ranges in ${currency} based on market rates
4. Include REAL company information - actual websites, phone numbers, emails that exist
5. Include sales contact person names where possible (use typical regional names)
6. Include both office phone and mobile numbers where available
7. Flag manufacturers and suppliers that are regional/local with isRegional/isLocal = true
8. For ${region} region, prioritize suppliers from UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman`;

    const messages: any[] = [
      { role: 'system', content: 'You are an expert industrial product analyst with deep knowledge of global manufacturing and regional supply chains.' },
    ];

    if (inputType === 'image' && imageData) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: analysisPrompt
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to analyze product');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      // Create default analysis
      analysis = {
        product: {
          name: textDescription || 'Product',
          category: 'Industrial Equipment',
          description: 'Product analysis in progress'
        },
        specifications: {
          material: 'Various',
          dimensions: 'Standard',
          standards: [],
          alternatives: []
        },
        manufacturers: [
          {
            name: 'Please refine your search',
            country: country,
            address: '',
            isRegional: true
          }
        ],
        suppliers: [
          {
            name: 'Local suppliers available',
            city: country,
            address: '',
            isLocal: true
          }
        ],
        marketSummary: {
          priceRange: { min: 0, max: 0, currency },
          availability: 'medium',
          leadTime: '2-4 weeks',
          recommendation: 'Please provide more details for accurate analysis',
          risks: ['Limited information provided']
        }
      };
    }

    console.log('Market analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in ai-market-analysis:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
