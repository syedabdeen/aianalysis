import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateRoleRequest, useRoleRequests } from '@/hooks/useRoleRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, UserPlus, Clock, CheckCircle, Loader2, RefreshCw, FlaskConical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type AppRole = 'admin' | 'manager' | 'buyer' | 'approver' | 'viewer';

const roleLabels: Record<string, { en: string; ar: string }> = {
  admin: { en: 'Administrator', ar: 'مسؤول' },
  manager: { en: 'Manager', ar: 'مدير' },
  buyer: { en: 'Buyer', ar: 'مشتري' },
  approver: { en: 'Approver', ar: 'معتمد' },
  viewer: { en: 'Viewer', ar: 'مشاهد' },
};

const roleDescriptions: Record<string, { en: string; ar: string }> = {
  admin: { 
    en: 'Full system access including user management and approval matrix configuration', 
    ar: 'وصول كامل للنظام بما في ذلك إدارة المستخدمين وتكوين مصفوفة الموافقات' 
  },
  manager: { 
    en: 'Manage projects, approve requests, and oversee team activities', 
    ar: 'إدارة المشاريع، الموافقة على الطلبات، والإشراف على أنشطة الفريق' 
  },
  buyer: { 
    en: 'Create and manage procurement documents (RFI, RFQ, PR, PO)', 
    ar: 'إنشاء وإدارة مستندات المشتريات' 
  },
  approver: { 
    en: 'Review and approve procurement and project documents', 
    ar: 'مراجعة واعتماد مستندات المشتريات والمشاريع' 
  },
  viewer: { 
    en: 'View-only access to reports and documents', 
    ar: 'وصول للعرض فقط للتقارير والمستندات' 
  },
};

export const UserRoleCard: React.FC = () => {
  const { role, isAdmin, user, refreshRole, setRoleOverride, roleOverride } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const createRoleRequest = useCreateRoleRequest();
  const { data: myRequests } = useRoleRequests();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [justification, setJustification] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const currentRoleLabel = role ? roleLabels[role] : null;
  const currentRoleDescription = role ? roleDescriptions[role] : null;

  // Filter pending requests for current user
  const pendingRequests = myRequests?.filter(
    req => req.user_id === user?.id && req.status === 'pending'
  ) || [];

  const handleRefreshRole = async () => {
    setRefreshing(true);
    await refreshRole();
    setRefreshing(false);
  };

  const handleRoleSwitch = (newRole: string) => {
    if (newRole === 'reset') {
      setRoleOverride(null);
    } else {
      setRoleOverride(newRole as AppRole);
    }
  };

  const handleSubmitRequest = async () => {
    if (!selectedRole || !justification) return;
    
    await createRoleRequest.mutateAsync({
      requested_role: selectedRole,
      justification,
    });
    
    setDialogOpen(false);
    setSelectedRole('');
    setJustification('');
  };

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'buyer': return 'secondary';
      case 'approver': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {language === 'ar' ? 'دورك في النظام' : 'Your System Role'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? 'دورك الحالي وصلاحياتك في النظام' 
            : 'Your current role and permissions in the system'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Override Alert */}
        {roleOverride && (
          <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <FlaskConical className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              {language === 'ar' 
                ? `أنت تستخدم وضع الاختبار كـ ${roleLabels[roleOverride]?.ar}. انقر "إعادة تعيين" للعودة لدورك الفعلي.`
                : `You are testing as ${roleLabels[roleOverride]?.en}. Click "Reset" to return to your actual role.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Current Role Display */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {language === 'ar' ? 'الدور الحالي:' : 'Current Role:'}
              </span>
              {currentRoleLabel ? (
                <Badge variant={getRoleBadgeVariant(role || '')}>
                  {language === 'ar' ? currentRoleLabel.ar : currentRoleLabel.en}
                </Badge>
              ) : (
                <Badge variant="outline">
                  {language === 'ar' ? 'غير محدد' : 'Not Assigned'}
                </Badge>
              )}
              {roleOverride && (
                <Badge variant="outline" className="text-amber-600 border-amber-400">
                  {language === 'ar' ? 'وضع الاختبار' : 'Test Mode'}
                </Badge>
              )}
            </div>
            {currentRoleDescription && (
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? currentRoleDescription.ar : currentRoleDescription.en}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefreshRole} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Role Switcher for Admins (Testing) */}
        {(isAdmin || roleOverride) && (
          <div className="p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {language === 'ar' ? 'تبديل الدور (للاختبار)' : 'Switch Role (Testing)'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(roleLabels).map(([key, labels]) => (
                <Button
                  key={key}
                  variant={role === key && !roleOverride ? 'default' : roleOverride === key ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleRoleSwitch(key)}
                  className="text-xs"
                >
                  {language === 'ar' ? labels.ar : labels.en}
                </Button>
              ))}
              {roleOverride && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRoleSwitch('reset')}
                  className="text-xs"
                >
                  {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {language === 'ar' 
                ? 'يسمح لك هذا باختبار التطبيق بأدوار مختلفة دون تغيير دورك الفعلي.'
                : 'This allows you to test the app with different roles without changing your actual role.'}
            </p>
          </div>
        )}

        {/* Admin Quick Access */}
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin/users')}
            >
              <Shield className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إدارة المستخدمين' : 'Manage Users'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/admin/approval-matrix')}
            >
              {language === 'ar' ? 'مصفوفة الموافقات' : 'Approval Matrix'}
            </Button>
          </div>
        )}

        {/* Pending Role Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {language === 'ar' ? 'طلبات قيد الانتظار' : 'Pending Requests'}
            </h4>
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {language === 'ar' 
                      ? roleLabels[req.requested_role]?.ar 
                      : roleLabels[req.requested_role]?.en}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'قيد المراجعة' : 'Under Review'}
                  </span>
                </div>
                {req.line_manager_approved_at && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Request Role Button (for non-admins) */}
        {!isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'طلب صلاحيات إضافية' : 'Request Additional Permissions'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'ar' ? 'طلب صلاحيات جديدة' : 'Request New Role'}
                </DialogTitle>
                <DialogDescription>
                  {language === 'ar' 
                    ? 'سيتم إرسال طلبك إلى مديرك المباشر ثم إلى المسؤول للموافقة' 
                    : 'Your request will be sent to your line manager and then to admin for approval'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'الدور المطلوب' : 'Requested Role'}</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'ar' ? 'اختر الدور' : 'Select a role'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels)
                        .filter(([key]) => key !== 'admin' && key !== role)
                        .map(([key, labels]) => (
                          <SelectItem key={key} value={key}>
                            <div>
                              <span>{language === 'ar' ? labels.ar : labels.en}</span>
                              <p className="text-xs text-muted-foreground">
                                {language === 'ar' 
                                  ? roleDescriptions[key]?.ar 
                                  : roleDescriptions[key]?.en}
                              </p>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'سبب الطلب' : 'Justification'}</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder={language === 'ar' 
                      ? 'اشرح لماذا تحتاج إلى هذه الصلاحيات...' 
                      : 'Explain why you need these permissions...'}
                    rows={4}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button 
                  onClick={handleSubmitRequest}
                  disabled={!selectedRole || !justification || createRoleRequest.isPending}
                >
                  {createRoleRequest.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {language === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};
