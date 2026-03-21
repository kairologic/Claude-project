'use client';

import React, { useState, useMemo } from 'react';
import { colors } from '@/lib/design-tokens';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  content: string;
}

interface HelpCategory {
  id: string;
  name: string;
  topics: HelpTopic[];
}

interface FAQItem {
  question: string;
  answer: string;
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    topics: [
      {
        id: 'what-is-kairologic',
        title: 'What is KairoLogic?',
        description: 'Learn about the KairoLogic platform and its core purpose',
        content: `KairoLogic is a comprehensive practice management and credentialing compliance platform designed specifically for healthcare providers. It automates the tracking, monitoring, and management of provider credentials across multiple payers and regulatory bodies.

The platform provides real-time visibility into compliance status, automates credential renewal workflows, and reduces administrative burden by centralizing all credentialing activities in one intuitive dashboard.`,
      },
      {
        id: 'how-dashboard-works',
        title: 'How the Dashboard Works',
        description: 'Understanding the main dashboard interface and navigation',
        content: `The KairoLogic dashboard is your command center for all credentialing activities. It provides:

• Overview Cards - Quick snapshots of compliance status, active workflows, and pending actions
• Workflow Hub - Access to all your credentialing processes in one place
• Provider Roster - Centralized view of all providers and their credential status
• Payer Directories - Monitor your representation across payer networks
• Alerts & Notifications - Real-time updates on important compliance events
• Reports - Analytics and historical data on credentialing activities

Navigation is organized intuitively with a left sidebar for main sections and breadcrumb trails for easy orientation.`,
      },
      {
        id: 'understanding-workflows',
        title: 'Understanding Workflows',
        description: 'The basics of automated credentialing workflows',
        content: `Workflows are automated processes that manage specific credentialing tasks. Each workflow:

• Monitors external sources for changes or requirements
• Automatically detects when actions are needed
• Guides you through required steps
• Tracks progress and completion status
• Generates alerts when deadlines approach

Workflows run continuously in the background and are customizable based on your practice's needs. You can view all active workflows in the Workflows section of the dashboard.`,
      },
    ],
  },
  {
    id: 'workflows',
    name: 'Workflows',
    topics: [
      {
        id: 'nppes-update-workflow',
        title: 'NPPES Update Workflows',
        description: 'Managing National Provider Enumeration System updates',
        content: `The NPPES Update workflow monitors the CMS National Provider Enumeration System for changes to provider credentials and information.

What it does:
• Tracks NPPES registration status for all providers
• Detects updates to provider information (address, specialties, licenses)
• Monitors NPI number assignments and changes
• Alerts you to discrepancies between your records and NPPES

Why it matters:
NPPES is the authoritative source for NPI information and is checked by virtually all payers. Keeping NPPES data current ensures payer directory accuracy and prevents claim denials.

How to use:
Access the NPPES workflow from the Workflows tab to view monitoring status, update provider information, and verify changes have been registered.`,
      },
      {
        id: 'payer-directory-workflow',
        title: 'Payer Directory Updates',
        description: 'Keeping your provider representation current across networks',
        content: `This workflow monitors all major payer directories to ensure your providers are listed correctly and with current credentials.

What it tracks:
• Provider presence in each payer's network
• Credential verification status
• Contract status and authorization levels
• Specialty and location information accuracy
• Termination or removal from networks

Automatic detection:
The workflow continuously scans payer directories and alerts you when:
• A provider is newly listed
• Information needs updating
• Status changes occur (active → inactive, etc.)
• Credentials are about to expire in a network

Taking action:
Use the dashboard to quickly see mismatches and submit corrections directly to payers or update your records as needed.`,
      },
      {
        id: 'license-renewal-workflow',
        title: 'License Renewal Monitoring',
        description: 'Tracking and managing provider license renewals',
        content: `This workflow monitors professional licenses and certifications to prevent lapses in coverage.

Key features:
• Tracks expiration dates for all licenses, certifications, and credentials
• Alerts you 90 days, 30 days, and 7 days before expiration
• Monitors renewal status through external sources when available
• Maintains historical records of all licenses

Automated actions:
• Sends reminders to renew licenses
• Tracks renewal submission status
• Escalates overdue renewals as high-priority alerts
• Documents proof of renewal

Why this matters:
A lapsed license can immediately disqualify a provider from payer networks and lead to denied claims. This workflow ensures nothing falls through the cracks.`,
      },
      {
        id: 'provider-onboarding-workflow',
        title: 'Provider Onboarding',
        description: 'Streamlined process for adding new providers to your practice',
        content: `The Provider Onboarding workflow guides you through adding a new provider to your practice and enrolling them across payer networks.

Onboarding steps:
1. Add provider basic information (name, NPI, specialties, licenses)
2. Complete credentialing forms for selected payers
3. Submit applications to payers
4. Monitor processing status
5. Receive activation confirmations

What happens automatically:
• Collects all required documentation
• Pre-fills known information from NPPES and CAQH
• Tracks application status with payers
• Alerts you when responses are received
• Maintains checklist of completed requirements

Time to completion:
Most onboardings are complete within 2-4 weeks, depending on payer requirements and application responsiveness.`,
      },
      {
        id: 'provider-release-workflow',
        title: 'Provider Release',
        description: 'Managing provider departures and network withdrawals',
        content: `When a provider leaves your practice, the Release workflow manages all necessary terminations and deactivations.

The process includes:
1. Mark provider for release in the system
2. Automatically generate termination notifications for all active networks
3. Submit final claims and documentation
4. Track termination confirmations from payers
5. Archive provider records

Automatic notifications:
The workflow automatically sends termination letters to payers and tracks:
• Confirmation of receipt
• Effective termination date
• Final claim submission deadlines
• Credential return requirements

Record keeping:
All released provider records are archived and remain accessible for historical and legal purposes.`,
      },
      {
        id: 'compliance-remediation-workflow',
        title: 'Compliance Remediation',
        description: 'Addressing compliance issues and fixing discrepancies',
        content: `When compliance issues are detected, this workflow provides a structured approach to remediation.

Types of issues addressed:
• Missing or incomplete credentials
• Information mismatches between systems
• Policy non-compliance
• Documentation gaps
• Unverified credentials

Remediation process:
1. Issue is detected and automatically analyzed
2. Remediation task is created with specific requirements
3. Escalation occurs if deadlines approach
4. Progress is tracked against resolution deadlines
5. Issue is marked resolved once all requirements are met

Priority levels:
Issues are prioritized based on regulatory impact and financial risk. High-priority items receive automated escalation and daily reminders until resolved.`,
      },
    ],
  },
  {
    id: 'provider-management',
    name: 'Provider Management',
    topics: [
      {
        id: 'adding-providers',
        title: 'Adding Providers',
        description: 'How to onboard new providers to your practice',
        content: `Adding a new provider to KairoLogic is straightforward:

Step 1: Access Provider Roster
Navigate to "Providers" in the main menu, then click "Add Provider"

Step 2: Enter Basic Information
• Full name
• NPI (National Provider Identifier)
• Date of birth
• Primary specialties
• Practice locations

Step 3: Add Credentials
• Medical licenses and license numbers
• DEA registration (if applicable)
• Board certifications
• Hospital affiliations
• Malpractice insurance information

Step 4: Select Networks
Choose which payer networks to apply to for enrollment

Step 5: Review and Submit
KairoLogic pre-fills known information from NPPES, CAQH ProView, and other sources. Review for accuracy, then submit.

The provider is now added to your roster and enrollment applications are automatically submitted to selected payers.`,
      },
      {
        id: 'provider-roster',
        title: 'Provider Roster',
        description: 'Managing your complete provider list',
        content: `The Provider Roster is a comprehensive view of all providers in your practice.

Features:
• Search and filter providers by name, specialty, status, or location
• View credential status at a glance with color-coded badges
• See all active and inactive providers
• Access provider details and history
• Download provider lists for external use
• Bulk actions for multiple providers

Provider information includes:
• NPI and identifier
• License status and expiration dates
• Specialty and sub-specialties
• Practice locations
• Payer network enrollment status
• Compliance status
• Last updated date

Keeping roster current:
Regularly review your roster to ensure information is accurate. The system flags outdated information and suggests updates based on external source changes.`,
      },
      {
        id: 'status-badges-explained',
        title: 'Status Badges Explained',
        description: 'Understanding provider status indicators',
        content: `Status badges appear throughout the dashboard to quickly communicate a provider's credentialing status.

Status meanings:

ACTIVE (Green)
Provider is fully credentialed and enrolled across all applicable payer networks.

ACTIVE WITH ALERTS (Yellow/Orange)
Provider is active but has pending items requiring attention (upcoming renewals, needed verifications, etc.)

PENDING (Blue)
Applications are in progress with payers. Waiting for responses or document requests.

REQUIRES ACTION (Red)
Provider has a compliance issue, missing documentation, or other urgent requirement.

INACTIVE (Gray)
Provider is no longer active in the system or has been released.

HOLD (Dark Orange)
Provider enrollment is temporarily paused pending resolution of a compliance issue.

Hovering over any status badge shows additional details and quick actions available.`,
      },
    ],
  },
  {
    id: 'payer-directories',
    name: 'Payer Directories',
    topics: [
      {
        id: 'understanding-payer-grid',
        title: 'Understanding the Payer Grid',
        description: 'How to read and use the payer directory monitoring grid',
        content: `The Payer Grid provides a comprehensive view of your provider representation across all major payer networks.

Grid structure:
• Rows = Providers in your practice
• Columns = Payer networks you monitor
• Each cell = Provider's status with that payer

Reading the grid:
• Green = Provider is active and verified in that network
• Yellow = Active but with noted discrepancies or pending items
• Red = Provider is not listed or status is unclear
• Gray = Provider should not be listed in this network
• Blue = Enrollment application in progress

Interactive features:
Click any cell to:
• View detailed information about that provider/payer relationship
• See what information is mismatched
• Submit corrections
• Check application status
• View history of changes

Filtering and sorting:
Filter by provider, payer, status, or specialty. Sort by any column to identify patterns and bulk update opportunities.`,
      },
      {
        id: 'matched-mismatch-not-listed',
        title: 'What Matched/Mismatch/Not Listed Means',
        description: 'Understanding data alignment indicators',
        content: `These indicators show how your provider information aligns with each payer's records.

MATCHED (Green)
Your provider data perfectly matches what's in the payer's system. No action needed.

MISMATCH (Yellow/Orange)
Your data differs from the payer's records. Common mismatches:

• Address mismatch - Your address differs from payer records
• Specialty mismatch - Listed specialty doesn't match your records
• Credential dates - Expiration dates don't align
• Status mismatch - You list as active; payer shows inactive
• Name variation - Slight spelling or format differences

Why this happens:
Mismatches can occur because:
• Providers update information with you but not with payers
• Payer information is outdated
• Different data entry formats between systems
• Providers have multiple locations with different roles

NOT LISTED (Red)
Provider does not appear in the payer's directory, even though they should be.

Why this happens:
• Application still pending
• Information was lost in system migration
• Provider was terminated
• Application was rejected (usually due to documentation)

What to do:
See the "How to Fix Mismatches" topic for step-by-step guidance.`,
      },
      {
        id: 'fixing-mismatches',
        title: 'How to Fix Mismatches',
        description: 'Steps to correct provider information across payer networks',
        content: `When you identify a mismatch, follow these steps:

Step 1: Determine the Root Cause
Click the mismatch to see details:
• Which field is different?
• What does each system show?
• Which source is more current?

Step 2: Update Your Records (if needed)
If the payer's information is correct, update your provider record in KairoLogic.

Step 3: Submit Correction to Payer
Most mismatches require notifying the payer:

Option A: Use KairoLogic's built-in tools
• Click "Submit Correction" on the mismatch detail
• Select the correct information
• Add any supporting documents
• Submit directly to the payer's system

Option B: Contact payer directly
For complex issues, you may need to:
• Call the payer's credentialing department
• Submit forms through their portal
• Send certified mail for official records

Step 4: Monitor Status
KairoLogic tracks correction submissions and alerts you when:
• Payer acknowledges receipt
• Changes are processed
• Status changes to "Matched"

Common fixes:
• Address updates - Usually processed in 1-3 days
• Specialty corrections - 3-7 days
• Status issues - May require documentation, 1-2 weeks
• Credential updates - 3-10 days`,
      },
    ],
  },
  {
    id: 'alerts-notifications',
    name: 'Alerts & Notifications',
    topics: [
      {
        id: 'alert-types',
        title: 'Alert Types',
        description: 'Understanding different types of system alerts',
        content: `KairoLogic generates different alerts for different situations. Understanding alert types helps you prioritize action.

COMPLIANCE ALERTS
Alert when credentials or statuses don't meet requirements.
Examples: Lapsed license, missing malpractice insurance, unverified NPI

DEADLINE ALERTS
Notify when important dates are approaching.
Examples: License renewal deadline, contract expiration, required re-verification

STATUS CHANGE ALERTS
Inform when payer or regulatory systems detect changes.
Examples: Provider deactivated by payer, new credential available, status updated

ACTION REQUIRED ALERTS
Indicate that specific action is needed from your practice.
Examples: Documents requested by payer, form completion needed, response required

INFORMATION ALERTS
Provide updates on system activities and changes.
Examples: Workflow completed, payer response received, update processed successfully

Where to find alerts:
• Dashboard top banner - Active alerts requiring immediate attention
• Alert Center - Comprehensive view of all alerts with history
• Provider detail pages - Provider-specific alerts
• Email notifications - Configurable alert delivery`,
      },
      {
        id: 'severity-levels',
        title: 'Severity Levels',
        description: 'Alert priority and urgency indicators',
        content: `Each alert has a severity level indicating urgency and importance.

CRITICAL (Red)
Requires immediate attention. Impacts provider's ability to practice or collect claims.
Examples:
• License lapsed
• Malpractice insurance expired
• Provider deactivated by major payer

Action needed: Within 24 hours

HIGH (Orange)
Important and time-sensitive. Will impact operations if not addressed soon.
Examples:
• License expires in 7 days
• Payer requesting documentation
• Status mismatch at major network

Action needed: Within 3-7 days

MEDIUM (Yellow)
Should be addressed soon but not immediately critical.
Examples:
• License expires in 30 days
• Minor information discrepancy
• Routine re-verification due

Action needed: Within 1-2 weeks

LOW (Blue)
Informational or routine matters.
Examples:
• Credential successfully verified
• Workflow completed
• Non-critical update available

Action needed: As convenient

Managing alerts:
• Set notification preferences in Settings
• Snooze non-urgent alerts to focus on critical items
• Mark alerts as resolved once addressed
• View alert history for compliance documentation`,
      },
      {
        id: 'managing-alerts',
        title: 'Managing Alerts',
        description: 'How to view, prioritize, and resolve alerts',
        content: `The Alert Center is your hub for managing all system notifications.

Accessing Alerts:
• Click the bell icon in the header for quick access
• Select "View All Alerts" to go to the Alert Center
• Filter by status, severity, type, or date

Alert actions:
Click any alert to:
• View full details and context
• Take recommended action
• Dismiss or snooze
• View related provider or workflow
• Add notes or comments

Filtering and sorting:
• By status (New, In Progress, Resolved)
• By severity (Critical, High, Medium, Low)
• By type (Compliance, Deadline, Status Change, etc.)
• By date (Last 7 days, This month, Custom range)
• By provider or payer

Bulk actions:
Select multiple alerts to:
• Mark as read/unread
• Change severity level
• Assign to team members
• Snooze multiple alerts
• Archive resolved alerts

Notification preferences:
Configure how you receive alerts:
• Email notifications on/off
• SMS for critical alerts (optional)
• Frequency (Real-time, Daily digest, Weekly summary)
• Alert types to include/exclude

Best practices:
• Review alerts daily
• Address critical alerts immediately
• Use snooze feature for future planning
• Archive resolved alerts to keep list current
• Set up team assignments for distributed workload`,
      },
    ],
  },
  {
    id: 'account-settings',
    name: 'Account & Settings',
    topics: [
      {
        id: 'team-management',
        title: 'Team Management',
        description: 'Managing user accounts and permissions',
        content: `The Team Management section lets you control who can access KairoLogic and what they can do.

Adding team members:
1. Go to Settings > Team Management
2. Click "Add Team Member"
3. Enter email address
4. Select role (see roles below)
5. Assign to practice sites (if applicable)
6. Send invitation

User roles:

ADMIN
Full access to all features and settings. Can manage users, billing, and practice configuration.

MANAGER
Access to all credentialing and reporting features. Can manage providers and workflows. Cannot access billing or user management.

CREDENTIALING SPECIALIST
Access to provider data, workflows, and alerts. Can update provider information and submit to payers. Cannot manage users or settings.

VIEWER
Read-only access. Can view dashboards, reports, and provider information but cannot make changes.

Managing team members:
• View all active users and their roles
• Suspend or remove access
• Change user roles
• Reset passwords
• View last login dates
• Track user activity in audit logs

Practice site assignment:
If you manage multiple practice sites, assign team members to specific sites to limit their visibility and access.`,
      },
      {
        id: 'practice-sites',
        title: 'Practice Sites',
        description: 'Managing multiple practice locations',
        content: `If your organization operates multiple practice sites or entities, you can manage each separately in KairoLogic.

Setting up practice sites:
1. Go to Settings > Practice Sites
2. Click "Add Practice Site"
3. Enter site information (name, location, TIN, NPI prefix, etc.)
4. Assign providers to site
5. Configure site-specific payer networks
6. Set up approval workflows if needed

Site management features:
• Separate dashboards for each site
• Site-specific provider rosters
• Network enrollment by site (some providers at one location, others at different location)
• Consolidated reporting across all sites
• Role-based access (assign users to specific sites only)

Multi-site workflows:
When managing multiple sites:
• Use site filters in the main dashboard
• Run reports comparing across sites
• View consolidated alerts or filter by site
• Bulk actions can target single or multiple sites

Site consolidation:
If you merge or close a practice site:
1. Archive inactive providers
2. Transfer providers to another site (if applicable)
3. Update payer enrollment to reflect change
4. Generate final reports for compliance records
5. Mark site as inactive`,
      },
      {
        id: 'billing',
        title: 'Billing',
        description: 'Managing your KairoLogic subscription and billing',
        content: `The Billing section provides visibility into your subscription, usage, and payment details.

Subscription information:
• Current plan and renewal date
• Number of providers included
• Monthly/annual pricing
• Unused overage allowance
• Payment method on file

Invoice management:
• View and download invoices
• Receipt history
• Payment status
• Tax documentation

Changing your plan:
To upgrade, downgrade, or change your subscription:
1. Go to Settings > Billing > Change Plan
2. Select desired plan
3. Review pricing and changes
4. Confirm changes
5. Changes take effect on next renewal date

Adding payment method:
1. Go to Billing > Payment Methods
2. Click "Add Payment Method"
3. Enter credit card or banking information
4. Set as default if needed

Overage charges:
Your plan includes a certain number of providers. If you exceed this:
• You'll receive a notice when approaching limit
• Overages are billed at additional cost
• Upgrade plan to avoid overage charges
• Usage is calculated at end of billing period

Support:
For billing questions or disputes:
• Contact our billing team: billing@kairologic.com
• Call our support line (number in Settings)
• Submit a support ticket through the Help section`,
      },
    ],
  },
  {
    id: 'faq',
    name: 'Common Questions',
    topics: [],
  },
];

