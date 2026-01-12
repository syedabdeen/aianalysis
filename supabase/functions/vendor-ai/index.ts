import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { action, imageBase64, vendorData, mimeType, fileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userContent: any[] = [];

    if (action === "extract_document" || action === "extract_document_advanced") {
      systemPrompt = `You are an expert document data extractor for procurement systems. Extract information from the provided document and return it as valid JSON.

First, classify the document into one of these categories:
- trade_license: Trade License / Commercial Registration
- establishment_card: Establishment Card
- vat_certificate: VAT / Tax Certificate
- insurance: Insurance Certificate
- bank_details: Bank Letter / Bank Details
- compliance_certificate: Compliance Certificate
- quality_certification: Quality Certification (ISO, etc.)
- identity_document: ID / Passport / Emirates ID
- contract_agreement: Contract or Agreement
- miscellaneous: Other documents

Then extract all relevant fields based on document type:

For Trade License: company_name_en, company_name_ar, trade_license_no, trade_license_expiry, issue_date, activity, address, issuing_authority
For VAT Certificate: company_name, tax_registration_no (TRN), issue_date, vat_category
For Bank Details: bank_name, branch, iban, account_number, swift_code, account_name
For Insurance: policy_number, coverage_type, start_date, end_date, insured_name

Return JSON with this structure:
{
  "classification": "document_type",
  "confidence": 85,
  "extracted_fields": [
    {"key": "field_name", "value": "extracted_value", "confidence": 90, "fieldType": "text|date|number"}
  ],
  "suggestedMappings": [
    {"vendorField": "company_name_en", "extractedValue": "value", "confidence": 85}
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, just raw JSON.`;

      // Build the document content for the model
      const isImage = mimeType?.startsWith('image/');
      const isPDF = mimeType === 'application/pdf';
      
      console.log(`Processing document: ${fileName}, type: ${mimeType}, isImage: ${isImage}, isPDF: ${isPDF}`);
      
      if (imageBase64) {
        if (isImage || isPDF) {
          userContent = [
            { type: "text", text: `Extract all relevant business information from this document (${fileName}). The document type is ${mimeType}. Return ONLY valid JSON, no markdown formatting.` },
            { type: "image_url", image_url: { url: imageBase64 } }
          ];
        } else {
          try {
            const base64Data = imageBase64.split(',')[1] || imageBase64;
            const textContent = atob(base64Data);
            userContent = [
              { type: "text", text: `Extract all relevant business information from this document content:\n\nFilename: ${fileName}\n\nContent:\n${textContent}\n\nReturn ONLY valid JSON, no markdown formatting.` }
            ];
          } catch {
            userContent = [
              { type: "text", text: `Document filename: ${fileName}. Unable to read content. Return empty extraction result as JSON.` }
            ];
          }
        }
      } else {
        throw new Error("No document content provided");
      }

    } else if (action === "calculate_risk") {
      systemPrompt = `You are a vendor risk assessment AI for procurement systems. Analyze the vendor profile and provide a risk assessment.

Evaluate based on:
1. Document completeness (trade license, tax certificate, bank details)
2. Document expiry dates (warn if expiring soon or expired)
3. Profile completeness (contact info, address, etc.)
4. Business type and industry risk factors

Return a JSON object with:
- risk_score: number between 0-100 (0 = lowest risk, 100 = highest risk)
- risk_level: "low" | "medium" | "high"
- risk_factors: array of identified risk factors
- recommendations: array of recommended actions
- summary: brief risk assessment summary in English
- summary_ar: brief risk assessment summary in Arabic

Return ONLY valid JSON, no markdown.`;

      userContent = [
        { type: "text", text: `Analyze this vendor profile and provide risk assessment:\n\n${JSON.stringify(vendorData, null, 2)}` }
      ];

    } else {
      throw new Error("Invalid action. Use 'extract_document', 'extract_document_advanced', or 'calculate_risk'");
    }

    console.log(`Processing ${action} request...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("AI response received:", content?.substring(0, 200));

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    let parsedResult;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedResult = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      parsedResult = { 
        classification: "miscellaneous",
        confidence: 0,
        extracted_fields: [],
        suggestedMappings: [],
        raw_response: content, 
        parse_error: true 
      };
    }

    console.log(`${action} completed successfully`);

    return new Response(JSON.stringify({ result: parsedResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("vendor-ai error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" },
    });
  }
});
