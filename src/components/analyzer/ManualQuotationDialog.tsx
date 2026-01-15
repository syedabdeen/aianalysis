import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ManualItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface ManualQuotationData {
  supplier: {
    name: string;
    contact: string;
    email: string;
    phone: string;
  };
  quotation: {
    reference: string;
    date: string;
    validityDays: number;
  };
  commercial: {
    total: number;
    currency: string;
    paymentTerms: string;
    deliveryDays: number;
    deliveryTerms: string;
  };
  items: ManualItem[];
}

interface ManualQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  fileName: string;
  existingData?: Partial<ManualQuotationData>;
  defaultCurrency?: string;
  onSave: (data: ManualQuotationData) => void;
}

export function ManualQuotationDialog({
  open,
  onOpenChange,
  supplierName,
  fileName,
  existingData,
  defaultCurrency = 'AED',
  onSave
}: ManualQuotationDialogProps) {
  const { language } = useLanguage();
  
  const [formData, setFormData] = useState<ManualQuotationData>({
    supplier: {
      name: existingData?.supplier?.name || supplierName || '',
      contact: existingData?.supplier?.contact || '',
      email: existingData?.supplier?.email || '',
      phone: existingData?.supplier?.phone || '',
    },
    quotation: {
      reference: existingData?.quotation?.reference || '',
      date: existingData?.quotation?.date || new Date().toISOString().split('T')[0],
      validityDays: existingData?.quotation?.validityDays || 30,
    },
    commercial: {
      total: existingData?.commercial?.total || 0,
      currency: existingData?.commercial?.currency || defaultCurrency,
      paymentTerms: existingData?.commercial?.paymentTerms || '',
      deliveryDays: existingData?.commercial?.deliveryDays || 0,
      deliveryTerms: existingData?.commercial?.deliveryTerms || '',
    },
    items: existingData?.items?.length ? existingData.items : [
      { description: '', quantity: 1, unit: 'EA', unitPrice: 0 }
    ],
  });

  const updateSupplier = (field: keyof ManualQuotationData['supplier'], value: string) => {
    setFormData(prev => ({
      ...prev,
      supplier: { ...prev.supplier, [field]: value }
    }));
  };

  const updateQuotation = (field: keyof ManualQuotationData['quotation'], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      quotation: { ...prev.quotation, [field]: value }
    }));
  };

  const updateCommercial = (field: keyof ManualQuotationData['commercial'], value: string | number) => {
    setFormData(prev => ({
      ...prev,
      commercial: { ...prev.commercial, [field]: value }
    }));
  };

  const updateItem = (index: number, field: keyof ManualItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit: 'EA', unitPrice: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = (): number => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSave = () => {
    // Auto-calculate total if not manually set
    const finalData = {
      ...formData,
      commercial: {
        ...formData.commercial,
        total: formData.commercial.total || calculateTotal()
      }
    };
    onSave(finalData);
    onOpenChange(false);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split('\n').filter(line => line.trim());
      
      const newItems: ManualItem[] = [];
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          newItems.push({
            description: parts[0]?.trim() || '',
            quantity: parseFloat(parts[1]) || 1,
            unit: parts[2]?.trim() || 'EA',
            unitPrice: parseFloat(parts[3]?.replace(/[^0-9.-]/g, '')) || 0
          });
        }
      }
      
      if (newItems.length > 0) {
        setFormData(prev => ({ ...prev, items: newItems }));
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'ar' ? 'إدخال بيانات العرض يدوياً' : 'Manual Quotation Entry'}
          </DialogTitle>
          <DialogDescription>
            {language === 'ar' 
              ? `إدخال البيانات للملف: ${fileName}`
              : `Enter data for: ${fileName}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Supplier Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {language === 'ar' ? 'معلومات المورد' : 'Supplier Information'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'اسم الشركة' : 'Company Name'} *</Label>
                  <Input 
                    value={formData.supplier.name}
                    onChange={(e) => updateSupplier('name', e.target.value)}
                    placeholder="Supplier Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'رقم العرض' : 'Quote Reference'}</Label>
                  <Input 
                    value={formData.quotation.reference}
                    onChange={(e) => updateQuotation('reference', e.target.value)}
                    placeholder="QT-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'جهة الاتصال' : 'Contact Person'}</Label>
                  <Input 
                    value={formData.supplier.contact}
                    onChange={(e) => updateSupplier('contact', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</Label>
                  <Input 
                    type="email"
                    value={formData.supplier.email}
                    onChange={(e) => updateSupplier('email', e.target.value)}
                    placeholder="contact@supplier.com"
                  />
                </div>
              </div>
            </div>

            {/* Commercial Terms */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {language === 'ar' ? 'الشروط التجارية' : 'Commercial Terms'}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'المبلغ الإجمالي' : 'Total Amount'}</Label>
                  <Input 
                    type="number"
                    value={formData.commercial.total || ''}
                    onChange={(e) => updateCommercial('total', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'العملة' : 'Currency'}</Label>
                  <Input 
                    value={formData.commercial.currency}
                    onChange={(e) => updateCommercial('currency', e.target.value)}
                    placeholder="AED"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'مدة التسليم (أيام)' : 'Delivery Days'}</Label>
                  <Input 
                    type="number"
                    value={formData.commercial.deliveryDays || ''}
                    onChange={(e) => updateCommercial('deliveryDays', parseInt(e.target.value) || 0)}
                    placeholder="14"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</Label>
                  <Input 
                    value={formData.commercial.paymentTerms}
                    onChange={(e) => updateCommercial('paymentTerms', e.target.value)}
                    placeholder="30 days net"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'شروط التسليم' : 'Delivery Terms'}</Label>
                  <Input 
                    value={formData.commercial.deliveryTerms}
                    onChange={(e) => updateCommercial('deliveryTerms', e.target.value)}
                    placeholder="Ex-Works"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {language === 'ar' ? 'البنود' : 'Line Items'}
                </h3>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handlePasteFromClipboard}
                  >
                    {language === 'ar' ? 'لصق من Excel' : 'Paste from Excel'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'ar' ? 'إضافة بند' : 'Add Item'}
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                    <TableHead className="w-20">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                    <TableHead className="w-20">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
                    <TableHead className="w-28">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                    <TableHead className="w-28">{language === 'ar' ? 'المجموع' : 'Total'}</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(idx, 'description', e.target.value)}
                          placeholder="Item description"
                          className="min-h-[40px] resize-none"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {(item.quantity * item.unitPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(idx)}
                          disabled={formData.items.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'إجمالي البنود:' : 'Items Total:'}
                  </span>
                  <span className="ml-2 font-bold text-lg">
                    {formData.commercial.currency} {calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={!formData.supplier.name}>
            <Save className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'حفظ' : 'Save Quotation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