const faqItems: FAQItem[] = [
  {
    question: 'How long does an NPPES update take?',
    answer: 'NPPES updates typically process within 1-2 weeks. KairoLogic automatically monitors your NPPES registration and alerts you when updates are detected. Once you submit changes to NPPES (either directly or through your State Medical Board), they appear in the national system within this timeframe, and we update your dashboard accordingly.',
  },
  {
    question: 'What does "Not Listed" mean in the payer grid?',
    answer: 'When a provider shows as "Not Listed" for a specific payer, it means that provider does not currently appear in that payer\'s provider directory. This can happen if: (1) The enrollment application is still pending, (2) The provider was recently hired and hasn\'t been enrolled yet, (3) The provider was terminated and removed from the network, or (4) The enrollment application was rejected. Click on the cell to see details and next steps.',
  },
  {
    question: 'How do I add a new provider?',
    answer: 'To add a new provider: (1) Navigate to Providers in the main menu, (2) Click "Add Provider", (3) Enter their basic information (name, NPI, date of birth, specialties), (4) Add credentials (licenses, certifications, etc.), (5) Select which payer networks to enroll in, (6) Review and submit. KairoLogic pre-fills known information and automatically submits applications to selected payers.',
  },
  {
    question: 'What triggers a workflow?',
    answer: 'Workflows are triggered by automatic detection of specific conditions. For example: (1) License renewal workflows trigger 90 days before expiration, (2) NPPES workflows detect when external information changes, (3) Payer directory workflows identify mismatches or status changes, (4) Compliance remediation workflows trigger when a compliance issue is detected. All workflows are continuously monitoring external sources in real-time.',
  },
  {
    question: 'How does auto-confirmation work?',
    answer: 'Auto-confirmation uses weekly synchronization with external sources like NPPES, payer directories, and state medical boards to verify credential status. When KairoLogic detects that a credential has been successfully registered or activated in an external system, it automatically confirms that status in your dashboard, reducing manual verification work. You can always review these automatic confirmations in the activity log.',
  },
  {
    question: 'What is CAQH ProView?',
    answer: 'CAQH ProView is a centralized credentialing database that contains verified provider information used by many payers and credentialing organizations. KairoLogic integrates with CAQH ProView to automatically pre-fill provider information during onboarding and to monitor for updates. Having an up-to-date CAQH profile speeds up payer enrollment processes significantly.',
  },
  {
    question: 'How are priorities determined?',
    answer: 'Alert and task priorities are determined by two factors: (1) Regulatory impact - How critical is this credential for compliance and provider ability to practice?, (2) Financial risk - How much revenue is at risk if this provider cannot bill? For example, a lapsed medical license is critical (regulatory impact) and may affect a high-billing provider (financial risk), so it receives a CRITICAL priority.',
  },
  {
    question: 'Can I export data?',
    answer: 'Data export functionality is coming soon in the Reports section. When available, you\'ll be able to export: (1) Provider roster lists, (2) Compliance reports, (3) Payer directory grids, (4) Alert history, (5) Credential verification records. This will support both CSV and PDF formats for use in external reporting and compliance documentation.',
  },
];

