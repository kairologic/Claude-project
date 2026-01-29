import { NextRequest, NextResponse } from 'next/server';

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

    // Mailjet API configuration
    const MAILJET_API_KEY = process.env.MAILJET_API_KEY || '80e5ddfcab46ef75a9b8d2bf51a5541b';
    const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY || '';
    
    // Send email using Mailjet
    const mailjetResponse = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64')}`
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: 'compliance@kairologic.com',
              Name: 'KairoLogic Sentry'
            },
            To: [
              {
                Email: 'compliance@kairologic.com',
                Name: 'KairoLogic Compliance Team'
              }
            ],
            Subject: `[${subject}] New Contact from ${practiceName}`,
            TextPart: `
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
            HTMLPart: `
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
          }
        ]
      })
    });

    if (!mailjetResponse.ok) {
      const errorData = await mailjetResponse.json();
      console.error('Mailjet error:', errorData);
      throw new Error('Failed to send email');
    }

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
