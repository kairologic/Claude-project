import sys
#!/usr/bin/env python3
"""
KairoLogic AI Disclosure Kit: Statutory Content & Assets
HB 149 + SB 1188 Compliance Documentation
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
import os

# ═══ COLORS ═══
NAVY = HexColor('#0B1E3D')
NAVY_LIGHT = HexColor('#1A3A5F')
GOLD = HexColor('#D4A574')
GOLD_DARK = HexColor('#B88F5F')
ORANGE = HexColor('#FF6B35')
WHITE = HexColor('#FFFFFF')
GRAY_50 = HexColor('#F9FAFB')
GRAY_100 = HexColor('#F3F4F6')
GRAY_200 = HexColor('#E5E7EB')
GRAY_400 = HexColor('#9CA3AF')
GRAY_500 = HexColor('#6B7280')
GRAY_700 = HexColor('#374151')
GRAY_900 = HexColor('#111827')
RED_50 = HexColor('#FEF2F2')
RED_600 = HexColor('#DC2626')
RED_700 = HexColor('#B91C1C')
GREEN_50 = HexColor('#F0FDF4')
GREEN_600 = HexColor('#059669')
GREEN_700 = HexColor('#047857')
BLUE_50 = HexColor('#EFF6FF')
BLUE_600 = HexColor('#2563EB')
BLUE_700 = HexColor('#1D4ED8')
AMBER_50 = HexColor('#FFFBEB')
AMBER_600 = HexColor('#D97706')
PURPLE_50 = HexColor('#FAF5FF')
PURPLE_600 = HexColor('#9333EA')

# ═══ STYLES ═══
S = {}
S['title'] = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=NAVY, spaceAfter=6)
S['h1'] = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=14, leading=20, textColor=NAVY, spaceBefore=20, spaceAfter=10)
S['h2'] = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceBefore=14, spaceAfter=6)
S['h3'] = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=NAVY, spaceBefore=10, spaceAfter=4)
S['body'] = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=15, textColor=GRAY_700, spaceAfter=8, alignment=TA_JUSTIFY)
S['body_bold'] = ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=GRAY_900, spaceAfter=8, alignment=TA_JUSTIFY)
S['bullet'] = ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10, leading=15, textColor=GRAY_700, spaceAfter=4, leftIndent=24, bulletIndent=12)
S['sub_bullet'] = ParagraphStyle('SubBullet', fontName='Helvetica', fontSize=9.5, leading=14, textColor=GRAY_700, spaceAfter=3, leftIndent=42, bulletIndent=30)
S['small'] = ParagraphStyle('Small', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY_500, spaceAfter=4)
S['asset_num'] = ParagraphStyle('AssetNum', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=GOLD_DARK, spaceAfter=2)
S['sig_label'] = ParagraphStyle('SigLabel', fontName='Helvetica', fontSize=9, leading=13, textColor=GRAY_500, spaceAfter=2)
S['toc_item'] = ParagraphStyle('TOCItem', fontName='Helvetica', fontSize=10, leading=18, textColor=NAVY, spaceAfter=2)


def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = letter
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, h - 42, w, 42, fill=True, stroke=False)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, h - 44, w, 2, fill=True, stroke=False)
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawString(0.75 * inch, h - 28, 'KAIROLOGIC')
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawString(1.72 * inch, h - 28, '|  AI DISCLOSURE KIT')
    canvas_obj.setFillColor(HexColor('#8899AA'))
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(w - 0.75 * inch, h - 28, 'HB 149 + SB 1188  |  STATUTORY CONTENT & ASSETS')
    canvas_obj.setFillColor(GRAY_200)
    canvas_obj.rect(0, 0, w, 36, fill=True, stroke=False)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, 36, w, 1.5, fill=True, stroke=False)
    canvas_obj.setFillColor(GRAY_500)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(0.75 * inch, 14, 'KairoLogic  |  AI Transparency Disclosure Kit  |  kairologic.com')
    canvas_obj.drawRightString(w - 0.75 * inch, 14, f'Page {doc.page}')
    canvas_obj.restoreState()


def styled_box(text, bg_color, border_color, text_color=None, font='Helvetica', font_size=9.5):
    tc = text_color or GRAY_700
    content = Paragraph(text, ParagraphStyle('Box', fontName=font, fontSize=font_size, leading=font_size + 4, textColor=tc, alignment=TA_JUSTIFY))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, border_color),
    ]))
    return t


def copy_ready_box(label, text, bg=GRAY_50, border=GRAY_400):
    """A box formatted as copy-ready content with a label"""
    header = Paragraph(f'<b>{label}</b>', ParagraphStyle('CRL',
        fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=GRAY_500))
    body = Paragraph(text, ParagraphStyle('CRB',
        fontName='Helvetica', fontSize=9.5, leading=14.5, textColor=NAVY, alignment=TA_JUSTIFY))
    t = Table([[header], [body]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('TOPPADDING', (0, 0), (0, 0), 8),
        ('BOTTOMPADDING', (0, 0), (0, 0), 2),
        ('TOPPADDING', (0, 1), (0, 1), 4),
        ('BOTTOMPADDING', (0, 1), (0, 1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1, border),
        ('LINEBELOW', (0, 0), (0, 0), 0.5, GRAY_200),
    ]))
    return t


def asset_header(num, title):
    return [
        Paragraph(f'ASSET {num}', S['asset_num']),
        Paragraph(title, S['h1']),
        HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10),
    ]


def build_cover():
    elements = []
    elements.append(Spacer(1, 1.0 * inch))

    banner = Table([['AI DISCLOSURE KIT  |  STATUTORY CONTENT & ASSETS']], colWidths=[5.5 * inch])
    banner.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, -1), GOLD),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(banner)
    elements.append(Spacer(1, 0.4 * inch))

    elements.append(Paragraph('AI Transparency<br/>Disclosure Kit', S['title']))
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width='40%', thickness=2.5, color=GOLD, spaceAfter=16, hAlign='LEFT'))

    elements.append(Paragraph(
        'Pre-written, copy-ready statutory content for website deployment, patient intake forms, '
        'privacy policy updates, staff scripts, and signage \u2014 designed to establish documented '
        'compliance with Texas House Bill 149 (AI Transparency) and Senate Bill 1188 (Data Sovereignty).',
        ParagraphStyle('CS', fontName='Helvetica', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceAfter=24)))

    # Asset summary
    asset_summary = [
        ['Asset', 'Deployment Location', 'Statute'],
        ['1. Website Footer Notice', 'Website footer / navigation bar', 'HB 149'],
        ['2. Patient Intake AI Consent Form', 'New patient paperwork / digital intake', 'HB 149 + SB 1188'],
        ['3. Privacy Policy AI Section', 'Website privacy policy page', 'HB 149 + SB 1188'],
        ['4. Phone Inquiry Script', 'Front desk / reception', 'HB 149'],
        ['5. Staff AI Usage Guidelines', 'Internal handbook / breakroom', 'SB 1188'],
        ['6. Social Media / Review Response Template', 'Online reputation management', 'HB 149'],
        ['7. Waiting Room Signage', 'Physical display / patient-facing areas', 'HB 149'],
        ['8. Vendor AI Verification Request', 'Email to AI tool vendors', 'SB 1188'],
    ]
    at = Table(asset_summary, colWidths=[2.2 * inch, 2.2 * inch, 1.2 * inch])
    at.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(at)
    elements.append(Spacer(1, 0.3 * inch))

    meta = [
        ['Governing Statutes:', 'Texas HB 149 (AI Transparency) + SB 1188 (Data Sovereignty)'],
        ['Version:', '1.0 \u2014 February 2026'],
        ['Classification:', 'Client Deliverable \u2014 Safe Harbor\u2122 Bundle'],
        ['Customization:', 'Replace all [Practice Name] placeholders with your legal entity name'],
    ]
    mt = Table(meta, colWidths=[1.6 * inch, 4.0 * inch])
    mt.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_500),
        ('TEXTCOLOR', (1, 0), (1, -1), GRAY_900),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(mt)
    elements.append(Spacer(1, 0.3 * inch))

    disc = Paragraph(
        '<b>CUSTOMIZATION INSTRUCTIONS:</b> All content in this kit is pre-written and copy-ready. '
        'Replace every instance of <b>[Practice Name]</b> with your legal business entity name before deployment. '
        'Content has been drafted for general healthcare practice use; practices with specialized AI applications '
        '(diagnostic imaging AI, clinical decision support, robotic surgery assistance) should consult legal '
        'counsel to determine if additional disclosure language is required. This kit does not constitute legal advice.',
        ParagraphStyle('D', fontName='Helvetica', fontSize=8, leading=11, textColor=GRAY_700, alignment=TA_JUSTIFY))
    dt = Table([[disc]], colWidths=[6.0 * inch])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_100),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    elements.append(dt)
    elements.append(PageBreak())
    return elements


def build_assets():
    elements = []

    # ═══ ASSET 1: WEBSITE FOOTER ═══
    elements.extend(asset_header('1', 'Website Footer / "Clear &amp; Conspicuous" Notice'))

    elements.append(Paragraph(
        'Texas HB 149 requires healthcare entities that use AI technologies to provide "clear and conspicuous" '
        'notice to patients and the public. The most effective and legally defensible placement is in your '
        'website footer, where it appears on every page of your site. Alternatively, create a dedicated '
        '"AI Transparency" link in your navigation bar that leads to this disclosure.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Website footer (all pages) or dedicated AI Transparency page', S['body_bold']))
    elements.append(Paragraph('<b>Priority:</b> CRITICAL \u2014 Deploy within 24 hours of bundle purchase', S['body_bold']))
    elements.append(Spacer(1, 6))

    elements.append(copy_ready_box(
        'COPY-READY CONTENT \u2014 WEBSITE FOOTER NOTICE',
        '<b>AI Transparency Notice:</b> [Practice Name] utilizes artificial intelligence (AI) technologies '
        'to assist in administrative, scheduling, and clinical data processing functions. In compliance with '
        'Texas House Bill 149, we affirm that these tools are deployed to enhance patient care and operational '
        'efficiency. All AI-driven processing utilized by this entity has been verified for US-Sovereign data '
        'residency in accordance with Texas Senate Bill 1188 (the Texas Data Sovereignty Act). No patient data '
        'is processed or stored outside the continental United States. Patients may request human review of any '
        'AI-assisted recommendation or opt out of specific AI-driven processes by contacting our office directly.',
        bg=BLUE_50, border=BLUE_600))
    elements.append(Spacer(1, 8))

    elements.append(styled_box(
        '<b>IMPLEMENTATION TIP:</b> If your website is managed by a developer or agency, forward this page '
        'to them with instructions to add the text to the global footer template. Request a screenshot of the '
        'deployed disclosure as evidence. If you use WordPress, add a "Custom HTML" widget to your footer area. '
        'For Squarespace or Wix, use the site-wide footer injection setting. The KairoLogic Sentry engine will '
        'automatically detect this disclosure during its next scan cycle.',
        HexColor('#FFF8F0'), GOLD, NAVY))
    elements.append(Spacer(1, 6))

    # Compact version
    elements.append(Paragraph('<b>Compact Version</b> (for space-constrained footers):', S['h3']))
    elements.append(copy_ready_box(
        'COMPACT FOOTER NOTICE (ONE-LINE)',
        '<b>AI Notice:</b> This practice uses US-Sovereign AI for administrative and clinical support. '
        'All data processing is strictly domestic per TX SB 1188 &amp; HB 149. '
        '<u>Learn more</u> | <u>Opt out</u>'))
    elements.append(Spacer(1, 10))

    # ═══ ASSET 2: PATIENT INTAKE CONSENT ═══
    elements.extend(asset_header('2', 'Patient Intake AI Consent Form'))

    elements.append(Paragraph(
        'If your practice uses AI for any patient-facing function \u2014 including chatbots, intake auto-fill, '
        'clinical transcription, appointment scheduling, or diagnostic decision support \u2014 this consent '
        'form must be included in your standard new-patient intake packet. It should be positioned immediately '
        'after your HIPAA Notice of Privacy Practices.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> New patient intake packet (print) and digital intake forms', S['body_bold']))
    elements.append(Paragraph('<b>Retention:</b> Signed forms must be retained in the patient chart for 6 years minimum', S['body_bold']))
    elements.append(Spacer(1, 6))

    consent_text = (
        '<b>[Practice Name]</b><br/>'
        '<b>ARTIFICIAL INTELLIGENCE DATA PROCESSING CONSENT</b><br/>'
        '<b>Texas House Bill 149 &amp; Senate Bill 1188 Compliance</b><br/><br/>'
        '<b>Patient Name:</b> ________________________________________ <b>Date:</b> ________________<br/><br/>'
        'I acknowledge that [Practice Name] may utilize artificial intelligence (AI) and automated '
        'systems for the following purposes:<br/><br/>'
        '\u2022  Transcription of clinical notes and medical records<br/>'
        '\u2022  Automated appointment scheduling, confirmations, and reminders<br/>'
        '\u2022  Preliminary diagnostic support and clinical data analysis<br/>'
        '\u2022  Patient communication, including automated responses and follow-ups<br/>'
        '\u2022  Insurance verification and billing processing<br/>'
        '\u2022  Quality assurance and clinical documentation review<br/><br/>'
        'I understand that:<br/><br/>'
        '<b>1. Human Oversight:</b> All AI-generated clinical data, recommendations, and documentation '
        'are reviewed and approved by a licensed healthcare professional before being incorporated into '
        'my medical record or used in treatment decisions. AI does not replace the clinical judgment of '
        'my healthcare provider.<br/><br/>'
        '<b>2. Data Sovereignty:</b> [Practice Name] has verified that all AI tools and automated systems '
        'process and store my personal health information exclusively on servers located within the '
        'continental United States, in compliance with Texas Senate Bill 1188 (the Texas Data Sovereignty Act). '
        'My data is not transmitted to, processed in, or accessible from any foreign jurisdiction.<br/><br/>'
        '<b>3. Right to Opt Out:</b> I may request that specific administrative tasks be processed manually '
        '(without AI assistance) by contacting the Practice Manager at any time. This right does not extend '
        'to system-level functions that are required for practice operations (e.g., EMR auto-save features).<br/><br/>'
        '<b>4. Right to Human Review:</b> I may request human review of any AI-assisted recommendation, '
        'clinical note, or automated communication at any time, at no additional cost.<br/><br/>'
        '<b>5. Data Protection:</b> AI systems used by this practice are subject to the same HIPAA privacy '
        'and security protections as all other patient data systems. My information is not shared with AI '
        'vendors for model training or any purpose beyond the direct services provided to this practice.<br/><br/>'
        '<b>Patient Signature:</b> ________________________________________ <b>Date:</b> ________________<br/><br/>'
        '<b>Printed Name:</b> ________________________________________<br/><br/>'
        '<b>Witness (Staff Member):</b> ________________________________________ <b>Date:</b> ________________'
    )

    consent_p = Paragraph(consent_text, ParagraphStyle('Consent',
        fontName='Helvetica', fontSize=9, leading=13, textColor=NAVY, alignment=TA_LEFT))
    ct = Table([[consent_p]], colWidths=[5.8 * inch])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), WHITE),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('BOX', (0, 0), (-1, -1), 1.5, NAVY),
    ]))
    elements.append(ct)
    elements.append(Spacer(1, 8))

    elements.append(styled_box(
        '<b>FOR EXISTING PATIENTS:</b> Distribute this form at the next scheduled visit. For practices with '
        'a large patient base, consider including the form in a mass mailing or patient portal notification '
        'with a request to sign and return at next visit. Document your distribution method and date for '
        'compliance records.',
        HexColor('#FFF8F0'), GOLD, NAVY))

    elements.append(PageBreak())

    # ═══ ASSET 3: PRIVACY POLICY SECTION ═══
    elements.extend(asset_header('3', 'Privacy Policy \u2014 AI Transparency Section'))

    elements.append(Paragraph(
        'Add this section to your existing website privacy policy. It should be inserted as a new numbered '
        'section, ideally after your existing "Use and Disclosure of PHI" section and before "Patient Rights." '
        'If your privacy policy is managed by an attorney, forward this content for review and integration.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Website privacy policy page (insert as new section)', S['body_bold']))
    elements.append(Spacer(1, 6))

    pp_text = (
        '<b>Section [X]: Artificial Intelligence, Automated Processing &amp; Data Sovereignty</b><br/><br/>'
        'In accordance with the Texas Data Sovereignty Act (Senate Bill 1188) and House Bill 149 '
        '(AI Transparency in Healthcare), [Practice Name] maintains the following policies regarding '
        'the use of artificial intelligence and automated data processing:<br/><br/>'
        '<b>1. Scope of AI Usage.</b> [Practice Name] may utilize AI-assisted tools for administrative '
        'functions (scheduling, billing, documentation), clinical support functions (transcription, '
        'preliminary data analysis, clinical decision support), and patient communication (automated '
        'reminders, chatbot-assisted inquiries). AI is used to augment, not replace, human clinical judgment.<br/><br/>'
        '<b>2. Human Oversight.</b> All AI-generated clinical data, including transcribed notes, diagnostic '
        'suggestions, and treatment recommendations, is reviewed and approved by a licensed healthcare '
        'professional prior to incorporation into the patient record or use in care decisions. No autonomous '
        'clinical decisions are made by AI systems without physician oversight.<br/><br/>'
        '<b>3. Data Residency &amp; Sovereignty.</b> In compliance with Texas SB 1188, [Practice Name] does '
        'not utilize AI vendors, sub-processors, or automated systems that process, store, cache, or transmit '
        'Protected Health Information (PHI) outside the continental United States. All AI tool vendors have '
        'been verified for domestic data residency through our vendor due diligence program. Verification '
        'records are maintained in our Forensic Evidence Ledger.<br/><br/>'
        '<b>4. Data Protection.</b> Patient data processed by AI systems is subject to the same HIPAA Privacy '
        'Rule (45 CFR Part 164) and Security Rule protections as all other patient data maintained by this '
        'practice. Patient information is not provided to AI vendors for model training, algorithm development, '
        'or any purpose beyond the direct clinical and administrative services rendered to this practice.<br/><br/>'
        '<b>5. Patient Right to Opt Out.</b> Patients may request that specific administrative tasks be '
        'processed manually (without AI assistance) by submitting a written request to the Practice Manager. '
        'This opt-out right applies to elective AI functions and does not extend to system-level operations '
        'required for standard practice management (e.g., EMR core functionality).<br/><br/>'
        '<b>6. Patient Right to Human Review.</b> Patients may request human review of any AI-assisted '
        'recommendation, clinical notation, or automated communication at any time. Such requests may be '
        'made verbally or in writing and will be fulfilled at no additional cost to the patient.<br/><br/>'
        '<b>7. AI System Transparency.</b> A current inventory of AI systems utilized by [Practice Name] '
        'is maintained internally and is available for review by state regulators upon request. Patients '
        'may request general information about AI tools used in their care by contacting the Practice Manager.<br/><br/>'
        '<b>8. Amendments.</b> This section will be updated as AI technologies are added, modified, or '
        'discontinued, or as applicable Texas or federal regulations are amended. Material changes will be '
        'communicated to patients through updated privacy policy postings and, where required, direct notice.'
    )

    pp_p = Paragraph(pp_text, ParagraphStyle('PP',
        fontName='Helvetica', fontSize=9, leading=13.5, textColor=NAVY, alignment=TA_JUSTIFY))
    ppt = Table([[pp_p]], colWidths=[5.8 * inch])
    ppt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_50),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('BOX', (0, 0), (-1, -1), 1, GRAY_400),
    ]))
    elements.append(ppt)

    elements.append(PageBreak())

    # ═══ ASSET 4: PHONE SCRIPT ═══
    elements.extend(asset_header('4', 'Verification Script \u2014 Phone &amp; In-Person Inquiries'))

    elements.append(Paragraph(
        'Use these scripts when a patient, prospective patient, or regulatory auditor asks about your '
        'practice\'s use of AI. Train all front desk and patient-facing staff on these responses. '
        'Print and post near reception phones for easy reference.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Front desk reference card, staff training, reception area', S['body_bold']))
    elements.append(Spacer(1, 6))

    # Patient inquiry
    elements.append(Paragraph('<b>Scenario A: Patient Asks About AI</b>', S['h2']))
    elements.append(copy_ready_box(
        'SCRIPT \u2014 PATIENT INQUIRY',
        '"Thank you for asking about that. Yes, we do use AI-assisted tools to help with '
        '[scheduling/transcription/documentation]. These tools help us provide more efficient care and reduce '
        'wait times. Importantly, all of our AI systems are verified to keep your medical information '
        'exclusively within the United States \u2014 we comply with the latest Texas data privacy laws, '
        'including SB 1188 and HB 149. A licensed provider always reviews anything generated by our AI tools '
        'before it goes into your chart. If you\'d like more details, I can provide you with our AI '
        'transparency notice, or you can find it on our website."',
        bg=GREEN_50, border=GREEN_600))
    elements.append(Spacer(1, 8))

    # Auditor inquiry
    elements.append(Paragraph('<b>Scenario B: Regulatory Auditor or Inspector Asks About AI</b>', S['h2']))
    elements.append(copy_ready_box(
        'SCRIPT \u2014 AUDITOR / REGULATORY INQUIRY',
        '"Absolutely. We maintain a documented AI compliance program under Texas HB 149 and SB 1188. '
        'Our Data Sovereignty Policy is on file and includes an inventory of all AI systems in use, '
        'vendor data residency certifications, and employee acknowledgment records. I can connect you '
        'with our designated Data Sovereignty Officer, [Name/Title], who can provide the full documentation '
        'portfolio. Would you like me to pull those records now, or would you prefer to schedule a '
        'compliance review meeting?"',
        bg=AMBER_50, border=AMBER_600))
    elements.append(Spacer(1, 8))

    # Concerned patient
    elements.append(Paragraph('<b>Scenario C: Patient Expresses Concern or Wants to Opt Out</b>', S['h2']))
    elements.append(copy_ready_box(
        'SCRIPT \u2014 PATIENT CONCERN / OPT-OUT REQUEST',
        '"I completely understand your concern, and we take this very seriously. You absolutely have the '
        'right to request that we handle your information manually for specific tasks. Let me make a note '
        'of your preference in your chart. Just so you know, even with our AI tools, a real person \u2014 '
        'your doctor or one of our clinical staff \u2014 always reviews everything before it becomes part of '
        'your record. Your data never leaves the country and is protected by the same HIPAA rules as '
        'everything else in your chart. Would you like me to provide a copy of our AI transparency notice '
        'for your records?"',
        bg=PURPLE_50, border=PURPLE_600))
    elements.append(Spacer(1, 8))

    elements.append(styled_box(
        '<b>TRAINING NOTE:</b> Staff should never speculate about technical details they are unsure of. '
        'If a question exceeds the scope of these scripts, the correct response is: "That\'s a great question. '
        'Let me connect you with our [Compliance Officer/Practice Manager] who can give you the most accurate '
        'information." Document all AI-related patient inquiries in a log for compliance records.',
        HexColor('#FFF8F0'), GOLD, NAVY))

    # ═══ ASSET 5: STAFF GUIDELINES ═══
    elements.extend(asset_header('5', 'Staff AI Usage Guidelines'))

    elements.append(Paragraph(
        'Post these guidelines in your breakroom or include them in your employee handbook. '
        'These rules operationalize the Data Sovereignty Policy for day-to-day staff behavior.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Breakroom posting, employee handbook, onboarding materials', S['body_bold']))
    elements.append(Spacer(1, 6))

    guidelines_data_raw = [
        ['DO use approved\nAI tools', 'Only use AI tools on the practice\u2019s approved list. If unsure, ask your manager.', 'Unapproved tools may route data offshore \u2014 $250K violation.'],
        ['DO NOT use\npersonal AI', 'Never paste patient info into ChatGPT, Bard, Gemini, or any free AI tool.', 'Consumer AI is not HIPAA-compliant and may store data overseas.'],
        ['DO NOT use\npersonal email', 'Never send patient data through Gmail, Yahoo, or Outlook personal accounts.', 'Personal email servers are unverified for data residency.'],
        ['DO report\nsuspicious tools', 'If you see a coworker using an unapproved tool, report within 24 hours.', 'Early detection prevents violations. No retaliation policy applies.'],
        ['DO check before\ninstalling', 'Do not install extensions, apps, or software on work devices without approval.', 'Shadow IT is the #1 cause of sovereignty breaches.'],
        ['DO protect login\ncredentials', 'Never share AI system passwords or access tokens. Use unique passwords.', 'Shared credentials make breach tracing impossible.'],
    ]

    cell_style = ParagraphStyle('Cell', fontName='Helvetica', fontSize=7.5, leading=10.5, textColor=GRAY_700)
    cell_bold = ParagraphStyle('CellBold', fontName='Helvetica-Bold', fontSize=7.5, leading=10.5, textColor=NAVY)
    header_style = ParagraphStyle('HdrCell', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=WHITE)

    guidelines_rows = [[
        Paragraph('Rule', header_style),
        Paragraph('Details', header_style),
        Paragraph('Why It Matters', header_style),
    ]]
    for rule, detail, why in guidelines_data_raw:
        guidelines_rows.append([
            Paragraph(f'<b>{rule}</b>', cell_bold),
            Paragraph(detail, cell_style),
            Paragraph(why, cell_style),
        ])

    gt = Table(guidelines_rows, colWidths=[1.0*inch, 2.7*inch, 2.1*inch])
    gt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(gt)

    # ═══ ASSET 6: SOCIAL MEDIA RESPONSE ═══
    elements.extend(asset_header('6', 'Social Media &amp; Review Response Template'))

    elements.append(Paragraph(
        'If a patient raises concerns about AI usage in an online review or social media post, use this '
        'template as a starting point. Never disclose PHI in a public response. Keep the tone professional, '
        'reassuring, and transparent.',
        S['body']))

    elements.append(copy_ready_box(
        'TEMPLATE \u2014 PUBLIC REVIEW / SOCIAL MEDIA RESPONSE',
        '"Thank you for raising this important question. At [Practice Name], we are committed to transparency '
        'in how we use technology to support patient care. Any AI tools we use are verified to process data '
        'exclusively within the United States, in compliance with Texas data sovereignty laws. A licensed '
        'healthcare provider always reviews AI-assisted recommendations. We welcome the opportunity to discuss '
        'this further \u2014 please contact our office directly so we can address your specific concerns in a '
        'private setting."'))
    elements.append(Spacer(1, 8))

    elements.append(styled_box(
        '<b>HIPAA REMINDER:</b> Never acknowledge that the reviewer is a patient, reference specific treatments, '
        'or disclose any health information in a public response. The template above is designed to address '
        'the concern without confirming or denying a patient relationship.',
        RED_50, RED_600, RED_700))

    # ═══ ASSET 7: WAITING ROOM SIGNAGE ═══
    elements.extend(asset_header('7', 'Waiting Room &amp; Patient-Facing Signage'))

    elements.append(Paragraph(
        'Print and display this notice in your waiting room, at the reception desk, or in treatment rooms. '
        'Physical signage demonstrates proactive transparency and satisfies the "conspicuous" element of '
        'HB 149\'s disclosure requirement.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Framed display in waiting room, reception desk tent card, treatment room posting', S['body_bold']))
    elements.append(Spacer(1, 6))

    sign_text = (
        '<b>OUR COMMITMENT TO YOUR DATA PRIVACY</b><br/><br/>'
        '[Practice Name] uses AI-assisted technology to enhance your care experience, including appointment '
        'management, clinical documentation, and administrative support.<br/><br/>'
        '<b>What This Means for You:</b><br/>'
        '\u2022  Your data never leaves the United States<br/>'
        '\u2022  A licensed provider reviews all AI-assisted clinical information<br/>'
        '\u2022  You may request human-only processing at any time<br/>'
        '\u2022  Your privacy is protected by HIPAA and Texas law<br/><br/>'
        '<b>Questions?</b> Ask any member of our team or visit our website for our full AI Transparency Notice.<br/><br/>'
        '<i>Compliant with Texas SB 1188 (Data Sovereignty) &amp; HB 149 (AI Transparency)</i>'
    )
    sign_p = Paragraph(sign_text, ParagraphStyle('Sign',
        fontName='Helvetica', fontSize=10, leading=15, textColor=NAVY, alignment=TA_CENTER))
    st = Table([[sign_p]], colWidths=[5.0 * inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), WHITE),
        ('TOPPADDING', (0, 0), (-1, -1), 20),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
        ('BOX', (0, 0), (-1, -1), 2, NAVY),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    # Center the table
    outer = Table([[st]], colWidths=[6.0 * inch])
    outer.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    elements.append(outer)

    # ═══ ASSET 8: VENDOR AI VERIFICATION ═══
    elements.extend(asset_header('8', 'Vendor AI Verification Request Email'))

    elements.append(Paragraph(
        'Send this email to every vendor that provides AI, machine learning, or automated processing tools '
        'used by your practice. This creates documented evidence of your vendor due diligence \u2014 a '
        'critical component of Safe Harbor standing under SB 1188.',
        S['body']))

    elements.append(Paragraph('<b>Deployment:</b> Email to each AI tool vendor', S['body_bold']))
    elements.append(Paragraph('<b>Deadline:</b> Send within 7 days of bundle purchase; vendor response expected within 14 business days', S['body_bold']))
    elements.append(Spacer(1, 6))

    email_text = (
        '<b>Subject:</b> AI System Data Residency Verification \u2014 Texas SB 1188 &amp; HB 149 Compliance Request<br/><br/>'
        'Dear [Vendor Name] Compliance / Privacy Team,<br/><br/>'
        'Our practice, [Practice Name], is implementing compliance measures required by the Texas Data '
        'Sovereignty Act (Senate Bill 1188) and House Bill 149 (AI Transparency in Healthcare). As a '
        'provider of AI/automated processing tools used in our clinical operations, we require the following '
        'verifications:<br/><br/>'
        '<b>1. Data Residency:</b> Please confirm that all patient data processed through your platform \u2014 '
        'including AI model inference, data storage, caching, and backup replication \u2014 occurs exclusively '
        'on servers located within the continental United States.<br/><br/>'
        '<b>2. Sub-Processor Disclosure:</b> Please identify any third-party sub-processors involved in the '
        'processing of our patient data and confirm their data residency status.<br/><br/>'
        '<b>3. Model Training:</b> Please confirm whether patient data from our practice is used for AI model '
        'training, algorithm improvement, or any purpose beyond the direct services provided to our practice.<br/><br/>'
        '<b>4. HB 149 Disclosure Support:</b> Please provide any standard AI transparency language or '
        'documentation that we may incorporate into our patient-facing disclosures.<br/><br/>'
        'If you have a Data Processing Addendum (DPA), Data Residency Certificate, or SOC 2 report that '
        'addresses these items, please provide a current copy.<br/><br/>'
        'We require this confirmation within <b>14 business days</b> to maintain our compliance timeline. '
        'If you have questions about these requirements, please contact our Data Sovereignty Officer at '
        '[Contact Email/Phone].<br/><br/>'
        'Thank you for your prompt attention to this matter.<br/><br/>'
        'Sincerely,<br/>'
        '[Your Name], [Your Title]<br/>'
        '[Practice Name]<br/>'
        '[Phone] | [Email]'
    )

    email_p = Paragraph(email_text, ParagraphStyle('Email',
        fontName='Helvetica', fontSize=9, leading=13, textColor=NAVY, alignment=TA_LEFT))
    et = Table([[email_p]], colWidths=[5.8 * inch])
    et.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_50),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('BOX', (0, 0), (-1, -1), 1, GRAY_400),
    ]))
    elements.append(et)
    elements.append(Spacer(1, 10))

    elements.append(styled_box(
        '<b>EVIDENCE RETENTION:</b> When vendors reply, save the email as a PDF. File it in your '
        'Forensic Evidence Ledger folder as: [VendorName]-AI-Verification-[Date].pdf. Log the vendor\'s '
        'response, the date received, and the respondent\'s name in your Evidence Ledger spreadsheet. '
        'This documentation is your strongest Safe Harbor evidence.',
        HexColor('#FFF8F0'), GOLD, NAVY))

    elements.append(PageBreak())

    # ═══ DEPLOYMENT CHECKLIST ═══
    elements.append(Paragraph('DEPLOYMENT CHECKLIST', S['asset_num']))
    elements.append(Paragraph('AI Disclosure Kit \u2014 Complete Verification', S['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    chk_cell = ParagraphStyle('ChkCell', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY_700)
    chk_hdr = ParagraphStyle('ChkHdr', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=WHITE)

    check_rows = [[
        Paragraph('#', chk_hdr),
        Paragraph('Asset', chk_hdr),
        Paragraph('Action Required', chk_hdr),
        Paragraph('Done', chk_hdr),
    ]]
    check_items = [
        ['1', 'Website Footer Notice', 'Deployed on all pages of practice website'],
        ['2', 'Patient Intake Consent', 'Added to new-patient packet; distribution plan for existing patients'],
        ['3', 'Privacy Policy Section', 'Inserted into website privacy policy as new section'],
        ['4', 'Phone Scripts', 'Printed and posted at reception; staff trained on all 3 scenarios'],
        ['5', 'Staff AI Guidelines', 'Posted in breakroom; included in employee handbook'],
        ['6', 'Social Media Template', 'Saved and accessible to reputation management / marketing staff'],
        ['7', 'Waiting Room Signage', 'Printed, framed, and displayed in patient-facing area'],
        ['8', 'Vendor AI Verification', 'Email sent to all AI tool vendors; responses logged in Evidence Ledger'],
    ]
    for num, asset, action in check_items:
        check_rows.append([
            Paragraph(num, chk_cell),
            Paragraph(f'<b>{asset}</b>', ParagraphStyle('ChkBold', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=NAVY)),
            Paragraph(action, chk_cell),
            Paragraph('[  ]', ParagraphStyle('ChkBox', fontName='Courier-Bold', fontSize=10, leading=12, textColor=GRAY_400, alignment=TA_CENTER)),
        ])

    clt = Table(check_rows, colWidths=[0.35*inch, 1.4*inch, 3.2*inch, 0.55*inch])
    clt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(clt)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph('Deployed By:', S['sig_label']))
    elements.append(HRFlowable(width='55%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph('Date All Assets Deployed:', S['sig_label']))
    elements.append(HRFlowable(width='40%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))

    return elements


def main():
    output_path = '/mnt/user-data/outputs/AI_Disclosure_Kit.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.85 * inch,
        bottomMargin=0.7 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title='AI Disclosure Kit: Statutory Content & Assets',
        author='KairoLogic Compliance Division',
        subject='HB 149 + SB 1188 AI Transparency Compliance Kit',
    )

    story = []
    story.extend(build_cover())
    story.extend(build_assets())

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')
    print(f'File size: {os.path.getsize(output_path) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