interface HelpCenterProps {
  practiceId: string;
}

type ViewType = 'topics' | 'topic-detail' | 'faq';

export default function HelpCenter({ practiceId }: HelpCenterProps) {
  const [currentView, setCurrentView] = useState<ViewType>('topics');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedFAQ, setExpandedFAQ] = useState<Set<number>>(new Set());
  const [topicFeedback, setTopicFeedback] = useState<{ [key: string]: string | null }>({});

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return helpCategories;
    }

    const query = searchQuery.toLowerCase();
    return helpCategories
      .map((category) => ({
        ...category,
        topics: category.topics.filter(
          (topic) =>
            topic.title.toLowerCase().includes(query) ||
            topic.description.toLowerCase().includes(query) ||
            topic.content.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.topics.length > 0 || category.name.toLowerCase().includes(query));
  }, [searchQuery]);

  const filteredFAQ = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqItems;
    }

    const query = searchQuery.toLowerCase();
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query) || item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleFAQ = (index: number) => {
    const newExpanded = new Set(expandedFAQ);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFAQ(newExpanded);
  };

  const handleTopicClick = (topic: HelpTopic, category: HelpCategory) => {
    setSelectedTopic(topic);
    setSelectedCategory(category);
    setCurrentView('topic-detail');
    setTopicFeedback({ ...topicFeedback, [topic.id]: null });
  };

  const handleBackToTopics = () => {
    setCurrentView('topics');
    setSelectedTopic(null);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const containerStyles: React.CSSProperties = {
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: '24px',
  };

  const headerStyles: React.CSSProperties = {
    marginBottom: '32px',
  };

  const titleStyles: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '8px',
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: '14px',
    color: colors.text_secondary,
  };

  const searchContainerStyles: React.CSSProperties = {
    marginBottom: '32px',
  };

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    padding: '12px 16px',
    fontSize: '14px',
    border: `1px solid ${colors.gray200}`,
    borderRadius: '10px',
    fontFamily: 'inherit',
    backgroundColor: colors.white,
    color: colors.text_primary,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  };

  const breadcrumbStyles: React.CSSProperties = {
    fontSize: '13px',
    color: colors.text_secondary,
    marginBottom: '24px',
    fontFamily: 'inherit',
  };

  const breadcrumbLinkStyles: React.CSSProperties = {
    color: colors.gold,
    cursor: 'pointer',
    textDecoration: 'none',
    fontWeight: '500',
  };

  const categoryContainerStyles: React.CSSProperties = {
    marginBottom: '24px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  const categoryHeaderStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: colors.navy,
    color: colors.white,
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    userSelect: 'none',
  };

  const categoryTitleStyles: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
  };

  const categoryToggleStyles: React.CSSProperties = {
    fontSize: '20px',
    color: colors.gold,
  };

  const topicListStyles: React.CSSProperties = {
    padding: '0',
  };

  const topicItemStyles: React.CSSProperties = {
    padding: '16px',
    borderBottom: `1px solid ${colors.gray200}`,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const topicItemHoverStyles: React.CSSProperties = {
    backgroundColor: '#f5f5f5',
  };

  const topicTitleStyles: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '4px',
  };

  const topicDescriptionStyles: React.CSSProperties = {
    fontSize: '13px',
    color: colors.text_secondary,
  };

  const detailContainerStyles: React.CSSProperties = {
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: '10px',
    padding: '32px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  const detailTitleStyles: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: '600',
    color: colors.navy,
    marginBottom: '16px',
  };

  const detailContentStyles: React.CSSProperties = {
    fontSize: '14px',
    color: colors.text_primary,
    lineHeight: '1.6',
    marginBottom: '32px',
    whiteSpace: 'pre-wrap',
  };

  const feedbackSectionStyles: React.CSSProperties = {
    borderTop: `1px solid ${colors.gray200}`,
    paddingTop: '24px',
    marginTop: '32px',
  };

  const feedbackLabelStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text_primary,
    marginBottom: '12px',
  };

  const feedbackButtonGroupStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
  };

  const feedbackButtonStyles = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '500',
    border: `1px solid ${isSelected ? colors.gold : colors.gray200}`,
    borderRadius: '6px',
    backgroundColor: isSelected ? colors.gold : colors.white,
    color: isSelected ? colors.white : colors.text_primary,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  });

  const backButtonStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    color: colors.gold,
    border: `1px solid ${colors.gold}`,
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    marginBottom: '24px',
    fontFamily: 'inherit',
    fontWeight: '500',
  };

  const faqContainerStyles: React.CSSProperties = {
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  };

  const faqItemStyles: React.CSSProperties = {
    borderBottom: `1px solid ${colors.gray200}`,
  };

  const faqQuestionStyles: React.CSSProperties = {
    padding: '16px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    transition: 'background-color 0.2s ease',
    userSelect: 'none',
  };

  const faqQuestionHoverStyles: React.CSSProperties = {
    backgroundColor: '#f5f5f5',
  };

  const faqQuestionTextStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.navy,
    flex: 1,
    textAlign: 'left',
  };

  const faqToggleStyles: React.CSSProperties = {
    fontSize: '18px',
    color: colors.gold,
    marginLeft: '12px',
  };

  const faqAnswerStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fafafa',
    fontSize: '13px',
    color: colors.text_primary,
    lineHeight: '1.6',
  };

  const emptyStateStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px 24px',
    color: colors.text_secondary,
  };

  const emptyStateTitleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.text_primary,
    marginBottom: '8px',
  };

  // Topic detail view
  if (currentView === 'topic-detail' && selectedTopic && selectedCategory) {
    return (
      <div style={containerStyles}>
        <div style={headerStyles}>
          <div style={breadcrumbStyles}>
            <span
              style={breadcrumbLinkStyles}
              onClick={handleBackToTopics}
            >
              Help
            </span>
            {' > '}
            <span
              style={breadcrumbLinkStyles}
              onClick={() => {
                setCurrentView('topics');
                setSelectedTopic(null);
                setSelectedCategory(null);
              }}
            >
              {selectedCategory.name}
            </span>
            {' > '}
            <span style={{ color: colors.text_secondary }}>{selectedTopic.title}</span>
          </div>
        </div>

        <button
          style={backButtonStyles}
          onClick={() => {
            setCurrentView('topics');
            setSelectedTopic(null);
            setSelectedCategory(null);
          }}
        >
          ← Back to Topics
        </button>

        <div style={detailContainerStyles}>
          <h1 style={detailTitleStyles}>{selectedTopic.title}</h1>
          <div style={detailContentStyles}>{selectedTopic.content}</div>

          <div style={feedbackSectionStyles}>
            <div style={feedbackLabelStyles}>Was this helpful?</div>
            <div style={feedbackButtonGroupStyles}>
              <button
                style={feedbackButtonStyles(topicFeedback[selectedTopic.id] === 'yes')}
                onClick={() =>
                  setTopicFeedback({
                    ...topicFeedback,
                    [selectedTopic.id]: 'yes',
                  })
                }
              >
                Yes
              </button>
              <button
                style={feedbackButtonStyles(topicFeedback[selectedTopic.id] === 'no')}
                onClick={() =>
                  setTopicFeedback({
                    ...topicFeedback,
                    [selectedTopic.id]: 'no',
                  })
                }
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // FAQ view
  if (currentView === 'faq') {
    return (
      <div style={containerStyles}>
        <div style={headerStyles}>
          <h1 style={titleStyles}>Help Center</h1>
          <p style={subtitleStyles}>Find answers to common questions</p>
        </div>

        <div style={searchContainerStyles}>
          <input
            type="text"
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyles}
          />
        </div>

        <button
          style={backButtonStyles}
          onClick={() => {
            setCurrentView('topics');
            setSearchQuery('');
          }}
        >
          ← Back to Topics
        </button>

        <div style={faqContainerStyles}>
          {filteredFAQ.length === 0 ? (
            <div style={emptyStateStyles}>
              <div style={emptyStateTitleStyles}>No results found</div>
              <p>Try a different search term or browse by category</p>
            </div>
          ) : (
            filteredFAQ.map((item, index) => (
              <div key={index} style={faqItemStyles}>
                <div
                  style={faqQuestionStyles}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = '#f5f5f5';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = colors.white;
                  }}
                  onClick={() => toggleFAQ(index)}
                >
                  <span style={faqQuestionTextStyles}>{item.question}</span>
                  <span style={faqToggleStyles}>
                    {expandedFAQ.has(index) ? '−' : '+'}
                  </span>
                </div>
                {expandedFAQ.has(index) && (
                  <div style={faqAnswerStyles}>{item.answer}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Topics view (default)
  return (
    <div style={containerStyles}>
      <div style={headerStyles}>
        <h1 style={titleStyles}>Help Center</h1>
        <p style={subtitleStyles}>Find answers and learn how to use KairoLogic</p>
      </div>

      <div style={searchContainerStyles}>
        <input
          type="text"
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchInputStyles}
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div style={emptyStateStyles}>
          <div style={emptyStateTitleStyles}>No results found</div>
          <p>Try a different search term</p>
        </div>
      ) : (
        <>
          {filteredCategories.map((category) => (
            <div key={category.id} style={categoryContainerStyles}>
              <div
                style={categoryHeaderStyles}
                onClick={() => toggleCategory(category.id)}
              >
                <h2 style={categoryTitleStyles}>{category.name}</h2>
                <span style={categoryToggleStyles}>
                  {expandedCategories.has(category.id) ? '−' : '+'}
                </span>
              </div>

              {expandedCategories.has(category.id) && category.topics.length > 0 && (
                <div style={topicListStyles}>
                  {category.topics.map((topic) => (
                    <div
                      key={topic.id}
                      style={topicItemStyles}
                      onMouseEnter={(e) => {
                        Object.assign(e.currentTarget.style, topicItemHoverStyles);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '';
                      }}
                      onClick={() => handleTopicClick(topic, category)}
                    >
                      <div style={topicTitleStyles}>{topic.title}</div>
                      <div style={topicDescriptionStyles}>{topic.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              backgroundColor: colors.white,
              border: `1px solid ${colors.gray200}`,
              borderRadius: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '14px', color: colors.text_primary, marginBottom: '12px' }}>
              Can't find what you're looking for?
            </p>
            <button
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                backgroundColor: colors.gold,
                color: colors.white,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              onClick={() => {
                setCurrentView('faq');
                setSearchQuery('');
              }}
            >
              Browse FAQ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
