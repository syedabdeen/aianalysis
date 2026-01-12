import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, RefreshCcw, ArrowRightCircle, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StockMovement, StockMovementType } from '@/types/inventory';

interface StockMovementTableProps {
  movements: StockMovement[];
  showItemColumn?: boolean;
}

const movementConfig: Record<StockMovementType, {
  icon: typeof ArrowUpCircle;
  color: string;
  label_en: string;
  label_ar: string;
}> = {
  goods_receipt: {
    icon: ArrowUpCircle,
    color: 'text-green-500',
    label_en: 'Goods Receipt',
    label_ar: 'استلام بضائع',
  },
  issue: {
    icon: ArrowDownCircle,
    color: 'text-red-500',
    label_en: 'Issue',
    label_ar: 'صرف',
  },
  adjustment: {
    icon: RefreshCcw,
    color: 'text-blue-500',
    label_en: 'Adjustment',
    label_ar: 'تعديل',
  },
  transfer: {
    icon: ArrowRightCircle,
    color: 'text-purple-500',
    label_en: 'Transfer',
    label_ar: 'نقل',
  },
  return: {
    icon: RotateCcw,
    color: 'text-orange-500',
    label_en: 'Return',
    label_ar: 'إرجاع',
  },
};

export function StockMovementTable({ movements, showItemColumn = false }: StockMovementTableProps) {
  const { language } = useLanguage();

  if (movements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {language === 'ar' ? 'لا توجد حركات مخزون' : 'No stock movements found'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
            <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
            {showItemColumn && (
              <TableHead>{language === 'ar' ? 'المادة' : 'Material'}</TableHead>
            )}
            <TableHead className="text-right">{language === 'ar' ? 'الكمية' : 'Quantity'}</TableHead>
            <TableHead className="text-right">{language === 'ar' ? 'الرصيد' : 'Balance'}</TableHead>
            <TableHead>{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
            <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => {
            const config = movementConfig[movement.movement_type];
            const Icon = config.icon;

            return (
              <TableRow key={movement.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <Badge variant="outline" className="text-xs">
                      {language === 'ar' ? config.label_ar : config.label_en}
                    </Badge>
                  </div>
                </TableCell>
                {showItemColumn && (
                  <TableCell>
                    {movement.inventory_item && (
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {movement.inventory_item.code}
                        </p>
                        <p className="text-sm">
                          {language === 'ar' ? movement.inventory_item.name_ar : movement.inventory_item.name_en}
                        </p>
                      </div>
                    )}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <span className={movement.quantity >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {movement.quantity >= 0 ? '+' : ''}{movement.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {movement.balance_after}
                </TableCell>
                <TableCell>
                  {movement.reference_code && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {movement.reference_type}: {movement.reference_code}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {movement.notes}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
