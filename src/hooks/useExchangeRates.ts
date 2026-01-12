import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExchangeRate, convertCurrency, getConversionRate } from "@/lib/currency";

export const useExchangeRates = () => {
  const queryClient = useQueryClient();

  const { data: rates = [], isLoading, error } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("*")
        .order("base_currency");

      if (error) throw error;
      return data as ExchangeRate[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const refreshRates = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-exchange-rates");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
    },
  });

  const convert = (amount: number, from: string, to: string): number | null => {
    return convertCurrency(amount, from, to, rates);
  };

  const getRate = (from: string, to: string): number | null => {
    return getConversionRate(from, to, rates);
  };

  const getRateAge = (): string | null => {
    if (!rates.length) return null;
    const oldest = rates.reduce((min, r) => {
      const date = new Date(r.fetched_at);
      return date < min ? date : min;
    }, new Date());
    
    const now = new Date();
    const hours = Math.floor((now.getTime() - oldest.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return "Less than 1 hour ago";
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return {
    rates,
    isLoading,
    error,
    convert,
    getRate,
    getRateAge,
    refreshRates: refreshRates.mutate,
    isRefreshing: refreshRates.isPending,
  };
};
