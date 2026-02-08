import sys
#!/usr/bin/env python3
"""
KairoLogic Safe Harbor Customization & Implementation Guide
Professional implementation walkthrough PDF
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib import colors
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
AMBER_50 = HexColor('#FFFBEB')
AMBER_600 = HexColor('#D97706')

# ═══ STYLES ═══
S = {}

S['title'] = ParagraphStyle('Title',
    fontName='Helvetica-Bold', fontSize=22, leading=28,
    textColor=NAVY, spaceAfter=6)

S['h1'] = ParagraphStyle('H1',
    fontName='Helvetica-Bold', fontSize=14, leading=20,
    textColor=NAVY, spaceBefore=20, spaceAfter=10)

S['h2'] = ParagraphStyle('H2',
    fontName='Helvetica-Bold', fontSize=11, leading=16,
    textColor=NAVY_LIGHT, spaceBefore=14, spaceAfter=6)

S['h3'] = ParagraphStyle('H3',
    fontName='Helvetica-Bold', fontSize=10, leading=14,
    textColor=NAVY, spaceBefore=10, spaceAfter=4)

S['body'] = ParagraphStyle('Body',
    fontName='Helvetica', fontSize=10, leading=15,
    textColor=GRAY_700, spaceAfter=8, alignment=TA_JUSTIFY)

S['body_bold'] = ParagraphStyle('BodyBold',
    fontName='Helvetica-Bold', fontSize=10, leading=15,
    textColor=GRAY_900, spaceAfter=8, alignment=TA_JUSTIFY)

S['bullet'] = ParagraphStyle('Bullet',
    fontName='Helvetica', fontSize=10, leading=15,
    textColor=GRAY_700, spaceAfter=4, leftIndent=24,
    bulletIndent=12)

S['sub_bullet'] = ParagraphStyle('SubBullet',
    fontName='Helvetica', fontSize=9.5, leading=14,
    textColor=GRAY_700, spaceAfter=3, leftIndent=42,
    bulletIndent=30)

S['step_num'] = ParagraphStyle('StepNum',
    fontName='Helvetica-Bold', fontSize=9, leading=12,
    textColor=GOLD_DARK, spaceAfter=2)

S['phase_num'] = ParagraphStyle('PhaseNum',
    fontName='Helvetica-Bold', fontSize=9, leading=12,
    textColor=GOLD_DARK, spaceAfter=2)

S['small'] = ParagraphStyle('Small',
    fontName='Helvetica', fontSize=8.5, leading=12,
    textColor=GRAY_500, spaceAfter=4)

S['code'] = ParagraphStyle('Code',
    fontName='Courier', fontSize=9, leading=13,
    textColor=NAVY, spaceAfter=4, leftIndent=12,
    backColor=GRAY_100)

S['sig_label'] = ParagraphStyle('SigLabel',
    fontName='Helvetica', fontSize=9, leading=13,
    textColor=GRAY_500, spaceAfter=2)

S['footer'] = ParagraphStyle('Footer',
    fontName='Helvetica', fontSize=7.5, leading=10,
    textColor=GRAY_500, alignment=TA_CENTER)

S['toc_item'] = ParagraphStyle('TOCItem',
    fontName='Helvetica', fontSize=10, leading=18,
    textColor=NAVY, spaceAfter=2)


def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = letter

    # Header
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, h - 42, w, 42, fill=True, stroke=False)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, h - 44, w, 2, fill=True, stroke=False)

    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawString(0.75 * inch, h - 28, 'KAIROLOGIC')
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawString(1.72 * inch, h - 28, '|  SAFE HARBOR\u2122 IMPLEMENTATION GUIDE')

    canvas_obj.setFillColor(HexColor('#8899AA'))
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(w - 0.75 * inch, h - 28, 'SB 1188 + HB 149  |  CONFIDENTIAL')

    # Footer
    canvas_obj.setFillColor(GRAY_200)
    canvas_obj.rect(0, 0, w, 36, fill=True, stroke=False)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, 36, w, 1.5, fill=True, stroke=False)

    canvas_obj.setFillColor(GRAY_500)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(0.75 * inch, 14,
        'KairoLogic  |  Safe Harbor\u2122 Policy Bundle  |  kairologic.com')
    canvas_obj.drawRightString(w - 0.75 * inch, 14, f'Page {doc.page}')

    canvas_obj.restoreState()


def callout_box(text, bg_color=GRAY_100, border_color=GRAY_200, text_color=GRAY_700, icon_prefix=''):
    """Create a styled callout box"""
    content = Paragraph(
        f'{icon_prefix}{text}',
        ParagraphStyle('CB', fontName='Helvetica', fontSize=9.5, leading=14,
                       textColor=text_color, alignment=TA_JUSTIFY))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg_color),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, border_color),
    ]))
    return t


def tip_box(title, text):
    """Pro tip callout"""
    content = Paragraph(
        f'<b>{title}</b><br/>{text}',
        ParagraphStyle('Tip', fontName='Helvetica', fontSize=9, leading=13,
                       textColor=NAVY, alignment=TA_LEFT))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFF8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, GOLD),
    ]))
    return t


def warning_box(text):
    content = Paragraph(
        f'<b>WARNING:</b> {text}',
        ParagraphStyle('Warn', fontName='Helvetica', fontSize=9, leading=13,
                       textColor=RED_700, alignment=TA_LEFT))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), RED_50),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, RED_600),
    ]))
    return t


def phase_header(num, title, time_est):
    """Create a phase header with time estimate"""
    return [
        Paragraph(f'PHASE {num}', S['phase_num']),
        Paragraph(title, S['h1']),
        Paragraph(f'Estimated Time: {time_est}', ParagraphStyle('Time',
            fontName='Helvetica-Oblique', fontSize=9, leading=12,
            textColor=GOLD_DARK, spaceAfter=4)),
        HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10),
    ]


def build_cover():
    elements = []
    elements.append(Spacer(1, 1.0 * inch))

    # Banner
    banner = Table([['SAFE HARBOR\u2122 POLICY BUNDLE  |  IMPLEMENTATION GUIDE']], colWidths=[5.5 * inch])
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

    elements.append(Paragraph('Customization &amp;<br/>Implementation Guide', S['title']))
    elements.append(Spacer(1, 4))
    elements.append(HRFlowable(width='40%', thickness=2.5, color=GOLD, spaceAfter=16, hAlign='LEFT'))

    elements.append(Paragraph(
        'Your step-by-step walkthrough for deploying the Safe Harbor\u2122 Policy Bundle, '
        'establishing documented compliance with Texas SB 1188 and HB 149, and securing '
        'your practice\'s standing on the Texas Sovereignty Registry.',
        ParagraphStyle('CS', fontName='Helvetica', fontSize=11, leading=16,
                       textColor=NAVY_LIGHT, spaceAfter=24)))

    # Time estimate highlight
    time_box_content = Paragraph(
        '<b>TOTAL IMPLEMENTATION TIME: APPROXIMATELY 60 MINUTES</b><br/>'
        'This guide is designed for non-technical Practice Managers and Office Administrators. '
        'No coding, IT expertise, or legal background required.',
        ParagraphStyle('TB', fontName='Helvetica', fontSize=9.5, leading=14,
                       textColor=GREEN_700))
    time_box = Table([[time_box_content]], colWidths=[5.5 * inch])
    time_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN_50),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, GREEN_600),
    ]))
    elements.append(time_box)
    elements.append(Spacer(1, 0.3 * inch))

    # Meta
    meta = [
        ['Bundle Version:', '1.0 (February 2026)'],
        ['Governing Statutes:', 'Texas SB 1188 + HB 149'],
        ['Audience:', 'Practice Managers, Office Administrators, Compliance Officers'],
        ['Prerequisite:', 'KairoLogic Safe Harbor\u2122 Policy Bundle (purchased)'],
        ['Support:', 'support@kairologic.net  |  kairologic.com/support'],
    ]
    mt = Table(meta, colWidths=[1.6 * inch, 4.0 * inch])
    mt.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_500),
        ('TEXTCOLOR', (1, 0), (1, -1), GRAY_900),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(mt)

    elements.append(Spacer(1, 0.4 * inch))

    # Disclaimer
    disc = Paragraph(
        '<b>IMPORTANT:</b> This implementation guide accompanies the Safe Harbor\u2122 Policy Bundle '
        'and is intended to assist practices in deploying compliance documentation. It does not constitute '
        'legal advice. Practices should review all customized documents with qualified legal counsel before '
        'final execution. KairoLogic provides compliance tooling and documentation; regulatory interpretations '
        'should be confirmed with an attorney licensed in the State of Texas.',
        ParagraphStyle('D', fontName='Helvetica', fontSize=8, leading=11,
                       textColor=GRAY_700, alignment=TA_JUSTIFY))
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


def build_toc():
    elements = []
    elements.append(Paragraph('TABLE OF CONTENTS', S['h1']))
    elements.append(HRFlowable(width='100%', thickness=1, color=GRAY_200, spaceAfter=12))

    items = [
        ('', 'Before You Begin: Bundle Contents Checklist'),
        ('Phase 1', 'Customizing the SB 1188 Data Sovereignty Policy Pack (15 min)'),
        ('Phase 2', 'Deploying the AI Transparency Disclosure Kit \u2014 HB 149 (10 min)'),
        ('Phase 3', 'Building Your Forensic Evidence Ledger (15 min)'),
        ('Phase 4', 'Employee Acknowledgment &amp; Training (10 min)'),
        ('Phase 5', 'Finalizing Your Registry Standing (5 min)'),
        ('Phase 6', 'Ongoing Compliance &amp; Quarterly Maintenance (5 min)'),
        ('', 'Vendor Email Template Library'),
        ('', 'Troubleshooting &amp; FAQ'),
        ('', 'Implementation Completion Checklist'),
        ('', 'Support &amp; Escalation Contacts'),
    ]
    for num, title in items:
        prefix = f'<b>{num}:</b> ' if num else '        '
        elements.append(Paragraph(f'{prefix}{title}', S['toc_item']))

    elements.append(PageBreak())
    return elements


def build_prereq():
    elements = []
    elements.append(Paragraph('BEFORE YOU BEGIN', S['phase_num']))
    elements.append(Paragraph('Bundle Contents Checklist', S['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    elements.append(Paragraph(
        'Verify that your Safe Harbor\u2122 Policy Bundle download contains all of the following documents. '
        'If any item is missing, contact support@kairologic.net before proceeding.',
        S['body']))

    checklist_data = [
        ['#', 'Document', 'Filename', 'Purpose'],
        ['1', 'SB 1188 Data Sovereignty Policy', 'SB1188-Data-Sovereignty-Policy.pdf', 'Core compliance policy for data residency'],
        ['2', 'AI Transparency Disclosure Kit', 'AI-Disclosure-Kit.txt', 'Website footer text + patient consent form (HB 149)'],
        ['3', 'Vendor Evidence Ledger', 'Evidence-Ledger.xlsx', 'Vendor inventory + data residency tracking'],
        ['4', 'Employee Acknowledgment Form', 'Employee-Acknowledgment.pdf', 'Staff sign-off on data sovereignty policy'],
        ['5', 'Vendor Certification Template', 'Vendor-Data-Sovereignty-Cert.pdf', 'Send to vendors for residency confirmation'],
        ['6', 'Quarterly Audit Checklist', 'Quarterly-Audit-Checklist.pdf', 'Recurring compliance verification tool'],
        ['7', 'Sentry Scan Report (PDF)', 'Your-Practice-Sentry-Report.pdf', 'Baseline forensic scan of your digital footprint'],
        ['8', 'This Implementation Guide', 'Safe-Harbor-Implementation-Guide.pdf', 'Step-by-step deployment walkthrough'],
    ]
    ct = Table(checklist_data, colWidths=[0.35*inch, 1.9*inch, 2.2*inch, 1.7*inch])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(ct)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph('<b>You will also need:</b>', S['body_bold']))
    needs = [
        'Your practice\'s legal business name (as registered with the Texas Secretary of State)',
        'The name and title of your Medical Director or Practice Owner (signatory)',
        'Access to your practice website (or contact info for your web developer)',
        'A list of your current digital vendors (EMR, website host, email provider, etc.)',
        'A printer and pen (for "wet ink" signatures on the executed policy)',
    ]
    for n in needs:
        elements.append(Paragraph(f'\u2022  {n}', S['bullet']))

    elements.append(PageBreak())
    return elements


def build_phases():
    elements = []

    # ═══ PHASE 1 ═══
    elements.extend(phase_header('1', 'Customizing the SB 1188 Data Sovereignty Policy Pack', '15 minutes'))

    elements.append(Paragraph(
        'The Data Sovereignty Policy Pack is the cornerstone of your Safe Harbor\u2122 defense. '
        'Under Texas SB 1188, demonstrating "Reasonable Care" requires a <b>written, executed policy</b> '
        'that is specific to your practice. A generic template is insufficient \u2014 the policy must be '
        'customized to reflect your entity\'s legal identity, organizational structure, and operational reality.',
        S['body']))

    elements.append(Paragraph('<b>Step 1.1: Identify Your Legal Entity</b>', S['h2']))
    elements.append(Paragraph(
        'Open the SB 1188 Data Sovereignty Policy document. Throughout the document, you will see '
        'placeholder text that must be replaced with your practice-specific information.',
        S['body']))

    replacements = [
        ['Placeholder', 'Replace With', 'Example'],
        ['[Practice Name]', 'Your legal business name', 'Austin Family Care, PLLC'],
        ['[Practice Address]', 'Primary business address', '4521 Medical Pkwy, Austin, TX 78756'],
        ['[Compliance Officer]', 'Name of designated officer', 'Maria Santos, Office Manager'],
        ['[Medical Director]', 'Licensed supervising physician', 'Dr. James Chen, MD'],
        ['[Effective Date]', 'Date of policy execution', 'February 8, 2026'],
    ]
    rt = Table(replacements, colWidths=[1.5*inch, 2.0*inch, 2.5*inch])
    rt.setStyle(TableStyle([
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
    elements.append(rt)
    elements.append(Spacer(1, 8))

    elements.append(tip_box(
        'PRO TIP: Use Your Legal Entity Name, Not Your DBA',
        'In a state audit, regulators look for the entity registered with the Texas Secretary of State. '
        'If your marketing name is "Bright Smile Dental" but your legal entity is "Bright Smile Dental Arts, PLLC," '
        'use the PLLC name throughout the policy. You may add the DBA in parentheses on the cover page.'))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph('<b>Step 1.2: Appoint a Data Sovereignty Officer</b>', S['h2']))
    elements.append(Paragraph(
        'SB 1188 Safe Harbor provisions are strengthened when a practice designates a specific individual '
        'as the point of contact for data residency compliance. This person does not need a legal or '
        'technical background \u2014 they serve as the organizational owner of the policy.',
        S['body']))
    elements.append(Paragraph(
        'Recommended designees (in order of preference):', S['body']))

    designees = [
        'Office Manager or Practice Administrator (most common \u2014 handles day-to-day vendor relationships)',
        'HIPAA Privacy Officer (if already designated, natural extension of existing role)',
        'Medical Director or Practice Owner (appropriate for small practices with fewer than 10 staff)',
        'External compliance consultant (if outsourced, ensure they are named in the policy with contact info)',
    ]
    for d in designees:
        elements.append(Paragraph(f'\u2022  {d}', S['bullet']))

    elements.append(Spacer(1, 8))
    elements.append(Paragraph('<b>Step 1.3: The "Wet Ink" Execution Requirement</b>', S['h2']))
    elements.append(Paragraph(
        'Once customization is complete, print the finalized policy and obtain physical signatures from '
        'the Practice Owner or Medical Director on the execution page (Section 12).',
        S['body']))

    elements.append(warning_box(
        'A digital-only policy file is <b>insufficient</b> for Safe Harbor standing. Texas regulators and '
        'plaintiff attorneys specifically look for signed, dated, physical policy documents during audits '
        'and litigation discovery. Print the policy, sign it with pen, and store it in your HIPAA binder '
        'alongside your Notice of Privacy Practices and BAAs.'))
    elements.append(Spacer(1, 6))

    elements.append(Paragraph('<b>After signing, you should have:</b>', S['body_bold']))
    after_items = [
        'One signed original stored in your HIPAA compliance binder',
        'One digital scan (PDF) stored in your secure practice drive',
        'One copy provided to your designated Data Sovereignty Officer',
    ]
    for a in after_items:
        elements.append(Paragraph(f'\u2022  {a}', S['bullet']))

    # ═══ PHASE 2 ═══
    elements.extend(phase_header('2', 'Deploying the AI Transparency Disclosure Kit (HB 149)', '10 minutes'))

    elements.append(Paragraph(
        'Texas House Bill 149 requires healthcare practices to provide "clear and conspicuous" notice '
        'to patients when artificial intelligence, machine learning, or automated decision-making tools '
        'are used in any aspect of patient care, communication, or data processing. Non-compliance '
        'exposes your practice to regulatory action and undermines your SB 1188 Safe Harbor standing.',
        S['body']))

    elements.append(Paragraph('<b>Step 2.1: Website Footer Disclosure</b>', S['h2']))
    elements.append(Paragraph(
        'Add the following disclosure text to your website footer. It should appear on every page '
        'of your practice website, immediately above or below your existing HIPAA/privacy notice links.',
        S['body']))

    # Disclosure text box
    disc_text = Paragraph(
        '<b>RECOMMENDED FOOTER TEXT:</b><br/><br/>'
        '<i>"This practice utilizes AI-assisted tools for administrative and clinical support functions. '
        'All artificial intelligence systems employed by this practice process data exclusively on '
        'servers located within the continental United States, in compliance with Texas SB 1188 '
        '(Data Sovereignty) and HB 149 (AI Transparency). Patients have the right to request human '
        'review of any AI-assisted recommendation. For questions about our AI practices, contact '
        'our office directly."</i>',
        ParagraphStyle('DT', fontName='Helvetica', fontSize=9, leading=13,
                       textColor=NAVY, alignment=TA_LEFT))
    dt_box = Table([[disc_text]], colWidths=[5.8 * inch])
    dt_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BLUE_50),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, BLUE_600),
    ]))
    elements.append(dt_box)
    elements.append(Spacer(1, 8))

    elements.append(tip_box(
        'HOW TO ADD THIS TO YOUR WEBSITE',
        'If you manage your own website (WordPress, Squarespace, Wix), add this text to your footer '
        'widget or site-wide footer HTML. If your website is managed by a developer or agency, forward '
        'the AI-Disclosure-Kit.txt file and request the update. Turnaround should be under 24 hours. '
        'Keep the confirmation email from your developer as evidence of deployment.'))
    elements.append(Spacer(1, 8))

    elements.append(Paragraph('<b>Step 2.2: Patient Intake AI Consent Addendum</b>', S['h2']))
    elements.append(Paragraph(
        'If your practice uses AI for any patient-facing function \u2014 including chatbots, intake form '
        'auto-fill, appointment scheduling bots, clinical transcription, or diagnostic decision support \u2014 '
        'you must add the AI Consent Form from your bundle to your standard new-patient packet.',
        S['body']))
    elements.append(Paragraph('<b>Implementation steps:</b>', S['body_bold']))
    intake_steps = [
        'Print the AI Consent Form from AI-Disclosure-Kit.txt (Page 2)',
        'Add it to your new-patient packet, immediately after the HIPAA Notice of Privacy Practices',
        'Train front desk staff to collect signatures on this form alongside existing intake paperwork',
        'For existing patients: distribute the form at next scheduled visit or include in a mass mailing',
        'Store signed forms in the patient chart (physical or scanned into your EMR)',
    ]
    for s in intake_steps:
        elements.append(Paragraph(f'\u2022  {s}', S['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph('<b>Step 2.3: AI System Inventory</b>', S['h2']))
    elements.append(Paragraph(
        'Document every AI or automated tool currently in use at your practice. This inventory is '
        'required by the Data Sovereignty Policy (Section 7.2) and serves as evidence during audits.',
        S['body']))

    ai_inventory = [
        ['AI Tool / Service', 'Function', 'Vendor', 'Data Residency Verified?'],
        ['Example: Freed AI', 'Clinical note transcription', 'Freed Health, Inc.', '[ ] Yes  [ ] No  [ ] Pending'],
        ['Example: Weave', 'Patient messaging / reminders', 'Weave Communications', '[ ] Yes  [ ] No  [ ] Pending'],
        ['', '', '', '[ ] Yes  [ ] No  [ ] Pending'],
        ['', '', '', '[ ] Yes  [ ] No  [ ] Pending'],
        ['', '', '', '[ ] Yes  [ ] No  [ ] Pending'],
    ]
    ait = Table(ai_inventory, colWidths=[1.5*inch, 1.6*inch, 1.5*inch, 1.4*inch])
    ait.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(ait)

    # ═══ PHASE 3 ═══
    elements.extend(phase_header('3', 'Building Your Forensic Evidence Ledger', '15 minutes'))

    elements.append(Paragraph(
        'The Forensic Evidence Ledger is your most powerful Safe Harbor artifact. In the event of '
        'a state inquiry or Cure Notice, this document proves that you conducted due diligence on '
        'every vendor that touches patient data. Regulators have stated that documented vendor '
        'verification is the <b>single strongest indicator of Reasonable Care</b>.',
        S['body']))

    elements.append(Paragraph('<b>Step 3.1: Inventory Your Digital Vendors</b>', S['h2']))
    elements.append(Paragraph(
        'Open the Evidence-Ledger.xlsx spreadsheet. For each vendor in the following categories, '
        'create a row entry:',
        S['body']))

    vendor_cats = [
        ['Category', 'Common Vendors', 'Priority'],
        ['Electronic Medical Records (EMR)', 'Epic, Athenahealth, DrChrono, Kareo, NextGen', 'CRITICAL'],
        ['Website Hosting', 'GoDaddy, Bluehost, WP Engine, Squarespace, Wix', 'CRITICAL'],
        ['Email Service', 'Google Workspace, Microsoft 365, Zoho, ProtonMail', 'HIGH'],
        ['Appointment Scheduling', 'Zocdoc, PatientPop, SimplePractice, Acuity', 'HIGH'],
        ['Telehealth Platform', 'Doxy.me, Zoom for Healthcare, Amwell', 'CRITICAL'],
        ['Billing / RCM', 'Waystar, Availity, Tebra, AdvancedMD', 'HIGH'],
        ['AI / Transcription', 'Freed, DeepScribe, Nuance DAX, Amazon Transcribe', 'CRITICAL'],
        ['Marketing / CRM', 'Mailchimp, HubSpot, Constant Contact, Birdeye', 'MODERATE'],
        ['Phone / VoIP', 'Weave, RingCentral, Vonage, 8x8', 'MODERATE'],
        ['Cloud Backup', 'Carbonite, Datto, Veeam, Backblaze', 'HIGH'],
    ]
    vt = Table(vendor_cats, colWidths=[1.8*inch, 2.6*inch, 1.1*inch])
    vt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TEXTCOLOR', (2, 1), (2, 1), RED_600),
        ('TEXTCOLOR', (2, 5), (2, 5), RED_600),
        ('TEXTCOLOR', (2, 7), (2, 7), RED_600),
        ('FONTNAME', (2, 1), (2, -1), 'Helvetica-Bold'),
    ]))
    elements.append(vt)
    elements.append(Spacer(1, 8))

    elements.append(Paragraph('<b>Step 3.2: Send Verification Emails</b>', S['h2']))
    elements.append(Paragraph(
        'For each vendor marked CRITICAL or HIGH priority, send the following verification request. '
        'A pre-written email template is included later in this guide.',
        S['body']))

    email_box = Paragraph(
        '<b>VENDOR VERIFICATION EMAIL (Template):</b><br/><br/>'
        'Subject: Data Residency Confirmation Request \u2014 Texas SB 1188 Compliance<br/><br/>'
        'Dear [Vendor Name] Compliance Team,<br/><br/>'
        'Our practice is implementing compliance measures under Texas Senate Bill 1188 (the Texas Data '
        'Sovereignty Act), which requires healthcare providers to verify that all patient data is stored '
        'and processed exclusively within the continental United States.<br/><br/>'
        'Please confirm the following:<br/>'
        '1. The physical location of servers that store or process our patient data<br/>'
        '2. Whether any sub-processors route data outside the United States<br/>'
        '3. The cloud regions/availability zones in use for our account<br/><br/>'
        'If you have a Data Processing Addendum or Data Residency Certificate available, please provide '
        'a copy. We require this confirmation within 14 business days.<br/><br/>'
        'Thank you for your cooperation.<br/>'
        '[Your Name], [Your Title]<br/>'
        '[Practice Name]',
        ParagraphStyle('EM', fontName='Helvetica', fontSize=8.5, leading=12,
                       textColor=NAVY, alignment=TA_LEFT))
    eb = Table([[email_box]], colWidths=[5.8 * inch])
    eb.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_50),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1, GRAY_400),
    ]))
    elements.append(eb)
    elements.append(Spacer(1, 8))

    elements.append(Paragraph('<b>Step 3.3: Document the Evidence</b>', S['h2']))
    evidence_steps = [
        'When a vendor replies confirming U.S.-only data residency, save the email as a PDF',
        'Name the file: [VendorName]-DataResidency-Confirmed-[Date].pdf',
        'In the Evidence Ledger spreadsheet, enter the Date Verified, the Vendor Representative name, and set Status to "Confirmed"',
        'If a vendor provides a formal Data Processing Addendum (DPA) or Certificate, attach it alongside the email confirmation',
        'Store all evidence PDFs in a dedicated folder: /Compliance/SB1188/Vendor-Confirmations/',
    ]
    for e in evidence_steps:
        elements.append(Paragraph(f'\u2022  {e}', S['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(warning_box(
        'If a vendor <b>refuses</b> to confirm U.S.-only data residency, or cannot provide the requested '
        'information within 14 business days, flag the vendor as "Unverified" in your Evidence Ledger and '
        'begin evaluating domestic alternatives immediately. An unverified Critical-tier vendor is your '
        'single largest compliance exposure under SB 1188.'))

    # ═══ PHASE 4 ═══
    elements.extend(phase_header('4', 'Employee Acknowledgment &amp; Training', '10 minutes'))

    elements.append(Paragraph(
        'Your Data Sovereignty Policy is only enforceable if your staff knows it exists and has formally '
        'acknowledged it. SB 1188 Safe Harbor provisions require documented evidence that all personnel '
        'with access to patient data have been trained on and have accepted the policy.',
        S['body']))

    elements.append(Paragraph('<b>Step 4.1: Distribute Acknowledgment Forms</b>', S['h2']))
    ack_steps = [
        'Print one Employee Data Sovereignty Acknowledgment form (Appendix B of the Policy Pack) for each current staff member',
        'Schedule a brief 10-minute all-hands meeting (or distribute individually for small practices)',
        'Walk through the key points: what data sovereignty means, what tools are prohibited, and how to report concerns',
        'Have each employee sign and date their acknowledgment form',
        'Scan signed forms and store both physical and digital copies',
    ]
    for a in ack_steps:
        elements.append(Paragraph(f'\u2022  {a}', S['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph('<b>Step 4.2: Key Training Points (5-Minute Brief)</b>', S['h2']))

    training_data = [
        ['Topic', 'Key Message'],
        ['What is SB 1188?', 'Texas law requiring patient data to stay in the U.S. Violations = $250K per incident.'],
        ['What is prohibited?', 'No foreign AI tools, no personal email for patient data, no unapproved apps.'],
        ['What is Shadow IT?', 'Any software you use for work that IT hasn\'t approved. This includes browser extensions, free AI tools, and personal cloud storage.'],
        ['How to report a concern', 'If you suspect data is going offshore, tell [Compliance Officer] within 24 hours. No retaliation.'],
        ['What happens if I violate?', 'First offense = warning + retraining. Repeated = disciplinary action up to termination.'],
    ]
    tt = Table(training_data, colWidths=[1.5*inch, 4.5*inch])
    tt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8.5),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(tt)

    # ═══ PHASE 5 ═══
    elements.extend(phase_header('5', 'Finalizing Your Registry Standing', '5 minutes'))

    elements.append(Paragraph(
        'Once Phases 1 through 4 are complete, your practice\'s digital compliance footprint will '
        'have materially changed. The final step is to update your standing on the Texas Sovereignty Registry.',
        S['body']))

    elements.append(Paragraph('<b>Step 5.1: Trigger a Sentry Rescan</b>', S['h2']))
    elements.append(Paragraph(
        'After deploying the AI Transparency disclosure on your website (Phase 2), the KairoLogic Sentry '
        'engine will automatically detect the update during its next scheduled scan cycle (within 48 hours). '
        'To trigger an immediate rescan:',
        S['body']))
    rescan_steps = [
        'Visit kairologic.com and navigate to the scan section',
        'Enter your practice URL to initiate a fresh Sentry Scan',
        'Review the updated scan results \u2014 your AI Transparency score should now reflect the disclosure',
        'If your overall score has improved to Sovereign (80+), proceed to finalize verification',
    ]
    for r in rescan_steps:
        elements.append(Paragraph(f'\u2022  {r}', S['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph('<b>Step 5.2: Finalize Verification on the Registry</b>', S['h2']))
    elements.append(Paragraph(
        'Log into the Texas Sovereignty Registry at kairologic.com/registry and locate your practice listing. '
        'Click "Claim &amp; Verify" to submit your verified identity and link your compliance documentation. '
        'Upon verification, your practice status will update from "Pre-Audited" to <b>"Verified Sovereign"</b> '
        'and the Sovereignty badge will appear next to your listing.',
        S['body']))

    elements.append(tip_box(
        'WHAT "VERIFIED SOVEREIGN" MEANS FOR YOUR PRACTICE',
        'Verified Sovereign status is visible to the public, including patients, referral partners, and '
        'competitor practices browsing the registry. It signals that your practice has taken active, '
        'documented steps to comply with Texas data sovereignty law \u2014 a meaningful differentiator '
        'in an increasingly compliance-conscious market.'))

    # ═══ PHASE 6 ═══
    elements.extend(phase_header('6', 'Ongoing Compliance &amp; Quarterly Maintenance', '5 minutes per quarter'))

    elements.append(Paragraph(
        'Safe Harbor standing is not a one-time achievement. Texas SB 1188 requires <b>ongoing, '
        'documented compliance</b>. The following quarterly cadence will keep your practice protected:',
        S['body']))

    quarterly_data = [
        ['Quarter', 'Action Items', 'Deliverables'],
        ['Q1 (Jan\u2013Mar)', 'Annual policy review + update. New employee acknowledgments. Vendor re-certification for Critical-tier.', 'Updated policy (if amended). Signed acknowledgments. Vendor certs on file.'],
        ['Q2 (Apr\u2013Jun)', 'Sentry Watch scan. AI system inventory update. Shadow IT sweep.', 'Scan report PDF. Updated AI inventory. Sweep results documented.'],
        ['Q3 (Jul\u2013Sep)', 'Mid-year vendor audit. Staff refresher training. Website disclosure review.', 'Quarterly Audit Checklist (Appendix C). Training attendance log.'],
        ['Q4 (Oct\u2013Dec)', 'Annual forensic audit. Evidence Ledger reconciliation. Policy version control.', 'Annual audit report. Complete Evidence Ledger. Policy amendment log.'],
    ]
    qt = Table(quarterly_data, colWidths=[1.0*inch, 2.5*inch, 2.5*inch])
    qt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(qt)

    elements.append(PageBreak())
    return elements


def build_completion_checklist():
    elements = []
    elements.append(Paragraph('IMPLEMENTATION COMPLETION', S['phase_num']))
    elements.append(Paragraph('Final Verification Checklist', S['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    elements.append(Paragraph(
        'Before considering your Safe Harbor\u2122 implementation complete, verify that every item below '
        'has been addressed. This checklist serves as your implementation sign-off document.',
        S['body']))
    elements.append(Spacer(1, 6))

    check_data = [
        ['Phase', '#', 'Item', 'Done'],
        ['1', '1.1', 'Legal entity name inserted throughout policy document', '[ ]'],
        ['1', '1.2', 'Data Sovereignty Officer designated by name and title', '[ ]'],
        ['1', '1.3', 'Policy printed and signed ("wet ink") by authorized signatory', '[ ]'],
        ['1', '1.4', 'Signed policy filed in HIPAA compliance binder', '[ ]'],
        ['1', '1.5', 'Digital scan (PDF) of signed policy stored securely', '[ ]'],
        ['2', '2.1', 'AI Transparency disclosure deployed on website footer', '[ ]'],
        ['2', '2.2', 'AI Consent Form added to new-patient intake packet', '[ ]'],
        ['2', '2.3', 'AI System Inventory completed and filed', '[ ]'],
        ['3', '3.1', 'All digital vendors inventoried in Evidence Ledger', '[ ]'],
        ['3', '3.2', 'Verification emails sent to all Critical and High-tier vendors', '[ ]'],
        ['3', '3.3', 'Vendor confirmation replies saved as PDFs and logged', '[ ]'],
        ['4', '4.1', 'Employee Acknowledgment forms signed by all staff', '[ ]'],
        ['4', '4.2', 'Staff training brief completed (key points covered)', '[ ]'],
        ['5', '5.1', 'Sentry Scan triggered post-disclosure deployment', '[ ]'],
        ['5', '5.2', 'Registry listing claimed and verification initiated', '[ ]'],
        ['6', '6.1', 'Quarterly review calendar set (next review date noted)', '[ ]'],
    ]
    clt = Table(check_data, colWidths=[0.6*inch, 0.45*inch, 3.7*inch, 0.5*inch])
    clt.setStyle(TableStyle([
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
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('FONTSIZE', (3, 1), (3, -1), 12),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(clt)
    elements.append(Spacer(1, 20))

    elements.append(Paragraph('Implementation Completed By:', S['sig_label']))
    elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph('Date:', S['sig_label']))
    elements.append(HRFlowable(width='40%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph('Next Quarterly Review Date:', S['sig_label']))
    elements.append(HRFlowable(width='40%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))

    elements.append(PageBreak())
    return elements


def build_support():
    elements = []
    elements.append(Paragraph('SUPPORT &amp; ESCALATION', S['phase_num']))
    elements.append(Paragraph('Getting Help When You Need It', S['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    support_data = [
        ['Issue', 'Contact', 'Expected Response'],
        ['General implementation questions', 'support@kairologic.net', 'Within 24 business hours'],
        ['Website disclosure deployment help', 'support@kairologic.net (subject: "HB 149 Website Help")', 'Within 24 business hours'],
        ['Vendor refuses to confirm residency', 'support@kairologic.net (subject: "Vendor Escalation")', 'Within 48 business hours'],
        ['Registry status not updating', 'support@kairologic.net (subject: "Registry Update")', 'Within 24 business hours'],
        ['Legal questions about SB 1188 / HB 149', 'Consult your practice attorney. KairoLogic cannot provide legal advice.', 'N/A'],
        ['Request a re-scan or updated report', 'Visit kairologic.com \u2014 Scan section', 'Immediate (automated)'],
        ['Upgrade to Sentry Watch monitoring', 'kairologic.com \u2014 Services page', 'Activation within 24 hours'],
    ]
    st = Table(support_data, colWidths=[1.8*inch, 2.6*inch, 1.6*inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(st)
    elements.append(Spacer(1, 20))

    # Final callout
    final = Paragraph(
        '<b>YOU\'RE PROTECTED.</b><br/><br/>'
        'By completing this implementation guide, your practice now has documented evidence of Reasonable Care '
        'under Texas SB 1188 \u2014 a signed data sovereignty policy, vendor verification records, employee '
        'acknowledgments, AI transparency disclosures, and a baseline forensic scan. This portfolio of '
        'evidence is your strongest defense against civil penalties and the foundation of your Safe Harbor '
        'standing. Welcome to the Texas Sovereignty Registry.',
        ParagraphStyle('Final', fontName='Helvetica', fontSize=10, leading=15,
                       textColor=WHITE, alignment=TA_JUSTIFY))
    ft = Table([[final]], colWidths=[5.8 * inch])
    ft.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(ft)

    return elements


def main():
    output_path = '/mnt/user-data/outputs/Safe_Harbor_Implementation_Guide.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.85 * inch,
        bottomMargin=0.7 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title='Safe Harbor\u2122 Customization & Implementation Guide',
        author='KairoLogic Compliance Division',
        subject='SB 1188 + HB 149 Implementation Walkthrough',
    )

    story = []
    story.extend(build_cover())
    story.extend(build_toc())
    story.extend(build_prereq())
    story.extend(build_phases())
    story.extend(build_completion_checklist())
    story.extend(build_support())

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')
    print(f'File size: {os.path.getsize(output_path) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
