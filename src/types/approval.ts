export type ApprovalCategory = 
  | 'purchase_request' 
  | 'purchase_order' 
  | 'contracts' 
  | 'capex' 
  | 'payments' 
  | 'float_cash';

export type ApprovalStatus = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'escalated' 
  | 'auto_approved';

export type OverrideType = 
  | 'emergency_purchase' 
  | 'single_source_justification' 
  | 'capex_special' 
  | 'float_cash_replenishment' 
  | 'budget_override';

export interface ApprovalRole {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  description: string | null;
  hierarchy_level: number;
  is_active: boolean;
  permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRule {
  id: string;
  category: ApprovalCategory;
  name_en: string;
  name_ar: string;
  min_amount: number;
  max_amount: number | null;
  currency: string;
  department_id: string | null;
  requires_sequential: boolean;
  auto_approve_below: number | null;
  escalation_hours: number | null;
  is_active: boolean;
  conditions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  approvers?: ApprovalRuleApprover[];
}

export interface ApprovalRuleApprover {
  id: string;
  rule_id: string;
  approval_role_id: string;
  sequence_order: number;
  is_mandatory: boolean;
  can_delegate: boolean;
  created_at: string;
  approval_role?: ApprovalRole;
}

export interface ApprovalOverride {
  id: string;
  override_type: OverrideType;
  name_en: string;
  name_ar: string;
  category: ApprovalCategory | null;
  conditions: Record<string, unknown>;
  bypass_levels: number[];
  require_justification: boolean;
  max_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalMatrixVersion {
  id: string;
  version_number: number;
  snapshot: {
    rules: ApprovalRule[];
    roles: ApprovalRole[];
    overrides: ApprovalOverride[];
    approvers: ApprovalRuleApprover[];
  };
  change_summary: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface ApprovalAuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  performed_by: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  category: ApprovalCategory;
  reference_id: string;
  reference_code: string;
  amount: number;
  currency: string;
  rule_id: string | null;
  current_level: number;
  status: ApprovalStatus;
  override_id: string | null;
  override_justification: string | null;
  initiated_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Category display info
export const APPROVAL_CATEGORIES: Record<ApprovalCategory, { label_en: string; label_ar: string; color: string }> = {
  purchase_request: { label_en: 'Purchase Request', label_ar: 'طلب شراء', color: 'blue' },
  purchase_order: { label_en: 'Purchase Order', label_ar: 'أمر شراء', color: 'green' },
  contracts: { label_en: 'Contracts', label_ar: 'العقود', color: 'purple' },
  capex: { label_en: 'CAPEX', label_ar: 'رأسمالي', color: 'orange' },
  payments: { label_en: 'Payments', label_ar: 'المدفوعات', color: 'yellow' },
  float_cash: { label_en: 'Float Cash', label_ar: 'النثرية', color: 'cyan' },
};

export const OVERRIDE_TYPES: Record<OverrideType, { label_en: string; label_ar: string }> = {
  emergency_purchase: { label_en: 'Emergency Purchase', label_ar: 'شراء طارئ' },
  single_source_justification: { label_en: 'Single Source Justification', label_ar: 'مبرر المورد الوحيد' },
  capex_special: { label_en: 'CAPEX Special', label_ar: 'رأسمالي خاص' },
  float_cash_replenishment: { label_en: 'Float Cash Replenishment', label_ar: 'تعويض النثرية' },
  budget_override: { label_en: 'Budget Override', label_ar: 'تجاوز الميزانية' },
};
