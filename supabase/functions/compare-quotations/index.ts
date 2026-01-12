import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Secure CORS - restrict to allowed origins
const getAllowedOrigins = (): string[] => {
  const origins = [
    'https://procuremind.com',
    'https://www.procuremind.com',
    'https://0b762ee2-5a0e-4d35-a836-8d0aa2d5a8c9.lovableproject.com',
  ];
  
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN');
  if (customOrigin) origins.push(customOrigin);
  
  const env = Deno.env.get('ENVIRONMENT');
  if (env !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
  }
  
  return origins.filter(Boolean);
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.some(o => origin.startsWith(o));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rfqId } = await req.json();

    if (!rfqId) {
      throw new Error('RFQ ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch RFQ with items
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('*')
      .eq('id', rfqId)
      .single();

    if (rfqError) throw rfqError;

    // Fetch RFQ items
    const { data: rfqItems, error: itemsError } = await supabase
      .from('rfq_items')
      .select('*')
      .eq('rfq_id', rfqId);

    if (itemsError) throw itemsError;

    // Fetch vendor quotations with vendor details
    const { data: rfqVendors, error: vendorsError } = await supabase
      .from('rfq_vendors')
      .select(`
        *,
        vendor:vendors(id, company_name_en, company_name_ar, rating_score, risk_score)
      `)
      .eq('rfq_id', rfqId)
      .eq('quotation_received', true);

    if (vendorsError) throw vendorsError;

    // Fetch prices for each vendor
    const vendorQuotations = await Promise.all(
      rfqVendors.map(async (rv) => {
        const { data: prices } = await supabase
          .from('rfq_vendor_prices')
          .select('*')
          .eq('rfq_vendor_id', rv.id);

        return {
          ...rv,
          prices: prices || [],
        };
      })
    );

    // Build comparison data
    const comparisonData = {
      rfq: {
        code: rfq.code,
        title: rfq.title_en,
        type: rfq.procurement_type,
        itemCount: rfqItems?.length || 0,
      },
      items: rfqItems?.map(item => ({
        id: item.id,
        description: item.description_en,
        quantity: item.quantity,
        unit: item.unit,
      })),
      vendors: vendorQuotations.map(vq => ({
        vendorId: vq.vendor?.id,
        vendorName: vq.vendor?.company_name_en,
        totalAmount: vq.total_amount,
        currency: vq.currency,
        deliveryDays: vq.delivery_days,
        paymentTerms: vq.payment_terms,
        validityDays: vq.validity_days,
        technicalScore: vq.technical_score,
        commercialScore: vq.commercial_score,
        ratingScore: vq.vendor?.rating_score,
        riskScore: vq.vendor?.risk_score,
        itemPrices: vq.prices.map((p: any) => ({
          itemId: p.rfq_item_id,
          unitPrice: p.unit_price,
          totalPrice: p.total_price,
        })),
      })),
    };

    // Use Lovable AI for comparison analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';

    const prompt = `You are a procurement expert analyzing vendor quotations for an RFQ. Analyze the following quotation data and provide:

1. **Price Comparison**: Compare total prices across vendors
2. **Value Analysis**: Consider price per item, delivery terms, payment terms
3. **Risk Assessment**: Consider vendor ratings and risk scores
4. **Recommendation**: Recommend the best vendor with clear justification

RFQ Details:
- Code: ${comparisonData.rfq.code}
- Title: ${comparisonData.rfq.title}
- Type: ${comparisonData.rfq.type}
- Items: ${comparisonData.rfq.itemCount}

Vendor Quotations:
${JSON.stringify(comparisonData.vendors, null, 2)}

Items Being Quoted:
${JSON.stringify(comparisonData.items, null, 2)}

Provide your analysis in the following JSON format:
{
  "summary": "Brief executive summary of the comparison",
  "priceComparison": {
    "lowestBidder": "Vendor name",
    "lowestAmount": 0,
    "highestBidder": "Vendor name", 
    "highestAmount": 0,
    "priceDifferencePercent": 0
  },
  "vendorAnalysis": [
    {
      "vendorName": "string",
      "strengths": ["list of strengths"],
      "weaknesses": ["list of weaknesses"],
      "overallScore": 0-100
    }
  ],
  "recommendation": {
    "recommendedVendor": "Vendor name",
    "vendorId": "uuid",
    "justification": "Detailed justification",
    "alternativeVendor": "Second best vendor name",
    "riskFactors": ["list of risks to consider"]
  }
}`;

    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a procurement analysis expert. Always respond with valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Keep the same error shape the frontend expects
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = analysisText.match(/```json\n?([\s\S]*?)\n?```/) || 
                        analysisText.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        summary: analysisText,
        error: 'Failed to parse structured analysis'
      };
    }

    // Store the comparison results in the RFQ
    const { error: updateError } = await supabase
      .from('rfqs')
      .update({
        ai_comparison: comparisonData,
        ai_recommendation: JSON.stringify(analysis),
      })
      .eq('id', rfqId);

    if (updateError) {
      console.error('Failed to update RFQ:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        comparison: comparisonData,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compare-quotations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
