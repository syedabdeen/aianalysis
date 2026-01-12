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
    const { text, fields } = await req.json();
    
    // Handle single text or multiple fields
    const textsToTranslate = fields || (text ? [{ key: 'text', value: text }] : []);
    
    if (textsToTranslate.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No text provided for translation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Translating texts to Arabic:', textsToTranslate.length, 'fields');

    const systemPrompt = `You are a professional translator specializing in English to Arabic translation for business and corporate contexts. Translate the given texts accurately while maintaining professional tone and business terminology.

IMPORTANT: Return ONLY a valid JSON object with the translated texts. The JSON must have the exact same keys as the input, with Arabic translations as values.`;

    const userContent = textsToTranslate.map((item: { key: string; value: string }) => 
      `${item.key}: ${item.value}`
    ).join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate the following texts to Arabic and return as JSON:\n\n${userContent}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    let translations: Record<string, string>;
    try {
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      translations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse translation response:', parseError);
      // Return original texts as fallback
      translations = {};
      textsToTranslate.forEach((item: { key: string; value: string }) => {
        translations[item.key] = item.value;
      });
    }

    console.log('Translation completed successfully');

    return new Response(
      JSON.stringify({ success: true, translations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-arabic function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
