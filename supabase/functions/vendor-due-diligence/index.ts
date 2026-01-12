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
    const { vendorName, country } = await req.json();
    
    if (!vendorName) {
      return new Response(
        JSON.stringify({ error: 'Vendor name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Performing AI due diligence for vendor:', vendorName);

    const systemPrompt = `You are an expert business intelligence analyst specializing in vendor due diligence and corporate research. Your task is to analyze a company and provide a comprehensive due diligence report.

For the given company name, provide a detailed analysis including:
1. Company Overview - Background summary, business description
2. Business Status - Current operational status, years in business (estimated)
3. Global Presence - Geographic footprint, international operations
4. Risk Assessment - Potential risks, red flags, compliance concerns
5. Financial Indicators - Revenue estimates, financial health indicators (if publicly available)
6. Market Reputation - Industry standing, customer reviews, awards
7. Contact Information - Official website, headquarters address, phone (if publicly available)
8. Key Personnel - Leadership team, key executives (if publicly available)

IMPORTANT: You must return ONLY a valid JSON object with this exact structure:
{
  "companyOverview": {
    "summary": "string",
    "businessDescription": "string",
    "yearsFounded": "string or number",
    "industry": "string"
  },
  "businessStatus": {
    "operationalStatus": "Active/Inactive/Unknown",
    "estimatedYearsInBusiness": "string",
    "registrationStatus": "string"
  },
  "globalPresence": {
    "headquarters": "string",
    "countries": ["array of country names"],
    "internationalOperations": "string description"
  },
  "riskAssessment": {
    "overallRiskLevel": "Low/Medium/High/Unknown",
    "riskFactors": ["array of risk factors"],
    "complianceConcerns": ["array of concerns"],
    "recommendations": ["array of recommendations"]
  },
  "financialIndicators": {
    "estimatedRevenue": "string",
    "financialHealth": "string",
    "creditRating": "string if available"
  },
  "marketReputation": {
    "industryStanding": "string",
    "customerFeedback": "string",
    "awards": ["array of awards if any"]
  },
  "contactInformation": {
    "website": "string or null",
    "address": "string or null",
    "phone": "string or null",
    "email": "string or null"
  },
  "keyPersonnel": [
    {
      "name": "string",
      "position": "string"
    }
  ],
  "analysisDate": "ISO date string",
  "confidenceLevel": "High/Medium/Low",
  "dataDisclaimer": "string disclaimer about data accuracy"
}`;

    const userPrompt = `Please conduct a comprehensive due diligence analysis for the following vendor:

Company Name: ${vendorName}
${country ? `Country/Region: ${country}` : ''}

Provide a thorough business intelligence report based on your knowledge. If specific information is not available, provide reasonable estimates or indicate "Not Available". Focus on identifying any potential risks or red flags.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let reportData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      reportData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Return a structured error response
      reportData = {
        companyOverview: {
          summary: content.substring(0, 500),
          businessDescription: 'Unable to parse structured data',
          yearsFounded: 'Unknown',
          industry: 'Unknown'
        },
        businessStatus: {
          operationalStatus: 'Unknown',
          estimatedYearsInBusiness: 'Unknown',
          registrationStatus: 'Unknown'
        },
        globalPresence: {
          headquarters: country || 'Unknown',
          countries: [],
          internationalOperations: 'Unknown'
        },
        riskAssessment: {
          overallRiskLevel: 'Unknown',
          riskFactors: ['Unable to complete full analysis'],
          complianceConcerns: [],
          recommendations: ['Manual verification recommended']
        },
        financialIndicators: {
          estimatedRevenue: 'Not Available',
          financialHealth: 'Unknown',
          creditRating: 'Not Available'
        },
        marketReputation: {
          industryStanding: 'Unknown',
          customerFeedback: 'Not Available',
          awards: []
        },
        contactInformation: {
          website: null,
          address: null,
          phone: null,
          email: null
        },
        keyPersonnel: [],
        analysisDate: new Date().toISOString(),
        confidenceLevel: 'Low',
        dataDisclaimer: 'This analysis could not be fully completed. Please verify information manually.'
      };
    }

    // Ensure required fields exist
    reportData.analysisDate = reportData.analysisDate || new Date().toISOString();
    reportData.vendorName = vendorName;
    reportData.dataDisclaimer = reportData.dataDisclaimer || 
      'This report is generated using AI and publicly available information. All data should be independently verified before making business decisions.';

    console.log('Due diligence analysis completed successfully');

    return new Response(
      JSON.stringify({ success: true, report: reportData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in vendor-due-diligence function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
