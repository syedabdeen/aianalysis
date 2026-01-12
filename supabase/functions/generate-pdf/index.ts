import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Secure CORS - restrict to allowed origins
const getAllowedOrigins = (): string[] => {
  const origins = [
    'https://procuremind.com',
    'https://www.procuremind.com',
    'https://0b762ee2-5a0e-4d35-a836-8d0aa2d5a8c9.lovableproject.com',
  ];
  
  const customOrigin = Deno.env.get('ALLOWED_ORIGIN');
  if (customOrigin) origins.push(customOrigin);
  
  const env = Deno.env.get('ENVIRONMENT');
  if (env !== 'production') {
    origins.push('http://localhost:8080', 'http://localhost:5173', 'http://localhost:3000');
  }
  
  return origins.filter(Boolean);
};

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = origin && allowedOrigins.some(o => origin.startsWith(o));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { poId, language = 'en' } = await req.json();
    
    if (!poId) {
      throw new Error('Purchase Order ID is required');
    }

    console.log(`Generating PDF for PO: ${poId}, Language: ${language}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch PO data with related information
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(code, company_name_en, company_name_ar, email, phone, address_en, address_ar),
        project:projects(code, name_en, name_ar),
        cost_center:cost_centers(code, name_en, name_ar),
        department:departments(code, name_en, name_ar),
        pr:purchase_requests(code, title_en, title_ar)
      `)
      .eq('id', poId)
      .single();

    if (poError || !po) {
      console.error('Error fetching PO:', poError);
      throw new Error('Purchase Order not found');
    }

    // Fetch PO items
    const { data: items, error: itemsError } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('po_id', poId)
      .order('item_number', { ascending: true });

    if (itemsError) {
      console.error('Error fetching PO items:', itemsError);
      throw new Error('Failed to fetch PO items');
    }

    console.log(`Found ${items?.length || 0} items for PO ${po.code}`);

    // Generate HTML for PDF
    const isArabic = language === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';
    
    const html = generatePOHtml(po, items || [], isArabic, dir);

    return new Response(
      JSON.stringify({
        success: true,
        html,
        po: {
          code: po.code,
          title: isArabic ? po.title_ar : po.title_en,
          vendor: isArabic ? po.vendor?.company_name_ar : po.vendor?.company_name_en,
          total: po.total_amount,
          currency: po.currency,
          items: items?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating PDF:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
      }
    );
  }
});

