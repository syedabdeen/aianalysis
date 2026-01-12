export type DocumentClassification = 
  | 'trade_license'
  | 'establishment_card'
  | 'vat_certificate'
  | 'insurance'
  | 'bank_details'
  | 'compliance_certificate'
  | 'quality_certification'
  | 'identity_document'
  | 'contract_agreement'
  | 'miscellaneous';

export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  fieldType: 'text' | 'date' | 'number';
}

export interface DocumentExtractionResult {
  classification: DocumentClassification;
  confidence: number;
  extractedFields: ExtractedField[];
  rawData: Record<string, any>;
  suggestedMappings: {
    vendorField: string;
    extractedValue: string;
    confidence: number;
  }[];
}

export interface VendorDocumentWithExtraction {
  id: string;
  vendor_id: string;
  document_type: string;
  classification: DocumentClassification;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  extracted_data?: Record<string, any>;
  expiry_date?: string;
  uploaded_by?: string;
  uploaded_at: string;
  ai_confidence_score: number;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  version: number;
  parent_document_id?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  original_filename?: string;
}

export interface DocumentUploadState {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'extracting' | 'completed' | 'error';
  error?: string;
  extractionResult?: DocumentExtractionResult;
  previewUrl?: string;
}

export interface DocumentAlert {
  id: string;
  vendor_id: string;
  document_id: string;
  alert_type: '30_days' | '15_days' | '7_days' | 'expired';
  alert_date: string;
  is_sent: boolean;
  sent_at?: string;
}

export const DOCUMENT_CLASSIFICATIONS: {
  value: DocumentClassification;
  labelEn: string;
  labelAr: string;
  icon: string;
}[] = [
  { value: 'trade_license', labelEn: 'Trade License', labelAr: 'الرخصة التجارية', icon: '📜' },
  { value: 'establishment_card', labelEn: 'Establishment Card', labelAr: 'بطاقة المنشأة', icon: '🏢' },
  { value: 'vat_certificate', labelEn: 'VAT Certificate', labelAr: 'شهادة ضريبة القيمة المضافة', icon: '💰' },
  { value: 'insurance', labelEn: 'Insurance', labelAr: 'التأمين', icon: '🛡️' },
  { value: 'bank_details', labelEn: 'Bank Details', labelAr: 'التفاصيل المصرفية', icon: '🏦' },
  { value: 'compliance_certificate', labelEn: 'Compliance Certificate', labelAr: 'شهادة الامتثال', icon: '✅' },
  { value: 'quality_certification', labelEn: 'Quality Certification', labelAr: 'شهادة الجودة', icon: '⭐' },
  { value: 'identity_document', labelEn: 'Identity Document', labelAr: 'وثيقة الهوية', icon: '🪪' },
  { value: 'contract_agreement', labelEn: 'Contract/Agreement', labelAr: 'عقد/اتفاقية', icon: '📝' },
  { value: 'miscellaneous', labelEn: 'Miscellaneous', labelAr: 'متنوع', icon: '📎' },
];

export const ALLOWED_FILE_TYPES = {
  'application/pdf': { ext: 'pdf', name: 'PDF' },
  'application/msword': { ext: 'doc', name: 'Word' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', name: 'Word' },
  'text/plain': { ext: 'txt', name: 'Text' },
  'image/jpeg': { ext: 'jpg', name: 'JPEG' },
  'image/png': { ext: 'png', name: 'PNG' },
} as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
