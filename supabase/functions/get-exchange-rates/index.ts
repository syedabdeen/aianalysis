import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Supported currencies
const CURRENCIES = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'INR', 'PKR', 'EGP', 'CNY', 'JPY'];

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if rates are still fresh (less than 24 hours old)
    const { data: existingRates } = await supabase
      .from('exchange_rates')
      .select('fetched_at')
      .limit(1)
      .single();

    if (existingRates) {
      const fetchedAt = new Date(existingRates.fetched_at);
      const now = new Date();
      const hoursSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceFetch < 24) {
        // Return existing rates
        const { data: rates } = await supabase
          .from('exchange_rates')
          .select('*');
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            rates, 
            cached: true,
            message: `Rates are ${Math.round(hoursSinceFetch)} hours old` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch fresh rates from free API (using USD as base)
    // Using exchangerate-api.com free tier
    const apiUrl = 'https://api.exchangerate-api.com/v4/latest/USD';
    
    console.log('Fetching exchange rates from API...');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    const apiRates = data.rates;

    // Build exchange rate records
    const now = new Date().toISOString();
    const rateRecords: Array<{
      base_currency: string;
      target_currency: string;
      rate: number;
      fetched_at: string;
    }> = [];

    // Create rates from USD to all currencies
    for (const currency of CURRENCIES) {
      if (apiRates[currency]) {
        rateRecords.push({
          base_currency: 'USD',
          target_currency: currency,
          rate: apiRates[currency],
          fetched_at: now,
        });
      }
    }

    // Create cross rates for common pairs
    const baseCurrencies = ['AED', 'EUR', 'GBP'];
    for (const base of baseCurrencies) {
      if (!apiRates[base]) continue;
      
      for (const target of CURRENCIES) {
        if (base === target || !apiRates[target]) continue;
        
        // Calculate cross rate via USD
        const rate = apiRates[target] / apiRates[base];
        rateRecords.push({
          base_currency: base,
          target_currency: target,
          rate,
          fetched_at: now,
        });
      }
    }

    // Upsert rates to database
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert(rateRecords, {
        onConflict: 'base_currency,target_currency',
      });

    if (upsertError) {
      console.error('Error upserting rates:', upsertError);
      throw new Error('Failed to save exchange rates');
    }

    console.log(`Updated ${rateRecords.length} exchange rates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        rates: rateRecords,
        cached: false,
        message: `Updated ${rateRecords.length} exchange rates` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-exchange-rates:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