function generatePOHtml(po: any, items: any[], isArabic: boolean, dir: string): string {
  const t = (en: string, ar: string) => isArabic ? ar : en;
  const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} ${po.currency}`;
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';

  const itemsHtml = items.map((item, index) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.item_number}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        ${isArabic ? item.description_ar : item.description_en}
        ${item.specifications ? `<br><small style="color: #6b7280;">${item.specifications}</small>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.unit}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: ${isArabic ? 'left' : 'right'};">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: ${isArabic ? 'left' : 'right'}; font-weight: 600;">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t('Purchase Order', 'أمر الشراء')} - ${po.code}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cairo:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: ${isArabic ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
      font-size: 12px;
      color: #1f2937;
      line-height: 1.5;
      background: white;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #0A0F1A;
    }
    
    .company-info h1 {
      font-size: 24px;
      font-weight: 700;
      color: #0A0F1A;
      margin-bottom: 5px;
    }
    
    .document-info {
      text-align: ${isArabic ? 'left' : 'right'};
    }
    
    .document-info h2 {
      font-size: 18px;
      font-weight: 700;
      color: #0A0F1A;
      margin-bottom: 10px;
    }
    
    .document-info p {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    
    .document-info .po-code {
      font-size: 16px;
      font-weight: 600;
      color: #33C8FF;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #0A0F1A;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .info-box {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    
    .info-box h3 {
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .info-box p {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 3px;
    }
    
    .info-box .value {
      color: #1f2937;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th {
      background: #0A0F1A;
      color: white;
      padding: 12px 10px;
      font-weight: 600;
      font-size: 11px;
      text-align: ${isArabic ? 'right' : 'left'};
    }
    
    th:first-child { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(5), th:nth-child(6) { text-align: ${isArabic ? 'left' : 'right'}; }
    
    .totals {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-box {
      width: 300px;
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 12px;
    }
    
    .totals-row.total {
      border-top: 2px solid #0A0F1A;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 14px;
      font-weight: 700;
    }
    
    .terms-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    
    .terms-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    .term-box {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
    }
    
    .term-box h4 {
      font-size: 11px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .term-box p {
      font-size: 11px;
      color: #6b7280;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 10px;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 40px;
      margin-top: 50px;
    }
    
    .signature-box {
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #374151;
      margin-top: 50px;
      padding-top: 10px;
    }
    
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <h1>ProcureMind</h1>
      <p style="color: #6b7280;">${t('Enterprise Procurement Management', 'إدارة المشتريات المؤسسية')}</p>
    </div>
    <div class="document-info">
      <h2>${t('PURCHASE ORDER', 'أمر الشراء')}</h2>
      <p class="po-code">${po.code}</p>
      <p><strong>${t('Date', 'التاريخ')}:</strong> ${formatDate(po.created_at)}</p>
      <p><strong>${t('Status', 'الحالة')}:</strong> ${po.status.toUpperCase()}</p>
      ${po.delivery_date ? `<p><strong>${t('Delivery Date', 'تاريخ التسليم')}:</strong> ${formatDate(po.delivery_date)}</p>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="info-grid">
      <div class="info-box">
        <h3>${t('Vendor Information', 'معلومات المورد')}</h3>
        <p class="value" style="font-size: 14px; margin-bottom: 5px;">${isArabic ? po.vendor?.company_name_ar : po.vendor?.company_name_en}</p>
        <p><strong>${t('Code', 'الكود')}:</strong> ${po.vendor?.code || '-'}</p>
        <p><strong>${t('Email', 'البريد')}:</strong> ${po.vendor?.email || '-'}</p>
        <p><strong>${t('Phone', 'الهاتف')}:</strong> ${po.vendor?.phone || '-'}</p>
        ${po.vendor?.address_en ? `<p><strong>${t('Address', 'العنوان')}:</strong> ${isArabic ? po.vendor.address_ar : po.vendor.address_en}</p>` : ''}
      </div>
      <div class="info-box">
        <h3>${t('Order Details', 'تفاصيل الطلب')}</h3>
        <p><strong>${t('PR Reference', 'مرجع طلب الشراء')}:</strong> ${po.pr?.code || '-'}</p>
        ${po.project ? `<p><strong>${t('Project', 'المشروع')}:</strong> ${isArabic ? po.project.name_ar : po.project.name_en}</p>` : ''}
        ${po.cost_center ? `<p><strong>${t('Cost Center', 'مركز التكلفة')}:</strong> ${isArabic ? po.cost_center.name_ar : po.cost_center.name_en}</p>` : ''}
        ${po.department ? `<p><strong>${t('Department', 'القسم')}:</strong> ${isArabic ? po.department.name_ar : po.department.name_en}</p>` : ''}
        ${po.delivery_address ? `<p><strong>${t('Delivery Address', 'عنوان التسليم')}:</strong> ${po.delivery_address}</p>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">${t('Order Items', 'عناصر الطلب')}</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>${t('Description', 'الوصف')}</th>
          <th style="width: 80px;">${t('Qty', 'الكمية')}</th>
          <th style="width: 80px;">${t('Unit', 'الوحدة')}</th>
          <th style="width: 120px;">${t('Unit Price', 'سعر الوحدة')}</th>
          <th style="width: 120px;">${t('Total', 'الإجمالي')}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${t('Subtotal', 'المجموع الفرعي')}</span>
          <span>${formatCurrency(po.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>${t('Tax', 'الضريبة')}</span>
          <span>${formatCurrency(po.tax_amount)}</span>
        </div>
        <div class="totals-row total">
          <span>${t('Total Amount', 'المبلغ الإجمالي')}</span>
          <span>${formatCurrency(po.total_amount)}</span>
        </div>
      </div>
    </div>
  </div>

  ${(po.payment_terms || po.delivery_terms) ? `
  <div class="terms-section">
    <h3 class="section-title">${t('Terms & Conditions', 'الشروط والأحكام')}</h3>
    <div class="terms-grid">
      ${po.payment_terms ? `
      <div class="term-box">
        <h4>${t('Payment Terms', 'شروط الدفع')}</h4>
        <p>${po.payment_terms}</p>
      </div>
      ` : ''}
      ${po.delivery_terms ? `
      <div class="term-box">
        <h4>${t('Delivery Terms', 'شروط التسليم')}</h4>
        <p>${po.delivery_terms}</p>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${po.terms_conditions ? `
  <div class="terms-section">
    <h3 class="section-title">${t('General Terms', 'الشروط العامة')}</h3>
    <div class="term-box">
      <p>${po.terms_conditions}</p>
    </div>
  </div>
  ` : ''}

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>${t('Prepared By', 'أُعد بواسطة')}</strong></p>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>${t('Approved By', 'اعتُمد بواسطة')}</strong></p>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <p><strong>${t('Received By (Vendor)', 'استُلم بواسطة (المورد)')}</strong></p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>${t('This document is computer-generated and is valid without signature.', 'هذا المستند منشأ آلياً وصالح بدون توقيع.')}</p>
    <p>${t('Generated on', 'تم إنشاؤه في')} ${new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
  </div>
</body>
</html>
  `;
}
