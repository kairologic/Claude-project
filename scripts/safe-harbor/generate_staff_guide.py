import sys
#!/usr/bin/env python3
"""
KairoLogic Staff Training Guide
Digital Sovereignty & Patient Privacy Standards
SB 1188 / HB 149 Compliance Training
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
S['title'] = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=22, leading=28, textColor=NAVY, spaceAfter=6)
S['h1'] = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=14, leading=20, textColor=NAVY, spaceBefore=20, spaceAfter=10)
S['h2'] = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceBefore=14, spaceAfter=6)
S['h3'] = ParagraphStyle('H3', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=NAVY, spaceBefore=10, spaceAfter=4)
S['body'] = ParagraphStyle('Body', fontName='Helvetica', fontSize=10, leading=15, textColor=GRAY_700, spaceAfter=8, alignment=TA_JUSTIFY)
S['body_bold'] = ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=GRAY_900, spaceAfter=8, alignment=TA_JUSTIFY)
S['module_num'] = ParagraphStyle('ModNum', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=GOLD_DARK, spaceAfter=2)
S['sig_label'] = ParagraphStyle('SigLabel', fontName='Helvetica', fontSize=9, leading=13, textColor=GRAY_500, spaceAfter=2)
S['small'] = ParagraphStyle('Small', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY_500, spaceAfter=4)
S['toc_item'] = ParagraphStyle('TOCItem', fontName='Helvetica', fontSize=10, leading=18, textColor=NAVY, spaceAfter=2)

# Cell styles
CS = ParagraphStyle('CS', fontName='Helvetica', fontSize=8.5, leading=12, textColor=GRAY_700)
CS_BOLD = ParagraphStyle('CSB', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=NAVY)
CS_HDR = ParagraphStyle('CSH', fontName='Helvetica-Bold', fontSize=8, leading=11, textColor=WHITE)
CS_RED = ParagraphStyle('CSR', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=RED_700)
CS_GREEN = ParagraphStyle('CSG', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=GREEN_700)


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
    c.drawString(1.72 * inch, h - 28, '|  STAFF TRAINING GUIDE')
    c.setFillColor(HexColor('#8899AA'))
    c.setFont('Helvetica', 7)
    c.drawRightString(w - 0.75 * inch, h - 28, 'SB 1188 + HB 149  |  INTERNAL USE ONLY')
    c.setFillColor(GRAY_200)
    c.rect(0, 0, w, 36, fill=True, stroke=False)
    c.setFillColor(GOLD)
    c.rect(0, 36, w, 1.5, fill=True, stroke=False)
    c.setFillColor(GRAY_500)
    c.setFont('Helvetica', 7)
    c.drawString(0.75 * inch, 14, 'KairoLogic  |  Staff Training Guide  |  CONFIDENTIAL \u2014 Internal Use Only')
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


def warning_box(text):
    return styled_box(f'<b>WARNING:</b> {text}', RED_50, RED_600, RED_700)


def tip_box(title, text):
    return styled_box(f'<b>{title}</b><br/>{text}', HexColor('#FFF8F0'), GOLD, NAVY)


def key_point_box(text):
    return styled_box(f'<b>KEY POINT:</b> {text}', BLUE_50, BLUE_600, NAVY)


def module_header(num, title):
    return [
        Paragraph(f'MODULE {num}', S['module_num']),
        Paragraph(title, S['h1']),
        HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=10),
    ]


def scenario_box(title, body):
    content = Paragraph(
        f'<b>{title}</b><br/><br/>{body}',
        ParagraphStyle('Scen', fontName='Helvetica', fontSize=9.5, leading=14, textColor=WHITE, alignment=TA_LEFT))
    t = Table([[content]], colWidths=[5.8 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), NAVY),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))
    return t


# ═══════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════

def build_cover():
    e = []
    e.append(Spacer(1, 1.0 * inch))

    banner = Table([['STAFF TRAINING GUIDE  |  INTERNAL USE ONLY']], colWidths=[5.5 * inch])
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

    e.append(Paragraph('Digital Sovereignty &amp;<br/>Patient Privacy Standards', S['title']))
    e.append(Spacer(1, 4))
    e.append(HRFlowable(width='40%', thickness=2.5, color=GOLD, spaceAfter=16, hAlign='LEFT'))

    e.append(Paragraph(
        'Mandatory compliance training for all employees, contractors, and temporary staff '
        'with access to patient data. Covers Texas Senate Bill 1188 (Data Sovereignty) and '
        'House Bill 149 (AI Transparency) requirements, prohibited tools, approved workflows, '
        'and incident reporting procedures.',
        ParagraphStyle('CovSub', fontName='Helvetica', fontSize=11, leading=16, textColor=NAVY_LIGHT, spaceAfter=24)))

    time_p = Paragraph(
        '<b>TRAINING DURATION: 15 MINUTES</b><br/>'
        'This guide is designed for front-office staff, clinical assistants, billing teams, and any '
        'personnel who handle patient information in any form \u2014 digital or physical.',
        ParagraphStyle('Time', fontName='Helvetica', fontSize=9.5, leading=14, textColor=GREEN_700))
    time_t = Table([[time_p]], colWidths=[5.5 * inch])
    time_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GREEN_50),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('BOX', (0, 0), (-1, -1), 1.5, GREEN_600),
    ]))
    e.append(time_t)
    e.append(Spacer(1, 0.25 * inch))

    meta = [
        ['Subject:', 'Digital Sovereignty & Patient Privacy Standards'],
        ['Governing Statutes:', 'Texas SB 1188 (Data Sovereignty) + HB 149 (AI Transparency)'],
        ['Audience:', 'All staff with patient data access'],
        ['Frequency:', 'Required at hire; annual refresher thereafter'],
        ['Version:', '1.0 \u2014 February 2026'],
        ['Prepared By:', 'KairoLogic Compliance Division'],
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
    e.append(mt)
    e.append(Spacer(1, 0.3 * inch))

    disc = Paragraph(
        '<b>NOTICE:</b> This training guide contains confidential compliance procedures. '
        'Distribution outside the practice is prohibited. Completion of this training and the '
        'accompanying attestation form is a condition of employment for all staff with access '
        'to patient data systems.',
        ParagraphStyle('D', fontName='Helvetica', fontSize=8, leading=11, textColor=GRAY_700, alignment=TA_JUSTIFY))
    dt = Table([[disc]], colWidths=[6.0 * inch])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_100),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    e.append(dt)
    e.append(PageBreak())
    return e


# ═══════════════════════════════════════════════
# TABLE OF CONTENTS
# ═══════════════════════════════════════════════

def build_toc():
    e = []
    e.append(Paragraph('TRAINING MODULES', S['h1']))
    e.append(HRFlowable(width='100%', thickness=1, color=GRAY_200, spaceAfter=12))

    items = [
        ('Module 1:', 'The Core Rule \u2014 What Is Data Sovereignty?'),
        ('Module 2:', 'The Prohibited Tools List \u2014 Common Data Leaks'),
        ('Module 3:', 'Working with AI \u2014 HB 149 Transparency Rules'),
        ('Module 4:', 'The 3-Step Vendor Check \u2014 Before You Sign Up'),
        ('Module 5:', 'Reporting a Data Leak \u2014 What to Do If Something Goes Wrong'),
        ('Module 6:', 'Real-World Scenarios \u2014 Test Your Knowledge'),
        ('Module 7:', 'Quick Reference Card \u2014 Print &amp; Post'),
        ('', 'Staff Attestation Form'),
    ]
    for num, title in items:
        prefix = f'<b>{num}</b> ' if num else '        '
        e.append(Paragraph(f'{prefix}{title}', S['toc_item']))
    e.append(PageBreak())
    return e


# ═══════════════════════════════════════════════
# MODULES 1-7
# ═══════════════════════════════════════════════

def build_modules():
    e = []

    # ═══ MODULE 1: CORE RULE ═══
    e.extend(module_header('1', 'The Core Rule \u2014 What Is Data Sovereignty?'))

    e.append(Paragraph(
        'Starting in 2026, Texas law requires that <b>all patient information</b> \u2014 medical records, '
        'appointment details, billing data, even text messages about scheduling \u2014 must stay within '
        'the United States at all times. This isn\'t just a HIPAA issue. It\'s a <b>Data Sovereignty</b> issue, '
        'governed by a new state law called <b>Senate Bill 1188</b>.',
        S['body']))

    e.append(key_point_box(
        'If <b>any</b> digital tool you use at work processes patient data outside the U.S. \u2014 '
        'even briefly, even accidentally \u2014 our practice could face fines up to '
        '<b>$250,000 per violation</b>. That is not a typo. A quarter of a million dollars. Per incident.'))
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>What does "data sovereignty" mean in plain English?</b>', S['h2']))
    e.append(Paragraph(
        'It means patient data must <b>physically exist on computers located inside the United States</b>. '
        'When you type a patient\'s name into an app, that information travels to a server somewhere. '
        'If that server is in Germany, Ireland, Singapore, or any other foreign country \u2014 even for a '
        'split second \u2014 it violates Texas law.',
        S['body']))

    e.append(Paragraph('<b>Why should I care? I\'m not in IT.</b>', S['h2']))
    e.append(Paragraph(
        'Because most data sovereignty violations don\'t happen in the server room. They happen at the '
        'front desk, in the break room, or on a staff member\'s phone. Someone copies a patient name into '
        'a free AI tool. Someone texts a colleague about a patient on WhatsApp. Someone installs a "helpful" '
        'browser extension. These everyday actions are where violations happen, and under SB 1188, '
        'the practice \u2014 and potentially the individual \u2014 is held responsible.',
        S['body']))

    e.append(Spacer(1, 6))
    e.append(scenario_box(
        'REAL-WORLD EXAMPLE: The Front Desk Shortcut',
        'Maria at the front desk is behind on chart notes. She copies three patients\' visit summaries into '
        'her personal ChatGPT account to "clean them up." ChatGPT processes that text on servers in Ireland. '
        'The data has now left the United States. Under SB 1188, this is a violation \u2014 even though Maria '
        'was trying to be efficient, even though she deleted the conversation afterward, and even though '
        'no harm came to the patients. <b>The violation is the data leaving the country. Period.</b>'))

    # ═══ MODULE 2: PROHIBITED TOOLS ═══
    e.extend(module_header('2', 'The Prohibited Tools List \u2014 Common Data Leaks'))

    e.append(Paragraph(
        'The following tools and behaviors are <b>strictly prohibited</b> for any task involving patient '
        'information. This includes scheduling, notes, billing, messaging, transcription, and any other '
        'activity that touches patient names, dates, conditions, or contact information.',
        S['body']))

    prohibited_rows = [[
        Paragraph('<b>Category</b>', CS_HDR),
        Paragraph('<b>Prohibited Tools</b>', CS_HDR),
        Paragraph('<b>Why It\'s Dangerous</b>', CS_HDR),
    ]]
    prohibited_data = [
        ['Personal AI\nAccounts',
         'ChatGPT (free/personal), Google Gemini, Microsoft Copilot (personal), Claude (free), DeepSeek, any free AI chatbot',
         'Data is processed on global servers. You cannot verify where patient data goes. Free tiers have zero data residency guarantees.'],
        ['Foreign Browser\nExtensions',
         'Grammarly (free), LanguageTool, Google Translate extension, AI writing assistants, "productivity" plugins',
         'These extensions read everything you type \u2014 including patient data in your EMR. Text is sent to foreign servers for processing.'],
        ['Unauthorized\nMessaging',
         'WhatsApp, Telegram, Signal (personal), Facebook Messenger, Instagram DMs, personal iMessage, personal SMS',
         'Messages route through global server clusters. Even "encrypted" apps may store metadata overseas. None are HIPAA-compliant.'],
        ['Personal Email',
         'Gmail (personal), Yahoo Mail, Outlook.com (personal), ProtonMail (personal), any non-practice email',
         'Personal email servers are unverified for data residency. You have no control over where backups are stored.'],
        ['Free Cloud\nStorage',
         'Personal Google Drive, personal Dropbox, personal OneDrive, Box (free), WeTransfer, any file-sharing not approved by practice',
         'Files may replicate to servers outside the U.S. for "global redundancy." Free tiers offer zero residency control.'],
        ['Unapproved AI\nTranscription',
         'Otter.ai (free), Whisper (self-hosted without verification), foreign transcription services, voice-to-text apps',
         'Audio containing patient information is processed on unknown servers. Transcription AI often trains on your data.'],
    ]
    for cat, tools, why in prohibited_data:
        prohibited_rows.append([
            Paragraph(f'<b>{cat}</b>', CS_RED),
            Paragraph(tools, CS),
            Paragraph(why, CS),
        ])

    pt = Table(prohibited_rows, colWidths=[1.1 * inch, 2.3 * inch, 2.4 * inch])
    pt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(pt)
    e.append(Spacer(1, 8))

    e.append(warning_box(
        'Using <b>any</b> of the tools above for patient-related tasks is a policy violation. '
        'First offense: written warning and mandatory retraining within 7 days. '
        'Second offense: suspension of system access and formal disciplinary action. '
        'Third offense or willful violation: termination.'))
    e.append(Spacer(1, 6))

    e.append(Paragraph('<b>What CAN I use?</b>', S['h2']))
    e.append(Paragraph(
        'Only tools on the practice\'s <b>Approved Software List</b>. If you\'re not sure whether a tool '
        'is approved, <b>ask your Practice Manager or Data Sovereignty Officer before using it</b>. '
        'The 30-second question could save the practice $250,000.',
        S['body']))

    approved_rows = [[
        Paragraph('<b>Function</b>', CS_HDR),
        Paragraph('<b>Approved Tool(s)</b>', CS_HDR),
        Paragraph('<b>Notes</b>', CS_HDR),
    ]]
    approved_data = [
        ['Patient Records', '[Your EMR \u2014 e.g., eClinicalWorks]', 'Only access through practice-issued devices'],
        ['Email', '[Practice email \u2014 e.g., Google Workspace]', 'Never forward patient data to personal email'],
        ['Messaging', '[Practice system \u2014 e.g., Weave]', 'Patient messaging only through approved platform'],
        ['Telehealth', '[Approved platform \u2014 e.g., Doxy.me]', 'HIPAA-compliant, US-hosted video platform'],
        ['AI Transcription', '[If applicable \u2014 e.g., Freed Health]', 'Enterprise version only; verified for US residency'],
        ['File Storage', '[Practice drive \u2014 e.g., Google Drive (Workspace)]', 'Enterprise account with US-only data residency'],
    ]
    for fn, tool, note in approved_data:
        approved_rows.append([
            Paragraph(f'<b>{fn}</b>', CS_BOLD),
            Paragraph(tool, CS),
            Paragraph(note, CS),
        ])

    at = Table(approved_rows, colWidths=[1.3 * inch, 2.2 * inch, 2.3 * inch])
    at.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GREEN_50]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(at)
    e.append(Spacer(1, 6))

    e.append(tip_box('PRACTICE MANAGER NOTE',
        'Customize the "Approved Tool(s)" column above with your specific vendors before distributing '
        'this guide to staff. The approved list should match the vendors documented in your Evidence Ledger.'))

    # ═══ MODULE 3: AI TRANSPARENCY ═══
    e.extend(module_header('3', 'Working with AI \u2014 HB 149 Transparency Rules'))

    e.append(Paragraph(
        'Texas House Bill 149 requires healthcare practices to be <b>transparent</b> with patients about '
        'AI usage. This means if we use AI for anything \u2014 scheduling, transcription, note-taking, '
        'reminders, or clinical support \u2014 patients have the right to know.',
        S['body']))

    e.append(Paragraph('<b>Rule 1: Always Be Honest About AI</b>', S['h2']))
    e.append(Paragraph(
        'If a patient asks "Is this an AI?" or "Did a computer write this?" \u2014 always answer truthfully. '
        'Never deny or hide that AI is being used. Here are sample responses:',
        S['body']))

    script_rows = [[
        Paragraph('<b>Patient Asks...</b>', CS_HDR),
        Paragraph('<b>You Say...</b>', CS_HDR),
    ]]
    scripts = [
        ['"Is this message from a computer?"',
         '"Yes, we use an AI tool to help draft reminders, but a real team member reviews everything before it goes out to you."'],
        ['"Are you using AI on my records?"',
         '"We use a US-based AI transcription tool to help document your visit notes accurately. Your doctor reviews and approves everything before it\'s added to your chart."'],
        ['"I don\'t want AI touching my data."',
         '"Absolutely, I\'ll make a note of that in your chart. You can opt out of specific AI-assisted processes at any time. Your data privacy is our top priority."'],
        ['"Is my data safe?"',
         '"Yes. All our AI tools are verified to keep your data exclusively within the United States. We comply with Texas data sovereignty laws, and your information is protected by HIPAA."'],
    ]
    for q, a in scripts:
        script_rows.append([
            Paragraph(f'<i>{q}</i>', CS),
            Paragraph(a, CS_BOLD),
        ])

    st = Table(script_rows, colWidths=[2.2 * inch, 3.6 * inch])
    st.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, BLUE_50]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(st)
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>Rule 2: Human-in-the-Loop \u2014 AI Never Gets the Final Word</b>', S['h2']))
    e.append(Paragraph(
        'Every piece of content generated by AI \u2014 whether it\'s a clinical note, a patient message, '
        'a billing code suggestion, or a diagnostic insight \u2014 must be <b>reviewed and approved by a '
        'human staff member</b> before it is sent to a patient, entered into a medical record, or used in '
        'any clinical decision. No exceptions.',
        S['body']))

    e.append(key_point_box(
        'AI is a <b>tool</b>, not a decision-maker. Think of it like spell-check: it helps, but you always '
        'read the final version before hitting send. If AI generates something that looks wrong, '
        'override it. You are the quality control.'))

    # ═══ MODULE 4: 3-STEP VENDOR CHECK ═══
    e.extend(module_header('4', 'The 3-Step Vendor Check \u2014 Before You Sign Up for Anything'))

    e.append(Paragraph(
        'Many data leaks start when a well-meaning staff member signs up for a "free trial" of a cool '
        'new app. Before creating an account, downloading software, or entering patient data into '
        '<b>any new tool</b> \u2014 even free ones \u2014 you must get approval. Here\'s how:',
        S['body']))

    e.append(Paragraph('<b>Step 1: STOP. Do not sign up yet.</b>', S['h2']))
    e.append(Paragraph(
        'No matter how useful the tool looks, do not create an account or enter any information until '
        'it has been verified. Free trials collect your data from the moment you register.',
        S['body']))

    e.append(Paragraph('<b>Step 2: Ask the vendor these three questions:</b>', S['h2']))

    q_rows = [[
        Paragraph('<b>#</b>', CS_HDR),
        Paragraph('<b>Question to Ask the Vendor</b>', CS_HDR),
        Paragraph('<b>What You Need to Hear</b>', CS_HDR),
    ]]
    questions = [
        ['1', '"Is your data storage and processing 100% based in the United States?"',
         '"Yes" \u2014 with a specific answer about server locations. Vague answers like "we use secure servers" are not acceptable.'],
        ['2', '"Do you use any offshore sub-processors, CDNs, or AI models hosted outside the U.S.?"',
         '"No" \u2014 with confirmation that ALL processing stays domestic. Watch for phrases like "global infrastructure" which may indicate foreign routing.'],
        ['3', '"Can you provide a written Data Residency Certificate for Texas SB 1188 compliance?"',
         '"Yes" \u2014 a real document confirming U.S.-only data residency. If they say "we\'re HIPAA compliant" instead, that is NOT the same thing.'],
    ]
    for num, q, ans in questions:
        q_rows.append([
            Paragraph(f'<b>{num}</b>', CS_BOLD),
            Paragraph(q, CS),
            Paragraph(ans, CS),
        ])

    qt = Table(q_rows, colWidths=[0.4 * inch, 2.8 * inch, 2.6 * inch])
    qt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_100]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    e.append(qt)
    e.append(Spacer(1, 8))

    e.append(Paragraph('<b>Step 3: Bring the answers to your Practice Manager.</b>', S['h2']))
    e.append(Paragraph(
        'Forward the vendor\'s responses to your Practice Manager or Data Sovereignty Officer. They will '
        'verify the tool, add it to the Evidence Ledger if approved, and give you the go-ahead. '
        'This process typically takes 1-3 business days.',
        S['body']))

    e.append(tip_box('REMEMBER',
        '"HIPAA compliant" and "SB 1188 compliant" are NOT the same thing. HIPAA protects data '
        '<b>security</b>. SB 1188 protects data <b>location</b>. A tool can be perfectly HIPAA-compliant '
        'and still violate Texas law by storing data on a server in Ireland.'))

    # ═══ MODULE 5: REPORTING A LEAK ═══
    e.extend(module_header('5', 'Reporting a Data Leak \u2014 What to Do If Something Goes Wrong'))

    e.append(Paragraph(
        'Mistakes happen. What matters is how quickly you respond. Under Texas law, a practice that '
        '<b>self-reports and remediates</b> a data sovereignty issue within 30 days may qualify for '
        'Safe Harbor protection \u2014 meaning reduced or eliminated penalties. But only if you act fast.',
        S['body']))

    e.append(Paragraph('<b>The 4-Step Incident Response (for any staff member):</b>', S['h2']))

    steps = [
        ('STEP 1: STOP', 'Immediately stop using the tool. Close the app, browser tab, or service. Do not attempt to "clean up" or delete data \u2014 that may destroy evidence needed for the investigation.'),
        ('STEP 2: REPORT', 'Notify your Practice Manager or Data Sovereignty Officer within 1 hour. This is not optional. You will not be punished for honest reporting. You WILL face consequences for covering it up.'),
        ('STEP 3: DOCUMENT', 'Write down: What tool you used, what patient data was involved, when it happened, and how you discovered the issue. Be specific. This will be logged in the Evidence Ledger.'),
        ('STEP 4: COOPERATE', 'Your Practice Manager will initiate the formal incident response process. Cooperate fully with any investigation. The goal is to remediate the issue within 30 days to protect the practice.'),
    ]
    for title, desc in steps:
        step_p = Paragraph(
            f'<b>{title}</b><br/>{desc}',
            ParagraphStyle('Step', fontName='Helvetica', fontSize=9.5, leading=14, textColor=GRAY_700))
        step_t = Table([[step_p]], colWidths=[5.8 * inch])
        step_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), AMBER_50 if 'STOP' in title or 'REPORT' in title else GRAY_50),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 14),
            ('RIGHTPADDING', (0, 0), (-1, -1), 14),
            ('BOX', (0, 0), (-1, -1), 1, AMBER_600 if 'STOP' in title or 'REPORT' in title else GRAY_400),
        ]))
        e.append(step_t)
        e.append(Spacer(1, 4))

    e.append(Spacer(1, 4))
    e.append(key_point_box(
        '<b>No retaliation.</b> This practice has a strict no-retaliation policy for good-faith incident '
        'reporting. You will never be punished for reporting a suspected data leak. '
        'You WILL be held accountable for failing to report one.'))

    # ═══ MODULE 6: SCENARIOS ═══
    e.extend(module_header('6', 'Real-World Scenarios \u2014 Test Your Knowledge'))

    e.append(Paragraph(
        'For each scenario below, think about what you would do before reading the answer.',
        S['body']))

    scenarios = [
        ('Scenario 1: The Grammar Checker',
         'You\'re typing a referral letter in the EMR and realize you have a Grammarly browser extension installed. It\'s highlighting errors in real-time. Is this okay?',
         'NO. Free Grammarly sends all text to external servers for processing \u2014 including any patient information visible on screen. Disable the extension on work devices immediately and notify your Practice Manager. Use your EMR\'s built-in spell check instead.'),
        ('Scenario 2: The Helpful Coworker',
         'A coworker shows you a cool AI app that can summarize patient intake forms in seconds. They\'ve been using it for a week. What do you do?',
         'Report it to your Practice Manager or Data Sovereignty Officer immediately. Even if the tool seems helpful, it hasn\'t been verified for U.S. data residency. Your coworker isn\'t in trouble for being unaware, but the tool must be assessed before further use. This is exactly the kind of "shadow IT" that causes SB 1188 violations.'),
        ('Scenario 3: The After-Hours Text',
         'A doctor texts you on your personal phone asking you to look up a patient\'s medication list and text it back. What do you do?',
         'Decline politely. Patient data should never be sent via personal text messages. Respond: "I\'d be happy to help, but I need to pull that up through our approved system. I\'ll send it through [approved platform] first thing in the morning." Log the request with your Practice Manager.'),
        ('Scenario 4: The Vendor Demo',
         'A sales rep is showing your office a new scheduling tool. During the demo, they ask you to enter some "test patient data" to see how it works. Is this okay?',
         'NO. Never enter real patient data into an unverified system, even as a "test." Use obviously fake data (e.g., "John Doe, 555-0100") during vendor demonstrations. If the vendor asks for real data, that\'s a red flag.'),
    ]
    for title, situation, answer in scenarios:
        e.append(Paragraph(f'<b>{title}</b>', S['h2']))
        e.append(scenario_box('SITUATION', situation))
        e.append(Spacer(1, 4))
        e.append(styled_box(f'<b>CORRECT RESPONSE:</b> {answer}', GREEN_50, GREEN_600, GREEN_700))
        e.append(Spacer(1, 8))

    # ═══ MODULE 7: QUICK REFERENCE CARD ═══
    e.extend(module_header('7', 'Quick Reference Card \u2014 Print &amp; Post'))

    e.append(Paragraph(
        'Print this page and post it at every workstation, in the break room, and at the front desk.',
        S['body']))

    card_p = Paragraph(
        '<b>DATA SOVEREIGNTY \u2014 STAFF QUICK REFERENCE</b><br/><br/>'
        '<b>THE RULE:</b> ALL patient data must stay in the United States. No exceptions.<br/><br/>'
        '<b>NEVER USE:</b> Personal ChatGPT/AI, WhatsApp, personal email, free browser extensions, '
        'unapproved apps, free cloud storage \u2014 for ANY patient-related task.<br/><br/>'
        '<b>ALWAYS USE:</b> Practice-approved tools only. If it\'s not on the approved list, don\'t use it.<br/><br/>'
        '<b>IF A PATIENT ASKS ABOUT AI:</b> Be honest. "Yes, we use US-based AI to help with [function]. '
        'Your doctor always reviews everything. Your data never leaves the country."<br/><br/>'
        '<b>BEFORE SIGNING UP FOR ANYTHING NEW:</b><br/>'
        '1. Is data stored 100% in the U.S.?<br/>'
        '2. Any offshore sub-processors?<br/>'
        '3. Can they provide a Data Residency Certificate?<br/>'
        'Then bring the answers to your Practice Manager.<br/><br/>'
        '<b>IF YOU MAKE A MISTAKE:</b> STOP using the tool. REPORT to Practice Manager within 1 hour. '
        'DOCUMENT what happened. No retaliation for honest reporting.<br/><br/>'
        '<b>THE PENALTY:</b> Up to $250,000 per violation. This is everyone\'s responsibility.<br/><br/>'
        '<i>Questions? Contact: [Data Sovereignty Officer Name] | [Phone/Email]</i>',
        ParagraphStyle('Card', fontName='Helvetica', fontSize=10, leading=15, textColor=NAVY, alignment=TA_LEFT))
    card_t = Table([[card_p]], colWidths=[5.2 * inch])
    card_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), WHITE),
        ('TOPPADDING', (0, 0), (-1, -1), 18),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 18),
        ('LEFTPADDING', (0, 0), (-1, -1), 18),
        ('RIGHTPADDING', (0, 0), (-1, -1), 18),
        ('BOX', (0, 0), (-1, -1), 2.5, NAVY),
    ]))
    outer = Table([[card_t]], colWidths=[6.0 * inch])
    outer.setStyle(TableStyle([('ALIGN', (0, 0), (-1, -1), 'CENTER')]))
    e.append(outer)

    e.append(PageBreak())
    return e


# ═══════════════════════════════════════════════
# STAFF ATTESTATION
# ═══════════════════════════════════════════════

def build_attestation():
    e = []
    e.append(Paragraph('STAFF ATTESTATION', S['module_num']))
    e.append(Paragraph('Data Sovereignty Training Acknowledgment', S['h1']))
    e.append(HRFlowable(width='100%', thickness=0.75, color=GOLD, spaceAfter=14))

    e.append(Paragraph(
        'This attestation must be completed by every employee, contractor, and temporary staff member '
        'with access to patient data. Signed attestations are retained in personnel files and serve as '
        'documented evidence of compliance training under the practice\'s Safe Harbor\u2122 program.',
        S['body']))
    e.append(Spacer(1, 12))

    attest_p = Paragraph(
        '<b>ATTESTATION</b><br/><br/>'
        'I, the undersigned, hereby attest that:<br/><br/>'
        '1. I have read and understood the Practice\'s Data Sovereignty &amp; Residency Policy in its entirety.<br/><br/>'
        '2. I have completed the Staff Training Guide on Digital Sovereignty &amp; Patient Privacy Standards.<br/><br/>'
        '3. I understand that Texas Senate Bill 1188 requires all patient data to remain within the United States '
        'and that violations may result in fines up to $250,000 per incident.<br/><br/>'
        '4. I understand that Texas House Bill 149 requires transparency with patients about AI usage and that '
        'I must disclose AI use honestly when asked.<br/><br/>'
        '5. I agree to use ONLY practice-approved digital tools for all patient-related tasks, including '
        'scheduling, documentation, communication, and data processing.<br/><br/>'
        '6. I will NOT use personal AI accounts, unauthorized messaging apps, personal email, unapproved '
        'browser extensions, or any unverified digital tool for patient data.<br/><br/>'
        '7. I will report any suspected data sovereignty violation to the Practice Manager or Data Sovereignty '
        'Officer within one (1) hour of discovery.<br/><br/>'
        '8. I understand that violation of the Data Sovereignty Policy may result in disciplinary action '
        'up to and including termination of employment.<br/><br/>'
        '9. I understand that the practice maintains a no-retaliation policy for good-faith reporting of '
        'suspected data sovereignty incidents.',
        ParagraphStyle('Attest', fontName='Helvetica', fontSize=9.5, leading=14, textColor=NAVY, alignment=TA_LEFT))
    attest_t = Table([[attest_p]], colWidths=[5.8 * inch])
    attest_t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), GRAY_50),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ('BOX', (0, 0), (-1, -1), 1.5, NAVY),
    ]))
    e.append(attest_t)
    e.append(Spacer(1, 24))

    sigs = [
        ('Employee Name (Print):', ''),
        ('Employee Signature:', ''),
        ('Position / Department:', ''),
        ('Date of Training Completion:', ''),
        ('', ''),
        ('Training Administered By:', ''),
        ('Trainer Signature:', ''),
        ('Date:', ''),
    ]
    for label, _ in sigs:
        if not label:
            e.append(Spacer(1, 10))
            continue
        e.append(Paragraph(label, S['sig_label']))
        e.append(HRFlowable(width='65%', thickness=0.5, color=GRAY_500, spaceAfter=2, hAlign='LEFT'))
        e.append(Spacer(1, 8))

    e.append(Spacer(1, 16))
    e.append(Paragraph(
        '<i>This form should be completed within 30 days of hire and annually thereafter during refresher '
        'training. Store signed forms in employee personnel files and maintain digital scans in the '
        'compliance documentation folder.</i>',
        S['small']))

    return e


# ═══════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════

def main():
    # Accept --output CLI arg
    output = None
    for i, arg in enumerate(sys.argv):
        if arg == '--output' and i + 1 < len(sys.argv):
            output = sys.argv[i + 1]
            os.makedirs(os.path.dirname(output) or '.', exist_ok=True)
    if not output:
        output = '/mnt/user-data/outputs/Staff_Training_Guide.pdf'

    doc = SimpleDocTemplate(output, pagesize=letter,
        topMargin=0.85*inch, bottomMargin=0.7*inch,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        title='Staff Training Guide \u2014 Digital Sovereignty & Patient Privacy',
        author='KairoLogic Compliance Division',
        subject='SB 1188 + HB 149 Staff Training')

    story = []
    story.extend(build_cover())
    story.extend(build_toc())
    story.extend(build_modules())
    story.extend(build_attestation())

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f'PDF generated: {output}')
    print(f'File size: {os.path.getsize(output) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
