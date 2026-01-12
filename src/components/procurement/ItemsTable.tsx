import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { MaterialSearchInput } from './MaterialSearchInput';
import { UOMSelect } from '@/components/ui/UOMSelect';

export interface ItemRow {
  id?: string;
  item_number: number;
  description_en: string;
  description_ar: string;
  quantity: number;
  unit: string;
  specifications?: string;
  unit_price?: number;
  total_price?: number;
  rfq_item_id?: string;
}

interface ItemsTableProps {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
  showPricing?: boolean;
  readOnly?: boolean;
  enableMaterialSearch?: boolean;
  lockQuantityPrice?: boolean; // Lock quantity and price fields (for PO from PR)
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  onChange,
  showPricing = false,
  readOnly = false,
  enableMaterialSearch = false,
  lockQuantityPrice = false,
}) => {
  const { t, language } = useLanguage();

  const addItem = () => {
    const newItem: ItemRow = {
      item_number: items.length + 1,
      description_en: '',
      description_ar: '',
      quantity: 1,
      unit: 'EA',
      specifications: '',
      unit_price: 0,
      total_price: 0,
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      item_number: i + 1,
    }));
    onChange(newItems);
  };

  const updateItem = (index: number, field: keyof ItemRow, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (showPricing && (field === 'quantity' || field === 'unit_price')) {
      newItems[index].total_price = newItems[index].quantity * (newItems[index].unit_price || 0);
    }
    
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead className="min-w-[280px]">{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (EN)'}</TableHead>
              <TableHead className="min-w-[200px]">{language === 'ar' ? 'الوصف (عربي)' : 'Description (AR)'}</TableHead>
              <TableHead className="min-w-[100px]">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
              <TableHead className="min-w-[100px]">{language === 'ar' ? 'الوحدة' : 'Unit'}</TableHead>
              {showPricing && (
                <>
                  <TableHead className="w-28">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                  <TableHead className="w-28">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                </>
              )}
              {!readOnly && <TableHead className="w-12"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showPricing ? 8 : 6} className="text-center text-muted-foreground py-8">
                  {language === 'ar' ? 'لا توجد عناصر. انقر لإضافة عنصر.' : 'No items. Click to add an item.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell className="font-medium">{item.item_number}</TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span>{item.description_en}</span>
                    ) : enableMaterialSearch ? (
                      <MaterialSearchInput
                        value={item.description_en}
                        onChange={(value, material) => {
                          updateItem(index, 'description_en', value);
                          if (material) {
                            updateItem(index, 'description_ar', material.name_ar);
                            updateItem(index, 'unit', material.unit);
                            if (showPricing) {
                              updateItem(index, 'unit_price', material.unit_price);
                            }
                          }
                        }}
                        placeholder="Search material..."
                      />
                    ) : (
                      <Textarea
                        value={item.description_en}
                        onChange={(e) => updateItem(index, 'description_en', e.target.value)}
                        placeholder="Item description"
                        className="min-h-[60px]"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <span>{item.description_ar}</span>
                    ) : (
                      <Textarea
                        value={item.description_ar}
                        onChange={(e) => updateItem(index, 'description_ar', e.target.value)}
                        placeholder="وصف العنصر"
                        className="min-h-[60px]"
                        dir="rtl"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly || lockQuantityPrice ? (
                      <span className="font-medium">{item.quantity}</span>
                    ) : (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {readOnly || lockQuantityPrice ? (
                      <span>{item.unit}</span>
                    ) : (
                      <UOMSelect
                        value={item.unit}
                        onChange={(value) => updateItem(index, 'unit', value)}
                      />
                    )}
                  </TableCell>
                  {showPricing && (
                    <>
                      <TableCell>
                        {readOnly || lockQuantityPrice ? (
                          <span className="font-medium">{item.unit_price?.toLocaleString()}</span>
                        ) : (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price || 0}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(item.total_price || 0).toLocaleString()}
                      </TableCell>
                    </>
                  )}
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {!readOnly && (
        <Button type="button" variant="outline" onClick={addItem} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ar' ? 'إضافة عنصر' : 'Add Item'}
        </Button>
      )}
    </div>
  );
};
