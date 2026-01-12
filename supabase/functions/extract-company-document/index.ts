import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

interface ExtractRequest {
  fileBase64: string;
  fileType: string;
  documentType: string;
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileBase64, fileType, documentType }: ExtractRequest = await req.json();

    console.log(`Processing ${documentType} document of type ${fileType}`);

    // Prepare the prompt based on document type
    let extractionPrompt = `Extract the following information from this ${documentType} document and return as JSON:`;
    
    if (documentType === "trade_license") {
      extractionPrompt += `
        - company_name: The company/business name
        - trade_license_number: The license number
        - trade_license_expiry: The expiry date (in YYYY-MM-DD format)
        - address: The registered address
        - phone: Contact phone number
        - email: Contact email if visible
      `;
    } else if (documentType === "vat_certificate") {
      extractionPrompt += `
        - company_name: The company name
        - vat_number: The VAT/TRN number
        - address: The registered address
      `;
    } else {
      extractionPrompt += `
        - company_name: The company name if visible
        - trade_license_number: Any license or registration number
        - address: Any address information
        - phone: Any phone number
        - email: Any email address
        - vat_number: Any VAT or tax number
      `;
    }

    extractionPrompt += `
      
      Return ONLY valid JSON with the extracted fields. Use null for fields that cannot be found.
      Example response: {"company_name": "ABC LLC", "trade_license_number": "123456", "trade_license_expiry": "2025-12-31", "address": "Dubai, UAE", "phone": null, "email": null}
    `;

    // Call Lovable AI for document extraction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: extractionPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileType};base64,${fileBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse));

    let extractedData: Record<string, unknown> = {};

    if (aiResponse.choices?.[0]?.message?.content) {
      const content = aiResponse.choices[0].message.content;
      // Try to parse JSON from the response
      try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, extractedData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in extract-company-document:", errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        extractedData: {} 
      }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" },
      }
    );
  }
});
