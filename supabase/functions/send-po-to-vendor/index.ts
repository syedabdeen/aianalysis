import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPORequest {
  poId: string;
  language?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { poId, language = 'en' }: SendPORequest = await req.json();

    if (!poId) {
      throw new Error('Purchase Order ID is required');
    }

    console.log(`Sending PO ${poId} to vendor...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch PO data with vendor information
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        vendor:vendors(id, code, company_name_en, company_name_ar, email, phone, address_en, address_ar),
        project:projects(code, name_en, name_ar),
        cost_center:cost_centers(code, name_en, name_ar),
        department:departments(code, name_en, name_ar),
        pr:purchase_requests(code, title_en, title_ar),
        created_by_profile:profiles!purchase_orders_created_by_fkey(full_name, email)
      `)
      .eq('id', poId)
      .single();

    if (poError || !po) {
      console.error('Error fetching PO:', poError);
      throw new Error('Purchase Order not found');
    }

    // Check if vendor has an email
    if (!po.vendor?.email) {
      console.log('Vendor does not have an email address');
      throw new Error('Vendor email address not found');
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
    const pdfHtml = generatePOHtml(po, items || [], isArabic);

    // Fetch company settings
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    const companyName = companySettings?.company_name_en || 'ProcureMind';

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      // Still save the PO copy even without sending email
      await savePOCopy(supabase, po, pdfHtml, null, 'email_not_configured');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'PO saved but email not configured',
          emailSent: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Send email to vendor
    const vendorName = isArabic ? po.vendor.company_name_ar : po.vendor.company_name_en;
    const emailHtml = generateEmailHtml(po, vendorName, companyName, isArabic);

    console.log(`Sending email to ${po.vendor.email}...`);

    const emailResponse = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [po.vendor.email],
      subject: isArabic 
        ? `أمر شراء جديد: ${po.code}` 
        : `New Purchase Order: ${po.code}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    // Save PO copy to database
    await savePOCopy(supabase, po, pdfHtml, po.vendor.email, 'sent');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'PO sent to vendor successfully',
        emailSent: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-po-to-vendor function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

async function savePOCopy(
  supabase: any, 
  po: any, 
  pdfHtml: string, 
  emailSentTo: string | null,
  emailStatus: string
) {
  const vendorName = po.vendor?.company_name_en || po.vendor?.company_name_ar || 'Unknown';
  
  const { error } = await supabase
    .from('po_copies')
    .insert({
      po_id: po.id,
      po_code: po.code,
      vendor_id: po.vendor?.id,
      vendor_name: vendorName,
      total_amount: po.total_amount,
      currency: po.currency,
      pdf_html: pdfHtml,
      email_sent_to: emailSentTo,
      email_sent_at: emailSentTo ? new Date().toISOString() : null,
      email_status: emailStatus,
    });

  if (error) {
    console.error('Error saving PO copy:', error);
  } else {
    console.log('PO copy saved successfully');
  }
}

function generateEmailHtml(po: any, vendorName: string, companyName: string, isArabic: boolean): string {
  const t = (en: string, ar: string) => isArabic ? ar : en;
  const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} ${po.currency}`;
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const dir = isArabic ? 'rtl' : 'ltr';

  return `
<!DOCTYPE html>
<html dir="${dir}" lang="${isArabic ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ${isArabic ? 'Tahoma, sans-serif' : 'Arial, sans-serif'}; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0A0F1A; margin: 0;">${companyName}</h1>
      <p style="color: #6b7280; margin: 5px 0;">${t('Enterprise Procurement Management', 'إدارة المشتريات المؤسسية')}</p>
    </div>
    
    <div style="background: linear-gradient(135deg, #0A0F1A 0%, #1a2332 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0; font-size: 18px;">${t('New Purchase Order', 'أمر شراء جديد')}</h2>
      <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #33C8FF;">${po.code}</p>
    </div>
    
    <p style="font-size: 16px; color: #374151;">${t('Dear', 'عزيزي')} ${vendorName},</p>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
      ${t(
        `We are pleased to inform you that a new Purchase Order has been issued and approved. Please find the order details below.`,
        `يسعدنا إبلاغكم بأنه تم إصدار واعتماد أمر شراء جديد. يرجى الاطلاع على تفاصيل الطلب أدناه.`
      )}
    </p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #374151; font-size: 14px;">${t('Order Summary', 'ملخص الطلب')}</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${t('PO Number', 'رقم أمر الشراء')}</td>
          <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: ${isArabic ? 'left' : 'right'};">${po.code}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${t('Order Date', 'تاريخ الطلب')}</td>
          <td style="padding: 8px 0; color: #1f2937; text-align: ${isArabic ? 'left' : 'right'};">${formatDate(po.created_at)}</td>
        </tr>
        ${po.delivery_date ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${t('Expected Delivery', 'تاريخ التسليم المتوقع')}</td>
          <td style="padding: 8px 0; color: #1f2937; text-align: ${isArabic ? 'left' : 'right'};">${formatDate(po.delivery_date)}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 12px 0 8px; color: #374151; font-weight: 600;">${t('Total Amount', 'المبلغ الإجمالي')}</td>
          <td style="padding: 12px 0 8px; color: #059669; font-weight: 700; font-size: 18px; text-align: ${isArabic ? 'left' : 'right'};">${formatCurrency(po.total_amount)}</td>
        </tr>
      </table>
    </div>
    
    ${po.payment_terms ? `
    <div style="margin: 20px 0;">
      <p style="font-size: 14px; color: #374151;"><strong>${t('Payment Terms', 'شروط الدفع')}:</strong> ${po.payment_terms}</p>
    </div>
    ` : ''}
    
    ${po.delivery_terms ? `
    <div style="margin: 20px 0;">
      <p style="font-size: 14px; color: #374151;"><strong>${t('Delivery Terms', 'شروط التسليم')}:</strong> ${po.delivery_terms}</p>
    </div>
    ` : ''}
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
      ${t(
        'The complete Purchase Order document with all item details is attached to this email. Please confirm receipt and your ability to fulfill this order.',
        'تم إرفاق مستند أمر الشراء الكامل مع جميع تفاصيل العناصر في هذا البريد الإلكتروني. يرجى تأكيد الاستلام وقدرتكم على تنفيذ هذا الطلب.'
      )}
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        ${t('Best regards,', 'مع أطيب التحيات،')}
      </p>
      <p style="font-size: 14px; color: #374151; font-weight: 600; margin: 5px 0;">
        ${t('Procurement Team', 'فريق المشتريات')}
      </p>
      <p style="font-size: 12px; color: #6b7280; margin: 5px 0;">
        ${companyName}
      </p>
    </div>
    
    <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0;">
        ${t('This is an automated message from ProcureMind. Please do not reply directly to this email.', 'هذه رسالة آلية من ProcureMind. يرجى عدم الرد مباشرة على هذا البريد الإلكتروني.')}
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function generatePOHtml(po: any, items: any[], isArabic: boolean): string {
  const t = (en: string, ar: string) => isArabic ? ar : en;
  const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} ${po.currency}`;
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const dir = isArabic ? 'rtl' : 'ltr';

  const itemsHtml = items.map((item) => `
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
  <title>${t('Purchase Order', 'أمر الشراء')} - ${po.code}</title>
  <style>
    body { font-family: ${isArabic ? 'Tahoma, sans-serif' : 'Arial, sans-serif'}; font-size: 12px; color: #1f2937; line-height: 1.5; background: white; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #0A0F1A; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #0A0F1A; color: white; padding: 12px 10px; font-weight: 600; font-size: 11px; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="color: #0A0F1A; margin: 0;">ProcureMind</h1>
      <p style="color: #6b7280;">${t('Enterprise Procurement Management', 'إدارة المشتريات المؤسسية')}</p>
    </div>
    <div style="text-align: ${isArabic ? 'left' : 'right'};">
      <h2 style="color: #0A0F1A;">${t('PURCHASE ORDER', 'أمر الشراء')}</h2>
      <p style="font-size: 16px; font-weight: 600; color: #33C8FF;">${po.code}</p>
      <p><strong>${t('Date', 'التاريخ')}:</strong> ${formatDate(po.created_at)}</p>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
      <h3>${t('Vendor Information', 'معلومات المورد')}</h3>
      <p><strong>${isArabic ? po.vendor?.company_name_ar : po.vendor?.company_name_en}</strong></p>
      <p>${t('Code', 'الكود')}: ${po.vendor?.code || '-'}</p>
      <p>${t('Email', 'البريد')}: ${po.vendor?.email || '-'}</p>
    </div>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
      <h3>${t('Order Details', 'تفاصيل الطلب')}</h3>
      <p>${t('PR Reference', 'مرجع طلب الشراء')}: ${po.pr?.code || '-'}</p>
      ${po.delivery_date ? `<p>${t('Delivery Date', 'تاريخ التسليم')}: ${formatDate(po.delivery_date)}</p>` : ''}
    </div>
  </div>

  <h3>${t('Order Items', 'عناصر الطلب')}</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${t('Description', 'الوصف')}</th>
        <th>${t('Qty', 'الكمية')}</th>
        <th>${t('Unit', 'الوحدة')}</th>
        <th>${t('Unit Price', 'سعر الوحدة')}</th>
        <th>${t('Total', 'الإجمالي')}</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
    <div style="width: 300px; background: #f9fafb; padding: 15px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span>${t('Subtotal', 'المجموع الفرعي')}</span>
        <span>${formatCurrency(po.subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 8px 0;">
        <span>${t('Tax', 'الضريبة')}</span>
        <span>${formatCurrency(po.tax_amount)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #0A0F1A; font-weight: bold;">
        <span>${t('Total Amount', 'المبلغ الإجمالي')}</span>
        <span>${formatCurrency(po.total_amount)}</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 10px;">
    <p>${t('Generated on', 'تم إنشاؤه في')} ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}

serve(handler);
