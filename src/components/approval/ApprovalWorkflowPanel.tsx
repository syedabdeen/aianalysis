import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, User, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import type { ApprovalStatus } from '@/types/approval';

interface WorkflowAction {
  id: string;
  sequence_order: number;
  status: ApprovalStatus;
  comments: string | null;
  acted_at: string | null;
  approval_role?: {
    name_en: string;
    name_ar: string;
    code: string;
    hierarchy_level: number;
  } | null;
  approver?: {
    full_name: string;
    email: string;
  } | null;
}

interface ApprovalWorkflow {
  id: string;
  status: ApprovalStatus;
  current_level: number;
  created_at: string;
  completed_at: string | null;
  actions?: WorkflowAction[];
}

interface ApprovalWorkflowPanelProps {
  workflow: ApprovalWorkflow | null;
  isLoading?: boolean;
}

export function ApprovalWorkflowPanel({ workflow, isLoading }: ApprovalWorkflowPanelProps) {
  const { language } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {language === 'ar' ? 'سير العمل للموافقة' : 'Approval Workflow'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? 'لم يتم بدء سير عمل الموافقة بعد' 
              : 'Approval workflow has not been initiated yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      escalated: 'outline',
      auto_approved: 'default',
    };

    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      approved: { en: 'Approved', ar: 'موافق عليه' },
      rejected: { en: 'Rejected', ar: 'مرفوض' },
      escalated: { en: 'Escalated', ar: 'مُصعَّد' },
      auto_approved: { en: 'Auto Approved', ar: 'موافق تلقائياً' },
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {language === 'ar' ? labels[status]?.ar : labels[status]?.en}
      </Badge>
    );
  };

  const sortedActions = [...(workflow.actions || [])].sort(
    (a, b) => a.sequence_order - b.sequence_order
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {language === 'ar' ? 'سير العمل للموافقة' : 'Approval Workflow'}
          </CardTitle>
          {getStatusBadge(workflow.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline */}
        <div className="relative">
          {sortedActions.map((action, index) => {
            const isLast = index === sortedActions.length - 1;
            const isCurrent = action.sequence_order === workflow.current_level && workflow.status === 'pending';

            return (
              <div key={action.id} className="relative flex items-start gap-3 pb-4">
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[10px] top-6 h-full w-0.5 ${
                      action.status === 'approved' ? 'bg-green-500' : 'bg-border'
                    }`}
                  />
                )}

                {/* Status icon */}
                <div
                  className={`relative z-10 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                    isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {getStatusIcon(action.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {language === 'ar' 
                        ? action.approval_role?.name_ar 
                        : action.approval_role?.name_en}
                    </span>
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs">
                        {language === 'ar' ? 'الحالي' : 'Current'}
                      </Badge>
                    )}
                  </div>

                  {action.status !== 'pending' && action.acted_at && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {action.approver?.full_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {action.approver.full_name}
                        </span>
                      )}
                      <span>
                        {format(new Date(action.acted_at), 'PPp')}
                      </span>
                    </div>
                  )}

                  {action.comments && (
                    <p className="mt-1 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      "{action.comments}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow info */}
        <div className="pt-3 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{language === 'ar' ? 'تاريخ البدء' : 'Started'}</span>
            <span>{format(new Date(workflow.created_at), 'PPp')}</span>
          </div>
          {workflow.completed_at && (
            <div className="flex justify-between">
              <span>{language === 'ar' ? 'تاريخ الانتهاء' : 'Completed'}</span>
              <span>{format(new Date(workflow.completed_at), 'PPp')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
