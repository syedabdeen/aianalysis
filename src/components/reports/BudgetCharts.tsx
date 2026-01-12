import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { BudgetMetrics } from '@/types/reports';
import { useLanguage } from '@/contexts/LanguageContext';
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle, Wallet, ArrowUpDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BudgetChartsProps {
  data: BudgetMetrics;
  isLoading: boolean;
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'hsl(160, 70%, 50%)',
  warning: 'hsl(45, 90%, 55%)',
  critical: 'hsl(0, 70%, 55%)',
};

export function BudgetCharts({ data, isLoading }: BudgetChartsProps) {
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

  const kpiCards = [
    { 
      label: { en: 'Total Budget', ar: 'إجمالي الميزانية' }, 
      value: formatCurrency(data.totalRevisedBudget), 
      icon: Wallet, 
      color: 'text-blue-400' 
    },
    { 
      label: { en: 'Consumed', ar: 'المستهلك' }, 
      value: formatCurrency(data.totalConsumed), 
      icon: DollarSign, 
      color: 'text-green-400' 
    },
    { 
      label: { en: 'Committed', ar: 'الملتزم' }, 
      value: formatCurrency(data.totalCommitted), 
      icon: TrendingUp, 
      color: 'text-cyan-400' 
    },
    { 
      label: { en: 'Available', ar: 'المتاح' }, 
      value: formatCurrency(data.availableBudget), 
      icon: CheckCircle, 
      color: 'text-purple-400' 
    },
  ];

  // Data for budget distribution pie chart
  const budgetDistribution = [
    { name: language === 'en' ? 'Consumed' : 'المستهلك', value: data.totalConsumed },
    { name: language === 'en' ? 'Committed' : 'الملتزم', value: data.totalCommitted },
    { name: language === 'en' ? 'Available' : 'المتاح', value: data.availableBudget },
  ];

  const BUDGET_COLORS = ['hsl(160, 70%, 50%)', 'hsl(45, 90%, 55%)', 'hsl(200, 80%, 55%)'];

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

      {/* Budget Utilization Gauge */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            {language === 'en' ? 'Overall Budget Utilization' : 'استخدام الميزانية الإجمالي'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {language === 'en' ? 'Utilization Rate' : 'معدل الاستخدام'}
              </span>
              <span className="text-2xl font-bold">
                {data.utilizationPercentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(data.utilizationPercentage, 100)} 
              className="h-4" 
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span className={data.utilizationPercentage > 90 ? 'text-destructive' : ''}>
                {formatCurrency(data.totalRevisedBudget)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Projects by Health */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Projects by Budget Health' : 'المشاريع حسب صحة الميزانية'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.projectsByHealth}
                  dataKey="count"
                  nameKey="health"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ health, count }) => `${health}: ${count}`}
                >
                  {data.projectsByHealth.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={HEALTH_COLORS[entry.health]} />
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
              {data.projectsByHealth.map((item) => (
                <div key={item.health} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: HEALTH_COLORS[item.health] }} 
                  />
                  <span className="text-sm capitalize">{item.health}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Budget Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Budget Distribution' : 'توزيع الميزانية'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                >
                  {budgetDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BUDGET_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
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

        {/* Top Projects by Spend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Top Projects by Spend' : 'أكثر المشاريع إنفاقاً'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topProjectsBySpend} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="consumed" name={language === 'en' ? 'Consumed' : 'المستهلك'} fill="hsl(160, 70%, 50%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="budget" name={language === 'en' ? 'Budget' : 'الميزانية'} fill="hsl(200, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Consumption Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{language === 'en' ? 'Monthly Budget Trend' : 'اتجاه الميزانية الشهري'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyConsumption}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="consumed" name={language === 'en' ? 'Consumed' : 'المستهلك'} fill="hsl(160, 70%, 50%)" stroke="hsl(160, 70%, 50%)" fillOpacity={0.3} />
                <Area type="monotone" dataKey="committed" name={language === 'en' ? 'Committed' : 'الملتزم'} fill="hsl(45, 90%, 55%)" stroke="hsl(45, 90%, 55%)" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
