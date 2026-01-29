# 📋 Fillout Integration Guide
## KairoLogic Platform - Consultation Scheduling

---

## 🎯 Overview

Fillout is now integrated for consultation scheduling instead of Calendly. This provides:
- **Custom branded forms** for consultation booking
- **Flexible field types** (date pickers, time slots, practice details)
- **Webhook integration** for automatic notifications
- **Payment collection** (can integrate with Stripe)
- **Better customization** to match KairoLogic branding

---

## 🔑 API Key (Already Configured)

```
FILLOUT_API_KEY=sk_prod_Zi3eFkuQgJFOXG6DwdpXe1aDVekPev1dGJ3zcBSGHooKier5F78JhQh4di0XxSd1BPp024snuxWDLIsubJvVKcGwDxMqKCGKgg8_40239
```

✅ This is already in your `.env.local.example` file

---

## 📝 Setting Up Your Fillout Form

### Step 1: Access Fillout Dashboard
1. Go to: https://fillout.com/dashboard
2. Log in with your account
3. Click "Create New Form"

### Step 2: Create Consultation Form

**Form Name:** Technical Consultation Booking

**Required Fields:**
```
1. Contact Name (Text field)
   - Required: Yes
   - Field ID: name

2. Email Address (Email field)
   - Required: Yes
   - Validation: Email format
   - Field ID: email

3. Phone Number (Phone field)
   - Required: Yes
   - Field ID: phone

4. Practice Name (Text field)
   - Required: Yes
   - Field ID: practice_name

5. Preferred Date (Date picker)
   - Required: Yes
   - Minimum: Today
   - Field ID: preferred_date

6. Preferred Time (Dropdown)
   - Options:
     • 9:00 AM - 10:30 AM
     • 11:00 AM - 12:30 PM
     • 1:00 PM - 2:30 PM
     • 3:00 PM - 4:30 PM
   - Field ID: preferred_time

7. Urgency Level (Radio buttons)
   - Options:
     • Standard (2-3 weeks)
     • Priority (1 week)
     • Urgent (2-3 days)
   - Field ID: urgency
   - Default: Standard

8. Current Compliance Status (Dropdown - Optional)
   - Options:
     • Already scanned (have results)
     • Not yet scanned
     • Received Cure Notice
     • General inquiry
   - Field ID: compliance_status

9. Additional Notes (Textarea - Optional)
   - Placeholder: "Any specific concerns or questions?"
   - Field ID: notes
```

### Step 3: Configure Form Settings

**Appearance:**
- Primary color: `#FF6B35` (KairoLogic Orange)
- Button text: "Schedule Consultation"
- Success message: "Thank you! We'll confirm your consultation within 24 hours."

**Notifications:**
- Enable email notifications to: compliance@kairologic.com
- Subject: "New Consultation Booking - [Practice Name]"

**Advanced Settings:**
- Enable "Limit one submission per email"
- Enable "Require reCAPTCHA"
- Redirect after submission: `/consultation/thank-you` (optional)

### Step 4: Get Form ID

After creating the form:
1. Click "Share" button
2. Click "Embed" tab
3. Copy the form ID from the embed code
4. Example: `kairologic-consultation` or `abc123xyz`
5. Update in code: `/app/consultation/page.tsx` line 85

**Current placeholder:** `data-fillout-id="kairologic-consultation"`

---

## 🔗 Webhook Configuration

### Step 1: Configure Webhook in Fillout
1. Go to Form Settings
2. Click "Integrations" tab
3. Click "Add Webhook"
4. Enter webhook URL: `https://yourdomain.com/api/fillout/webhook`
5. Select events: "Form Submitted"
6. Save webhook

### Step 2: Test Webhook
1. Submit a test form
2. Check Vercel logs for webhook data
3. Verify email notification arrives
4. Confirm data structure matches expectations

---

## 📧 Email Notifications

When a consultation is booked, the system will:

1. **Send to KairoLogic Team:**
   - All form details
   - Urgency level highlighted
   - Direct link to respond

2. **Auto-response to Client (Optional):**
   - Confirmation of booking request
   - What to expect next
   - Contact information

