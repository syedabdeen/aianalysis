import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useApprovalRoles, 
  useAddRuleApprover, 
  useRemoveRuleApprover 
} from '@/hooks/useApprovalMatrix';
import { ApprovalRule, ApprovalRuleApprover } from '@/types/approval';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  ArrowRight,
  User,
} from 'lucide-react';

interface ApproverManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: ApprovalRule | null;
}

export const ApproverManagementDialog: React.FC<ApproverManagementDialogProps> = ({
  open,
  onOpenChange,
  rule,
}) => {
  const { language } = useLanguage();
  const { data: roles } = useApprovalRoles();
  const addApprover = useAddRuleApprover();
  const removeApprover = useRemoveRuleApprover();

  const [selectedRole, setSelectedRole] = useState<string>('');
  const [sequenceOrder, setSequenceOrder] = useState(1);
  const [isMandatory, setIsMandatory] = useState(true);
  const [canDelegate, setCanDelegate] = useState(false);

  const approvers = rule?.approvers?.sort((a, b) => a.sequence_order - b.sequence_order) || [];

  const availableRoles = roles?.filter(
    role => !approvers.some(a => a.approval_role_id === role.id)
  );

  const handleAddApprover = async () => {
    if (!rule || !selectedRole) return;

    await addApprover.mutateAsync({
      rule_id: rule.id,
      approval_role_id: selectedRole,
      sequence_order: approvers.length + 1,
      is_mandatory: isMandatory,
      can_delegate: canDelegate,
    });

    setSelectedRole('');
    setIsMandatory(true);
    setCanDelegate(false);
  };

  const handleRemoveApprover = async (id: string) => {
    await removeApprover.mutateAsync(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {language === 'ar' ? 'إدارة المعتمدين' : 'Manage Approvers'} - {language === 'ar' ? rule?.name_ar : rule?.name_en}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Approvers */}
          <div className="space-y-3">
            <Label>{language === 'ar' ? 'مسار الموافقة' : 'Approval Path'}</Label>
            
            {approvers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  {language === 'ar' ? 'لا يوجد معتمدون بعد' : 'No approvers added yet'}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {approvers.map((approver, index) => (
                  <React.Fragment key={approver.id}>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <Badge variant="outline" className="text-xs">
                          {approver.sequence_order}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {language === 'ar' 
                            ? approver.approval_role?.name_ar 
                            : approver.approval_role?.name_en}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {approver.is_mandatory && (
                            <Badge variant="secondary" className="text-xs">
                              {language === 'ar' ? 'إلزامي' : 'Required'}
                            </Badge>
                          )}
                          {approver.can_delegate && (
                            <Badge variant="secondary" className="text-xs">
                              {language === 'ar' ? 'قابل للتفويض' : 'Delegable'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveApprover(approver.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {index < approvers.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Add New Approver */}
          <div className="border-t border-border pt-4 space-y-4">
            <Label>{language === 'ar' ? 'إضافة معتمد' : 'Add Approver'}</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {language === 'ar' ? 'الدور' : 'Role'}
                </Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر دور' : 'Select role'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles?.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            L{role.hierarchy_level}
                          </Badge>
                          {language === 'ar' ? role.name_ar : role.name_en}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'إلزامي' : 'Mandatory'}
                  </Label>
                  <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'قابل للتفويض' : 'Can Delegate'}
                  </Label>
                  <Switch checked={canDelegate} onCheckedChange={setCanDelegate} />
                </div>
              </div>
            </div>

            <Button
              onClick={handleAddApprover}
              disabled={!selectedRole || addApprover.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إضافة إلى المسار' : 'Add to Path'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
