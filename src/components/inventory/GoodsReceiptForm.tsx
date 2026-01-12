import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePOItemsForReceipt, useCreateGoodsReceipt } from '@/hooks/useGoodsReceipt';
import { useInventoryItems } from '@/hooks/useInventory';
import type { QualityStatus } from '@/types/inventory';

const formSchema = z.object({
  po_id: z.string().min(1, 'PO is required'),
  receipt_date: z.date(),
  notes: z.string().optional(),
});

interface GoodsReceiptFormProps {
  poId?: string;
  onSuccess?: () => void;
}

export function GoodsReceiptForm({ poId, onSuccess }: GoodsReceiptFormProps) {
  const { language } = useLanguage();
  const [itemsData, setItemsData] = useState<Array<{
    po_item_id: string;
    description: string;
    quantity_ordered: number;
    already_received: number;
    quantity_received: number;
    quantity_rejected: number;
    quality_status: QualityStatus;
    inventory_item_id?: string;
    inspection_notes?: string;
  }>>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      po_id: poId || '',
      receipt_date: new Date(),
      notes: '',
    },
  });

  const selectedPoId = form.watch('po_id');
  const { data: poItems, isLoading: loadingItems } = usePOItemsForReceipt(selectedPoId);
  const { data: inventoryItems } = useInventoryItems({ is_active: true });
  const createGoodsReceipt = useCreateGoodsReceipt();

  useEffect(() => {
    if (poItems && poItems.length > 0) {
      setItemsData(poItems.map((item) => ({
        po_item_id: item.id,
        description: language === 'ar' ? item.description_ar : item.description_en,
        quantity_ordered: item.quantity,
        already_received: item.received_quantity,
        quantity_received: Math.max(0, item.quantity - item.received_quantity),
        quantity_rejected: 0,
        quality_status: 'pending' as QualityStatus,
        inventory_item_id: undefined,
        inspection_notes: '',
      })));
    }
  }, [poItems, language]);

  const updateItemData = (index: number, field: string, value: any) => {
    setItemsData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createGoodsReceipt.mutateAsync({
      po_id: values.po_id,
      receipt_date: format(values.receipt_date, 'yyyy-MM-dd'),
      notes: values.notes,
      items: itemsData.map(item => ({
        po_item_id: item.po_item_id,
        inventory_item_id: item.inventory_item_id,
        quantity_received: item.quantity_received,
        quantity_rejected: item.quantity_rejected,
        quality_status: item.quality_status,
        inspection_notes: item.inspection_notes,
      })),
    });

    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="receipt_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{language === 'ar' ? 'تاريخ الاستلام' : 'Receipt Date'}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : (language === 'ar' ? 'اختر التاريخ' : 'Pick a date')}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{language === 'ar' ? 'ملاحظات' : 'Notes'}</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {loadingItems ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : itemsData.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'المطلوب' : 'Ordered'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'مستلم سابقاً' : 'Previously Received'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'الكمية المستلمة' : 'Qty Received'}</TableHead>
                  <TableHead className="text-center">{language === 'ar' ? 'مرفوض' : 'Rejected'}</TableHead>
                  <TableHead>{language === 'ar' ? 'حالة الجودة' : 'Quality'}</TableHead>
                  <TableHead>{language === 'ar' ? 'ربط بالمخزون' : 'Link to Inventory'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsData.map((item, index) => (
                  <TableRow key={item.po_item_id}>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate">{item.description}</p>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{item.already_received}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity_ordered - item.already_received}
                        value={item.quantity_received}
                        onChange={(e) => updateItemData(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity_rejected}
                        onChange={(e) => updateItemData(index, 'quantity_rejected', parseFloat(e.target.value) || 0)}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.quality_status}
                        onValueChange={(value) => updateItemData(index, 'quality_status', value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                          <SelectItem value="passed">{language === 'ar' ? 'مقبول' : 'Passed'}</SelectItem>
                          <SelectItem value="failed">{language === 'ar' ? 'مرفوض' : 'Failed'}</SelectItem>
                          <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.inventory_item_id || 'none'}
                        onValueChange={(value) => updateItemData(index, 'inventory_item_id', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder={language === 'ar' ? 'اختر...' : 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{language === 'ar' ? 'لا يوجد' : 'None'}</SelectItem>
                          {inventoryItems?.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.code} - {language === 'ar' ? inv.name_ar : inv.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لا توجد عناصر للاستلام' : 'No items to receive'}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={createGoodsReceipt.isPending || itemsData.length === 0}>
            {createGoodsReceipt.isPending
              ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : (language === 'ar' ? 'تسجيل الاستلام' : 'Record Receipt')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
