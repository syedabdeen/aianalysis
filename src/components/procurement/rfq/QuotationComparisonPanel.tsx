import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Sparkles, 
  Loader2, 
  Trophy, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle,
  FileCheck,
  DollarSign,
  Truck,
  Shield,
  Clock,
  Scale,
  MessageSquareWarning
} from 'lucide-react';
import { toast } from 'sonner';

interface QuotationComparisonPanelProps {
  rfqId: string;
  vendors: any[];
  items: any[];
}

export const QuotationComparisonPanel: React.FC<QuotationComparisonPanelProps> = ({
  rfqId,
  vendors,
  items,
}) => {
  const { language } = useLanguage();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [comparisonTab, setComparisonTab] = useState('commercial');

  const receivedVendors = vendors.filter(v => v.quotation_received);

  // Fetch linked PR to get non-recommended justification
  const { data: linkedPR } = useQuery({
    queryKey: ['linked-pr', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select(`
          id,
          code,
          non_recommended_justification,
          vendor_id,
          vendor:vendors(id, code, company_name_en, company_name_ar)
        `)
        .eq('rfq_id_linked', rfqId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!rfqId
  });

  const runAIComparison = async () => {
    if (receivedVendors.length < 2) {
      toast.error(language === 'ar' ? 'يجب أن يكون هناك عرضان على الأقل للمقارنة' : 'Need at least 2 quotations to compare');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('compare-quotations', {
        body: { rfqId },
      });

      if (error) throw error;
      
      setAnalysis(data.analysis);
      toast.success(language === 'ar' ? 'تم إكمال التحليل' : 'Analysis completed');
    } catch (error) {
      console.error('AI comparison error:', error);
      toast.error(language === 'ar' ? 'فشل في تحليل عروض الأسعار' : 'Failed to analyze quotations');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Build price comparison table
  const priceMatrix: Record<string, Record<string, number>> = {};
  receivedVendors.forEach(vendor => {
    priceMatrix[vendor.id] = {};
    vendor.prices?.forEach((price: any) => {
      priceMatrix[vendor.id][price.rfq_item_id] = price.unit_price;
    });
  });

  // Find lowest price for each item
  const lowestPrices: Record<string, { price: number; vendorId: string }> = {};
  items.forEach(item => {
    let lowest = Infinity;
    let lowestVendor = '';
    receivedVendors.forEach(vendor => {
      const price = priceMatrix[vendor.id]?.[item.id] || 0;
      if (price > 0 && price < lowest) {
        lowest = price;
        lowestVendor = vendor.id;
      }
    });
    if (lowest !== Infinity) {
      lowestPrices[item.id] = { price: lowest, vendorId: lowestVendor };
    }
  });

  // Calculate vendor scores for display
  const getOverallScore = (vendor: any) => {
    const tech = vendor.technical_score || 0;
    const comm = vendor.commercial_score || 0;
    return Math.round((tech * 0.4 + comm * 0.6));
  };

  return (
    <div className="space-y-6">
      {/* Analysis Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'مقارنة عروض الأسعار بالذكاء الاصطناعي' : 'AI Quotation Comparison'}
            </CardTitle>
            <Button onClick={runAIComparison} disabled={isAnalyzing || receivedVendors.length < 2}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'تشغيل التحليل' : 'Run Analysis'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {receivedVendors.length < 2 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{language === 'ar' ? 'عروض أسعار غير كافية' : 'Insufficient Quotations'}</AlertTitle>
              <AlertDescription>
                {language === 'ar' 
                  ? 'يجب استلام عرضي أسعار على الأقل لإجراء المقارنة.'
                  : 'At least 2 quotations must be received to run comparison.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `${receivedVendors.length} عروض أسعار جاهزة للمقارنة`
                : `${receivedVendors.length} quotations ready for comparison`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-Recommended Vendor Justification Alert */}
      {linkedPR?.non_recommended_justification && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <MessageSquareWarning className="h-5 w-5" />
              {language === 'ar' ? 'مبرر اختيار مورد غير موصى به' : 'Non-Recommended Vendor Selection Justification'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'المورد المختار:' : 'Selected Vendor:'}
                </span>
                <Badge variant="secondary">
                  {linkedPR.vendor?.code} - {language === 'ar' 
                    ? linkedPR.vendor?.company_name_ar 
                    : linkedPR.vendor?.company_name_en}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'طلب الشراء المرتبط:' : 'Linked PR:'}
                </span>
                <Badge variant="outline">{linkedPR.code}</Badge>
              </div>
              <div className="mt-3 p-3 bg-background rounded-md border">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                  {language === 'ar' ? 'المبرر:' : 'Justification:'}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {linkedPR.non_recommended_justification}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical & Commercial Comparison Tabs */}
      {receivedVendors.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ar' ? 'مقارنة تفصيلية' : 'Detailed Comparison'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={comparisonTab} onValueChange={setComparisonTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="commercial" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  {language === 'ar' ? 'تجاري' : 'Commercial'}
                </TabsTrigger>
                <TabsTrigger value="technical" className="gap-2">
                  <FileCheck className="h-4 w-4" />
                  {language === 'ar' ? 'فني' : 'Technical'}
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2">
                  <Truck className="h-4 w-4" />
                  {language === 'ar' ? 'التسليم' : 'Delivery'}
                </TabsTrigger>
              </TabsList>

              {/* Commercial Tab */}
              <TabsContent value="commercial" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">{language === 'ar' ? 'العنصر' : 'Item'}</TableHead>
                        <TableHead className="sticky left-0 bg-background">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        {receivedVendors.map(vendor => (
                          <TableHead key={vendor.id} className="text-center min-w-[120px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-medium">{vendor.vendor?.code}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {language === 'ar' ? vendor.vendor?.company_name_ar : vendor.vendor?.company_name_en}
                              </span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            {item.item_number}. {language === 'ar' ? item.description_ar : item.description_en}
                          </TableCell>
                          <TableCell className="sticky left-0 bg-background">{item.quantity}</TableCell>
                          {receivedVendors.map(vendor => {
                            const price = priceMatrix[vendor.id]?.[item.id] || 0;
                            const isLowest = lowestPrices[item.id]?.vendorId === vendor.id;
                            return (
                              <TableCell key={vendor.id} className="text-center">
                                {price > 0 ? (
                                  <span className={`inline-flex items-center gap-1 ${isLowest ? 'text-green-600 font-medium' : ''}`}>
                                    {isLowest && <TrendingDown className="h-3 w-3" />}
                                    {price.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell className="sticky left-0 bg-muted/50" colSpan={2}>
                          {language === 'ar' ? 'الإجمالي' : 'Total'}
                        </TableCell>
                        {receivedVendors.map(vendor => (
                          <TableCell key={vendor.id} className="text-center">
                            {vendor.total_amount?.toLocaleString() || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Payment Terms Summary */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                  {receivedVendors.map(vendor => (
                    <Card key={vendor.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-4 w-4 text-primary" />
                          <span className="font-medium">{vendor.vendor?.code}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}:</span>
                            <span>{vendor.payment_terms || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === 'ar' ? 'صلاحية العرض' : 'Validity'}:</span>
                            <span>{vendor.validity_days ? `${vendor.validity_days} ${language === 'ar' ? 'يوم' : 'days'}` : '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{language === 'ar' ? 'التقييم التجاري' : 'Commercial Score'}:</span>
                            <span className="font-medium">{vendor.commercial_score || '-'}/100</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Technical Tab */}
              <TabsContent value="technical" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {receivedVendors.map(vendor => (
                    <Card key={vendor.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{vendor.vendor?.code}</span>
                          <Badge variant={vendor.technical_score >= 70 ? 'default' : vendor.technical_score >= 50 ? 'secondary' : 'destructive'}>
                            {vendor.technical_score || 0}/100
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{language === 'ar' ? 'التقييم الفني' : 'Technical Score'}</span>
                            <span>{vendor.technical_score || 0}%</span>
                          </div>
                          <Progress value={vendor.technical_score || 0} className="h-2" />
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <span className="text-muted-foreground">{language === 'ar' ? 'الضمان' : 'Warranty'}:</span>
                              <p>{vendor.warranty_terms || vendor.warranty_days ? `${vendor.warranty_days} ${language === 'ar' ? 'يوم' : 'days'}` : '-'}</p>
                            </div>
                          </div>
                          
                          {vendor.technical_deviations && (
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                              <div>
                                <span className="text-muted-foreground">{language === 'ar' ? 'الانحرافات' : 'Deviations'}:</span>
                                <p className="text-orange-600">{vendor.technical_deviations}</p>
                              </div>
                            </div>
                          )}
                          
                          {vendor.specification_compliance && (
                            <div className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                              <div>
                                <span className="text-muted-foreground">{language === 'ar' ? 'المطابقة' : 'Compliance'}:</span>
                                <p className="text-green-600">
                                  {typeof vendor.specification_compliance === 'object' 
                                    ? JSON.stringify(vendor.specification_compliance) 
                                    : vendor.specification_compliance}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Delivery Tab */}
              <TabsContent value="delivery" className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المورد' : 'Vendor'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'أيام التسليم' : 'Delivery Days'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'شروط التسليم' : 'Delivery Terms'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'تقييم التسليم' : 'Delivery Score'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivedVendors.map(vendor => {
                        const isQuickest = vendor.delivery_days && 
                          vendor.delivery_days === Math.min(...receivedVendors.map(v => v.delivery_days || Infinity));
                        return (
                          <TableRow key={vendor.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{vendor.vendor?.code}</span>
                                <span className="text-muted-foreground text-sm">
                                  {language === 'ar' ? vendor.vendor?.company_name_ar : vendor.vendor?.company_name_en}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`inline-flex items-center gap-1 ${isQuickest ? 'text-green-600 font-medium' : ''}`}>
                                {isQuickest && <Clock className="h-3 w-3" />}
                                {vendor.delivery_days ? `${vendor.delivery_days} ${language === 'ar' ? 'يوم' : 'days'}` : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {vendor.delivery_terms || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={vendor.delivery_score || 0} className="h-2 w-16" />
                                <span className="text-sm">{vendor.delivery_score || 0}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Overall Score Comparison */}
      {receivedVendors.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              {language === 'ar' ? 'المقارنة الإجمالية' : 'Overall Comparison'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedVendors
                .sort((a, b) => getOverallScore(b) - getOverallScore(a))
                .map((vendor, idx) => (
                <Card key={vendor.id} className={idx === 0 ? 'border-primary bg-primary/5' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                        <span className="font-medium">{vendor.vendor?.code}</span>
                      </div>
                      <Badge variant={idx === 0 ? 'default' : 'secondary'} className="text-lg px-3">
                        {getOverallScore(vendor)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'فني (40%)' : 'Technical (40%)'}</span>
                        <span>{vendor.technical_score || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'تجاري (60%)' : 'Commercial (60%)'}</span>
                        <span>{vendor.commercial_score || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                        <span>{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                        <span>{(vendor.total_amount || 0).toLocaleString()} AED</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Results */}
      {analysis && (
        <>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Trophy className="h-5 w-5" />
                {language === 'ar' ? 'توصية الذكاء الاصطناعي' : 'AI Recommendation'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg">{analysis.summary}</p>
              
              {analysis.recommendation && (
                <Alert className="border-green-500/50 bg-green-500/5">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-600">
                    {language === 'ar' ? 'المورد الموصى به' : 'Recommended Vendor'}: {analysis.recommendation.recommendedVendor}
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p>{analysis.recommendation.justification}</p>
                    {analysis.recommendation.confidenceScore && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'مستوى الثقة' : 'Confidence'}:
                        </span>
                        <Badge variant="outline">{analysis.recommendation.confidenceScore}%</Badge>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {analysis.priceComparison && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 mb-1">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">{language === 'ar' ? 'أقل عرض' : 'Lowest Bid'}</span>
                    </div>
                    <p className="text-lg font-bold">{analysis.priceComparison.lowestBidder}</p>
                    <p className="text-2xl font-bold">{analysis.priceComparison.lowestAmount?.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-orange-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">{language === 'ar' ? 'أعلى عرض' : 'Highest Bid'}</span>
                    </div>
                    <p className="text-lg font-bold">{analysis.priceComparison.highestBidder}</p>
                    <p className="text-2xl font-bold">{analysis.priceComparison.highestAmount?.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {analysis.vendorAnalysis && (
                <div className="space-y-3">
                  <h4 className="font-medium">{language === 'ar' ? 'تحليل الموردين' : 'Vendor Analysis'}</h4>
                  <div className="grid gap-3">
                    {analysis.vendorAnalysis.map((va: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{va.vendorName}</span>
                          <Badge variant={va.overallScore >= 70 ? 'default' : va.overallScore >= 50 ? 'secondary' : 'destructive'}>
                            {language === 'ar' ? 'النقاط' : 'Score'}: {va.overallScore}/100
                          </Badge>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div>
                            <span className="text-green-600">{language === 'ar' ? 'نقاط القوة' : 'Strengths'}:</span>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {va.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div>
                            <span className="text-orange-600">{language === 'ar' ? 'نقاط الضعف' : 'Weaknesses'}:</span>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {va.weaknesses?.map((w: string, i: number) => <li key={i}>{w}</li>)}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendation?.riskFactors && (
                <div>
                  <h4 className="font-medium mb-2 text-orange-600">{language === 'ar' ? 'عوامل المخاطر' : 'Risk Factors'}</h4>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {analysis.recommendation.riskFactors.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
