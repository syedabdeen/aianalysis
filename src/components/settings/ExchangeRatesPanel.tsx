import { useEffect } from "react";
import { RefreshCw, TrendingUp, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useCompany } from "@/contexts/CompanyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCurrencySymbol } from "@/lib/currency";

export function ExchangeRatesPanel() {
  const { language } = useLanguage();
  const { defaultCurrency } = useCompany();
  const { rates, isLoading, error, refreshRates, isRefreshing, getRateAge, convert } = useExchangeRates();

  // Auto-fetch rates on mount if empty
  useEffect(() => {
    if (!isLoading && rates.length === 0 && !error) {
      refreshRates();
    }
  }, [isLoading, rates.length, error, refreshRates]);

  // Filter rates to show conversions from/to default currency
  const relevantRates = rates.filter(
    (rate) => rate.base_currency === defaultCurrency || rate.target_currency === defaultCurrency
  );

  // Get unique currencies for conversion table
  const targetCurrencies = [...new Set(relevantRates.map(r => 
    r.base_currency === defaultCurrency ? r.target_currency : r.base_currency
  ))].slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {language === "ar" ? "أسعار الصرف" : "Exchange Rates"}
              </CardTitle>
              <CardDescription>
                {language === "ar" 
                  ? `أسعار الصرف مقابل ${defaultCurrency}` 
                  : `Exchange rates against ${defaultCurrency}`}
              </CardDescription>
            </div>
            <Button 
              onClick={() => refreshRates()} 
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {language === "ar" ? "تحديث" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Last Updated */}
          {getRateAge() && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              {language === "ar" ? "آخر تحديث: " : "Last updated: "}
              {getRateAge()}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === "ar" 
                  ? "فشل في تحميل أسعار الصرف. يرجى المحاولة مرة أخرى." 
                  : "Failed to load exchange rates. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading || isRefreshing ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === "ar" ? "لا توجد أسعار صرف متاحة" : "No exchange rates available"}</p>
              <Button 
                onClick={() => refreshRates()} 
                variant="outline" 
                className="mt-4"
              >
                {language === "ar" ? "جلب الأسعار الآن" : "Fetch Rates Now"}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "العملة" : "Currency"}</TableHead>
                  <TableHead className="text-right">
                    {language === "ar" ? `1 ${defaultCurrency} =` : `1 ${defaultCurrency} =`}
                  </TableHead>
                  <TableHead className="text-right">
                    {language === "ar" ? `= 1 ${defaultCurrency}` : `= 1 ${defaultCurrency}`}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetCurrencies.map((currency) => {
                  const forwardRate = convert(1, defaultCurrency, currency);
                  const reverseRate = convert(1, currency, defaultCurrency);
                  
                  return (
                    <TableRow key={currency}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {getCurrencySymbol(currency)}
                          </Badge>
                          <span className="font-medium">{currency}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {forwardRate !== null ? forwardRate.toFixed(4) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {reverseRate !== null ? reverseRate.toFixed(4) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {language === "ar" ? "معلومات" : "Information"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            {language === "ar" 
              ? "• يتم تحديث أسعار الصرف تلقائياً كل 24 ساعة"
              : "• Exchange rates are automatically refreshed every 24 hours"}
          </p>
          <p>
            {language === "ar"
              ? "• الأسعار مرجعية فقط وقد تختلف عن أسعار البنوك"
              : "• Rates are for reference only and may differ from bank rates"}
          </p>
          <p>
            {language === "ar"
              ? `• العملة الافتراضية للنظام: ${defaultCurrency}`
              : `• System default currency: ${defaultCurrency}`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
