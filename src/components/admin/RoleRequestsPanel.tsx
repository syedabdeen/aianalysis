import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRoleRequests, useApproveRoleRequestByAdmin, useRejectRoleRequest } from '@/hooks/useRoleRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Clock, User, Shield, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const RoleRequestsPanel: React.FC = () => {
  const { language } = useLanguage();
  const { data: requests, isLoading } = useRoleRequests();
  const approveRequest = useApproveRoleRequestByAdmin();
  const rejectRequest = useRejectRoleRequest();
  
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  const pendingRequests = requests?.filter(r => r.status === 'pending' && r.line_manager_approved_at) || [];
  const allRequests = requests || [];

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    
    if (actionType === 'approve') {
      await approveRequest.mutateAsync({ id: selectedRequest, comments });
    } else {
      await rejectRequest.mutateAsync({ id: selectedRequest, comments });
    }
    
    setSelectedRequest(null);
    setActionType(null);
    setComments('');
  };

  const getStatusBadge = (request: typeof allRequests[0]) => {
    if (request.status === 'approved') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'معتمد' : 'Approved'}
        </Badge>
      );
    }
    if (request.status === 'rejected') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'مرفوض' : 'Rejected'}
        </Badge>
      );
    }
    if (request.line_manager_approved_at) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <AlertCircle className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'بانتظار المسؤول' : 'Pending Admin'}
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
        <Clock className="h-3 w-3 mr-1" />
        {language === 'ar' ? 'بانتظار المدير' : 'Pending Manager'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {language === 'ar' ? 'طلبات تعيين الأدوار' : 'Role Assignment Requests'}
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الدور المطلوب' : 'Requested Role'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المبرر' : 'Justification'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المدير المباشر' : 'Line Manager'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{request.user?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{request.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10">
                        {request.requested_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
                        {request.justification}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm">{request.line_manager?.full_name || '-'}</span>
                        {request.line_manager_approved_at && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(request)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'dd/MM/yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {request.status === 'pending' && request.line_manager_approved_at && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={() => {
                              setSelectedRequest(request.id);
                              setActionType('approve');
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setSelectedRequest(request.id);
                              setActionType('reject');
                            }}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {allRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد طلبات' : 'No role requests'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={() => {
        setSelectedRequest(null);
        setActionType(null);
        setComments('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve'
                ? (language === 'ar' ? 'اعتماد طلب الدور' : 'Approve Role Request')
                : (language === 'ar' ? 'رفض طلب الدور' : 'Reject Role Request')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">
                {actionType === 'reject'
                  ? (language === 'ar' ? 'سبب الرفض (مطلوب)' : 'Rejection Reason (Required)')
                  : (language === 'ar' ? 'ملاحظات (اختياري)' : 'Comments (Optional)')}
              </label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={actionType === 'reject' 
                  ? (language === 'ar' ? 'يرجى توضيح سبب الرفض' : 'Please explain the reason for rejection')
                  : (language === 'ar' ? 'أي ملاحظات إضافية' : 'Any additional comments')}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedRequest(null);
              setActionType(null);
              setComments('');
            }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionType === 'reject' && !comments.trim()}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionType === 'approve'
                ? (language === 'ar' ? 'اعتماد' : 'Approve')
                : (language === 'ar' ? 'رفض' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
