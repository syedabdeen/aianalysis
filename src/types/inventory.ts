export type StockMovementType = 'goods_receipt' | 'issue' | 'adjustment' | 'transfer' | 'return';
export type GoodsReceiptStatus = 'pending' | 'partial' | 'complete';
export type QualityStatus = 'pending' | 'passed' | 'failed' | 'partial';

export interface InventoryCategory {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description?: string;
  parent_category_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  description?: string;
  category_id?: string;
  category?: InventoryCategory;
  unit: string;
  unit_price: number;
  currency: string;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point: number;
  current_stock: number;
  warehouse_location?: string;
  is_active: boolean;
  is_stockable: boolean;
  lead_time_days?: number;
  specifications?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  inventory_item?: Partial<InventoryItem> & { id: string; code: string; name_en: string; name_ar: string };
  movement_type: StockMovementType;
  quantity: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  reference_code?: string;
  project_id?: string;
  cost_center_id?: string;
  notes?: string;
  performed_by?: string;
  warehouse_location?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface GoodsReceipt {
  id: string;
  receipt_code: string;
  po_id: string;
  vendor_id: string;
  vendor?: {
    company_name_en: string;
    company_name_ar: string;
  };
  purchase_order?: {
    code: string;
    title_en: string;
    title_ar: string;
  };
  receipt_date: string;
  status: GoodsReceiptStatus;
  notes?: string;
  received_by?: string;
  created_at: string;
  updated_at: string;
  items?: GoodsReceiptItem[];
}

export interface GoodsReceiptItem {
  id: string;
  receipt_id: string;
  po_item_id: string;
  inventory_item_id?: string;
  inventory_item?: InventoryItem;
  quantity_ordered: number;
  quantity_received: number;
  quantity_rejected: number;
  quality_status: QualityStatus;
  inspection_notes?: string;
  created_at: string;
}

export interface InventoryItemFormData {
  name_en: string;
  name_ar: string;
  description?: string;
  category_id?: string;
  unit: string;
  unit_price: number;
  currency: string;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point: number;
  warehouse_location?: string;
  is_stockable: boolean;
  lead_time_days?: number;
  specifications?: string;
}

export interface StockAdjustmentFormData {
  inventory_item_id: string;
  adjustment_type: 'add' | 'subtract' | 'set';
  quantity: number;
  reason: string;
  notes?: string;
  project_id?: string;
  cost_center_id?: string;
  warehouse_location?: string;
}

export interface GoodsReceiptFormData {
  po_id: string;
  receipt_date: string;
  notes?: string;
  items: {
    po_item_id: string;
    inventory_item_id?: string;
    quantity_received: number;
    quantity_rejected: number;
    quality_status: QualityStatus;
    inspection_notes?: string;
  }[];
}

export const UNIT_OPTIONS = [
  { value: 'EA', label_en: 'Each', label_ar: 'قطعة' },
  { value: 'KG', label_en: 'Kilogram', label_ar: 'كيلوغرام' },
  { value: 'M', label_en: 'Meter', label_ar: 'متر' },
  { value: 'M2', label_en: 'Square Meter', label_ar: 'متر مربع' },
  { value: 'M3', label_en: 'Cubic Meter', label_ar: 'متر مكعب' },
  { value: 'L', label_en: 'Liter', label_ar: 'لتر' },
  { value: 'BOX', label_en: 'Box', label_ar: 'صندوق' },
  { value: 'SET', label_en: 'Set', label_ar: 'طقم' },
  { value: 'TON', label_en: 'Ton', label_ar: 'طن' },
  { value: 'ROLL', label_en: 'Roll', label_ar: 'لفة' },
  { value: 'BAG', label_en: 'Bag', label_ar: 'كيس' },
  { value: 'SHEET', label_en: 'Sheet', label_ar: 'لوح' },
  { value: 'PAIR', label_en: 'Pair', label_ar: 'زوج' },
];
