export type VendorType = 'material' | 'service' | 'subcontractor';
export type VendorStatus = 'pending' | 'approved' | 'suspended' | 'blacklisted';
export type VendorDocumentType = 'trade_license' | 'tax_certificate' | 'bank_letter' | 'insurance' | 'other';

export interface VendorCategory {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description?: string;
  is_active: boolean;
}

export interface Vendor {
  id: string;
  code: string;
  company_name_en: string;
  company_name_ar: string;
  trade_license_no?: string;
  trade_license_expiry?: string;
  tax_registration_no?: string;
  email: string;
  phone?: string;
  website?: string;
  address_en?: string;
  address_ar?: string;
  city?: string;
  country: string;
  category_id?: string;
  vendor_type: VendorType;
  status: VendorStatus;
  is_active: boolean;
  rating_score: number;
  risk_score: number;
  ai_insights?: Record<string, any>;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  // Joined data
  category?: VendorCategory;
  contacts?: VendorContact[];
  bank_details?: VendorBankDetail[];
  documents?: VendorDocument[];
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
}

export interface VendorBankDetail {
  id: string;
  vendor_id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  iban?: string;
  swift_code?: string;
  currency: string;
  is_primary: boolean;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: VendorDocumentType;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  extracted_data?: Record<string, any>;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface VendorFormData {
  // Step 1: Basic Info
  company_name_en: string;
  company_name_ar: string;
  vendor_type: VendorType;
  category_id?: string; // Legacy single category (kept for backwards compatibility)
  category_ids?: string[]; // Multiple categories support
  email: string;
  phone?: string;
  website?: string;
  
  // Step 2: Business Details
  trade_license_no?: string;
  trade_license_expiry?: string;
  tax_registration_no?: string;
  address_en?: string;
  address_ar?: string;
  city?: string;
  country: string;
  
  // Step 3: Contacts
  contacts: Omit<VendorContact, 'id' | 'vendor_id'>[];
  
  // Step 4: Bank Details
  bank_details: Omit<VendorBankDetail, 'id' | 'vendor_id'>[];
  
  notes?: string;
}

export interface VendorCategoryMapping {
  id: string;
  vendor_id: string;
  category_id: string;
  created_at: string;
  category?: VendorCategory;
}
