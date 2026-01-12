import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { InventoryMetrics } from '@/types/reports';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, DollarSign, AlertTriangle, TrendingUp, Boxes, ArrowDownUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface InventoryChartsProps {
  data: InventoryMetrics;
  isLoading: boolean;
}

const STOCK_STATUS_COLORS: Record<string, string> = {
  healthy: 'hsl(160, 70%, 50%)',
  low: 'hsl(45, 90%, 55%)',
  out: 'hsl(0, 70%, 55%)',
};

const CATEGORY_COLORS = ['hsl(200, 80%, 55%)', 'hsl(195, 100%, 60%)', 'hsl(160, 70%, 50%)', 'hsl(280, 70%, 60%)', 'hsl(45, 90%, 55%)', 'hsl(340, 70%, 55%)'];

export function InventoryCharts({ data, isLoading }: InventoryChartsProps) {
  const { language } = useLanguage();

  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="h-[300px] bg-muted/20" />
      ))}
    </div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const lowStockCount = data.byStockStatus.find(s => s.status === 'low')?.count || 0;
  const outOfStockCount = data.byStockStatus.find(s => s.status === 'out')?.count || 0;

  const kpiCards = [
    { 
      label: { en: 'Total Items', ar: 'إجمالي العناصر' }, 
      value: data.totalItems, 
      icon: Package, 
      color: 'text-blue-400' 
    },
    { 
      label: { en: 'Total Value', ar: 'إجمالي القيمة' }, 
      value: formatCurrency(data.totalValue), 
      icon: DollarSign, 
      color: 'text-green-400' 
    },
    { 
      label: { en: 'Low Stock', ar: 'مخزون منخفض' }, 
      value: lowStockCount, 
      icon: AlertTriangle, 
      color: 'text-yellow-400' 
    },
    { 
      label: { en: 'Out of Stock', ar: 'نفاد المخزون' }, 
      value: outOfStockCount, 
      icon: Boxes, 
      color: 'text-red-400' 
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="glass-card kpi-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label[language]}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Stock Status Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Stock Status Distribution' : 'توزيع حالة المخزون'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byStockStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {data.byStockStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STOCK_STATUS_COLORS[entry.status] || 'hsl(215, 20%, 50%)'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {data.byStockStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STOCK_STATUS_COLORS[item.status] }} 
                  />
                  <span className="text-sm capitalize">{item.status}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory by Category */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Inventory by Category' : 'المخزون حسب الفئة'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="count" name={language === 'en' ? 'Items' : 'العناصر'} fill="hsl(200, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Movement Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-primary" />
              {language === 'en' ? 'Stock Movement Trend' : 'اتجاه حركة المخزون'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.movementTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.movementTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="inbound" name={language === 'en' ? 'Inbound' : 'وارد'} fill="hsl(160, 70%, 50%)" stroke="hsl(160, 70%, 50%)" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="outbound" name={language === 'en' ? 'Outbound' : 'صادر'} fill="hsl(0, 70%, 55%)" stroke="hsl(0, 70%, 55%)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {language === 'en' ? 'No movement data available' : 'لا تتوفر بيانات الحركة'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              {language === 'en' ? 'Low Stock Alerts' : 'تنبيهات المخزون المنخفض'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'en' ? 'Item' : 'العنصر'}</TableHead>
                    <TableHead className="text-right">{language === 'en' ? 'Current' : 'الحالي'}</TableHead>
                    <TableHead className="text-right">{language === 'en' ? 'Min Level' : 'الحد الأدنى'}</TableHead>
                    <TableHead className="text-right">{language === 'en' ? 'Status' : 'الحالة'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">{item.currentStock} {item.unit}</TableCell>
                      <TableCell className="text-right">{item.minLevel} {item.unit}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.currentStock <= 0 ? 'destructive' : 'secondary'} className="text-xs">
                          {item.currentStock <= 0 ? (language === 'en' ? 'Out' : 'نفاد') : (language === 'en' ? 'Low' : 'منخفض')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-2 text-green-400" />
                  <p>{language === 'en' ? 'All items are well stocked!' : 'جميع العناصر متوفرة بشكل جيد!'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
