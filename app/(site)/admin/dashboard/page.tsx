'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { colors, shadows, transitions, radii, spacing, typography, keyframes } from '@/lib/design-tokens';
import {
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  Activity,
  Clock,
} from 'lucide-react';

interface KPIData {
  totalPractices: number;
  activeAlerts: number;
  openIssues: number;
  contentItems: number;
}

interface ActivityItem {
  id: string;
  type: 'alert' | 'issue' | 'content' | 'practice';
  title: string;
  subtitle: string;
  timestamp: string;
  severity?: 'critical' | 'warning' | 'info';
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalPractices: 0,
    activeAlerts: 0,
    openIssues: 0,
    contentItems: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Auth check
  useEffect(() => {
    const adminAuth = typeof window !== 'undefined' ? sessionStorage.getItem('admin_auth') : null;
    if (!adminAuth) {
      router.push('/admin');
      return;
    }
    setIsAuthed(true);

    // Simulate loading KPI data (real implementation would call APIs)
    setTimeout(() => {
      setKpiData({
        totalPractices: 24,
        activeAlerts: 7,
        openIssues: 12,
        contentItems: 18,
      });
      setIsLoading(false);
    }, 500);
  }, [router]);

  // Placeholder activity data
  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'alert',
      title: 'Credentialing Alert',
      subtitle: 'Oak Ridge Medical Center - License renewal needed',
      timestamp: '5m ago',
      severity: 'critical',
    },
    {
      id: '2',
      type: 'issue',
      title: 'Feature Request',
      subtitle: 'Batch provider import capability',
      timestamp: '2h ago',
      severity: 'info',
    },
    {
      id: '3',
      type: 'practice',
      title: 'New Practice Onboarded',
      subtitle: 'Riverside Medical Partners',
      timestamp: '1d ago',
      severity: 'info',
    },
    {
      id: '4',
      type: 'alert',
      title: 'Compliance Alert',
      subtitle: 'Green Valley Clinic - SB1188 audit required',
      timestamp: '2d ago',
      severity: 'warning',
    },
    {
      id: '5',
      type: 'content',
      title: 'Content Updated',
      subtitle: 'Credentialing workflow guide v2.1',
      timestamp: '3d ago',
      severity: 'info',
    },
    {
      id: '6',
      type: 'issue',
      title: 'Bug Report',
      subtitle: 'CAQH sync occasionally times out',
      timestamp: '4d ago',
      severity: 'warning',
    },
    {
      id: '7',
      type: 'alert',
      title: 'Expiration Alert',
      subtitle: 'Spring Valley Pediatrics - 3 providers expiring soon',
      timestamp: '5d ago',
      severity: 'warning',
    },
    {
      id: '8',
      type: 'practice',
      title: 'Practice Status Change',
      subtitle: 'Sunset Healthcare - paused monitoring',
      timestamp: '1w ago',
      severity: 'info',
    },
    {
      id: '9',
      type: 'content',
      title: 'New Content Published',
      subtitle: 'PECOS enrollment best practices',
      timestamp: '1w ago',
      severity: 'info',
    },
    {
      id: '10',
      type: 'issue',
      title: 'Feature Completed',
      subtitle: 'Provider roster export - CSV format',
      timestamp: '2w ago',
      severity: 'info',
    },
  ];

  if (!isAuthed) {
    return null;
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return colors.red;
      case 'warning':
        return colors.gold;
      default:
        return colors.blue;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle size={16} />;
      case 'issue':
        return <CheckCircle size={16} />;
      case 'practice':
        return <Users size={16} />;
      case 'content':
        return <Zap size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  return (
    <div
      style={{
        padding: `${spacing['4xl']}px ${spacing.xl}px`,
        backgroundColor: colors.gray50,
        minHeight: '100vh',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        ${keyframes.fadeIn}
        ${keyframes.fadeInUp}
        ${keyframes.scaleIn}

        .dashboard-header {
          animation: fadeIn 400ms ease-out;
          margin-bottom: ${spacing['3xl']}px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: ${spacing.lg}px;
          margin-bottom: ${spacing['3xl']}px;
          animation: fadeInUp 500ms ease-out;
        }

        @media (min-width: 640px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .kpi-card {
          background: ${colors.white};
          border-radius: ${radii.lg}px;
          padding: ${spacing['2xl']}px;
          box-shadow: ${shadows.xs};
          transition: all ${transitions.base};
          border: 1px solid ${colors.gray200};
        }

        .kpi-card:hover {
          box-shadow: ${shadows.md};
          transform: translateY(-2px);
        }

        .kpi-card-icon {
          width: 48px;
          height: 48px;
          border-radius: ${radii.md}px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: ${spacing.md}px;
        }

        .kpi-value {
          font-size: ${typography.h2.fontSize}px;
          font-weight: ${typography.h2.fontWeight};
          line-height: ${typography.h2.lineHeight};
          color: ${colors.navy};
          margin-bottom: ${spacing.xs}px;
        }

        .kpi-label {
          font-size: ${typography.body.fontSize}px;
          font-weight: ${typography.body.fontWeight};
          color: ${colors.gray400};
          line-height: ${typography.body.lineHeight};
        }

        .section-title {
          font-size: ${typography.h2.fontSize}px;
          font-weight: ${typography.h2.fontWeight};
          color: ${colors.navy};
          margin-bottom: ${spacing.lg}px;
          display: flex;
          align-items: center;
          gap: ${spacing.md}px;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: ${spacing.lg}px;
          margin-bottom: ${spacing['3xl']}px;
          animation: fadeInUp 600ms ease-out;
        }

        @media (min-width: 1024px) {
          .quick-actions {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .action-card {
          background: ${colors.white};
          border-radius: ${radii.lg}px;
          padding: ${spacing['2xl']}px;
          box-shadow: ${shadows.xs};
          border: 1px solid ${colors.gray200};
          transition: all ${transitions.base};
          text-decoration: none;
          color: inherit;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }

        .action-card:hover {
          box-shadow: ${shadows.md};
          transform: translateX(4px);
          border-color: ${colors.gold};
        }

        .action-card-content {
          flex: 1;
        }

        .action-card-icon {
          width: 56px;
          height: 56px;
          border-radius: ${radii.md}px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-left: ${spacing.lg}px;
          font-size: 24px;
        }

        .action-title {
          font-size: ${typography.h3.fontSize}px;
          font-weight: ${typography.h3.fontWeight};
          color: ${colors.navy};
          margin-bottom: ${spacing.xs}px;
        }

        .action-desc {
          font-size: ${typography.bodySmall.fontSize}px;
          font-weight: ${typography.bodySmall.fontWeight};
          color: ${colors.gray400};
          line-height: ${typography.bodySmall.lineHeight};
        }

        .activity-feed {
          background: ${colors.white};
          border-radius: ${radii.lg}px;
          border: 1px solid ${colors.gray200};
          box-shadow: ${shadows.xs};
          overflow: hidden;
          animation: fadeInUp 700ms ease-out;
        }

        .activity-header {
          padding: ${spacing['2xl']}px;
          border-bottom: 1px solid ${colors.gray200};
        }

        .activity-list {
          max-height: 600px;
          overflow-y: auto;
        }

        .activity-item {
          padding: ${spacing['2xl']}px;
          border-bottom: 1px solid ${colors.gray200};
          transition: background-color ${transitions.fast};
          display: flex;
          gap: ${spacing.lg}px;
          align-items: flex-start;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-item:hover {
          background-color: ${colors.gray50};
        }

        .activity-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: ${radii.full}px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-title {
          font-size: ${typography.body.fontSize}px;
          font-weight: ${typography.body.fontWeight};
          color: ${colors.navy};
          margin-bottom: ${spacing.xs}px;
          line-height: ${typography.body.lineHeight};
        }

        .activity-subtitle {
          font-size: ${typography.bodySmall.fontSize}px;
          font-weight: ${typography.bodySmall.fontWeight};
          color: ${colors.gray400};
          line-height: ${typography.bodySmall.lineHeight};
          margin-bottom: ${spacing.xs}px;
        }

        .activity-time {
          font-size: ${typography.caption.fontSize}px;
          font-weight: ${typography.caption.fontWeight};
          color: ${colors.gray300};
          line-height: ${typography.caption.lineHeight};
        }

        .severity-badge {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: ${radii.full}px;
          margin-right: ${spacing.xs}px;
          margin-left: -${spacing['2xl'] + spacing.lg}px;
        }

        /* Skeleton loading for KPI cards */
        .skeleton {
          background: linear-gradient(90deg, ${colors.gray100} 0%, ${colors.gray200} 50%, ${colors.gray100} 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .kpi-value.skeleton {
          height: 32px;
          width: 80%;
          border-radius: ${radii.sm}px;
          margin-bottom: ${spacing.xs}px;
        }

        .kpi-label.skeleton {
          height: 16px;
          width: 60%;
          border-radius: ${radii.sm}px;
        }
      `}}
      />

      {/* Header */}
      <div className="dashboard-header">
        <h1 style={{ ...typography.h1, color: colors.navy, marginBottom: spacing.sm }}>
          Admin Overview
        </h1>
        <p style={{ ...typography.body, color: colors.gray400 }}>
          System health, alerts, and activity across all practices
        </p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {/* Total Practices */}
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#E6F7F2' }}>
            <Users size={24} color={colors.green} />
          </div>
          <div className="kpi-value">
            {isLoading ? '—' : kpiData.totalPractices}
          </div>
          <div className="kpi-label">Total Practices</div>
        </div>

        {/* Active Alerts */}
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#FDEEEE' }}>
            <AlertCircle size={24} color={colors.red} />
          </div>
          <div className="kpi-value">
            {isLoading ? '—' : kpiData.activeAlerts}
          </div>
          <div className="kpi-label">Active Alerts</div>
        </div>

        {/* Open Issues */}
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#FDF6E3' }}>
            <Zap size={24} color={colors.gold} />
          </div>
          <div className="kpi-value">
            {isLoading ? '—' : kpiData.openIssues}
          </div>
          <div className="kpi-label">Open Issues</div>
        </div>

        {/* Content Items */}
        <div className="kpi-card">
          <div className="kpi-card-icon" style={{ backgroundColor: '#EEF4FF' }}>
            <TrendingUp size={24} color={colors.blue} />
          </div>
          <div className="kpi-value">
            {isLoading ? '—' : kpiData.contentItems}
          </div>
          <div className="kpi-label">Content Items</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: spacing['3xl'] }}>
        <h2 className="section-title">
          <Zap size={20} color={colors.gold} />
          Quick Actions
        </h2>
        <div className="quick-actions">
          <Link href="/admin/practices" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="action-card">
              <div className="action-card-content">
                <div className="action-title">Manage Practices</div>
                <div className="action-desc">View, edit, and onboard medical practices</div>
              </div>
              <div className="action-card-icon" style={{ backgroundColor: '#E6F7F2', color: colors.green }}>
                <Users size={24} />
              </div>
            </div>
          </Link>

          <Link href="/admin/content-studio" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="action-card">
              <div className="action-card-content">
                <div className="action-title">Content Studio</div>
                <div className="action-desc">Create and manage educational content</div>
              </div>
              <div className="action-card-icon" style={{ backgroundColor: '#EEF4FF', color: colors.blue }}>
                <TrendingUp size={24} />
              </div>
            </div>
          </Link>

          <Link href="/admin/alerts" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="action-card">
              <div className="action-card-content">
                <div className="action-title">View All Alerts</div>
                <div className="action-desc">Review critical alerts and compliance issues</div>
              </div>
              <div className="action-card-icon" style={{ backgroundColor: '#FDEEEE', color: colors.red }}>
                <AlertCircle size={24} />
              </div>
            </div>
          </Link>

          <Link href="/admin/issues" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="action-card">
              <div className="action-card-content">
                <div className="action-title">Track Issues</div>
                <div className="action-desc">Feature requests, bugs, and feedback</div>
              </div>
              <div className="action-card-icon" style={{ backgroundColor: '#FDF6E3', color: colors.gold }}>
                <CheckCircle size={24} />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <h2 className="section-title">
          <Activity size={20} color={colors.gold} />
          Recent Activity
        </h2>
        <div className="activity-feed">
          <div className="activity-header">
            <div style={{ ...typography.body, color: colors.gray400, display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Clock size={16} />
              Last 10 Events
            </div>
          </div>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div key={item.id} className="activity-item">
                <div
                  className="activity-icon-wrapper"
                  style={{
                    backgroundColor: item.severity
                      ? `${getSeverityColor(item.severity)}20`
                      : colors.gray100,
                    color: getSeverityColor(item.severity),
                  }}
                >
                  {getActivityIcon(item.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{item.title}</div>
                  <div className="activity-subtitle">{item.subtitle}</div>
                  <div className="activity-time">{item.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
