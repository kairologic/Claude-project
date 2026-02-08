import sys
#!/usr/bin/env python3
"""
KairoLogic SB 1188 Data Sovereignty & Residency Policy Pack
Professional compliance document with authoritative legal formatting
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
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os

# ═══ COLORS ═══
NAVY = HexColor('#0B1E3D')
NAVY_LIGHT = HexColor('#1A3A5F')
GOLD = HexColor('#D4A574')
GOLD_DARK = HexColor('#B88F5F')
ORANGE = HexColor('#FF6B35')
WHITE = HexColor('#FFFFFF')
GRAY_100 = HexColor('#F3F4F6')
GRAY_200 = HexColor('#E5E7EB')
GRAY_500 = HexColor('#6B7280')
GRAY_700 = HexColor('#374151')
GRAY_900 = HexColor('#111827')
RED_600 = HexColor('#DC2626')
GREEN_600 = HexColor('#059669')

# ═══ STYLES ═══
styles = {}

styles['title'] = ParagraphStyle('Title',
    fontName='Helvetica-Bold', fontSize=22, leading=28,
    textColor=NAVY, spaceAfter=6, alignment=TA_LEFT)

styles['subtitle'] = ParagraphStyle('Subtitle',
    fontName='Helvetica', fontSize=11, leading=15,
    textColor=GRAY_500, spaceAfter=20, alignment=TA_LEFT)

styles['h1'] = ParagraphStyle('H1',
    fontName='Helvetica-Bold', fontSize=14, leading=20,
    textColor=NAVY, spaceBefore=24, spaceAfter=10, alignment=TA_LEFT)

styles['h2'] = ParagraphStyle('H2',
    fontName='Helvetica-Bold', fontSize=11, leading=16,
    textColor=NAVY_LIGHT, spaceBefore=18, spaceAfter=8, alignment=TA_LEFT)

styles['body'] = ParagraphStyle('Body',
    fontName='Helvetica', fontSize=10, leading=15,
    textColor=GRAY_700, spaceAfter=8, alignment=TA_JUSTIFY)

styles['body_bold'] = ParagraphStyle('BodyBold',
    fontName='Helvetica-Bold', fontSize=10, leading=15,
    textColor=GRAY_900, spaceAfter=8, alignment=TA_JUSTIFY)

styles['bullet'] = ParagraphStyle('Bullet',
    fontName='Helvetica', fontSize=10, leading=15,
    textColor=GRAY_700, spaceAfter=4, leftIndent=24,
    bulletIndent=12, bulletFontSize=10, alignment=TA_LEFT)

styles['sub_bullet'] = ParagraphStyle('SubBullet',
    fontName='Helvetica', fontSize=9.5, leading=14,
    textColor=GRAY_700, spaceAfter=3, leftIndent=42,
    bulletIndent=30, bulletFontSize=9, alignment=TA_LEFT)

styles['callout'] = ParagraphStyle('Callout',
    fontName='Helvetica-Oblique', fontSize=9.5, leading=14,
    textColor=NAVY, spaceAfter=6, leftIndent=12, alignment=TA_LEFT)

styles['footer'] = ParagraphStyle('Footer',
    fontName='Helvetica', fontSize=7.5, leading=10,
    textColor=GRAY_500, alignment=TA_CENTER)

styles['section_num'] = ParagraphStyle('SectionNum',
    fontName='Helvetica-Bold', fontSize=9, leading=12,
    textColor=GOLD_DARK, spaceAfter=2, alignment=TA_LEFT)

styles['sig_label'] = ParagraphStyle('SigLabel',
    fontName='Helvetica', fontSize=9, leading=13,
    textColor=GRAY_500, spaceAfter=2, alignment=TA_LEFT)

styles['sig_line'] = ParagraphStyle('SigLine',
    fontName='Helvetica', fontSize=10, leading=14,
    textColor=GRAY_700, spaceAfter=16, alignment=TA_LEFT)

styles['small'] = ParagraphStyle('Small',
    fontName='Helvetica', fontSize=8.5, leading=12,
    textColor=GRAY_500, spaceAfter=4, alignment=TA_LEFT)

styles['toc_item'] = ParagraphStyle('TOCItem',
    fontName='Helvetica', fontSize=10, leading=18,
    textColor=NAVY, spaceAfter=2, alignment=TA_LEFT)


def header_footer(canvas_obj, doc):
    """Draw header and footer on each page"""
    canvas_obj.saveState()
    w, h = letter
    page_num = doc.page

    # Header bar
    canvas_obj.setFillColor(NAVY)
    canvas_obj.rect(0, h - 42, w, 42, fill=True, stroke=False)

    # Gold accent line
    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, h - 44, w, 2, fill=True, stroke=False)

    # Header text
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawString(0.75 * inch, h - 28, 'KAIROLOGIC')
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(GOLD)
    canvas_obj.drawString(1.72 * inch, h - 28, '|  DATA SOVEREIGNTY POLICY PACK')

    canvas_obj.setFillColor(HexColor('#8899AA'))
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(w - 0.75 * inch, h - 28, 'SB 1188 COMPLIANCE  |  CONFIDENTIAL')

    # Footer
    canvas_obj.setFillColor(GRAY_200)
    canvas_obj.rect(0, 0, w, 36, fill=True, stroke=False)

    canvas_obj.setFillColor(GOLD)
    canvas_obj.rect(0, 36, w, 1.5, fill=True, stroke=False)

    canvas_obj.setFillColor(GRAY_500)
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(0.75 * inch, 14,
        'KairoLogic  |  Texas Sovereignty Compliance Platform  |  kairologic.com')
    canvas_obj.drawRightString(w - 0.75 * inch, 14, f'Page {page_num}')

    canvas_obj.restoreState()


def build_cover_page():
    """Build cover page elements"""
    elements = []

    elements.append(Spacer(1, 1.2 * inch))

    # Classification banner
    banner_data = [['CONFIDENTIAL  —  INTERNAL COMPLIANCE DOCUMENT']]
    banner = Table(banner_data, colWidths=[5.5 * inch])
    banner.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, -1), GOLD),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 20),
        ('RIGHTPADDING', (0, 0), (-1, -1), 20),
    ]))
    elements.append(banner)
    elements.append(Spacer(1, 0.5 * inch))

    # Title block
    elements.append(Paragraph('DATA SOVEREIGNTY<br/>&amp; RESIDENCY POLICY', styles['title']))
    elements.append(Spacer(1, 4))

    # Gold line
    elements.append(HRFlowable(width='40%', thickness=2.5, color=GOLD,
                               spaceAfter=16, spaceBefore=4, hAlign='LEFT'))

    elements.append(Paragraph('Texas Senate Bill 1188 Compliance Framework', ParagraphStyle(
        'CoverSub', fontName='Helvetica', fontSize=12, leading=16,
        textColor=NAVY_LIGHT, spaceAfter=4)))
    elements.append(Paragraph('The Texas Data Sovereignty Act', ParagraphStyle(
        'CoverSub2', fontName='Helvetica-Oblique', fontSize=10, leading=14,
        textColor=GRAY_500, spaceAfter=24)))

    # Metadata table
    meta = [
        ['Effective Date:', 'February 8, 2026'],
        ['Document Version:', '1.0'],
        ['Classification:', 'Internal — Compliance Use Only'],
        ['Governing Statute:', 'Texas SB 1188 (88th Legislature, R.S.)'],
        ['Companion Statute:', 'Texas HB 149 (AI Transparency)'],
        ['Review Cycle:', 'Quarterly (Next Review: May 2026)'],
        ['Prepared By:', 'KairoLogic Compliance Division'],
    ]
    meta_table = Table(meta, colWidths=[1.6 * inch, 4.0 * inch])
    meta_table.setStyle(TableStyle([
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
    elements.append(meta_table)

    elements.append(Spacer(1, 0.6 * inch))

    # Disclaimer
    disclaimer_data = [[Paragraph(
        '<b>NOTICE:</b> This document constitutes an internal compliance policy adopted pursuant to Texas Senate Bill 1188 '
        '(the Texas Data Sovereignty Act). It establishes binding operational requirements for all personnel, contractors, '
        'and digital service providers engaged by the Practice. Unauthorized distribution of this document is prohibited. '
        'This policy does not constitute legal advice and should be reviewed by qualified legal counsel.',
        ParagraphStyle('Disc', fontName='Helvetica', fontSize=8, leading=11,
                       textColor=GRAY_700, alignment=TA_JUSTIFY))
    ]]
    disc_table = Table(disclaimer_data, colWidths=[6.0 * inch])
    disc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_100),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    elements.append(disc_table)

    elements.append(PageBreak())
    return elements


def build_toc():
    """Build table of contents"""
    elements = []
    elements.append(Paragraph('TABLE OF CONTENTS', styles['h1']))
    elements.append(HRFlowable(width='100%', thickness=1, color=GRAY_200, spaceAfter=12))

    toc_items = [
        ('1.', 'Purpose & Legislative Authority'),
        ('2.', 'Scope of Applicability'),
        ('3.', 'Definitions'),
        ('4.', 'Domestic Data Residency Requirements'),
        ('5.', 'Prohibited Practices'),
        ('6.', 'Vendor Due Diligence & Certification'),
        ('7.', 'AI Transparency Disclosure (HB 149 Alignment)'),
        ('8.', 'Employee & Contractor Obligations'),
        ('9.', 'Incident Response & Breach Protocol'),
        ('10.', 'Audit, Monitoring & Enforcement'),
        ('11.', 'Safe Harbor Affirmation & Cure Provisions'),
        ('12.', 'Policy Governance & Amendment'),
        ('', 'Appendix A: Vendor Data Sovereignty Certificate'),
        ('', 'Appendix B: Employee Acknowledgment Form'),
        ('', 'Appendix C: Quarterly Audit Checklist'),
    ]
    for num, title in toc_items:
        prefix = f'<b>{num}</b> ' if num else '       '
        elements.append(Paragraph(f'{prefix}{title}', styles['toc_item']))

    elements.append(PageBreak())
    return elements


def section_header(num, title):
    """Create a numbered section header"""
    return [
        Paragraph(f'SECTION {num}', styles['section_num']),
        Paragraph(title, styles['h1']),
        HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10),
    ]


def build_policy_body():
    """Build the full policy body"""
    elements = []

    # ═══ SECTION 1: PURPOSE ═══
    elements.extend(section_header('1', 'PURPOSE & LEGISLATIVE AUTHORITY'))
    elements.append(Paragraph(
        'The purpose of this policy is to establish strict, enforceable guidelines for the residency, processing, '
        'transmission, and storage of Protected Health Information (PHI) and Personal Identifying Information (PII) '
        'in accordance with <b>Texas Senate Bill 1188</b> (the "Texas Data Sovereignty Act"), as enacted by the '
        '88th Texas Legislature, Regular Session.',
        styles['body']))
    elements.append(Paragraph(
        'This organization is committed to ensuring that all digital patient data remains exclusively within the '
        'continental United States at all times, across all systems, and through all processing stages. This commitment '
        'protects against foreign data exploitation, ensures compliance with state-mandated data residency requirements, '
        'and establishes documented "Reasonable Care" necessary for statutory Safe Harbor standing under SB 1188.',
        styles['body']))
    elements.append(Paragraph(
        'This policy further aligns with <b>House Bill 149</b> (AI Transparency) to ensure comprehensive compliance '
        'with Texas digital healthcare regulations enacted during the 88th Legislative Session.',
        styles['body']))

    # ═══ SECTION 2: SCOPE ═══
    elements.extend(section_header('2', 'SCOPE OF APPLICABILITY'))
    elements.append(Paragraph(
        'This policy applies to all individuals and entities that handle, access, store, process, or transmit '
        'data on behalf of the Practice, including but not limited to:',
        styles['body']))

    scope_items = [
        'All full-time, part-time, and temporary employees',
        'Independent contractors and consulting clinicians',
        'Third-party vendors, sub-processors, and digital service providers',
        'Virtual assistants (VAs), whether domestic or offshore',
        'Managed Service Providers (MSPs) and IT support organizations',
        'Cloud infrastructure providers (IaaS, PaaS, SaaS)',
        'AI, machine learning, and automated decision-making tool providers',
        'Website hosting, analytics, and marketing technology vendors',
    ]
    for item in scope_items:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        '<b>Jurisdictional Scope:</b> This policy applies to all data originating from, processed within, or '
        'pertaining to patients located in the State of Texas, regardless of where the Practice\'s systems or '
        'personnel are physically located.',
        styles['body']))

    # ═══ SECTION 3: DEFINITIONS ═══
    elements.extend(section_header('3', 'DEFINITIONS'))
    
    definitions = [
        ('"Protected Health Information" (PHI)', 'Any individually identifiable health information as defined by HIPAA (45 CFR 160.103), including but not limited to patient names, diagnoses, treatment records, billing information, and biometric data.'),
        ('"Personal Identifying Information" (PII)', 'Any data that could reasonably be used to identify an individual, including name, date of birth, Social Security Number, email address, IP address, device identifiers, and geolocation data.'),
        ('"Data Residency"', 'The geographic location where digital data is physically stored, processed, cached, or transmitted, including transient processing and backup replication.'),
        ('"Foreign Adversary Jurisdiction"', 'Any nation or territory designated by the U.S. government as a foreign adversary, including but not limited to: China (including Hong Kong), Russia, Iran, North Korea, Cuba, and the Maduro regime of Venezuela.'),
        ('"Domestic Data Boundary"', 'The continental United States, including all 50 states, the District of Columbia, and U.S. territories where federal data protection laws apply.'),
        ('"Sub-Processor"', 'Any third party engaged by a primary vendor to process, store, or transmit data on behalf of the Practice, including CDN providers, backup services, and AI model inference endpoints.'),
        ('"Shadow IT"', 'Any software, application, cloud service, browser extension, or digital tool used by Practice personnel that has not been formally approved and verified for data sovereignty compliance.'),
        ('"Certificate of Data Sovereignty"', 'A formal attestation from a vendor confirming the physical location of all servers, the legal jurisdiction of the corporate entity, and the absence of foreign sub-processor routing.'),
    ]
    for term, defn in definitions:
        elements.append(Paragraph(f'<b>{term}</b>', styles['body_bold']))
        elements.append(Paragraph(defn, styles['body']))
        elements.append(Spacer(1, 2))

    # ═══ SECTION 4: DOMESTIC RESIDENCY ═══
    elements.extend(section_header('4', 'DOMESTIC DATA RESIDENCY REQUIREMENTS'))

    elements.append(Paragraph('<b>4.1 General Requirement</b>', styles['h2']))
    elements.append(Paragraph(
        'All digital systems utilized by the Practice must host and process data exclusively on servers and '
        'infrastructure located within the Domestic Data Boundary. This requirement applies at all stages of '
        'data lifecycle management, including:',
        styles['body']))

    lifecycle = [
        'Collection and intake (website forms, patient portals, intake kiosks)',
        'Processing and computation (clinical decision support, billing, scheduling)',
        'Storage at rest (primary databases, backups, archives, disaster recovery)',
        'Transmission in transit (API calls, email routing, file transfers)',
        'Caching and edge processing (CDN nodes, edge computing, load balancers)',
        'Disposal and deletion (secure erasure, media destruction)',
    ]
    for item in lifecycle:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    elements.append(Spacer(1, 8))
    elements.append(Paragraph('<b>4.2 Covered Systems</b>', styles['h2']))
    elements.append(Paragraph(
        'The following system categories must demonstrate verified domestic data residency:',
        styles['body']))

    systems_data = [
        ['System Category', 'Examples', 'Residency Verification'],
        ['Electronic Medical Records', 'Epic, Athenahealth, DrChrono, Kareo', 'Annual vendor attestation'],
        ['Patient Portals', 'MyChart, FollowMyHealth, custom portals', 'Server IP geolocation audit'],
        ['Practice Management', 'Dentrix, NextGen, AdvancedMD', 'Vendor data residency certificate'],
        ['Website & Intake Forms', 'WordPress, Jotform, Typeform, custom', 'DNS + hosting verification'],
        ['Communication Tools', 'Email servers, telehealth, patient SMS', 'MX record + routing analysis'],
        ['AI & Automation', 'Chatbots, transcription, clinical AI', 'Model hosting + API endpoint audit'],
        ['Billing & Revenue Cycle', 'Waystar, Availity, Change Healthcare', 'Processing location attestation'],
        ['Imaging & Diagnostics', 'PACS, cloud radiology, pathology AI', 'Storage + processing verification'],
        ['Backup & Disaster Recovery', 'Veeam, Datto, cloud backup services', 'Replication target audit'],
    ]
    systems_table = Table(systems_data, colWidths=[1.6*inch, 2.0*inch, 2.4*inch])
    systems_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('TEXTCOLOR', (0, 0), (-1, 0), WHITE),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), GRAY_700),
        ('BACKGROUND', (0, 1), (-1, -1), WHITE),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(systems_table)
    elements.append(Spacer(1, 10))

    # ═══ SECTION 5: PROHIBITED PRACTICES ═══
    elements.extend(section_header('5', 'PROHIBITED PRACTICES'))
    elements.append(Paragraph(
        'The following activities constitute direct violations of this policy and of Texas SB 1188. '
        'Violation may result in disciplinary action, termination, and statutory penalties of up to '
        '<b>$250,000 per incident</b>:',
        styles['body']))

    prohibited = [
        ('5.1 Offshore Data Routing',
         'The use of any digital tool, service, or platform that routes patient data through servers, proxies, '
         'processing centers, or relay nodes located outside the continental United States is strictly prohibited. '
         'This includes "pass-through" routing where data transiently crosses foreign infrastructure, even if '
         'the final storage destination is domestic.'),
        ('5.2 Foreign Cloud Storage',
         'Storage of patient data on cloud instances, virtual machines, object storage buckets, or database '
         'replicas located in non-U.S. regions is a violation of this policy. This applies to all cloud providers '
         'including Amazon Web Services (AWS), Microsoft Azure, Google Cloud Platform (GCP), and any other '
         'infrastructure-as-a-service provider. Cloud regions must be explicitly configured to U.S.-only zones.'),
        ('5.3 Unverified AI & Machine Learning Tools',
         'Staff may not input, upload, or otherwise expose patient data to any artificial intelligence system, '
         'large language model, machine learning tool, or automated transcription service that has not been '
         'forensically verified for domestic data residency. This prohibition specifically includes consumer-grade '
         'AI tools such as non-enterprise ChatGPT, Bard, Claude (non-enterprise), and any foreign-hosted '
         'transcription, translation, or diagnostic AI services.'),
        ('5.4 Unauthorized Communication Channels',
         'Patient data may not be transmitted via personal email accounts, consumer messaging applications '
         '(WhatsApp, Telegram, WeChat, Signal), social media direct messages, or any communication platform '
         'that has not been approved by the Practice for HIPAA-compliant, domestically-hosted communication.'),
        ('5.5 Shadow IT',
         'The installation, use, or configuration of any software, browser extension, mobile application, or '
         'cloud service that has not been formally approved by Practice IT administration and verified for '
         'data sovereignty compliance is prohibited. This includes free-tier SaaS products, trial software, '
         'and browser-based tools.'),
    ]
    for title, desc in prohibited:
        elements.append(Paragraph(f'<b>{title}</b>', styles['h2']))
        elements.append(Paragraph(desc, styles['body']))

    # ═══ SECTION 6: VENDOR DUE DILIGENCE ═══
    elements.extend(section_header('6', 'VENDOR DUE DILIGENCE & CERTIFICATION'))

    elements.append(Paragraph(
        'Before engaging any new digital vendor, service provider, or sub-processor, the Practice Manager '
        'or designated compliance officer must complete the following due diligence process:',
        styles['body']))

    elements.append(Paragraph('<b>6.1 Certificate of Data Sovereignty</b>', styles['h2']))
    elements.append(Paragraph(
        'Every vendor that processes, stores, or transmits patient data must provide a signed Certificate of '
        'Data Sovereignty confirming:',
        styles['body']))

    cert_items = [
        'The physical address and geographic coordinates of all primary and backup data centers',
        'The legal jurisdiction and country of incorporation of the parent company and all subsidiaries',
        'Written confirmation that no sub-processors, CDN nodes, or processing endpoints route data outside the United States',
        'The specific cloud regions and availability zones in use, with contractual guarantees against automatic failover to non-U.S. regions',
        'Data encryption standards in transit (TLS 1.2+) and at rest (AES-256 or equivalent)',
    ]
    for item in cert_items:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph('<b>6.2 Vendor Risk Classification</b>', styles['h2']))

    risk_data = [
        ['Risk Tier', 'Data Access Level', 'Verification Requirement', 'Review Cycle'],
        ['Critical', 'Direct PHI access (EMR, billing, clinical AI)', 'Full forensic audit + Certificate', 'Quarterly'],
        ['High', 'Indirect PHI access (email, analytics, CDN)', 'Certificate + IP geolocation check', 'Semi-annually'],
        ['Moderate', 'PII only (scheduling, marketing, CRM)', 'Written attestation + contract review', 'Annually'],
        ['Low', 'No patient data (office supplies, facilities)', 'Standard procurement process', 'As needed'],
    ]
    risk_table = Table(risk_data, colWidths=[0.9*inch, 2.0*inch, 1.9*inch, 1.2*inch])
    risk_table.setStyle(TableStyle([
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
        # Highlight critical row
        ('TEXTCOLOR', (0, 1), (0, 1), RED_600),
        ('FONTNAME', (0, 1), (0, 1), 'Helvetica-Bold'),
    ]))
    elements.append(risk_table)

    # ═══ SECTION 7: AI TRANSPARENCY ═══
    elements.extend(section_header('7', 'AI TRANSPARENCY DISCLOSURE (HB 149 ALIGNMENT)'))
    elements.append(Paragraph(
        'In alignment with <b>House Bill 149</b> (AI Transparency in Healthcare), the Practice shall maintain '
        'the following disclosures and operational controls:',
        styles['body']))

    ai_items = [
        ('7.1 Public-Facing Disclosure', 'If AI, machine learning, or automated decision-making tools are used to interact with patients, process clinical data, triage inquiries, or generate treatment recommendations, the Practice must maintain a clearly visible public disclosure on its website and in patient-facing materials. This disclosure must explicitly state: (a) the purpose and scope of AI usage, (b) confirmation of domestic data residency compliance, and (c) the patient\'s right to request human review of any AI-generated recommendation.'),
        ('7.2 AI System Inventory', 'The Practice shall maintain a current inventory of all AI and automated systems in use, including the vendor name, processing location, data inputs, and decision-making scope. This inventory must be reviewed quarterly and updated within 72 hours of any system addition or change.'),
        ('7.3 Clinical AI Governance', 'Any AI system that influences clinical decision-making must be supervised by a licensed healthcare professional. Fully autonomous clinical decisions by AI systems are prohibited without explicit physician oversight and documented approval workflows.'),
    ]
    for title, desc in ai_items:
        elements.append(Paragraph(f'<b>{title}</b>', styles['h2']))
        elements.append(Paragraph(desc, styles['body']))

    # ═══ SECTION 8: EMPLOYEE OBLIGATIONS ═══
    elements.extend(section_header('8', 'EMPLOYEE & CONTRACTOR OBLIGATIONS'))
    elements.append(Paragraph(
        'All employees, contractors, and temporary staff with access to patient data must:',
        styles['body']))

    emp_items = [
        'Complete data sovereignty awareness training within 30 days of hire and annually thereafter',
        'Sign the Employee Data Sovereignty Acknowledgment (Appendix B) prior to accessing any patient data system',
        'Report any suspected data sovereignty violation, unauthorized tool usage, or shadow IT to the Practice Manager or Compliance Officer within 24 hours of discovery',
        'Use only Practice-approved devices, applications, and communication channels for patient data',
        'Refrain from downloading, copying, or transmitting patient data to personal devices, accounts, or cloud storage',
        'Cooperate fully with quarterly compliance audits and provide access to work devices upon request',
    ]
    for item in emp_items:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    # ═══ SECTION 9: INCIDENT RESPONSE ═══
    elements.extend(section_header('9', 'INCIDENT RESPONSE & BREACH PROTOCOL'))
    elements.append(Paragraph(
        'In the event that patient data is discovered to have been routed, stored, or processed outside the '
        'Domestic Data Boundary — whether through vendor failure, system misconfiguration, or unauthorized '
        'staff action — the following protocol shall be initiated:',
        styles['body']))

    incident_data = [
        ['Phase', 'Timeline', 'Actions Required'],
        ['Detection', 'Within 1 hour', 'Isolate affected system. Document the data exposure scope. Notify Practice Manager.'],
        ['Assessment', 'Within 4 hours', 'Determine data types exposed, volume, duration, and foreign jurisdictions involved.'],
        ['Containment', 'Within 24 hours', 'Terminate foreign data routing. Revoke vendor access if applicable. Secure backup copies.'],
        ['Notification', 'Within 72 hours', 'Notify affected patients per HIPAA Breach Notification Rule. Notify Texas Attorney General if 500+ records affected.'],
        ['Remediation', 'Within 30 days', 'Implement corrective controls. Update vendor agreements. Conduct root cause analysis.'],
        ['Documentation', 'Within 45 days', 'Complete incident report. Update risk register. File amended BAA if applicable.'],
    ]
    incident_table = Table(incident_data, colWidths=[1.1*inch, 1.2*inch, 3.7*inch])
    incident_table.setStyle(TableStyle([
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
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(incident_table)

    # ═══ SECTION 10: AUDIT & ENFORCEMENT ═══
    elements.extend(section_header('10', 'AUDIT, MONITORING & ENFORCEMENT'))

    elements.append(Paragraph('<b>10.1 Continuous Monitoring</b>', styles['h2']))
    elements.append(Paragraph(
        'The Practice will undergo quarterly <b>Sentry Watch</b> compliance scans to verify that no new '
        'third-party scripts, plugins, CDN configurations, or shadow IT have introduced offshore data routing. '
        'These automated forensic scans analyze DNS records, IP geolocation, HTTP headers, TLS certificates, '
        'and embedded resource origins.',
        styles['body']))

    elements.append(Paragraph('<b>10.2 Annual Forensic Audit</b>', styles['h2']))
    elements.append(Paragraph(
        'An annual comprehensive forensic audit shall be conducted, encompassing full vendor re-certification, '
        'infrastructure mapping, AI system inventory review, and staff compliance verification. Results shall be '
        'documented in the annual Sovereignty Audit Report.',
        styles['body']))

    elements.append(Paragraph('<b>10.3 Enforcement & Disciplinary Action</b>', styles['h2']))
    elements.append(Paragraph(
        'Any employee, contractor, or vendor found to be in violation of this policy shall be subject to:',
        styles['body']))

    enforcement = [
        '<b>First Offense:</b> Written warning, mandatory retraining within 7 days, and supervised system access for 90 days',
        '<b>Second Offense:</b> Suspension of system access, formal disciplinary action, and escalation to Practice leadership',
        '<b>Third Offense or Willful Violation:</b> Termination of employment or contract, with potential referral to legal counsel for statutory liability assessment',
        '<b>Vendor Violation:</b> Immediate contract suspension, cessation of data processing, and formal cure notice with 30-day remediation deadline',
    ]
    for item in enforcement:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    # ═══ SECTION 11: SAFE HARBOR ═══
    elements.extend(section_header('11', 'SAFE HARBOR AFFIRMATION & CURE PROVISIONS'))

    # Safe Harbor box
    sh_content = Paragraph(
        '<b>SAFE HARBOR DECLARATION</b><br/><br/>'
        'By adopting, maintaining, and actively enforcing this Data Sovereignty &amp; Residency Policy, the Practice '
        'hereby affirms its intent to comply with Texas Senate Bill 1188 (the Texas Data Sovereignty Act) and '
        'demonstrates "Reasonable Care" as defined under the statute\'s Safe Harbor provisions.<br/><br/>'
        'This document, together with quarterly Sentry Watch scan results, vendor Certificates of Data Sovereignty, '
        'employee acknowledgments, and annual audit reports, constitutes the Practice\'s evidentiary portfolio of '
        'compliance — serving as primary evidence in the event of a state-level inquiry, regulatory audit, or '
        'Cure Notice under SB 1188.',
        ParagraphStyle('SH', fontName='Helvetica', fontSize=9.5, leading=14,
                       textColor=NAVY, alignment=TA_JUSTIFY))

    sh_table = Table([[sh_content]], colWidths=[5.8 * inch])
    sh_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor('#FFF8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('BOX', (0, 0), (-1, -1), 2, GOLD),
    ]))
    elements.append(sh_table)
    elements.append(Spacer(1, 10))

    elements.append(Paragraph(
        '<b>Cure Provisions:</b> In the event that a data sovereignty violation is detected through internal '
        'monitoring, external audit, or regulatory inquiry, the Practice shall initiate remediation within '
        '72 hours and complete corrective action within the cure period specified by the applicable enforcement '
        'authority. Documentation of the cure process shall be retained for a minimum of six (6) years.',
        styles['body']))

    # ═══ SECTION 12: GOVERNANCE ═══
    elements.extend(section_header('12', 'POLICY GOVERNANCE & AMENDMENT'))
    elements.append(Paragraph(
        'This policy shall be reviewed and updated <b>quarterly</b> or upon any of the following triggering events:',
        styles['body']))

    gov_items = [
        'Amendment or reinterpretation of Texas SB 1188 or HB 149 by the Texas Legislature or Attorney General',
        'Introduction of new federal data residency or AI governance legislation',
        'Material change in the Practice\'s digital infrastructure, vendor relationships, or AI tool usage',
        'Occurrence of a data sovereignty incident or near-miss event',
        'Annual audit findings that require policy clarification or strengthening',
    ]
    for item in gov_items:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        'All amendments must be approved by the Practice Owner or designated Compliance Officer and '
        'communicated to all covered personnel within 14 days of adoption.',
        styles['body']))

    elements.append(PageBreak())
    return elements


def build_signature_page():
    """Build the execution/signature page"""
    elements = []
    elements.append(Paragraph('POLICY EXECUTION', styles['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=16))

    elements.append(Paragraph(
        'By signing below, the undersigned acknowledges that they have read, understand, and agree to enforce '
        'the Data Sovereignty &amp; Residency Policy as set forth in this document. This signature constitutes '
        'binding adoption of the policy on behalf of the Practice.',
        styles['body']))
    elements.append(Spacer(1, 30))

    sig_fields = [
        ('Practice Owner / Authorized Officer', 'Print name of authorized signatory'),
        ('Signature', ''),
        ('Title / Position', ''),
        ('Date of Execution', ''),
    ]
    for label, hint in sig_fields:
        elements.append(Paragraph(label, styles['sig_label']))
        elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        if hint:
            elements.append(Paragraph(hint, styles['small']))
        elements.append(Spacer(1, 12))

    elements.append(Spacer(1, 20))

    # Witness
    elements.append(Paragraph('<b>Witness / Compliance Officer (Optional)</b>', styles['body_bold']))
    elements.append(Spacer(1, 8))
    for label in ['Name', 'Signature', 'Date']:
        elements.append(Paragraph(label, styles['sig_label']))
        elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        elements.append(Spacer(1, 10))

    elements.append(PageBreak())
    return elements


def build_appendices():
    """Build appendix pages"""
    elements = []

    # ═══ APPENDIX A ═══
    elements.append(Paragraph('APPENDIX A', styles['section_num']))
    elements.append(Paragraph('Vendor Data Sovereignty Certificate', styles['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=12))

    elements.append(Paragraph(
        'This certificate is to be completed by each vendor that processes, stores, or transmits patient data '
        'on behalf of the Practice. Return the completed certificate to the Practice Compliance Officer prior '
        'to contract execution or renewal.',
        styles['body']))
    elements.append(Spacer(1, 12))

    cert_fields = [
        'Vendor Legal Name:',
        'Parent Company (if applicable):',
        'Country of Incorporation:',
        'Primary Data Center Location (City, State):',
        'Backup/DR Data Center Location (City, State):',
        'Cloud Provider & Region (e.g., AWS us-east-1):',
        'Sub-Processors Used (list all):',
    ]
    for field in cert_fields:
        elements.append(Paragraph(field, styles['sig_label']))
        elements.append(HRFlowable(width='90%', thickness=0.5, color=GRAY_200, spaceAfter=2, hAlign='LEFT'))
        elements.append(Spacer(1, 8))

    elements.append(Spacer(1, 12))

    attestation = Paragraph(
        '<b>ATTESTATION:</b> I hereby certify that all data processed on behalf of the above-named Practice '
        'is stored and processed exclusively within the continental United States. No sub-processors, CDN nodes, '
        'caching layers, or processing endpoints route data outside the U.S. Domestic Data Boundary as defined '
        'by Texas SB 1188. I understand that providing false information in this certificate may result in '
        'immediate contract termination and potential statutory liability.',
        ParagraphStyle('Att', fontName='Helvetica', fontSize=9, leading=13,
                       textColor=GRAY_700, alignment=TA_JUSTIFY))
    att_table = Table([[attestation]], colWidths=[5.8 * inch])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_100),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(att_table)
    elements.append(Spacer(1, 16))

    for label in ['Vendor Authorized Signatory:', 'Title:', 'Date:', 'Signature:']:
        elements.append(Paragraph(label, styles['sig_label']))
        elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        elements.append(Spacer(1, 8))

    elements.append(PageBreak())

    # ═══ APPENDIX B ═══
    elements.append(Paragraph('APPENDIX B', styles['section_num']))
    elements.append(Paragraph('Employee Data Sovereignty Acknowledgment', styles['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=12))

    elements.append(Paragraph(
        'I, the undersigned, acknowledge that I have received, read, and understand the Practice\'s Data '
        'Sovereignty &amp; Residency Policy (Version 1.0, Effective February 8, 2026). I agree to:',
        styles['body']))

    ack_items = [
        'Comply with all provisions of the policy, including the prohibition on offshore data routing, unauthorized AI tools, and shadow IT',
        'Use only Practice-approved devices, applications, and communication channels when handling patient data',
        'Report any suspected data sovereignty violation to the Compliance Officer within 24 hours',
        'Complete annual data sovereignty training as required',
        'Cooperate fully with compliance audits and system access reviews',
    ]
    for item in ack_items:
        elements.append(Paragraph(f'\u2022  {item}', styles['bullet']))

    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        'I understand that violation of this policy may result in disciplinary action up to and including '
        'termination, and may expose both myself and the Practice to statutory penalties under Texas law.',
        styles['body']))
    elements.append(Spacer(1, 16))

    for label in ['Employee Name (Print):', 'Employee Signature:', 'Position / Department:', 'Date:']:
        elements.append(Paragraph(label, styles['sig_label']))
        elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        elements.append(Spacer(1, 10))

    elements.append(PageBreak())

    # ═══ APPENDIX C ═══
    elements.append(Paragraph('APPENDIX C', styles['section_num']))
    elements.append(Paragraph('Quarterly Compliance Audit Checklist', styles['h1']))
    elements.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=12))

    elements.append(Paragraph('Audit Period: ___________________    Auditor: ___________________', styles['body']))
    elements.append(Spacer(1, 10))

    checklist_data = [
        ['#', 'Audit Item', 'Status', 'Notes'],
        ['1', 'Sentry Watch scan completed — no offshore data routing detected', '', ''],
        ['2', 'All vendor Certificates of Data Sovereignty current and on file', '', ''],
        ['3', 'AI system inventory reviewed and updated', '', ''],
        ['4', 'Employee acknowledgment forms current for all active staff', '', ''],
        ['5', 'Website hosting and DNS verified as domestic-only', '', ''],
        ['6', 'Email (MX) routing verified — no foreign relay servers', '', ''],
        ['7', 'Cloud infrastructure regions verified (no non-U.S. zones)', '', ''],
        ['8', 'Third-party scripts and plugins audited for data residency', '', ''],
        ['9', 'Telehealth platform verified for domestic processing', '', ''],
        ['10', 'HB 149 AI disclosure visible and accurate on website', '', ''],
        ['11', 'Shadow IT sweep completed — no unauthorized tools detected', '', ''],
        ['12', 'Incident log reviewed — all incidents resolved within SLA', '', ''],
        ['13', 'Policy version current — no amendments pending', '', ''],
        ['14', 'Staff training completion rate at or above 100%', '', ''],
    ]
    cl_table = Table(checklist_data, colWidths=[0.4*inch, 3.4*inch, 0.9*inch, 1.3*inch])
    cl_table.setStyle(TableStyle([
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
    elements.append(cl_table)
    elements.append(Spacer(1, 16))

    elements.append(Paragraph('Audit Result:   [  ] COMPLIANT    [  ] NON-COMPLIANT    [  ] REMEDIATION REQUIRED', styles['body_bold']))
    elements.append(Spacer(1, 16))

    for label in ['Auditor Signature:', 'Date:', 'Practice Manager Acknowledgment:', 'Date:']:
        elements.append(Paragraph(label, styles['sig_label']))
        elements.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        elements.append(Spacer(1, 8))

    return elements


def main():
    output_path = '/mnt/user-data/outputs/SB1188_Data_Sovereignty_Policy_Pack.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.85 * inch,
        bottomMargin=0.7 * inch,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        title='Data Sovereignty & Residency Policy — SB 1188 Compliance',
        author='KairoLogic Compliance Division',
        subject='Texas SB 1188 Data Sovereignty Policy Pack',
    )

    story = []
    story.extend(build_cover_page())
    story.extend(build_toc())
    story.extend(build_policy_body())
    story.extend(build_signature_page())
    story.extend(build_appendices())

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'PDF generated: {output_path}')
    print(f'File size: {os.path.getsize(output_path) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
