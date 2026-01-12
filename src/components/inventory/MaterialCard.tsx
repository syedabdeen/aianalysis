import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Edit, Eye, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StockLevelIndicator } from './StockLevelIndicator';
import type { InventoryItem } from '@/types/inventory';

interface MaterialCardProps {
  item: InventoryItem;
}

export function MaterialCard({ item }: MaterialCardProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const name = language === 'ar' ? item.name_ar : item.name_en;
  const categoryName = item.category 
    ? (language === 'ar' ? item.category.name_ar : item.category.name_en)
    : null;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-mono text-muted-foreground">{item.code}</p>
              <h3 className="font-semibold text-lg">{name}</h3>
            </div>
          </div>
          <Badge variant={item.is_active ? 'default' : 'secondary'}>
            {item.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {categoryName && (
          <Badge variant="outline" className="text-xs">
            {categoryName}
          </Badge>
        )}

        <StockLevelIndicator
          currentStock={item.current_stock}
          minLevel={item.min_stock_level}
          maxLevel={item.max_stock_level}
          unit={item.unit}
        />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">
              {language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}:
            </span>
            <p className="font-medium">
              {item.unit_price.toLocaleString()} {item.currency}
            </p>
          </div>
          {item.warehouse_location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{item.warehouse_location}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/inventory/${item.id}`)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {language === 'ar' ? 'عرض' : 'View'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/inventory/${item.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
