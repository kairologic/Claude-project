import sys
#!/usr/bin/env python3
"""
KairoLogic 30-Day Compliance Roadmap
The Path to Sovereign Verification
SB 1188 + HB 149
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
from reportlab.pdfgen import canvas
import os

# ═══ COLORS ═══
NAVY = HexColor('#0B1E3D')
NAVY_LIGHT = HexColor('#1A3A5F')
GOLD = HexColor('#D4A574')
GOLD_DARK = HexColor('#B88F5F')
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
AMBER_700 = HexColor('#B45309')
ORANGE = HexColor('#FF6B35')

# ═══ STYLES ═══
S = {}
S['title'] = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=NAVY, spaceAfter=6)
S['h1'] = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=14, leading=20, textColor=NAVY, spaceBefore=20, spaceAfter=10)
S['h2'] = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceBefore=14, spaceAfter=6)
S['h3'] = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=NAVY, spaceBefore=10, spaceAfter=4)
S['body'] = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=15, textColor=GRAY_700, spaceAfter=8, alignment=TA_JUSTIFY)
S['body_bold'] = ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=GRAY_900, spaceAfter=8, alignment=TA_JUSTIFY)
S['bullet'] = ParagraphStyle('Bullet', fontName='Helvetica', fontSize=10, leading=15, textColor=GRAY_700, spaceAfter=4, leftIndent=24, bulletIndent=12)
S['phase_num'] = ParagraphStyle('PhaseNum', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=GOLD_DARK, spaceAfter=2)
S['sig_label'] = ParagraphStyle('SigLabel', fontName='Helvetica', fontSize=9, leading=13, textColor=GRAY_500, spaceAfter=2)
S['small'] = ParagraphStyle('Small', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY_500, spaceAfter=4)

# Cell styles for Paragraph-wrapped tables
CS = ParagraphStyle('CS', fontName='Helvetica', fontSize=9, leading=13, textColor=GRAY_700)
CS_BOLD = ParagraphStyle('CSB', fontName='Helvetica-Bold', fontSize=9, leading=13, textColor=NAVY)
CS_HDR = ParagraphStyle('CSH', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=WHITE)
CS_SM = ParagraphStyle('CSSM', fontName='Helvetica', fontSize=8, leading=11, textColor=GRAY_500)
CS_CHECK = ParagraphStyle('CSCHK', fontName='Courier-Bold', fontSize=11, leading=13, textColor=GRAY_400, alignment=TA_CENTER)


def header_footer(c, doc):
    c.saveState()
    w, h = letter
    c.setFillColor(NAVY)
    c.rect(0, h - 42, w, 42, fill=True, stroke=False)
    c.setFillColor(GOLD)
    c.rect(0, h - 44, w, 2, fill=True, stroke=False)
    c.setFillColor(WHITE)
    c.setFont('Helvetica-Bold', 8)
    c.drawString(0.75 * inch, h - 28, 'KAIROLOGIC')
    c.setFont('Helvetica', 7)
    c.setFillColor(GOLD)
    c.drawString(1.72 * inch, h - 28, '|  30-DAY COMPLIANCE ROADMAP')
    c.setFillColor(HexColor('#8899AA'))
    c.setFont('Helvetica', 7)
    c.drawRightString(w - 0.75 * inch, h - 28, 'SB 1188 + HB 149  |  CONFIDENTIAL')
    c.setFillColor(GRAY_200)
    c.rect(0, 0, w, 36, fill=True, stroke=False)
    c.setFillColor(GOLD)
    c.rect(0, 36, w, 1.5, fill=True, stroke=False)
    c.setFillColor(GRAY_500)
    c.setFont('Helvetica', 7)
    c.drawString(0.75 * inch, 14, 'KairoLogic  |  30-Day Compliance Roadmap  |  kairologic.com')
    c.drawRightString(w - 0.75 * inch, 14, f'Page {doc.page}')
    c.restoreState()


def styled_box(text, bg, border, tc=None):
    content = Paragraph(text, ParagraphStyle('SB', fontName='Helvetica', fontSize=9.5, leading=14, textColor=tc or GRAY_700, alignment=TA_JUSTIFY))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), bg),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, border),
    ]))
    return t


def phase_header(num, title, days, color):
    """Phase header with colored day badge"""
    badge_p = Paragraph(
        f'<b>{days}</b>',
        ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge = Table([[badge_p]], colWidths=[1.2 * inch])
    badge.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))

    return [
        Paragraph(f'PHASE {num}', S['phase_num']),
        S['h1'],  # placeholder — we use Paragraph directly below
        Paragraph(title, S['h1']),
        badge,
        HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10),
    ]


def checklist_table(items, accent_color=NAVY):
    """Build a checklist table with [ ] checkboxes, task, owner, and deliverable columns"""
    rows = [[
        Paragraph('[  ]', CS_HDR),
        Paragraph('<b>Task</b>', CS_HDR),
        Paragraph('<b>Owner</b>', CS_HDR),
        Paragraph('<b>Deliverable</b>', CS_HDR),
    ]]
    for task, owner, deliverable in items:
        rows.append([
            Paragraph('[  ]', CS_CHECK),
            Paragraph(task, CS),
            Paragraph(owner, CS_SM),
            Paragraph(deliverable, CS_SM),
        ])

    t = Table(rows, colWidths=[0.45 * inch, 2.9 * inch, 1.1 * inch, 1.35 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), accent_color),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_50]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('VALIGN', (0, 1), (0, -1), 'MIDDLE'),
    ]))
    return t


def build_cover():
    e = []
    e.append(Spacer(1, 0.9 * inch))

    banner = Table([['30-DAY COMPLIANCE ROADMAP  |  SAFE HARBOR\u2122 VERIFICATION']], colWidths=[5.5 * inch])
    banner.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, -1), GOLD),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    e.append(banner)
    e.append(Spacer(1, 0.4 * inch))

    e.append(Paragraph('The 30-Day Path to<br/>Sovereign Verification', S['title']))
    e.append(Spacer(1, 4))
    e.append(HRFlowable(width='40%', thickness=2.5, color=GOLD, spaceAfter=16, hAlign='LEFT'))

    e.append(Paragraph(
        'A structured, phase-by-phase implementation plan to transition your practice from '
        '"Pre-Audited" (At-Risk) to "Verified Sovereign" (Safe Harbor) status on the Texas '
        'Sovereignty Registry \u2014 establishing documented compliance with SB 1188 and HB 149 '
        'within 30 calendar days.',
        ParagraphStyle('CovSub', fontName='Helvetica', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceAfter=20)))

    # Objective highlight
    obj_p = Paragraph(
        '<b>OBJECTIVE</b><br/>'
        'Transition from <b>"Pre-Audited" (At-Risk)</b> to <b>"Verified Sovereign" (Safe Harbor)</b><br/><br/>'
        'Upon completion, your practice will have: a signed Data Sovereignty Policy, deployed AI disclosures, '
        'verified vendor residency records, trained staff with signed attestations, and a Verified Sovereign '
        'listing on the Texas Sovereignty Registry \u2014 a complete evidentiary portfolio that constitutes '
        '"Reasonable Care" under SB 1188.',
        ParagraphStyle('Obj', fontName='Helvetica', fontSize=9.5, leading=14, textColor=GREEN_700))
    obj_t = Table([[obj_p]], colWidths=[5.5 * inch])
    obj_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN_50),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, GREEN_600),
    ]))
    e.append(obj_t)
    e.append(Spacer(1, 0.25 * inch))

    # Phase overview timeline
    timeline_rows = [[
        Paragraph('<b>Phase</b>', CS_HDR),
        Paragraph('<b>Days</b>', CS_HDR),
        Paragraph('<b>Focus</b>', CS_HDR),
        Paragraph('<b>Outcome</b>', CS_HDR),
    ]]
    phases = [
        ['Phase 1', 'Days 1\u20137', 'Forensic Diagnostic', 'Complete inventory of digital supply chain; identify compliance gaps'],
        ['Phase 2', 'Days 8\u201314', 'Policy Adoption &\nTransparency', 'Signed policy on file; AI disclosures deployed; vendor verification initiated'],
        ['Phase 3', 'Days 15\u201321', 'Vendor Hardening &\nStaff Training', 'All vendors verified or flagged; staff trained and attestations collected'],
        ['Phase 4', 'Days 22\u201330', 'Verification &\nDefense', 'Registry verification complete; Safe Harbor evidence portfolio assembled'],
        ['Ongoing', 'Every 90 days', 'Maintenance &\nMonitoring', 'Quarterly audit; Sentry Watch scan; evidence ledger updated'],
    ]
    for p in phases:
        timeline_rows.append([
            Paragraph(f'<b>{p[0]}</b>', CS_BOLD),
            Paragraph(p[1], CS),
            Paragraph(p[2], CS),
            Paragraph(p[3], CS),
        ])

    tt = Table(timeline_rows, colWidths=[0.9 * inch, 1.0 * inch, 1.4 * inch, 2.5 * inch])
    tt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        # Gold left border on ongoing row
        ('BACKGROUND', (0, 5), (0, 5), HexColor('#FFF8F0')),
    ]))
    e.append(tt)
    e.append(Spacer(1, 0.2 * inch))

    meta = [
        ['Audience:', 'Practice Managers, Compliance Officers, Medical Directors'],
        ['Prerequisite:', 'KairoLogic Safe Harbor\u2122 Policy Bundle (purchased)'],
        ['Version:', '1.0 \u2014 February 2026'],
    ]
    mt = Table(meta, colWidths=[1.2 * inch, 4.4 * inch])
    mt.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), GRAY_500),
        ('TEXTCOLOR', (1, 0), (1, -1), GRAY_900),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
    ]))
    e.append(mt)

    e.append(PageBreak())
    return e


def build_phase1():
    e = []
    e.append(Paragraph('PHASE 1', S['phase_num']))
    e.append(Paragraph('The Forensic Diagnostic', S['h1']))

    # Day badge
    badge_p = Paragraph('<b>DAYS 1 \u2013 7</b>', ParagraphStyle('B', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge = Table([[badge_p]], colWidths=[1.2 * inch])
    badge.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), RED_600),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    e.append(badge)
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    e.append(Paragraph(
        'Before you can fix compliance gaps, you need to know where they are. Phase 1 is a complete '
        'forensic inventory of your practice\'s digital footprint \u2014 every vendor, every tool, every '
        'script running on your website. This is the diagnostic that tells you exactly what needs to change.',
        S['body']))

    e.append(Paragraph('<b>1.1 Digital Supply Chain Inventory</b>', S['h2']))
    e.append(Paragraph(
        'Open the Evidence Ledger (Tab 1: Digital Supply Chain). Systematically document every '
        'software vendor and digital service that touches patient data:',
        S['body']))

    e.append(checklist_table([
        ('List your EMR / EHR system with server location and contract details', 'Practice Mgr', 'Ledger Row 1'),
        ('List your website hosting provider and verify DNS records for US-only hosting', 'IT / Web Dev', 'Ledger + DNS audit'),
        ('List your email service provider (Google Workspace, Microsoft 365, etc.)', 'Practice Mgr', 'Ledger Row'),
        ('List your appointment scheduling and patient communication tools', 'Front Desk Mgr', 'Ledger Row'),
        ('List your telehealth / video conferencing platform', 'Practice Mgr', 'Ledger Row'),
        ('List your billing, RCM, and insurance verification tools', 'Billing Mgr', 'Ledger Row'),
        ('List ALL AI tools in use (transcription, chatbots, clinical AI, etc.)', 'Practice Mgr', 'Ledger + AI Inventory'),
        ('List your backup and disaster recovery services', 'IT Admin', 'Ledger Row'),
        ('List any marketing tools (CRM, newsletter, review management)', 'Marketing', 'Ledger Row'),
        ('List VoIP, phone system, and fax services', 'Office Mgr', 'Ledger Row'),
    ], RED_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>1.2 Digital Perimeter Sweep</b>', S['h2']))
    e.append(Paragraph(
        'Perform a forensic scan of your practice website to identify hidden scripts, tracking pixels, '
        'embedded resources, and third-party integrations that may be routing data through offshore servers. '
        'Many practices are unaware that their website contains foreign-hosted scripts added by marketing '
        'plugins, analytics tools, or theme components.',
        S['body']))

    e.append(checklist_table([
        ('Run a KairoLogic Sentry Scan on your practice website URL', 'Practice Mgr', 'Sentry Report PDF'),
        ('Review scan results for any foreign-hosted scripts or resources', 'Practice Mgr', 'Gap list'),
        ('Identify all third-party tracking pixels (Google Analytics, Facebook, etc.)', 'Web Dev', 'Script inventory'),
        ('Check for CDN endpoints that may route through foreign edge nodes', 'IT / Web Dev', 'CDN config docs'),
        ('Review website form handlers (intake, contact, appointment request)', 'Web Dev', 'Form routing audit'),
        ('Check for embedded chat widgets or AI chatbots and their hosting origins', 'Practice Mgr', 'Widget audit'),
    ], RED_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>1.3 Compliance Gap Analysis</b>', S['h2']))
    e.append(Paragraph(
        'Compare your current digital footprint against the requirements of both SB 1188 (Data Sovereignty) '
        'and HB 149 (AI Transparency). Identify every gap that must be closed before verification.',
        S['body']))

    gap_rows = [[
        Paragraph('<b>Compliance Area</b>', CS_HDR),
        Paragraph('<b>SB 1188 Requirement</b>', CS_HDR),
        Paragraph('<b>Your Status</b>', CS_HDR),
    ]]
    gaps = [
        ['Data Residency Policy', 'Signed, entity-specific policy on file', '[  ] Complete  [  ] Incomplete'],
        ['Vendor Verification', 'All Critical/High vendors verified for US residency', '[  ] Complete  [  ] Incomplete'],
        ['AI Disclosure (Website)', 'Public-facing notice on website per HB 149', '[  ] Complete  [  ] Incomplete'],
        ['AI Consent (Intake)', 'Patient consent form in intake packet', '[  ] Complete  [  ] Incomplete'],
        ['Privacy Policy Update', 'AI Transparency section added', '[  ] Complete  [  ] Incomplete'],
        ['Employee Training', 'All staff trained + attestations signed', '[  ] Complete  [  ] Incomplete'],
        ['Evidence Ledger', 'Complete vendor inventory with proofs', '[  ] Complete  [  ] Incomplete'],
        ['Foreign Script Removal', 'No offshore scripts on practice website', '[  ] Complete  [  ] Incomplete'],
        ['Shadow IT Sweep', 'No unauthorized tools in use by staff', '[  ] Complete  [  ] Incomplete'],
    ]
    for area, req, status in gaps:
        gap_rows.append([
            Paragraph(f'<b>{area}</b>', CS_BOLD),
            Paragraph(req, CS),
            Paragraph(status, CS),
        ])

    gt = Table(gap_rows, colWidths=[1.5 * inch, 2.4 * inch, 1.9 * inch])
    gt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(gt)
    e.append(Spacer(1, 8))

    e.append(styled_box(
        '<b>PHASE 1 DELIVERABLE:</b> A completed Evidence Ledger (Tab 1) with every vendor documented, '
        'a Sentry Scan report identifying any foreign-hosted scripts, and a Gap Analysis showing exactly '
        'what must be remediated in Phase 2. You should now know precisely where your practice stands.',
        GREEN_50, GREEN_600, GREEN_700))

    # ═══ PHASE 2 ═══
    e.append(Spacer(1, 10))
    e.append(Paragraph('PHASE 2', S['phase_num']))
    e.append(Paragraph('Policy Adoption &amp; Transparency Deployment', S['h1']))

    badge_p2 = Paragraph('<b>DAYS 8 \u2013 14</b>', ParagraphStyle('B2', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge2 = Table([[badge_p2]], colWidths=[1.2 * inch])
    badge2.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), AMBER_600), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    e.append(badge2)
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    e.append(Paragraph(
        'With your diagnostic complete, Phase 2 focuses on establishing the foundational compliance '
        'documents: your signed Data Sovereignty Policy, public-facing AI disclosures, and the '
        'initiation of vendor verification outreach.',
        S['body']))

    e.append(Paragraph('<b>2.1 Adopt &amp; Execute the Data Sovereignty Policy</b>', S['h2']))
    e.append(checklist_table([
        ('Open SB 1188 Data Sovereignty Policy; replace all [Practice Name] placeholders with legal entity name', 'Practice Mgr', 'Customized policy'),
        ('Designate a Data Sovereignty Officer by name and title (typically Office Manager)', 'Med Director', 'Officer designation'),
        ('Review the policy with Medical Director or Practice Owner', 'Med Director', 'Review confirmed'),
        ('Print the finalized policy and obtain "wet ink" signatures on execution page', 'Practice Mgr', 'Signed original'),
        ('Scan signed policy as PDF; file original in HIPAA binder, digital copy in compliance folder', 'Practice Mgr', '3 copies secured'),
    ], AMBER_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>2.2 Deploy AI Transparency Disclosures (HB 149)</b>', S['h2']))
    e.append(checklist_table([
        ('Deploy website footer AI Transparency Notice (from AI Disclosure Kit, Asset 1) on all pages', 'Web Dev', 'Screenshot evidence'),
        ('Add AI Consent Form (Asset 2) to new-patient intake packet, after HIPAA Notice of Privacy Practices', 'Front Desk Mgr', 'Updated packet'),
        ('Insert AI Transparency section (Asset 3) into website privacy policy', 'Web Dev', 'Updated policy page'),
        ('Print and post waiting room signage (Asset 7) in patient-facing areas', 'Office Mgr', 'Signage displayed'),
        ('Train front desk staff on phone inquiry scripts (Asset 4, all 3 scenarios)', 'Practice Mgr', 'Training log'),
        ('Post Staff AI Guidelines (Asset 5) in breakroom and add to employee handbook', 'Practice Mgr', 'Posted + handbook'),
    ], AMBER_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>2.3 Initiate Vendor Verification Outreach</b>', S['h2']))
    e.append(checklist_table([
        ('Send Vendor AI Verification email (Asset 8) to all CRITICAL-tier vendors in your Evidence Ledger', 'Practice Mgr', 'Sent emails logged'),
        ('Send Vendor AI Verification email to all HIGH-tier vendors', 'Practice Mgr', 'Sent emails logged'),
        ('Set 14-business-day deadline in calendar for vendor responses', 'Practice Mgr', 'Calendar reminder'),
        ('Request Data Processing Addendums (DPAs) or Data Residency Certificates from each vendor', 'Practice Mgr', 'Requests sent'),
    ], AMBER_600))
    e.append(Spacer(1, 8))

    e.append(styled_box(
        '<b>PHASE 2 DELIVERABLE:</b> A signed Data Sovereignty Policy filed in your HIPAA binder, AI '
        'disclosures live on your website and in patient intake forms, waiting room signage displayed, '
        'staff briefed on AI scripts, and vendor verification emails sent to all Critical and High-tier vendors.',
        GREEN_50, GREEN_600, GREEN_700))

    # ═══ PHASE 3 ═══
    e.append(Spacer(1, 10))
    e.append(Paragraph('PHASE 3', S['phase_num']))
    e.append(Paragraph('Vendor Hardening &amp; Staff Training', S['h1']))

    badge_p3 = Paragraph('<b>DAYS 15 \u2013 21</b>', ParagraphStyle('B3', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge3 = Table([[badge_p3]], colWidths=[1.2 * inch])
    badge3.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), BLUE_600), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    e.append(badge3)
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    e.append(Paragraph(
        'Phase 3 closes the two most common compliance gaps: unverified vendors and untrained staff. '
        'By the end of this phase, every vendor should be verified (or flagged for replacement) and '
        'every staff member should have completed the sovereignty training with a signed attestation.',
        S['body']))

    e.append(Paragraph('<b>3.1 Vendor Verification &amp; Hardening</b>', S['h2']))
    e.append(checklist_table([
        ('Collect and review vendor responses to verification emails sent in Phase 2', 'Practice Mgr', 'Responses on file'),
        ('For each confirmed vendor: save reply as PDF, update Evidence Ledger status to "SOVEREIGN"', 'Practice Mgr', 'Ledger updated'),
        ('For vendors providing formal DPAs or Certificates: file in /Compliance/Vendor-Confirmations/', 'Practice Mgr', 'Certs on file'),
        ('For non-responsive vendors: send follow-up email with 7-day deadline', 'Practice Mgr', 'Follow-up sent'),
        ('For vendors that CANNOT confirm US residency: flag as "NON-COMPLIANT" in Ledger', 'Practice Mgr', 'Flagged in Ledger'),
        ('For non-compliant vendors: begin researching US-sovereign alternatives and create migration plan', 'Practice Mgr + IT', 'Migration plan'),
        ('Remove or replace any foreign-hosted scripts identified in Phase 1 Sentry Scan', 'Web Dev', 'Clean scan result'),
        ('Update Evidence Ledger Tab 2 (Technical Residency Signals) with all network endpoints', 'IT Admin', 'Tab 2 complete'),
    ], BLUE_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>3.2 Staff Training &amp; Attestation</b>', S['h2']))
    e.append(checklist_table([
        ('Schedule 15-minute "Sovereignty Huddle" training session for all staff', 'Practice Mgr', 'Meeting invite'),
        ('Conduct training using Staff Training Guide (Modules 1\u20135)', 'Practice Mgr', 'Training delivered'),
        ('Walk through real-world scenarios (Module 6) with staff', 'Practice Mgr', 'Discussion complete'),
        ('Distribute and collect signed Staff Attestation forms from every employee', 'Practice Mgr', 'Signed forms'),
        ('File signed attestations in personnel files (physical + digital scan)', 'Practice Mgr / HR', 'Filed + scanned'),
        ('Post Quick Reference Card (Module 7) at all workstations and in breakroom', 'Office Mgr', 'Cards posted'),
        ('Distribute Approved Software List to all staff (from Training Guide Module 2)', 'Practice Mgr', 'List distributed'),
    ], BLUE_600))
    e.append(Spacer(1, 8))

    e.append(styled_box(
        '<b>PHASE 3 DELIVERABLE:</b> All vendors verified or flagged with migration plans, foreign scripts '
        'removed from website, Evidence Ledger fully populated with proofs, all staff trained with signed '
        'attestations on file, Quick Reference Cards posted at workstations.',
        GREEN_50, GREEN_600, GREEN_700))

    # ═══ PHASE 4 ═══
    e.append(Spacer(1, 10))
    e.append(Paragraph('PHASE 4', S['phase_num']))
    e.append(Paragraph('Verification &amp; Safe Harbor Defense', S['h1']))

    badge_p4 = Paragraph('<b>DAYS 22 \u2013 30</b>', ParagraphStyle('B4', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge4 = Table([[badge_p4]], colWidths=[1.2 * inch])
    badge4.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GREEN_600), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    e.append(badge4)
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    e.append(Paragraph(
        'The final phase brings everything together: a comprehensive audit of your evidence portfolio, '
        'verification on the Texas Sovereignty Registry, and assembly of your Safe Harbor defense package.',
        S['body']))

    e.append(Paragraph('<b>4.1 Final Evidence Audit</b>', S['h2']))
    e.append(checklist_table([
        ('Review Evidence Ledger Tab 1: confirm all vendors have status of SOVEREIGN or documented migration plan', 'Practice Mgr', 'Ledger audit'),
        ('Review Evidence Ledger Tab 2: confirm all network endpoints are documented and sovereign', 'IT Admin', 'Tab 2 audit'),
        ('Verify all vendor confirmation PDFs are saved and organized in compliance folder', 'Practice Mgr', 'File audit'),
        ('Confirm all employee attestation forms are signed, scanned, and filed', 'Practice Mgr', 'HR file check'),
        ('Verify AI disclosure is live on website footer (screenshot for evidence)', 'Practice Mgr', 'Screenshot PDF'),
        ('Verify AI Consent Form is in current patient intake packet', 'Front Desk Mgr', 'Packet check'),
        ('Verify waiting room signage is displayed', 'Office Mgr', 'Photo evidence'),
        ('Complete the Quarterly Audit Checklist (Appendix C of Policy Pack) for Q1', 'Practice Mgr', 'Checklist signed'),
    ], GREEN_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>4.2 Registry Verification</b>', S['h2']))
    e.append(checklist_table([
        ('Run a final KairoLogic Sentry Scan on your practice website to confirm clean results', 'Practice Mgr', 'Final scan report'),
        ('Visit kairologic.com/registry and locate your practice listing', 'Practice Mgr', 'Listing found'),
        ('Click "Claim & Verify" and complete identity verification steps', 'Practice Mgr', 'Verification submitted'),
        ('Confirm practice status updates from "Pre-Audited" to "Verified Sovereign"', 'Practice Mgr', 'Status confirmed'),
    ], GREEN_600))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>4.3 Assemble Safe Harbor Evidence Portfolio</b>', S['h2']))
    e.append(Paragraph(
        'Compile the following documents into a single compliance binder (physical and digital). '
        'This portfolio is your definitive Safe Harbor defense:',
        S['body']))

    portfolio_rows = [[
        Paragraph('<b>#</b>', CS_HDR),
        Paragraph('<b>Document</b>', CS_HDR),
        Paragraph('<b>Status</b>', CS_HDR),
    ]]
    portfolio = [
        ['1', 'Signed Data Sovereignty Policy (SB 1188)', '[  ] On file'],
        ['2', 'Evidence Ledger (all tabs complete)', '[  ] On file'],
        ['3', 'Vendor Data Residency Certificates / Confirmation PDFs', '[  ] On file'],
        ['4', 'AI Disclosure Kit deployment evidence (website screenshots)', '[  ] On file'],
        ['5', 'Signed Patient AI Consent Forms (sample batch)', '[  ] On file'],
        ['6', 'Signed Employee Attestation Forms (all staff)', '[  ] On file'],
        ['7', 'Staff Training completion log', '[  ] On file'],
        ['8', 'KairoLogic Sentry Scan Report (baseline + final)', '[  ] On file'],
        ['9', 'Quarterly Audit Checklist (Q1 completed)', '[  ] On file'],
        ['10', 'Registry Verification confirmation', '[  ] On file'],
    ]
    for num, doc, status in portfolio:
        portfolio_rows.append([
            Paragraph(num, CS),
            Paragraph(f'<b>{doc}</b>', CS_BOLD),
            Paragraph(status, CS),
        ])

    pft = Table(portfolio_rows, colWidths=[0.4 * inch, 3.8 * inch, 1.0 * inch])
    pft.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(pft)
    e.append(Spacer(1, 10))

    # Final success box
    final_p = Paragraph(
        '<b>CONGRATULATIONS \u2014 YOU\'RE SOVEREIGN.</b><br/><br/>'
        'Your practice now has a complete, documented Safe Harbor defense under Texas SB 1188 and HB 149. '
        'Your signed policy, verified vendor records, deployed disclosures, trained staff, and Registry '
        'verification collectively establish "Reasonable Care" \u2014 the strongest protection available '
        'against civil penalties, Cure Notices, and regulatory action. You have transitioned from '
        '"Pre-Audited" to "Verified Sovereign."',
        ParagraphStyle('Final', fontName='Helvetica', fontSize=10, leading=15, textColor=WHITE, alignment=TA_JUSTIFY))
    ft = Table([[final_p]], colWidths=[5.8 * inch])
    ft.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 16),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))
    e.append(ft)

    e.append(PageBreak())
    return e


def build_maintenance():
    e = []
    e.append(Paragraph('ONGOING', S['phase_num']))
    e.append(Paragraph('Quarterly Maintenance &amp; Monitoring', S['h1']))

    badge_m = Paragraph('<b>EVERY 90 DAYS</b>', ParagraphStyle('BM', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=WHITE, alignment=TA_CENTER))
    badge_mt = Table([[badge_m]], colWidths=[1.3 * inch])
    badge_mt.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), GOLD_DARK), ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    e.append(badge_mt)
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10))

    e.append(Paragraph(
        'Safe Harbor standing requires <b>ongoing compliance</b>, not a one-time implementation. '
        'The most common way practices lose their Verified Sovereign status is through "Shadow IT drift" \u2014 '
        'new marketing plugins, staff installing unapproved tools, or vendors changing their infrastructure '
        'without notice. The quarterly maintenance cycle prevents this.',
        S['body']))

    e.append(styled_box(
        '<b>THE QUARTERLY SWEEP \u2014 Set a recurring calendar reminder for every 90 days.</b><br/><br/>'
        'Failure to maintain quarterly audits degrades your Safe Harbor evidence portfolio over time. '
        'A signed policy from 2026 with no subsequent audit trail tells a regulator in 2027 that you '
        '"set it and forgot it" \u2014 undermining your Reasonable Care defense.',
        AMBER_50, AMBER_600, AMBER_700))
    e.append(Spacer(1, 8))

    e.append(checklist_table([
        ('Run a KairoLogic Sentry Watch scan on your practice website', 'Practice Mgr', 'Scan report PDF'),
        ('Review scan results for any new foreign scripts, plugins, or tracking pixels', 'Practice Mgr', 'Clean scan confirmed'),
        ('Review Evidence Ledger Tab 1: update any vendors that have changed or been added', 'Practice Mgr', 'Ledger current'),
        ('Re-verify any vendor whose contract has been renewed or modified', 'Practice Mgr', 'Updated certs'),
        ('Check for new employees needing Data Sovereignty training + attestation', 'Practice Mgr / HR', 'New attestations'),
        ('Verify AI disclosure is still live and accurate on website footer', 'Practice Mgr', 'Screenshot PDF'),
        ('Review AI system inventory for any new or discontinued tools', 'Practice Mgr', 'Inventory updated'),
        ('Conduct Shadow IT sweep: check for unapproved tools on staff devices', 'IT Admin', 'Sweep results'),
        ('Complete the Quarterly Audit Checklist (Appendix C of Policy Pack)', 'Practice Mgr', 'Signed checklist'),
        ('Log the audit in Evidence Ledger Tab 4 (Quarterly Audit Trail)', 'Practice Mgr', 'Audit trail row'),
        ('Update the "Last Updated" date on your Evidence Ledger', 'Practice Mgr', 'Ledger timestamp'),
    ], GOLD_DARK))
    e.append(Spacer(1, 12))

    # Quarterly calendar
    e.append(Paragraph('<b>Recommended Quarterly Schedule</b>', S['h2']))
    cal_rows = [[
        Paragraph('<b>Quarter</b>', CS_HDR),
        Paragraph('<b>Target Date</b>', CS_HDR),
        Paragraph('<b>Focus Areas</b>', CS_HDR),
        Paragraph('<b>Completed</b>', CS_HDR),
    ]]
    cal = [
        ['Q1 2026', 'March 31', 'Initial implementation complete. Baseline audit.', '[  ]'],
        ['Q2 2026', 'June 30', 'First 90-day review. New vendor check. Staff refresher.', '[  ]'],
        ['Q3 2026', 'September 30', 'Mid-year audit. Website re-scan. Shadow IT sweep.', '[  ]'],
        ['Q4 2026', 'December 31', 'Annual review. Policy version control. Full re-certification.', '[  ]'],
        ['Q1 2027', 'March 31', 'Anniversary audit. Vendor contract renewals. Annual training.', '[  ]'],
    ]
    for q, date, focus, done in cal:
        cal_rows.append([
            Paragraph(f'<b>{q}</b>', CS_BOLD),
            Paragraph(date, CS),
            Paragraph(focus, CS),
            Paragraph(done, CS_CHECK),
        ])

    ct = Table(cal_rows, colWidths=[0.9 * inch, 1.0 * inch, 3.0 * inch, 0.9 * inch])
    ct.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(ct)
    e.append(Spacer(1, 12))

    # Support
    e.append(Paragraph('<b>Support &amp; Escalation</b>', S['h2']))
    support_rows = [[
        Paragraph('<b>Need</b>', CS_HDR),
        Paragraph('<b>Contact</b>', CS_HDR),
    ]]
    support = [
        ['Implementation questions', 'support@kairologic.net'],
        ['Website disclosure help', 'support@kairologic.net (subject: "HB 149 Website Help")'],
        ['Vendor won\'t confirm residency', 'support@kairologic.net (subject: "Vendor Escalation")'],
        ['Registry status issue', 'support@kairologic.net (subject: "Registry Update")'],
        ['Request a re-scan', 'kairologic.com \u2014 Scan section (immediate)'],
        ['Upgrade to Sentry Watch monitoring', 'kairologic.com \u2014 Services page'],
        ['Legal questions (SB 1188 / HB 149)', 'Consult your practice attorney'],
    ]
    for need, contact in support:
        support_rows.append([
            Paragraph(need, CS),
            Paragraph(contact, CS),
        ])

    spt = Table(support_rows, colWidths=[2.4 * inch, 3.4 * inch])
    spt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(spt)

    e.append(Spacer(1, 16))

    # Sign-off
    e.append(Paragraph('Roadmap Completion Sign-Off', S['h2']))
    for label in ['Practice Manager Name:', 'Signature:', 'Date Roadmap Completed:', 'Next Quarterly Audit Date:']:
        e.append(Paragraph(label, S['sig_label']))
        e.append(HRFlowable(width='60%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        e.append(Spacer(1, 8))

    return e


def main():
    
    # Accept --output CLI arg
    output = None
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output = sys.argv[i + 1]
            import os
            os.makedirs(os.path.dirname(output) or '.', exist_ok=True)
    if not output:
        output = '/mnt/user-data/outputs/Compliance_Roadmap.pdf'

    doc = SimpleDocTemplate(output, pagesize=letter,
        topMargin=0.85*inch, bottomMargin=0.7*inch,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        title='30-Day Compliance Roadmap \u2014 Path to Sovereign Verification',
        author='KairoLogic Compliance Division',
        subject='SB 1188 + HB 149 30-Day Implementation Roadmap')

    story = []
    story.extend(build_cover())
    story.extend(build_phase1())
    story.extend(build_maintenance())

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'PDF generated: {output}')
    print(f'File size: {os.path.getsize(output) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
