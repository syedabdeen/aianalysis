import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSetRFQVendorPrices } from '@/hooks/useRFQ';
import { useMarkQuotationReceived } from '@/hooks/useRFQWorkflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Save, Loader2, Check, Building2, Mail, MailX } from 'lucide-react';
import { toast } from 'sonner';

interface VendorQuotationFormProps {
  rfqVendor: any;
  rfqItems: any[];
  rfqId: string;
}

export const VendorQuotationForm: React.FC<VendorQuotationFormProps> = ({
  rfqVendor,
  rfqItems,
  rfqId,
}) => {
  const { language } = useLanguage();
  const markQuotationReceived = useMarkQuotationReceived();
  const setPrices = useSetRFQVendorPrices();

  const [quotationReceived, setQuotationReceived] = useState(rfqVendor.quotation_received);
  const [deliveryDays, setDeliveryDays] = useState(rfqVendor.delivery_days || '');
  const [validityDays, setValidityDays] = useState(rfqVendor.validity_days || '');
  const [paymentTerms, setPaymentTerms] = useState(rfqVendor.payment_terms || '');
  const [notes, setNotes] = useState(rfqVendor.notes || '');
  const [technicalScore, setTechnicalScore] = useState(rfqVendor.technical_score || '');
  const [commercialScore, setCommercialScore] = useState(rfqVendor.commercial_score || '');
  const [warrantyTerms, setWarrantyTerms] = useState(rfqVendor.warranty_terms || '');
  const [itemPrices, setItemPrices] = useState<Record<string, { unitPrice: number; totalPrice: number }>>({});
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    // Initialize item prices from existing data
    const initial: Record<string, { unitPrice: number; totalPrice: number }> = {};
    rfqItems.forEach(item => {
      const existingPrice = rfqVendor.prices?.find((p: any) => p.rfq_item_id === item.id);
      initial[item.id] = {
        unitPrice: existingPrice?.unit_price || 0,
        totalPrice: existingPrice?.total_price || (item.quantity * (existingPrice?.unit_price || 0)),
      };
    });
    setItemPrices(initial);
  }, [rfqItems, rfqVendor.prices]);

  const updateItemPrice = (itemId: string, unitPrice: number, quantity: number) => {
    setItemPrices(prev => ({
      ...prev,
      [itemId]: {
        unitPrice,
        totalPrice: unitPrice * quantity,
      },
    }));
  };

  const calculateTotal = () => {
    return Object.values(itemPrices).reduce((sum, p) => sum + p.totalPrice, 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First save item prices
      const pricesData = Object.entries(itemPrices).map(([itemId, prices]) => ({
        rfq_item_id: itemId,
        unit_price: prices.unitPrice,
        total_price: prices.totalPrice,
      }));

      await setPrices.mutateAsync({
        rfqVendorId: rfqVendor.id,
        rfqId,
        prices: pricesData,
      });

      // Update vendor quotation details using the new hook (only if marking as received)
      if (quotationReceived) {
        await markQuotationReceived.mutateAsync({
          rfqVendorId: rfqVendor.id,
          rfqId,
          quotationData: {
            delivery_days: deliveryDays ? parseInt(deliveryDays) : null,
            validity_days: validityDays ? parseInt(validityDays) : null,
            payment_terms: paymentTerms || null,
            notes: notes || null,
            technical_score: technicalScore ? parseInt(technicalScore) : null,
            commercial_score: commercialScore ? parseInt(commercialScore) : null,
            warranty_terms: warrantyTerms || null,
            total_amount: calculateTotal(),
          },
        });
      }

      toast.success(language === 'ar' ? 'تم حفظ عرض الأسعار' : 'Quotation saved');
    } catch (error) {
      console.error('Error saving quotation:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">
              {language === 'ar' ? rfqVendor.vendor?.company_name_ar : rfqVendor.vendor?.company_name_en}
            </CardTitle>
            <Badge variant="outline">{rfqVendor.vendor?.code}</Badge>
            {/* Email status indicator */}
            {rfqVendor.email_sent ? (
              <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
                <Mail className="h-3 w-3" />
                {language === 'ar' ? 'تم الإرسال' : 'Email Sent'}
              </Badge>
            ) : rfqVendor.email_error ? (
              <Badge variant="destructive" className="gap-1">
                <MailX className="h-3 w-3" />
                {language === 'ar' ? 'فشل الإرسال' : 'Send Failed'}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm">{language === 'ar' ? 'تم استلام العرض' : 'Quotation Received'}</Label>
            <Switch checked={quotationReceived} onCheckedChange={setQuotationReceived} />
            {quotationReceived && <Check className="h-4 w-4 text-green-500" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {quotationReceived && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'أيام التسليم' : 'Delivery Days'}</Label>
                <Input
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'أيام الصلاحية' : 'Validity Days'}</Label>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder="90"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التقييم الفني (0-100)' : 'Technical Score (0-100)'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={technicalScore}
                  onChange={(e) => setTechnicalScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التقييم التجاري (0-100)' : 'Commercial Score (0-100)'}</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={commercialScore}
                  onChange={(e) => setCommercialScore(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g., 50% advance, 50% on delivery"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'شروط الضمان' : 'Warranty Terms'}</Label>
                <Input
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  placeholder="e.g., 12 months manufacturer warranty"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">{language === 'ar' ? 'أسعار العناصر' : 'Item Prices'}</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="w-24">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="w-32">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                    <TableHead className="w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.item_number}</TableCell>
                      <TableCell>{language === 'ar' ? item.description_ar : item.description_en}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={itemPrices[item.id]?.unitPrice || ''}
                          onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0, item.quantity)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(itemPrices[item.id]?.totalPrice || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right font-bold">
                      {language === 'ar' ? 'الإجمالي' : 'Total'}:
                    </TableCell>
                    <TableCell className="font-bold">
                      {calculateTotal().toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {language === 'ar' ? 'حفظ' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
