import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApprovalAuditLogs } from '@/hooks/useApprovalMatrix';
import { ApprovalAuditLog } from '@/types/approval';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2,
  FileText,
} from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  AddRule: <Plus className="h-4 w-4 text-green-400" />,
  EditRule: <Pencil className="h-4 w-4 text-blue-400" />,
  DeleteRule: <Trash2 className="h-4 w-4 text-red-400" />,
  AddRole: <Plus className="h-4 w-4 text-green-400" />,
  EditRole: <Pencil className="h-4 w-4 text-blue-400" />,
};

const ACTION_COLORS: Record<string, string> = {
  AddRule: 'bg-green-500/20 text-green-400 border-green-500/30',
  EditRule: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DeleteRule: 'bg-red-500/20 text-red-400 border-red-500/30',
  AddRole: 'bg-green-500/20 text-green-400 border-green-500/30',
  EditRole: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export const AuditLogViewer: React.FC = () => {
  const { language } = useLanguage();
  const { data: logs, isLoading } = useApprovalAuditLogs(30);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {language === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {logs?.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
              >
                <div className="mt-0.5">
                  {ACTION_ICONS[log.action] || <FileText className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={ACTION_COLORS[log.action] || ''}>
                      {log.action}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {log.entity_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.created_at), 'PPpp')}
                  </p>
                  {log.new_values && (
                    <p className="text-sm mt-1 truncate">
                      {(log.new_values as any).name_en || (log.new_values as any).name || 'Item updated'}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'ar' ? 'لا توجد سجلات' : 'No audit logs yet'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
