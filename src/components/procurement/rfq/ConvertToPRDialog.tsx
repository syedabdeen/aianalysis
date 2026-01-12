import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConvertRFQToPR } from '@/hooks/useRFQWorkflow';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trophy, CheckCircle2, Building2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VendorData {
  id: string;
  vendor_id: string;
  vendor?: {
    id: string;
    code: string;
    company_name_en: string;
    company_name_ar: string;
  };
  quotation_received: boolean;
  total_amount?: number | null;
  delivery_days?: number | null;
  payment_terms?: string | null;
  technical_score?: number | null;
  commercial_score?: number | null;
  is_recommended?: boolean | null;
}

interface ConvertToPRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: string;
  vendors: VendorData[];
  recommendedVendorCode?: string;
}

export const ConvertToPRDialog: React.FC<ConvertToPRDialogProps> = ({
  open,
  onOpenChange,
  rfqId,
  vendors,
  recommendedVendorCode,
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const convertToPR = useConvertRFQToPR();
  
  const receivedVendors = vendors.filter(v => v.quotation_received);
  const recommendedVendor = receivedVendors.find(v => 
    v.vendor?.code === recommendedVendorCode || v.is_recommended
  );
  
  const [selectedVendorId, setSelectedVendorId] = useState<string>(
    recommendedVendor?.vendor_id || receivedVendors[0]?.vendor_id || ''
  );
  const [justification, setJustification] = useState<string>('');

  // Check if selected vendor is NOT the recommended one
  const isNonRecommendedSelected = recommendedVendor && selectedVendorId !== recommendedVendor.vendor_id;
  
  // Reset justification when recommended vendor is selected
  useEffect(() => {
    if (!isNonRecommendedSelected) {
      setJustification('');
    }
  }, [isNonRecommendedSelected]);

  const handleConvert = async () => {
    if (!selectedVendorId) return;
    
    // Require justification if non-recommended vendor is selected
    if (isNonRecommendedSelected && !justification.trim()) {
      return;
    }
    
    try {
      const pr = await convertToPR.mutateAsync({
        rfqId,
        selectedVendorId,
        nonRecommendedJustification: isNonRecommendedSelected ? justification.trim() : undefined,
      });
      onOpenChange(false);
      navigate(`/procurement/pr/${pr.id}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  const getLowestPrice = () => {
    const prices = receivedVendors
      .map(v => v.total_amount || 0)
      .filter(p => p > 0);
    return Math.min(...prices);
  };

  const lowestPrice = getLowestPrice();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {language === 'ar' ? 'تحويل إلى طلب شراء' : 'Convert to Purchase Request'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? 'اختر المورد لإنشاء طلب الشراء. سيتم نسخ جميع التفاصيل والأسعار من عرض الأسعار.'
              : 'Select a vendor to create the Purchase Request. All details and prices will be copied from the quotation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedVendorId} onValueChange={setSelectedVendorId}>
            <div className="space-y-3">
              {receivedVendors.map((v) => {
                const isRecommended = v.vendor.code === recommendedVendorCode || v.is_recommended;
                const isLowest = v.total_amount === lowestPrice;
                
                return (
                  <Card 
                    key={v.vendor_id}
                    className={`cursor-pointer transition-all ${
                      selectedVendorId === v.vendor_id 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedVendorId(v.vendor_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value={v.vendor_id} id={v.vendor_id} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Label htmlFor={v.vendor_id} className="font-medium cursor-pointer">
                              <Building2 className="h-4 w-4 inline mr-1" />
                              {language === 'ar' ? v.vendor.company_name_ar : v.vendor.company_name_en}
                            </Label>
                            <Badge variant="outline">{v.vendor.code}</Badge>
                            {isRecommended && (
                              <Badge className="bg-green-500/10 text-green-600 gap-1">
                                <Trophy className="h-3 w-3" />
                                {language === 'ar' ? 'موصى به' : 'Recommended'}
                              </Badge>
                            )}
                            {isLowest && !isRecommended && (
                              <Badge variant="secondary">
                                {language === 'ar' ? 'أقل سعر' : 'Lowest Price'}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'المبلغ' : 'Amount'}:
                              </span>
                              <p className="font-medium">
                                {(v.total_amount || 0).toLocaleString()} AED
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'التسليم' : 'Delivery'}:
                              </span>
                              <p className="font-medium">
                                {v.delivery_days || '-'} {language === 'ar' ? 'يوم' : 'days'}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'تقني' : 'Technical'}:
                              </span>
                              <p className="font-medium">
                                {v.technical_score ?? '-'}/100
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {language === 'ar' ? 'تجاري' : 'Commercial'}:
                              </span>
                              <p className="font-medium">
                                {v.commercial_score ?? '-'}/100
                              </p>
                            </div>
                          </div>
                          {v.payment_terms && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {language === 'ar' ? 'شروط الدفع' : 'Payment'}: {v.payment_terms}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </RadioGroup>

          {/* Justification required for non-recommended vendor */}
          {isNonRecommendedSelected && (
            <div className="mt-4 space-y-3">
              <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700 dark:text-orange-400">
                  {language === 'ar' 
                    ? 'أنت تختار مورداً غير الموصى به من النظام. يرجى تقديم مبرر لهذا الاختيار.'
                    : 'You are selecting a vendor other than the system-recommended one. Please provide justification for this selection.'}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="justification" className="text-sm font-medium">
                  {language === 'ar' ? 'مبرر اختيار المورد *' : 'Vendor Selection Justification *'}
                </Label>
                <Textarea
                  id="justification"
                  placeholder={language === 'ar' 
                    ? 'اشرح سبب اختيار هذا المورد بدلاً من المورد الموصى به...'
                    : 'Explain why you are selecting this vendor instead of the recommended one...'}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={!selectedVendorId || convertToPR.isPending || (isNonRecommendedSelected && !justification.trim())}
          >
            {convertToPR.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {language === 'ar' ? 'جاري التحويل...' : 'Converting...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إنشاء طلب الشراء' : 'Create PR'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
