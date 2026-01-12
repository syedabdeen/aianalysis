import { VendorStatus } from '@/types/vendor';

interface VendorEmailData {
  vendorName: string;
  vendorEmail: string;
  vendorCode: string;
  newStatus: VendorStatus;
  notes?: string;
  language?: 'en' | 'ar';
}

const statusLabels: Record<VendorStatus, { en: string; ar: string }> = {
  pending: { en: 'Pending Review', ar: 'قيد المراجعة' },
  approved: { en: 'Approved', ar: 'معتمد' },
  suspended: { en: 'Suspended', ar: 'معلق' },
  blacklisted: { en: 'Blacklisted', ar: 'محظور' },
};

const statusColors: Record<VendorStatus, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  suspended: '#f59e0b',
  blacklisted: '#ef4444',
};

const statusIcons: Record<VendorStatus, string> = {
  pending: '⏳',
  approved: '✅',
  suspended: '⚠️',
  blacklisted: '🚫',
};

export function generateVendorStatusEmailHtml(data: VendorEmailData): string {
  const { vendorName, vendorCode, newStatus, notes, language = 'en' } = data;
  const isRTL = language === 'ar';
  const statusLabel = statusLabels[newStatus][language];
  const statusColor = statusColors[newStatus];
  const statusIcon = statusIcons[newStatus];

  const title = isRTL
    ? `تحديث حالة المورد - ${vendorCode}`
    : `Vendor Status Update - ${vendorCode}`;

  const greeting = isRTL
    ? `عزيزي ${vendorName},`
    : `Dear ${vendorName},`;

  const mainMessage = isRTL
    ? `نود إعلامكم بأن حالة حساب المورد الخاص بكم قد تم تحديثها.`
    : `We would like to inform you that your vendor account status has been updated.`;

  const statusTitle = isRTL ? 'الحالة الجديدة:' : 'New Status:';
  const notesTitle = isRTL ? 'ملاحظات:' : 'Notes:';

  const approvedMessage = isRTL
    ? 'تهانينا! تم اعتماد حسابكم. يمكنكم الآن المشاركة في عمليات الشراء والتوريد.'
    : 'Congratulations! Your account has been approved. You can now participate in procurement and supply operations.';

  const suspendedMessage = isRTL
    ? 'تم تعليق حسابكم مؤقتاً. يرجى التواصل معنا للحصول على مزيد من المعلومات.'
    : 'Your account has been temporarily suspended. Please contact us for more information.';

  const blacklistedMessage = isRTL
    ? 'تم حظر حسابكم. يرجى التواصل مع إدارة المشتريات إذا كان لديكم أي استفسارات.'
    : 'Your account has been blacklisted. Please contact the procurement department if you have any inquiries.';

  const getStatusMessage = () => {
    switch (newStatus) {
      case 'approved':
        return approvedMessage;
      case 'suspended':
        return suspendedMessage;
      case 'blacklisted':
        return blacklistedMessage;
      default:
        return '';
    }
  };

  const footer = isRTL
    ? 'شكراً لتعاونكم معنا.'
    : 'Thank you for your partnership.';

  const signature = isRTL
    ? 'فريق إدارة المشتريات<br/>ProcureMind'
    : 'Procurement Management Team<br/>ProcureMind';

  return `
    <!DOCTYPE html>
    <html lang="${language}" dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc; direction: ${isRTL ? 'rtl' : 'ltr'};">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin: 0; font-size: 24px; border-bottom: 3px solid #3182ce; padding-bottom: 15px;">
            ${statusIcon} ${title}
          </h1>
        </div>

        <!-- Greeting -->
        <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">
          ${greeting}
        </p>

        <!-- Main Message -->
        <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin-bottom: 25px;">
          ${mainMessage}
        </p>

        <!-- Status Card -->
        <div style="background: linear-gradient(135deg, ${statusColor}15, ${statusColor}05); border: 2px solid ${statusColor}; border-radius: 10px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <p style="font-size: 14px; color: #718096; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">
            ${statusTitle}
          </p>
          <p style="font-size: 22px; font-weight: bold; color: ${statusColor}; margin: 0;">
            ${statusIcon} ${statusLabel}
          </p>
        </div>

        <!-- Status Specific Message -->
        <div style="background-color: #f7fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="font-size: 14px; color: #4a5568; margin: 0; line-height: 1.6;">
            ${getStatusMessage()}
          </p>
        </div>

        <!-- Notes Section -->
        ${notes ? `
          <div style="border-${isRTL ? 'right' : 'left'}: 4px solid #3182ce; padding-${isRTL ? 'right' : 'left'}: 15px; margin-bottom: 25px;">
            <p style="font-size: 13px; color: #718096; margin: 0 0 5px 0; font-weight: bold;">
              ${notesTitle}
            </p>
            <p style="font-size: 14px; color: #4a5568; margin: 0; font-style: italic;">
              "${notes}"
            </p>
          </div>
        ` : ''}

        <!-- Vendor Details -->
        <div style="background-color: #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 13px;">
                ${isRTL ? 'رمز المورد:' : 'Vendor Code:'}
              </td>
              <td style="padding: 8px 0; color: #2d3748; font-weight: bold; font-size: 13px; text-align: ${isRTL ? 'left' : 'right'};">
                ${vendorCode}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #718096; font-size: 13px;">
                ${isRTL ? 'التاريخ:' : 'Date:'}
              </td>
              <td style="padding: 8px 0; color: #2d3748; font-size: 13px; text-align: ${isRTL ? 'left' : 'right'};">
                ${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <p style="font-size: 14px; color: #4a5568; margin-bottom: 20px;">
          ${footer}
        </p>

        <p style="font-size: 14px; color: #2d3748; margin: 0;">
          ${signature}
        </p>

        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;" />

        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
          ${isRTL 
            ? 'هذه رسالة آلية من نظام ProcureMind. يرجى عدم الرد على هذا البريد الإلكتروني.'
            : 'This is an automated message from ProcureMind. Please do not reply to this email.'}
        </p>
      </div>
    </body>
    </html>
  `;
}

export function getVendorStatusEmailSubject(
  vendorCode: string,
  newStatus: VendorStatus,
  language: 'en' | 'ar' = 'en'
): string {
  const statusLabel = statusLabels[newStatus][language];
  const statusIcon = statusIcons[newStatus];

  if (language === 'ar') {
    return `${statusIcon} تحديث حالة المورد: ${vendorCode} - ${statusLabel}`;
  }
  return `${statusIcon} Vendor Status Update: ${vendorCode} - ${statusLabel}`;
}
