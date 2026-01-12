import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RFQEmailRequest {
  rfqId: string;
  vendorIds?: string[]; // Optional: specific vendors to email, otherwise all
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rfqId, vendorIds }: RFQEmailRequest = await req.json();

    if (!rfqId) {
      throw new Error('RFQ ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch RFQ with items
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select(`
        *,
        project:projects(name_en, name_ar),
        department:departments(name_en, name_ar),
        requested_by_profile:profiles!rfqs_requested_by_fkey(full_name, email)
      `)
      .eq('id', rfqId)
      .single();

    if (rfqError) throw rfqError;
    if (!rfq) throw new Error('RFQ not found');

    // Fetch RFQ items
    const { data: items, error: itemsError } = await supabase
      .from('rfq_items')
      .select('*')
      .eq('rfq_id', rfqId)
      .order('item_number');

    if (itemsError) throw itemsError;

    // Fetch vendors to email
    let vendorQuery = supabase
      .from('rfq_vendors')
      .select(`
        *,
        vendor:vendors(id, company_name_en, company_name_ar, code, email)
      `)
      .eq('rfq_id', rfqId)
      .eq('email_sent', false);

    if (vendorIds && vendorIds.length > 0) {
      vendorQuery = vendorQuery.in('vendor_id', vendorIds);
    }

    const { data: rfqVendors, error: vendorsError } = await vendorQuery;
    if (vendorsError) throw vendorsError;

    if (!rfqVendors || rfqVendors.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No vendors to email', sentCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch company settings for sender info
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('company_name_en, email')
      .limit(1)
      .single();

    const buyerName = rfq.requested_by_profile?.full_name || 'Procurement Team';
    const companyName = companySettings?.company_name_en || 'ProcureMind';
    const submissionDeadline = rfq.submission_deadline 
      ? new Date(rfq.submission_deadline).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : undefined;

    const results = {
      success: [] as string[],
      failed: [] as { vendorId: string; error: string }[]
    };

    // Send emails to each vendor
    for (const rv of rfqVendors) {
      if (!rv.vendor?.email) {
        results.failed.push({ 
          vendorId: rv.vendor_id, 
          error: 'No contact email registered' 
        });
        continue;
      }

      try {
        // Generate the vendor portal submission link
        const configuredBaseUrl =
          Deno.env.get('PUBLIC_APP_URL') ||
          Deno.env.get('SITE_URL') ||
          (() => {
            const origin = req.headers.get('origin');
            if (origin) return origin;

            const referer = req.headers.get('referer');
            if (referer) {
              try {
                return new URL(referer).origin;
              } catch {
                // ignore
              }
            }

            return null;
          })();

        if (!configuredBaseUrl) {
          throw new Error(
            'Unable to determine the app URL for vendor submission links. Please set PUBLIC_APP_URL in backend secrets.'
          );
        }

        const baseUrl = configuredBaseUrl.replace(/\/$/, '');
        const submissionLink = `${baseUrl}/vendor-portal/quotation?token=${rv.submission_token}`;

        // Generate email content
        const emailHtml = generateRFQEmail({
          rfqCode: rfq.code,
          rfqTitle: rfq.title_en,
          vendorName: rv.vendor.company_name_en,
          vendorCode: rv.vendor.code,
          submissionDeadline,
          items: items?.map(item => ({
            itemNumber: item.item_number,
            description: item.description_en,
            quantity: item.quantity,
            unit: item.unit,
            specifications: item.specifications
          })) || [],
          termsAndConditions: rfq.terms_conditions,
          buyerName,
          companyName,
          submissionLink
        });

        // Send email via the send-email function
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: [{ email: rv.vendor.email, name: rv.vendor.company_name_en }],
            subject: `📋 Request for Quotation: ${rfq.code} - ${rfq.title_en}`,
            htmlBody: emailHtml,
            replyTo: { 
              address: companySettings?.email || 'cmc@widelens.info', 
              name: companyName 
            }
          })
        });

        const emailResult = await emailResponse.json();

        if (emailResult.success) {
          // Update vendor record
          await supabase
            .from('rfq_vendors')
            .update({
              email_sent: true,
              email_sent_at: new Date().toISOString(),
              quotation_issue_date: new Date().toISOString()
            })
            .eq('id', rv.id);

          results.success.push(rv.vendor_id);

          // Log audit
          await supabase.from('rfq_audit_logs').insert({
            rfq_id: rfqId,
            action: 'email_sent',
            action_details: {
              vendor_id: rv.vendor_id,
              vendor_code: rv.vendor.code,
              vendor_email: rv.vendor.email,
              subject: `Request for Quotation: ${rfq.code}`
            }
          });
        } else {
          // Update with error
          await supabase
            .from('rfq_vendors')
            .update({
              email_error: emailResult.error || 'Unknown error'
            })
            .eq('id', rv.id);

          results.failed.push({ 
            vendorId: rv.vendor_id, 
            error: emailResult.error || 'Failed to send email' 
          });
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        results.failed.push({ vendorId: rv.vendor_id, error: errorMessage });

        await supabase
          .from('rfq_vendors')
          .update({ email_error: errorMessage })
          .eq('id', rv.id);
      }
    }

    // Update RFQ status to 'submitted' (issued) if emails were sent
    if (results.success.length > 0) {
      const { error: rfqUpdateError } = await supabase
        .from('rfqs')
        .update({
          status: 'submitted',
          email_dispatch_date: new Date().toISOString(),
        })
        .eq('id', rfqId);

      if (rfqUpdateError) {
        console.error('Failed to update RFQ status after sending emails:', rfqUpdateError);
        throw rfqUpdateError;
      }

      // Log audit
      await supabase.from('rfq_audit_logs').insert({
        rfq_id: rfqId,
        action: 'rfq_issued',
        action_details: {
          vendors_emailed: results.success.length,
          vendors_failed: results.failed.length,
        },
      });
    }

    console.log('RFQ emails sent:', results);

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: results.success.length,
        failedCount: results.failed.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-rfq-emails:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Email template generator
