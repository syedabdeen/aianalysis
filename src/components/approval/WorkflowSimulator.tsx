import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSimulateWorkflow } from '@/hooks/useApprovalMatrix';
import { APPROVAL_CATEGORIES, ApprovalCategory } from '@/types/approval';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PlayCircle, 
  CheckCircle2, 
  ArrowRight,
  Zap,
  Route,
  AlertCircle,
} from 'lucide-react';

export const WorkflowSimulator: React.FC = () => {
  const { language } = useLanguage();
  const simulate = useSimulateWorkflow();
  
  const [category, setCategory] = useState<ApprovalCategory>('purchase_request');
  const [amount, setAmount] = useState<number>(10000);

  const handleSimulate = () => {
    simulate.mutate({ category, amount });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          {language === 'ar' ? 'محاكاة سير العمل' : 'Workflow Simulator'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{language === 'ar' ? 'الفئة' : 'Category'}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ApprovalCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPROVAL_CATEGORIES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {language === 'ar' ? value.label_ar : value.label_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'ar' ? 'المبلغ (AED)' : 'Amount (AED)'}</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              step={100}
            />
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleSimulate} 
              disabled={simulate.isPending}
              className="w-full"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'محاكاة' : 'Simulate'}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {simulate.data && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Rule Match */}
            {simulate.data.rule ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'القاعدة المطابقة' : 'Matching Rule'}
                    </p>
                    <p className="font-medium">
                      {language === 'ar' ? simulate.data.rule.name_ar : simulate.data.rule.name_en}
                    </p>
                  </div>
                  <Badge variant="outline">v{simulate.data.rule.version}</Badge>
                </div>

                {/* Auto Approval Check */}
                {simulate.data.autoApproved && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <Zap className="h-5 w-5 text-green-400" />
                    <p className="text-green-400 font-medium">
                      {language === 'ar' 
                        ? 'سيتم الموافقة تلقائياً (أقل من الحد الأدنى)'
                        : 'Will be auto-approved (below threshold)'}
                    </p>
                  </div>
                )}

                {/* Approval Path */}
                {!simulate.data.autoApproved && simulate.data.approvalPath.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'مسار الموافقة' : 'Approval Path'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {simulate.data.approvalPath.map((approver: any, index: number) => (
                        <React.Fragment key={approver.id}>
                          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
                            <Badge variant="outline" className="text-xs">
                              {approver.sequence_order}
                            </Badge>
                            <span className="text-sm font-medium">
                              {language === 'ar' 
                                ? approver.approval_role?.name_ar 
                                : approver.approval_role?.name_en}
                            </span>
                            {approver.is_mandatory && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          {index < simulate.data.approvalPath.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* No approvers warning */}
                {!simulate.data.autoApproved && simulate.data.approvalPath.length === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                    <p className="text-yellow-400">
                      {language === 'ar' 
                        ? 'لا يوجد معتمدون محددون لهذه القاعدة'
                        : 'No approvers configured for this rule'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400">
                  {language === 'ar' 
                    ? 'لم يتم العثور على قاعدة مطابقة لهذا المبلغ'
                    : 'No matching rule found for this amount'}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
