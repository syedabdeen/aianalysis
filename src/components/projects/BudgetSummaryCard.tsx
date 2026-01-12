import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { BudgetProgressBar } from './BudgetProgressBar';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ArrowUpRight, Layers } from 'lucide-react';
import type { Project } from '@/types/project';

interface BudgetSummaryCardProps {
  project: Project;
}

export function BudgetSummaryCard({ project }: BudgetSummaryCardProps) {
  const { language } = useLanguage();

  const initialBudget = project.original_budget;
  const currentBudget = project.revised_budget > 0 ? project.revised_budget : project.original_budget;
  const variationValue = currentBudget - initialBudget;
  const remaining = currentBudget - project.budget_committed - project.budget_consumed;
  const utilizationPercentage = currentBudget > 0 ? ((project.budget_committed + project.budget_consumed) / currentBudget) * 100 : 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      style: 'currency',
      currency: project.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{language === 'ar' ? 'ملخص الميزانية' : 'Budget Summary'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Value Summary - Initial, Variation, Current */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
          <div className="text-center p-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'القيمة الأولية' : 'Initial Value'}
            </p>
            <p className="text-xl font-bold text-blue-600">{formatAmount(initialBudget)}</p>
          </div>
          
          <div className="text-center p-3 border-x border-border/50">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${variationValue >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {variationValue >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'قيمة التغييرات' : 'Variation Value'}
            </p>
            <p className={`text-xl font-bold ${variationValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {variationValue >= 0 ? '+' : ''}{formatAmount(variationValue)}
            </p>
          </div>
          
          <div className="text-center p-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ar' ? 'القيمة الحالية' : 'Current Value'}
            </p>
            <p className="text-xl font-bold text-purple-600">{formatAmount(currentBudget)}</p>
          </div>
        </div>

        {/* Budget Details */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-2 p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <ArrowUpRight className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'الملتزم' : 'Committed'}
            </p>
            <p className="text-lg font-semibold">{formatAmount(project.budget_committed)}</p>
          </div>
          
          <div className="space-y-2 p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <DollarSign className="h-4 w-4 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'المصروف' : 'Consumed'}
            </p>
            <p className="text-lg font-semibold">{formatAmount(project.budget_consumed)}</p>
          </div>
          
          <div className="space-y-2 p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${remaining < 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {remaining < 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <DollarSign className="h-4 w-4 text-green-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'المتبقي' : 'Remaining'}
            </p>
            <p className={`text-lg font-semibold ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(remaining)}
            </p>
          </div>
          
          <div className="space-y-2 p-3 rounded-lg bg-card border">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'نسبة الاستخدام' : 'Utilization'}
            </p>
            <p className="text-lg font-semibold">{utilizationPercentage.toFixed(1)}%</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'استخدام الميزانية' : 'Budget Utilization'}
            </span>
            <span className="font-medium">{utilizationPercentage.toFixed(1)}%</span>
          </div>
          <BudgetProgressBar
            consumed={project.budget_consumed}
            committed={project.budget_committed}
            total={currentBudget}
            currency={project.currency}
            showLabels={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}