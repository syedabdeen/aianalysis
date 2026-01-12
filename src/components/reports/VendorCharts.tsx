import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { VendorMetrics } from '@/types/reports';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, CheckCircle, Clock, TrendingUp, Package, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface VendorChartsProps {
  data: VendorMetrics;
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(45, 90%, 55%)',
  approved: 'hsl(160, 70%, 50%)',
  suspended: 'hsl(30, 90%, 55%)',
  blacklisted: 'hsl(0, 70%, 55%)',
};

const TYPE_COLORS = ['hsl(200, 80%, 55%)', 'hsl(195, 100%, 60%)', 'hsl(160, 70%, 50%)', 'hsl(280, 70%, 60%)'];

export function VendorCharts({ data, isLoading }: VendorChartsProps) {
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

  const approvedCount = data.byStatus.find(s => s.status === 'approved')?.count || 0;

  const kpiCards = [
    { 
      label: { en: 'Total Vendors', ar: 'إجمالي الموردين' }, 
      value: data.totalVendors, 
      icon: Users, 
      color: 'text-blue-400' 
    },
    { 
      label: { en: 'Approved', ar: 'المعتمدين' }, 
      value: approvedCount, 
      icon: CheckCircle, 
      color: 'text-green-400' 
    },
    { 
      label: { en: 'Avg Delivery Days', ar: 'متوسط أيام التسليم' }, 
      value: `${data.avgDeliveryDays} days`, 
      icon: Clock, 
      color: 'text-cyan-400' 
    },
    { 
      label: { en: 'Total Quotations', ar: 'إجمالي العروض' }, 
      value: data.quotationMetrics.totalQuotations, 
      icon: FileText, 
      color: 'text-purple-400' 
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

      {/* Quotation Metrics */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {language === 'en' ? 'Quotation Performance' : 'أداء العروض'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-3xl font-bold text-primary">{data.quotationMetrics.totalQuotations}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'en' ? 'Total Quotations Received' : 'إجمالي العروض المستلمة'}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-3xl font-bold text-green-400">{data.quotationMetrics.selectionRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'en' ? 'Vendor Selection Rate' : 'معدل اختيار الموردين'}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-3xl font-bold text-cyan-400">{data.avgDeliveryDays}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'en' ? 'Avg Delivery Days' : 'متوسط أيام التسليم'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Vendors by Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Vendors by Status' : 'الموردون حسب الحالة'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ status, count }) => `${status}: ${count}`}
                >
                  {data.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || 'hsl(215, 20%, 50%)'} />
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
            <div className="flex justify-center flex-wrap gap-4 mt-4">
              {data.byStatus.map((item) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[item.status] || 'hsl(215, 20%, 50%)' }} 
                  />
                  <span className="text-sm capitalize">{item.status}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vendors by Type */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Vendors by Type' : 'الموردون حسب النوع'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {data.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
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
          </CardContent>
        </Card>

        {/* Top Vendors by Spend */}
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {language === 'en' ? 'Top 10 Vendors by PO Value' : 'أكثر 10 موردين حسب قيمة أوامر الشراء'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topBySpend.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'en' ? 'Vendor' : 'المورد'}</TableHead>
                    <TableHead className="text-right">{language === 'en' ? 'Total Spend' : 'إجمالي الإنفاق'}</TableHead>
                    <TableHead className="text-right">{language === 'en' ? 'PO Count' : 'عدد الأوامر'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topBySpend.map((vendor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(vendor.totalSpend)}</TableCell>
                      <TableCell className="text-right">{vendor.poCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'en' ? 'No vendor spend data available' : 'لا تتوفر بيانات إنفاق الموردين'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
