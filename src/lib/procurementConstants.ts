// Standard Payment Terms
export const STANDARD_PAYMENT_TERMS = [
  { value: 'net_30', label_en: 'Net 30 Days', label_ar: 'صافي 30 يوم' },
  { value: 'net_45', label_en: 'Net 45 Days', label_ar: 'صافي 45 يوم' },
  { value: 'net_60', label_en: 'Net 60 Days', label_ar: 'صافي 60 يوم' },
  { value: 'net_90', label_en: 'Net 90 Days', label_ar: 'صافي 90 يوم' },
  { value: 'cod', label_en: 'Cash on Delivery (COD)', label_ar: 'الدفع عند التسليم' },
  { value: 'advance_100', label_en: '100% Advance Payment', label_ar: 'دفع مقدم 100%' },
  { value: 'advance_50', label_en: '50% Advance, 50% on Delivery', label_ar: '50% مقدم، 50% عند التسليم' },
  { value: 'advance_30_70', label_en: '30% Advance, 70% on Delivery', label_ar: '30% مقدم، 70% عند التسليم' },
  { value: 'lc', label_en: 'Letter of Credit (L/C)', label_ar: 'خطاب اعتماد' },
  { value: 'lc_at_sight', label_en: 'L/C at Sight', label_ar: 'خطاب اعتماد عند الإطلاع' },
  { value: 'lc_30', label_en: 'L/C 30 Days', label_ar: 'خطاب اعتماد 30 يوم' },
  { value: 'lc_60', label_en: 'L/C 60 Days', label_ar: 'خطاب اعتماد 60 يوم' },
  { value: 'lc_90', label_en: 'L/C 90 Days', label_ar: 'خطاب اعتماد 90 يوم' },
  { value: 'tt', label_en: 'Telegraphic Transfer (T/T)', label_ar: 'حوالة برقية' },
  { value: 'tt_advance', label_en: 'T/T Advance', label_ar: 'حوالة برقية مقدمة' },
  { value: 'special', label_en: 'Special Payment Terms', label_ar: 'شروط دفع خاصة' },
];

// INCOTERMS 2020
export const INCOTERMS = [
  { value: 'EXW', label_en: 'EXW - Ex Works', label_ar: 'تسليم المصنع', description: 'Seller delivers when goods are placed at buyer\'s disposal at seller\'s premises' },
  { value: 'FCA', label_en: 'FCA - Free Carrier', label_ar: 'تسليم للناقل', description: 'Seller delivers goods to carrier or person nominated by buyer' },
  { value: 'CPT', label_en: 'CPT - Carriage Paid To', label_ar: 'أجرة النقل مدفوعة', description: 'Seller pays for carriage to named destination' },
  { value: 'CIP', label_en: 'CIP - Carriage and Insurance Paid', label_ar: 'أجرة النقل والتأمين مدفوعة', description: 'Seller pays for carriage and insurance to named destination' },
  { value: 'DAP', label_en: 'DAP - Delivered at Place', label_ar: 'التسليم في المكان', description: 'Seller delivers goods ready for unloading at named place of destination' },
  { value: 'DPU', label_en: 'DPU - Delivered at Place Unloaded', label_ar: 'التسليم في المكان بعد التفريغ', description: 'Seller delivers goods unloaded at named place of destination' },
  { value: 'DDP', label_en: 'DDP - Delivered Duty Paid', label_ar: 'التسليم مع دفع الرسوم', description: 'Seller bears all costs and risks including duty, taxes, and customs clearance' },
  { value: 'FAS', label_en: 'FAS - Free Alongside Ship', label_ar: 'تسليم بجانب السفينة', description: 'Seller delivers goods alongside vessel at named port of shipment' },
  { value: 'FOB', label_en: 'FOB - Free on Board', label_ar: 'تسليم على ظهر السفينة', description: 'Seller delivers goods on board vessel at named port of shipment' },
  { value: 'CFR', label_en: 'CFR - Cost and Freight', label_ar: 'التكلفة والشحن', description: 'Seller pays costs and freight to named port of destination' },
  { value: 'CIF', label_en: 'CIF - Cost, Insurance and Freight', label_ar: 'التكلفة والتأمين والشحن', description: 'Seller pays costs, insurance, and freight to named port of destination' },
];

// Common delivery location types
export const DELIVERY_LOCATION_TYPES = [
  { value: 'project_site', label_en: 'Project Site', label_ar: 'موقع المشروع' },
  { value: 'warehouse', label_en: 'Warehouse', label_ar: 'المستودع' },
  { value: 'head_office', label_en: 'Head Office', label_ar: 'المقر الرئيسي' },
  { value: 'custom', label_en: 'Custom Location', label_ar: 'موقع مخصص' },
];
