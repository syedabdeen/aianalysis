import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { ProcurementMetrics } from '@/types/reports';
import { useLanguage } from '@/contexts/LanguageContext';
import { FileText, FileSearch, ClipboardList, ShoppingCart, TrendingUp, ArrowRight } from 'lucide-react';

interface ProcurementChartsProps {
  data: ProcurementMetrics;
  isLoading: boolean;
}

const COLORS = ['hsl(200, 80%, 55%)', 'hsl(195, 100%, 60%)', 'hsl(160, 70%, 50%)', 'hsl(280, 70%, 60%)', 'hsl(45, 90%, 55%)'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'hsl(215, 20%, 50%)',
  submitted: 'hsl(200, 80%, 55%)',
  pending: 'hsl(45, 90%, 55%)',
  approved: 'hsl(160, 70%, 50%)',
  rejected: 'hsl(0, 70%, 55%)',
  completed: 'hsl(160, 70%, 50%)',
  cancelled: 'hsl(0, 50%, 45%)',
};

export function ProcurementCharts({ data, isLoading }: ProcurementChartsProps) {
  const { language } = useLanguage();

  if (isLoading) {
    return <div className="grid gap-4 md:grid-cols-2 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="h-[300px] bg-muted/20" />
      ))}
    </div>;
  }

  const kpiCards = [
    { label: { en: 'Total RFIs', ar: 'إجمالي طلبات المعلومات' }, value: data.totalRFIs, icon: FileText, color: 'text-blue-400' },
    { label: { en: 'Total RFQs', ar: 'إجمالي طلبات عروض الأسعار' }, value: data.totalRFQs, icon: FileSearch, color: 'text-cyan-400' },
    { label: { en: 'Total PRs', ar: 'إجمالي طلبات الشراء' }, value: data.totalPRs, icon: ClipboardList, color: 'text-green-400' },
    { label: { en: 'Total POs', ar: 'إجمالي أوامر الشراء' }, value: data.totalPOs, icon: ShoppingCart, color: 'text-purple-400' },
  ];

  // Combine all status data for bar chart
  const statusData = ['draft', 'submitted', 'pending', 'approved', 'rejected', 'completed'].map(status => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    RFIs: data.rfiByStatus.find(s => s.status === status)?.count || 0,
    RFQs: data.rfqByStatus.find(s => s.status === status)?.count || 0,
    PRs: data.prByStatus.find(s => s.status === status)?.count || 0,
    POs: data.poByStatus.find(s => s.status === status)?.count || 0,
  }));

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
                  <p className="text-3xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Funnel */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {language === 'en' ? 'Procurement Conversion Funnel' : 'مسار تحويل المشتريات'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 py-8">
            {[
              { label: 'RFI', value: data.totalRFIs, rate: null },
              { label: 'RFQ', value: data.totalRFQs, rate: data.conversionRates.rfiToRfq },
              { label: 'PR', value: data.totalPRs, rate: data.conversionRates.rfqToPr },
              { label: 'PO', value: data.totalPOs, rate: data.conversionRates.prToPo },
            ].map((step, index) => (
              <div key={step.label} className="flex items-center gap-4 flex-1">
                <div className="flex-1 text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold">{step.value}</span>
                  </div>
                  <p className="font-medium">{step.label}</p>
                  {step.rate !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.rate.toFixed(1)}% {language === 'en' ? 'converted' : 'محول'}
                    </p>
                  )}
                </div>
                {index < 3 && <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Documents by Status' : 'المستندات حسب الحالة'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="RFIs" fill="hsl(200, 80%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="RFQs" fill="hsl(195, 100%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PRs" fill="hsl(160, 70%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="POs" fill="hsl(280, 70%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Procurement Type Pie Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'By Procurement Type' : 'حسب نوع المشتريات'}</CardTitle>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

        {/* Monthly Trend Line Chart */}
        <Card className="glass-card md:col-span-2">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Monthly Procurement Trend' : 'اتجاه المشتريات الشهري'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="rfis" name="RFIs" stroke="hsl(200, 80%, 55%)" strokeWidth={2} dot={{ fill: 'hsl(200, 80%, 55%)' }} />
                <Line type="monotone" dataKey="rfqs" name="RFQs" stroke="hsl(195, 100%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(195, 100%, 60%)' }} />
                <Line type="monotone" dataKey="prs" name="PRs" stroke="hsl(160, 70%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(160, 70%, 50%)' }} />
                <Line type="monotone" dataKey="pos" name="POs" stroke="hsl(280, 70%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(280, 70%, 60%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
