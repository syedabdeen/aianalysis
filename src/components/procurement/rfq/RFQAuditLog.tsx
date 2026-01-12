import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  History, 
  Mail, 
  FileCheck, 
  BarChart3, 
  FileOutput,
  User
} from 'lucide-react';
import { format } from 'date-fns';

interface RFQAuditLogProps {
  rfqId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  rfq_issued: <Mail className="h-4 w-4 text-blue-500" />,
  quotation_received: <FileCheck className="h-4 w-4 text-green-500" />,
  analysis_triggered: <BarChart3 className="h-4 w-4 text-purple-500" />,
  converted_to_pr: <FileOutput className="h-4 w-4 text-primary" />,
};

const actionLabels: Record<string, { en: string; ar: string }> = {
  rfq_issued: { en: 'RFQ Issued', ar: 'تم إصدار طلب عرض الأسعار' },
  quotation_received: { en: 'Quotation Received', ar: 'تم استلام عرض الأسعار' },
  analysis_triggered: { en: 'Analysis Triggered', ar: 'تم تشغيل التحليل' },
  converted_to_pr: { en: 'Converted to PR', ar: 'تم التحويل إلى طلب شراء' },
};

export const RFQAuditLog: React.FC<RFQAuditLogProps> = ({ rfqId }) => {
  const { language } = useLanguage();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['rfq-audit-logs', rfqId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfq_audit_logs')
        .select(`
          *,
          performer:profiles!rfq_audit_logs_performed_by_fkey(full_name, email)
        `)
        .eq('rfq_id', rfqId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!rfqId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {language === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {language === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
          </CardTitle>
          <Badge variant="secondary">{logs?.length || 0}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {logs && logs.length > 0 ? (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0"
                >
                  <div className="mt-1">
                    {actionIcons[log.action] || <History className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {actionLabels[log.action]?.[language] || log.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.performed_at), 'dd MMM yyyy, HH:mm')}
                      </span>
                    </div>
                    
                    {log.performer && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{log.performer.full_name || log.performer.email}</span>
                      </div>
                    )}
                    
                    {log.action_details && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {log.action === 'rfq_issued' && (
                          <span>
                            {language === 'ar' 
                              ? `تم إرسال ${log.action_details.emails_sent} بريد إلكتروني إلى ${log.action_details.vendors_count} مورد`
                              : `Sent ${log.action_details.emails_sent} emails to ${log.action_details.vendors_count} vendors`}
                          </span>
                        )}
                        {log.action === 'quotation_received' && (
                          <span>
                            {language === 'ar'
                              ? `المبلغ: ${(log.action_details.total_amount || 0).toLocaleString()} درهم`
                              : `Amount: ${(log.action_details.total_amount || 0).toLocaleString()} AED`}
                          </span>
                        )}
                        {log.action === 'analysis_triggered' && (
                          <span>
                            {language === 'ar'
                              ? `تمت مقارنة ${log.action_details.vendors_compared} موردين`
                              : `Compared ${log.action_details.vendors_compared} vendors`}
                          </span>
                        )}
                        {log.action === 'converted_to_pr' && (
                          <span>
                            {language === 'ar'
                              ? `طلب الشراء: ${log.action_details.pr_code} - المورد: ${log.action_details.selected_vendor_code}`
                              : `PR: ${log.action_details.pr_code} - Vendor: ${log.action_details.selected_vendor_code}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {language === 'ar' ? 'لا توجد سجلات' : 'No audit logs yet'}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