function generateRFQEmail(data: {
  rfqCode: string;
  rfqTitle: string;
  vendorName: string;
  vendorCode: string;
  submissionDeadline?: string;
  items: Array<{ itemNumber: number; description: string; quantity: number; unit: string; specifications?: string }>;
  termsAndConditions?: string;
  buyerName: string;
  companyName: string;
  submissionLink: string;
}): string {
  const itemsHtml = data.items.map(item => `
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
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Request for Quotation - ${data.rfqCode}</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
      <div style="background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a365d, #2d3748); border-radius: 8px; padding: 25px; margin-bottom: 25px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 26px;">📋 Request for Quotation</h1>
          <p style="color: #a0aec0; margin: 10px 0 0 0; font-size: 16px;">${data.rfqCode}</p>
        </div>

        <!-- Vendor Info -->
        <div style="background-color: #edf2f7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <p style="margin: 0; color: #2d3748; font-size: 15px;">
            <strong>Vendor Code:</strong> ${data.vendorCode}
          </p>
        </div>

        <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">Dear ${data.vendorName},</p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.6; margin-bottom: 20px;">
          We would like to invite you to submit a quotation for the following items:
        </p>

        <!-- RFQ Details -->
        <div style="border: 2px solid #3182ce; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
          <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">${data.rfqTitle}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #718096; width: 40%;">RFQ Reference:</td>
              <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${data.rfqCode}</td>
            </tr>
            ${data.submissionDeadline ? `
            <tr>
              <td style="padding: 8px 0; color: #718096;">Submission Deadline:</td>
              <td style="padding: 8px 0; color: #e53e3e; font-weight: bold;">📅 ${data.submissionDeadline}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Items Table -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">📦 Item Details</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #f7fafc; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #edf2f7;">
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 50px;">#</th>
                <th style="padding: 12px 8px; text-align: left; color: #4a5568; font-size: 13px;">Description</th>
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 80px;">Quantity</th>
                <th style="padding: 12px 8px; text-align: center; color: #4a5568; font-size: 13px; width: 80px;">Unit</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>

        <!-- Submit Online Button -->
        <div style="text-align: center; margin-bottom: 25px;">
          <a href="${data.submissionLink}" style="display: inline-block; background: linear-gradient(135deg, #3182ce, #2c5282); color: #ffffff; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(49, 130, 206, 0.4);">
            📝 Submit Your Quotation Online
          </a>
          <p style="color: #718096; font-size: 12px; margin-top: 10px;">
            Click the button above to submit your quotation directly through our vendor portal.
          </p>
        </div>

        <!-- Instructions -->
        <div style="background: linear-gradient(135deg, #3182ce15, #3182ce05); border: 1px solid #3182ce; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 15px;">✉️ Submission Instructions</h3>
          <p style="color: #4a5568; margin: 0; font-size: 14px; line-height: 1.6;">
            Use the button above to submit your quotation online. Alternatively, you may reply to this email with your complete quotation including unit prices and totals for each item, validity period, delivery terms, and payment terms.
          </p>
        </div>

        ${data.termsAndConditions ? `
        <div style="border-left: 4px solid #f6ad55; padding-left: 15px; margin-bottom: 25px;">
          <h4 style="color: #744210; margin: 0 0 10px 0; font-size: 14px;">📜 Terms and Conditions</h4>
          <p style="color: #4a5568; margin: 0; font-size: 13px; line-height: 1.5;">${data.termsAndConditions}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #4a5568; margin-bottom: 20px;">
          Thank you for your interest. We look forward to receiving your quotation.
        </p>

        <p style="font-size: 14px; color: #2d3748; margin: 0;">
          Best regards,<br/>
          <strong>${data.buyerName}</strong><br/>
          <span style="color: #718096;">${data.companyName}</span>
        </p>

        <hr style="margin: 25px 0; border: none; border-top: 1px solid #e2e8f0;" />

        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">
          This is an automated message from ProcureMind Procurement System.
        </p>
      </div>
    </body>
    </html>
  `;
}