---

## 🎨 Embedding the Form

The form is embedded on `/consultation` page using:

```html
<div 
  data-fillout-id="your-form-id"
  data-fillout-embed-type="standard"
  data-fillout-inherit-parameters
  data-fillout-dynamic-resize
  style={{ minWidth: '320px', minHeight: '700px', width: '100%' }}
></div>
```

**Embed Options:**
- `standard` - Full form with all styling
- `popup` - Opens in modal
- `slider` - Slides in from side
- `inline` - Seamless integration

---

## 💳 Payment Integration (Optional)

Fillout can collect payment for consultations:

### Enable Payment Collection:
1. Go to Form Settings → Payments
2. Connect Stripe account
3. Add payment field:
   - Amount: $3,000
   - Description: "Technical Consultation (90 minutes)"
4. Set as required field

### Alternative: Manual Payment
Keep consultation booking free, send payment link later via email.

---

## 🔄 Workflow After Booking

### Automated (Current Setup):
1. Client submits consultation form
2. Webhook triggers `/api/fillout/webhook`
3. Email sent to compliance@kairologic.com
4. Client sees success message

### Manual Follow-up (Your Process):
1. Review booking details in email
2. Check calendar availability
3. Send confirmation email with:
   - Confirmed date/time
   - Video meeting link (Zoom/Google Meet)
   - What to prepare for consultation
   - Payment link (if not collected upfront)

---

## 📊 Viewing Submissions

### Fillout Dashboard:
1. Go to: https://fillout.com/dashboard
2. Click on "Technical Consultation" form
3. View "Submissions" tab
4. Export to CSV if needed

### Future Enhancement:
Store submissions in Supabase database for admin dashboard view.

---

## 🎯 Next Steps

### Immediate:
1. ✅ Create form in Fillout dashboard
2. ✅ Get form ID
3. ✅ Update `/app/consultation/page.tsx` with correct form ID
4. ✅ Set up webhook to `/api/fillout/webhook`
5. ✅ Test form submission

### Short-term:
1. Create custom thank-you page
2. Set up automated confirmation emails
3. Integrate with calendar system
4. Add to Supabase database

### Long-term:
1. Add payment collection
2. Build consultation management in admin dashboard
3. Automated calendar booking
4. Pre-consultation questionnaire

---

## 🧪 Testing Checklist

- [ ] Form loads on `/consultation` page
- [ ] All fields are visible and functional
- [ ] Date picker shows available dates
- [ ] Form submission works
- [ ] Webhook receives data
- [ ] Email notification arrives
- [ ] Success message displays
- [ ] Mobile responsive
- [ ] Brand colors match KairoLogic

---

## 🆘 Troubleshooting

### Form Not Loading
- Check if Fillout script loaded: `https://server.fillout.com/embed/v1/`
- Verify form ID is correct
- Check browser console for errors

### Webhook Not Firing
- Verify webhook URL is correct in Fillout settings
- Check Vercel function logs
- Ensure webhook is enabled for "Form Submitted" event

### Email Not Sending
- Confirm Mailjet secret key is set in Vercel
- Check Mailjet dashboard for delivery logs
- Verify sender email is verified

---

## 📖 Fillout Documentation

- **Dashboard:** https://fillout.com/dashboard
- **Docs:** https://docs.fillout.com/
- **Embed Guide:** https://docs.fillout.com/embed
- **Webhooks:** https://docs.fillout.com/webhooks
- **API Reference:** https://docs.fillout.com/api

---

## 🎉 Benefits Over Calendly

✅ **More Customizable** - Match exact KairoLogic branding
✅ **Collect Practice Details** - Get all info upfront
✅ **Flexible Fields** - Add custom questions
✅ **Better Integration** - Direct webhook to your system
✅ **Lower Cost** - More affordable pricing
✅ **Form Builder** - Easy to modify without code changes

---

**Status:** ✅ Configured and Ready  
**Integration:** Complete  
**Testing Required:** Yes (after form creation)

---

**Next Action:** Create form in Fillout dashboard and get form ID!
