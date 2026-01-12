import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApprovalRulesTable } from '@/components/approval/ApprovalRulesTable';
import { ApprovalRolesTable } from '@/components/approval/ApprovalRolesTable';
import { ApprovalRuleDialog } from '@/components/approval/ApprovalRuleDialog';
import { ApprovalRoleDialog } from '@/components/approval/ApprovalRoleDialog';
import { ApproverManagementDialog } from '@/components/approval/ApproverManagementDialog';
import { WorkflowSimulator } from '@/components/approval/WorkflowSimulator';
import { AuditLogViewer } from '@/components/approval/AuditLogViewer';
import { MatrixVersionHistory } from '@/components/approval/MatrixVersionHistory';
import { MatrixExportButton } from '@/components/approval/MatrixExportButton';
import { ApprovalThresholdsTable } from '@/components/approval/ApprovalThresholdsTable';
import { UserApproversTable } from '@/components/approval/UserApproversTable';
import { UserApproverDialog } from '@/components/approval/UserApproverDialog';
import { ApprovalRule, ApprovalRole, APPROVAL_CATEGORIES, ApprovalCategory } from '@/types/approval';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Settings2, 
  Shield, 
  GitBranch,
  History,
  PlayCircle,
  FileJson,
  Layers,
  Users,
  DollarSign,
} from 'lucide-react';

const ApprovalMatrixPage: React.FC = () => {
  const { language, isRTL } = useLanguage();
  
  // Dialog states
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [approverDialogOpen, setApproverDialogOpen] = useState(false);
  const [userApproverDialogOpen, setUserApproverDialogOpen] = useState(false);
  
  // Selected items for editing
  const [selectedRule, setSelectedRule] = useState<ApprovalRule | null>(null);
  const [selectedRole, setSelectedRole] = useState<ApprovalRole | null>(null);
  const [ruleForApprovers, setRuleForApprovers] = useState<ApprovalRule | null>(null);
  const [selectedUserApprover, setSelectedUserApprover] = useState<any | null>(null);
  
  // Filter
  const [categoryFilter, setCategoryFilter] = useState<ApprovalCategory | 'all'>('all');

  const handleAddUserApprover = () => {
    setSelectedUserApprover(null);
    setUserApproverDialogOpen(true);
  };

  const handleEditUserApprover = (approver: any) => {
    setSelectedUserApprover(approver);
    setUserApproverDialogOpen(true);
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setSelectedRule(rule);
    setRuleDialogOpen(true);
  };

  const handleAddRule = () => {
    setSelectedRule(null);
    setRuleDialogOpen(true);
  };

  const handleEditRole = (role: ApprovalRole) => {
    setSelectedRole(role);
    setRoleDialogOpen(true);
  };

  const handleAddRole = () => {
    setSelectedRole(null);
    setRoleDialogOpen(true);
  };

  const handleManageApprovers = (rule: ApprovalRule) => {
    setRuleForApprovers(rule);
    setApproverDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Approval Matrix"
          titleAr="مصفوفة الموافقات"
          description="Manage approval rules and roles for financial approvals"
          descriptionAr="إدارة قواعد وأدوار الموافقة للموافقات المالية"
          icon={GitBranch}
          actions={<MatrixExportButton />}
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="rules" className="gap-2">
              <Layers className="h-4 w-4" />
              {language === 'ar' ? 'القواعد' : 'Rules'}
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="h-4 w-4" />
              {language === 'ar' ? 'الأدوار' : 'Roles'}
            </TabsTrigger>
            <TabsTrigger value="thresholds" className="gap-2">
              <DollarSign className="h-4 w-4" />
              {language === 'ar' ? 'الحدود' : 'Thresholds'}
            </TabsTrigger>
            <TabsTrigger value="user-approvers" className="gap-2">
              <Users className="h-4 w-4" />
              {language === 'ar' ? 'المعتمدين' : 'User Approvers'}
            </TabsTrigger>
            <TabsTrigger value="simulator" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              {language === 'ar' ? 'المحاكاة' : 'Simulator'}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {language === 'ar' ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Select 
                  value={categoryFilter} 
                  onValueChange={(v) => setCategoryFilter(v as ApprovalCategory | 'all')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'ar' ? 'جميع الفئات' : 'All Categories'}
                    </SelectItem>
                    {Object.entries(APPROVAL_CATEGORIES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {language === 'ar' ? value.label_ar : value.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddRule} className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة قاعدة' : 'Add Rule'}
              </Button>
            </div>

            <ApprovalRulesTable
              selectedCategory={categoryFilter === 'all' ? undefined : categoryFilter}
              onEdit={handleEditRule}
              onManageApprovers={handleManageApprovers}
            />

            {/* Category Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(APPROVAL_CATEGORIES).map(([key, value]) => (
                <Card key={key} className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant="outline" 
                        className={`text-xs bg-${value.color}-500/20 text-${value.color}-400 border-${value.color}-500/30`}
                      >
                        {language === 'ar' ? value.label_ar : value.label_en}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddRole} className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة دور' : 'Add Role'}
              </Button>
            </div>

            <ApprovalRolesTable onEdit={handleEditRole} />
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {language === 'ar' ? 'جدول حدود الموافقة' : 'Approval Threshold Table'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalThresholdsTable />
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Approvers Tab */}
          <TabsContent value="user-approvers" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleAddUserApprover} className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'ar' ? 'إضافة معتمد' : 'Add User Approver'}
              </Button>
            </div>
            <UserApproversTable onEdit={handleEditUserApprover} />
          </TabsContent>

          {/* Simulator Tab */}
          <TabsContent value="simulator">
            <WorkflowSimulator />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MatrixVersionHistory />
              <AuditLogViewer />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ApprovalRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        rule={selectedRule}
      />

      <ApprovalRoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        role={selectedRole}
      />

      <ApproverManagementDialog
        open={approverDialogOpen}
        onOpenChange={setApproverDialogOpen}
        rule={ruleForApprovers}
      />

      <UserApproverDialog
        open={userApproverDialogOpen}
        onOpenChange={setUserApproverDialogOpen}
        approver={selectedUserApprover}
      />
    </DashboardLayout>
  );
};

export default ApprovalMatrixPage;
