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
    const { contactName, email, practiceName, subject, message } = body;

    // Validate required fields
    if (!contactName || !email || !practiceName || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!SES_SMTP_USER || !SES_SMTP_PASS) {
      console.error('[Contact] SES SMTP credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

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
      replyTo: email,
      subject: `[${subject}] New Contact from ${practiceName}`,
      text: `
New Contact Form Submission
----------------------------

Contact Name: ${contactName}
Email: ${email}
Practice Name: ${practiceName}
Subject: ${subject}

Message:
${message}

----------------------------
Sent from KairoLogic Sentry Platform
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
    .value { margin-top: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🛡 New Contact Form Submission</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Contact Name:</div>
        <div class="value">${contactName}</div>
      </div>
      <div class="field">
        <div class="label">Email:</div>
        <div class="value">${email}</div>
      </div>
      <div class="field">
        <div class="label">Practice Name:</div>
        <div class="value">${practiceName}</div>
      </div>
      <div class="field">
        <div class="label">Subject:</div>
        <div class="value">${subject}</div>
      </div>
      <div class="field">
        <div class="label">Message:</div>
        <div class="value">${message}</div>
      </div>
    </div>
    <div class="footer">
      Sent from KairoLogic Sentry Platform<br>
      ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>
      `
    });

    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

