import { useLanguage } from '@/contexts/LanguageContext';
import { useProjectAlerts, useDismissAlert } from '@/hooks/useProjects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, DollarSign, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { ProjectAlertType } from '@/types/project';

interface ProjectAlertsWidgetProps {
  projectId?: string;
  maxItems?: number;
}

const alertIcons: Record<ProjectAlertType, React.ElementType> = {
  budget_warning: DollarSign,
  budget_exceeded: AlertTriangle,
  timeline_warning: Clock,
  timeline_exceeded: AlertTriangle,
};

const alertColors: Record<ProjectAlertType, string> = {
  budget_warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  budget_exceeded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  timeline_warning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  timeline_exceeded: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function ProjectAlertsWidget({ projectId, maxItems = 5 }: ProjectAlertsWidgetProps) {
  const { language } = useLanguage();
  const { data: alerts, isLoading } = useProjectAlerts(projectId);
  const dismissAlert = useDismissAlert();

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy HH:mm', { locale: language === 'ar' ? ar : undefined });
  };

  const displayedAlerts = alerts?.slice(0, maxItems) || [];

  if (isLoading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  if (displayedAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {language === 'ar' ? 'التنبيهات' : 'Alerts'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            {language === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {language === 'ar' ? 'التنبيهات' : 'Alerts'}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            ({displayedAlerts.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedAlerts.map((alert) => {
          const Icon = alertIcons[alert.alert_type];
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${alertColors[alert.alert_type]}`}
            >
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">
                  {language === 'ar' ? alert.message_ar : alert.message_en}
                </p>
                <p className="text-xs opacity-75 mt-1">{formatDate(alert.created_at)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => dismissAlert.mutate(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
