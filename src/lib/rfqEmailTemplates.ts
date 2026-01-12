interface RFQEmailData {
  rfqCode: string;
  rfqTitle: string;
  vendorName: string;
  vendorCode: string;
  submissionDeadline?: string;
  items: Array<{
    itemNumber: number;
    description: string;
    quantity: number;
    unit: string;
    specifications?: string;
  }>;
  termsAndConditions?: string;
  buyerName?: string;
  buyerEmail?: string;
  companyName?: string;
  language?: 'en' | 'ar';
}

export function generateRFQInvitationEmailHtml(data: RFQEmailData): string {
  const { 
    rfqCode, 
    rfqTitle, 
    vendorName, 
    vendorCode, 
    submissionDeadline, 
    items, 
    termsAndConditions,
    buyerName,
    companyName = 'ProcureMind',
    language = 'en' 
  } = data;
  
  const isRTL = language === 'ar';

  const labels = {
    title: isRTL ? 'طلب عرض أسعار' : 'Request for Quotation',
    greeting: isRTL ? `عزيزي ${vendorName},` : `Dear ${vendorName},`,
    intro: isRTL 
      ? `نود دعوتكم لتقديم عرض أسعار للبنود التالية:`
      : `We would like to invite you to submit a quotation for the following items:`,
    rfqRef: isRTL ? 'مرجع طلب عرض الأسعار' : 'RFQ Reference',
    deadline: isRTL ? 'الموعد النهائي للتقديم' : 'Submission Deadline',
    itemsTitle: isRTL ? 'تفاصيل البنود' : 'Item Details',
    itemNo: isRTL ? 'رقم' : '#',
    description: isRTL ? 'الوصف' : 'Description',
    quantity: isRTL ? 'الكمية' : 'Quantity',
    unit: isRTL ? 'الوحدة' : 'Unit',
    specifications: isRTL ? 'المواصفات' : 'Specifications',
    instructions: isRTL ? 'تعليمات التقديم' : 'Submission Instructions',
    instructionsContent: isRTL 
      ? 'يرجى الرد على هذا البريد الإلكتروني مع عرض أسعاركم الكامل متضمناً أسعار الوحدة والإجمالي لكل بند، مدة الصلاحية، شروط التسليم، وشروط الدفع.'
      : 'Please reply to this email with your complete quotation including unit prices and totals for each item, validity period, delivery terms, and payment terms.',
    terms: isRTL ? 'الشروط والأحكام' : 'Terms and Conditions',
    footer: isRTL 
      ? 'شكراً لاهتمامكم. نتطلع لاستلام عرض أسعاركم.'
      : 'Thank you for your interest. We look forward to receiving your quotation.',
    signature: isRTL ? 'مع أطيب التحيات' : 'Best regards',
    buyer: isRTL ? 'المشتري' : 'Buyer',
    vendorCodeLabel: isRTL ? 'رمز المورد' : 'Vendor Code',
    autoMessage: isRTL 
      ? 'هذه رسالة آلية من نظام ProcureMind للمشتريات.'
      : 'This is an automated message from ProcureMind Procurement System.',
  };

  const itemsHtml = items.map((item, index) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; text-align: center; font-weight: 600;">${item.itemNumber}</td>
      <td style="padding: 12px 8px;">
        <div style="font-weight: 500;">${item.description}</div>
        ${item.specifications ? `<div style="font-size: 12px; color: #718096; margin-top: 4px;">${item.specifications}</div>` : ''}
      </td>
      <td style="padding: 12px 8px; text-align: center; font-weight: 600;">${item.quantity}</td>
      <td style="padding: 12px 8px; text-align: center;">${item.unit}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${labels.title} - ${rfqCode}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f7fafc; direction: ${isRTL ? 'rtl' : 'ltr'};">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a365d, #2d3748); border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">
            📋 ${labels.title}
          </h1>
          <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 16px;">
            ${rfqCode}
          </p>
        </div>

        <!-- Vendor Info -->
        <div style="background-color: #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <p style="margin: 0; color: #2d3748; font-size: 15px;">
            <strong>${labels.vendorCodeLabel}:</strong> ${vendorCode}
          </p>
        </div>

        <!-- Greeting -->
        <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">
          ${labels.greeting}
        </p>

        <!-- Intro -->
        <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
          ${labels.intro}
        </p>

        <!-- RFQ Details Card -->
        <div style="border: 2px solid #3182ce; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
          <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">
            ${rfqTitle}
          </h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096; width: 40%;">${labels.rfqRef}:</td>
              <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${rfqCode}</td>
            </tr>
            ${submissionDeadline ? `
            <tr>
              <td style="padding: 8px 0; color: #718096;">${labels.deadline}:</td>
              <td style="padding: 8px 0; color: #e53e3e; font-weight: bold;">📅 ${submissionDeadline}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
            📦 ${labels.itemsTitle}
          </h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #edf2f7;">
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 50px;">${labels.itemNo}</th>
                <th style="padding: 12px 8px; text-align: ${isRTL ? 'right' : 'left'}; color: #4a5568; font-size: 13px;">${labels.description}</th>
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 80px;">${labels.quantity}</th>
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 80px;">${labels.unit}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Submission Instructions -->
        <div style="background: linear-gradient(135deg, #3182ce15, #3182ce05); border: 1px solid #3182ce; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 15px;">
            ✉️ ${labels.instructions}
          </h3>
          <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
            ${labels.instructionsContent}
          </p>
        </div>

        ${termsAndConditions ? `
        <!-- Terms and Conditions -->
        <div style="border-${isRTL ? 'right' : 'left'}: 4px solid #f6ad55; padding-${isRTL ? 'right' : 'left'}: 15px; margin-bottom: 25px;">
          <h4 style="color: #744210; margin: 0 0 10px 0; font-size: 14px;">
            📜 ${labels.terms}
          </h4>
          <p style="color: #4a5568; margin: 0; font-size: 13px; line-height: 1.5;">
            ${termsAndConditions}
          </p>
        </div>
        ` : ''}

        <!-- Footer -->
        <p style="font-size: 14px; color: #4a5568; margin-bottom: 20px;">
          ${labels.footer}
        </p>

        <p style="font-size: 14px; color: #2d3748; margin: 0;">
          ${labels.signature},<br/>
          ${buyerName ? `<strong>${buyerName}</strong><br/>` : ''}
          <span style="color: #718096;">${companyName}</span>
        </p>

        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;" />

        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
          ${labels.autoMessage}
        </p>
      </div>
    </body>
    </html>
  `;
}

export function getRFQInvitationEmailSubject(
  rfqCode: string,
  rfqTitle: string,
  language: 'en' | 'ar' = 'en'
): string {
  if (language === 'ar') {
    return `📋 طلب عرض أسعار: ${rfqCode} - ${rfqTitle}`;
  }
  return `📋 Request for Quotation: ${rfqCode} - ${rfqTitle}`;
}

interface QuoteReceivedNotificationData {
  rfqCode: string;
  rfqTitle: string;
  buyerName: string;
  quotesReceived: number;
  totalVendors: number;
  vendorsResponded: string[];
  vendorsPending: string[];
  language?: 'en' | 'ar';
}

export function generateQuoteReceivedNotificationHtml(data: QuoteReceivedNotificationData): string {
  const {
    rfqCode,
    rfqTitle,
    buyerName,
    quotesReceived,
    totalVendors,
    vendorsResponded,
    vendorsPending,
    language = 'en'
  } = data;

  const isRTL = language === 'ar';

  const labels = {
    title: isRTL ? 'إشعار استلام عروض الأسعار' : 'Quotation Receipt Notification',
    greeting: isRTL ? `عزيزي ${buyerName},` : `Dear ${buyerName},`,
    message: isRTL
      ? `نود إعلامك بأنه تم استلام عروض أسعار جديدة لطلب عرض الأسعار ${rfqCode}.`
      : `We would like to inform you that quotations have been received for RFQ ${rfqCode}.`,
    summary: isRTL ? 'ملخص عروض الأسعار' : 'Quotation Summary',
    received: isRTL ? 'عروض مستلمة' : 'Quotes Received',
    pending: isRTL ? 'في الانتظار' : 'Pending',
    readyForAnalysis: isRTL 
      ? 'عروض الأسعار جاهزة للتحليل! يمكنك الآن النقر على زر "تحليل" لمقارنة العروض.'
      : 'Quotations are ready for analysis! You can now click the "ANALYSIS" button to compare quotes.',
    respondedVendors: isRTL ? 'الموردون الذين استجابوا' : 'Vendors Who Responded',
    pendingVendors: isRTL ? 'الموردون في الانتظار' : 'Pending Vendors',
    action: isRTL ? 'عرض طلب عرض الأسعار' : 'View RFQ',
  };

  return `
    <!DOCTYPE html>
    <html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <title>${labels.title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #1a365d; margin: 0; font-size: 22px;">
            📬 ${labels.title}
          </h1>
          <p style="color: #718096; margin: 10px 0 0 0;">
            ${rfqCode} - ${rfqTitle}
          </p>
        </div>

        <p style="font-size: 15px; color: #2d3748;">
          ${labels.greeting}
        </p>

        <p style="font-size: 14px; color: #4a5568; line-height: 1.6;">
          ${labels.message}
        </p>

        <!-- Summary Card -->
        <div style="display: flex; gap: 15px; margin: 20px 0;">
          <div style="flex: 1; background: linear-gradient(135deg, #10b98115, #10b98105); border: 2px solid #10b981; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #10b981;">${quotesReceived}</div>
            <div style="font-size: 12px; color: #047857;">${labels.received}</div>
          </div>
          <div style="flex: 1; background: linear-gradient(135deg, #f59e0b15, #f59e0b05); border: 2px solid #f59e0b; border-radius: 8px; padding: 15px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${totalVendors - quotesReceived}</div>
            <div style="font-size: 12px; color: #b45309;">${labels.pending}</div>
          </div>
        </div>

        ${quotesReceived >= 2 ? `
        <div style="background-color: #10b98115; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
          <p style="margin: 0; color: #047857; font-weight: 600;">
            ✅ ${labels.readyForAnalysis}
          </p>
        </div>
        ` : ''}

        ${vendorsResponded.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h4 style="color: #10b981; margin: 0 0 10px 0; font-size: 14px;">✓ ${labels.respondedVendors}:</h4>
          <p style="margin: 0; color: #4a5568; font-size: 13px;">${vendorsResponded.join(', ')}</p>
        </div>
        ` : ''}

        ${vendorsPending.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h4 style="color: #f59e0b; margin: 0 0 10px 0; font-size: 14px;">⏳ ${labels.pendingVendors}:</h4>
          <p style="margin: 0; color: #4a5568; font-size: 13px;">${vendorsPending.join(', ')}</p>
        </div>
        ` : ''}

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />

        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
          This is an automated notification from ProcureMind.
        </p>
      </div>
    </body>
    </html>
  `;
}

export function getQuoteReceivedNotificationSubject(
  rfqCode: string,
  quotesReceived: number,
  language: 'en' | 'ar' = 'en'
): string {
  if (language === 'ar') {
    return `📬 تم استلام ${quotesReceived} عروض أسعار - ${rfqCode}`;
  }
  return `📬 ${quotesReceived} Quotation(s) Received - ${rfqCode}`;
}