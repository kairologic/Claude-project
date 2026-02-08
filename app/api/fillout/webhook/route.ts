import { NextRequest, NextResponse } from 'next/server';

// Amazon SES SMTP Configuration
const SES_SMTP_HOST = process.env.SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com';
const SES_SMTP_PORT = parseInt(process.env.SES_SMTP_PORT || '587');
const SES_SMTP_USER = process.env.SES_SMTP_USER || '';
const SES_SMTP_PASS = process.env.SES_SMTP_PASS || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'compliance@kairologic.net';
const SES_FROM_NAME = process.env.SES_FROM_NAME || 'KairoLogic Sentry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Fillout sends webhook data when a form is submitted
    const { formId, submissionId, responses } = body;

    // Log the consultation booking
    console.log('New consultation booking:', {
      formId,
      submissionId,
      responses
    });

    // Extract consultation details
    const consultationData = {
      name: responses.find((r: any) => r.questionId === 'name')?.value || '',
      email: responses.find((r: any) => r.questionId === 'email')?.value || '',
      phone: responses.find((r: any) => r.questionId === 'phone')?.value || '',
      practiceName: responses.find((r: any) => r.questionId === 'practice_name')?.value || '',
      preferredDate: responses.find((r: any) => r.questionId === 'preferred_date')?.value || '',
      preferredTime: responses.find((r: any) => r.questionId === 'preferred_time')?.value || '',
      urgency: responses.find((r: any) => r.questionId === 'urgency')?.value || 'standard',
      submittedAt: new Date().toISOString()
    };

    // Send confirmation email via Amazon SES
    if (SES_SMTP_USER && SES_SMTP_PASS) {
      try {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.default.createTransport({
          host: SES_SMTP_HOST,
          port: SES_SMTP_PORT,
          secure: false,
          auth: {
            user: SES_SMTP_USER,
            pass: SES_SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"${SES_FROM_NAME}" <${SES_FROM_EMAIL}>`,
          to: 'compliance@kairologic.net',
          subject: `[NEW CONSULTATION] ${consultationData.practiceName}`,
          text: `
New Technical Consultation Booking
----------------------------------

Name: ${consultationData.name}
Email: ${consultationData.email}
Phone: ${consultationData.phone}
Practice: ${consultationData.practiceName}

Preferred Date: ${consultationData.preferredDate}
Preferred Time: ${consultationData.preferredTime}
Urgency: ${consultationData.urgency}

Submission ID: ${submissionId}
Submitted: ${consultationData.submittedAt}

----------------------------------
Please confirm booking within 24 hours.
          `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #0B1E3D; color: white; padding: 20px; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #0B1E3D; }
    .value { margin-top: 5px; padding: 8px; background: white; border-radius: 4px; }
    .urgent { background: #FF6B35; color: white; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🛡 New Technical Consultation Booking</h2>
    </div>
    
    ${consultationData.urgency === 'urgent' ? '<div class="urgent">⚠️ URGENT CONSULTATION REQUEST</div>' : ''}
    
    <div class="content">
      <div class="field">
        <div class="label">Contact Name:</div>
        <div class="value">${consultationData.name}</div>
      </div>
      
      <div class="field">
        <div class="label">Email:</div>
        <div class="value">${consultationData.email}</div>
      </div>
      
      <div class="field">
        <div class="label">Phone:</div>
        <div class="value">${consultationData.phone}</div>
      </div>
      
      <div class="field">
        <div class="label">Practice Name:</div>
        <div class="value">${consultationData.practiceName}</div>
      </div>
      
      <div class="field">
        <div class="label">Preferred Date:</div>
        <div class="value">${consultationData.preferredDate}</div>
      </div>
      
      <div class="field">
        <div class="label">Preferred Time:</div>
        <div class="value">${consultationData.preferredTime}</div>
      </div>
      
      <div class="field">
        <div class="label">Urgency Level:</div>
        <div class="value">${consultationData.urgency}</div>
      </div>
      
      <div class="field">
        <div class="label">Submission ID:</div>
        <div class="value">${submissionId}</div>
      </div>
    </div>
    
    <div class="footer">
      Please confirm booking within 24 hours<br>
      Sent from KairoLogic Sentry Platform<br>
      ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
          `
        });

        console.log(`[Fillout Webhook] Consultation email sent for ${consultationData.practiceName}`);
      } catch (emailErr) {
        console.error('[Fillout Webhook] Email send error:', emailErr);
      }
    } else {
      console.warn('[Fillout Webhook] SES SMTP credentials not configured — skipping email');
    }

    // TODO: Store consultation booking in Supabase
    // const supabase = getSupabase();
    // await supabase.from('consultations').insert({
    //   ...consultationData,
    //   fillout_submission_id: submissionId
    // });

    return NextResponse.json({ 
      success: true,
      message: 'Consultation booking received',
      submissionId 
    });

  } catch (error) {
    console.error('Fillout webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process consultation booking' },
      { status: 500 }
    );
  }
}

