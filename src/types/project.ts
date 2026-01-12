export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectType = 'construction' | 'maintenance' | 'capex' | 'service';
export type VariationType = 'addition' | 'deduction' | 'scope_change';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';
export type ProjectAlertType = 'budget_warning' | 'budget_exceeded' | 'timeline_warning' | 'timeline_exceeded';
export type BudgetTransactionType = 'allocation' | 'commitment' | 'expense' | 'refund';

export interface Project {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description?: string;
  status: ProjectStatus;
  project_type: ProjectType;
  client_name?: string;
  client_reference?: string;
  start_date?: string;
  end_date?: string;
  actual_end_date?: string;
  initial_start_date?: string;
  initial_end_date?: string;
  extension_reason?: string;
  extended_at?: string;
  original_budget: number;
  revised_budget: number;
  budget_committed: number;
  budget_consumed: number;
  currency: string;
  progress_percentage: number;
  cost_center_id?: string;
  department_id?: string;
  manager_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  cost_center?: { id: string; name_en: string; name_ar: string; code: string };
  department?: { id: string; name_en: string; name_ar: string; code: string };
  manager?: { id: string; full_name: string; email: string };
}

export interface ProjectVariation {
  id: string;
  project_id: string;
  variation_code: string;
  description_en: string;
  description_ar: string;
  variation_type: VariationType;
  amount: number;
  currency: string;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name_en: string;
  name_ar: string;
  description?: string;
  due_date: string;
  completed_date?: string;
  status: MilestoneStatus;
  weight_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectBudgetTransaction {
  id: string;
  project_id: string;
  reference_type: string;
  reference_id?: string;
  reference_code?: string;
  transaction_type: BudgetTransactionType;
  amount: number;
  currency: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface ProjectAlert {
  id: string;
  project_id: string;
  alert_type: ProjectAlertType;
  threshold_percentage?: number;
  current_value?: number;
  message_en: string;
  message_ar: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface ProjectFormData {
  name_en: string;
  name_ar: string;
  description?: string;
  project_type: ProjectType;
  client_name?: string;
  client_reference?: string;
  start_date?: string;
  end_date?: string;
  original_budget: number;
  currency: string;
  cost_center_id?: string;
  department_id?: string;
  manager_id?: string;
}

export interface VariationFormData {
  description_en: string;
  description_ar: string;
  variation_type: VariationType;
  amount: number;
  justification?: string;
}

export interface MilestoneFormData {
  name_en: string;
  name_ar: string;
  description?: string;
  due_date: string;
  weight_percentage: number;
}
