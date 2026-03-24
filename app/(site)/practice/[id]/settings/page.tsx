'use client';

import { useState, useEffect } from 'react';
import { colors } from '@/lib/design-tokens';
import { Lock, Mail, Users, Bell, Link2, Zap, Eye, EyeOff, Trash2, Plus, MoreVertical, X } from 'lucide-react';

interface SettingsPageProps {
  params: { id: string };
}

interface PracticeForm {
  practice_name: string;
  organization_npi: string;
  primary_address: string;
  city: string;
  state: string;
  zip_code: string;
  website_url: string;
  primary_phone: string;
  primary_fax: string;
  specialties: string[];
  states_of_operation: string[];
  subscription_tier: string;
}

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_active: string;
}

interface NotificationSettings {
  drift_alerts: boolean;
  scan_complete: boolean;
  monthly_report: boolean;
  credential_expiry: boolean;
  workflow_updates: boolean;
  payer_changes: boolean;
  drift_frequency: 'immediate' | 'daily' | 'weekly';
  delivery_email: string;
  additional_recipients: string[];
  quiet_hours_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
}

interface PayerConnection {
  payer_id: string;
  payer_name: string;
  status: 'Connected' | 'Pending' | 'Error';
  last_sync: string;
  providers_found: number;
  sync_frequency: string;
  auth_status: string;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const practiceId = params.id;
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'team' | 'notifications' | 'payers' | 'automation'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Tab 1: Practice Profile
  const [practiceForm, setPracticeForm] = useState<PracticeForm>({
    practice_name: '',
    organization_npi: '',
    primary_address: '',
    city: '',
    state: '',
    zip_code: '',
    website_url: '',
    primary_phone: '',
    primary_fax: '',
    specialties: [],
    states_of_operation: [],
    subscription_tier: '',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');

  // Tab 2: Security
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' });
  const [currentEmail, setCurrentEmail] = useState('user@example.com');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Tab 3: Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });

  // Tab 4: Notifications
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    drift_alerts: true,
    scan_complete: true,
    monthly_report: false,
    credential_expiry: true,
    workflow_updates: true,
    payer_changes: false,
    drift_frequency: 'daily',
    delivery_email: 'user@example.com',
    additional_recipients: [],
    quiet_hours_enabled: false,
    quiet_start: '22:00',
    quiet_end: '08:00',
    timezone: 'America/New_York',
  });
  const [newRecipient, setNewRecipient] = useState('');

  // Tab 5: Payers
  const [payerConnections, setPayerConnections] = useState<PayerConnection[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [payerRequest, setPayerRequest] = useState({ payer_name: '' });

  useEffect(() => {
    loadPracticeData();
  }, [practiceId]);

  async function loadPracticeData() {
    try {
      setLoading(true);
      // Simulated data loading
      setPracticeForm({
        practice_name: 'Sunrise Medical Group',
        organization_npi: '1234567890',
        primary_address: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        website_url: 'https://sunrisemedical.com',
        primary_phone: '(415) 555-0100',
        primary_fax: '(415) 555-0101',
        specialties: ['Cardiology', 'Internal Medicine'],
        states_of_operation: ['CA', 'NV'],
        subscription_tier: 'Professional',
      });

      setTeamMembers([
        {
          user_id: '1',
          name: 'Dr. Sarah Johnson',
          email: 'sarah@example.com',
          role: 'Admin',
          status: 'Active',
          last_active: '2 hours ago',
        },
        {
          user_id: '2',
          name: 'Michael Chen',
          email: 'michael@example.com',
          role: 'Manager',
          status: 'Active',
          last_active: '30 minutes ago',
        },
      ]);

      setPayerConnections([
        {
          payer_id: '1',
          payer_name: 'Aetna',
          status: 'Connected',
          last_sync: '2026-03-22 14:30',
          providers_found: 12,
          sync_frequency: 'Weekly',
          auth_status: 'Valid',
        },
        {
          payer_id: '2',
          payer_name: 'BlueCross BlueShield',
          status: 'Connected',
          last_sync: '2026-03-22 15:15',
          providers_found: 18,
          sync_frequency: 'Weekly',
          auth_status: 'Valid',
        },
        {
          payer_id: '3',
          payer_name: 'Cigna',
          status: 'Pending',
          last_sync: 'Never',
          providers_found: 0,
          sync_frequency: 'Weekly',
          auth_status: 'Pending',
        },
      ]);
    } catch (err) {
      console.error('Error loading practice data:', err);
      setMessage({ type: 'error', text: 'Failed to load practice data' });
    } finally {
      setLoading(false);
    }
  }

  async function savePracticeSettings() {
    try {
      setLoading(true);
      // Simulated save
      await new Promise(r => setTimeout(r, 500));
      setMessage({ type: 'success', text: 'Practice settings saved successfully' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 500));
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ new_password: '', confirm_password: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1000));
      setMessage({ type: 'success', text: 'Account deleted. Redirecting...' });
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
  }

  async function inviteTeamMember() {
    if (!inviteForm.email) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 500));
      setMessage({ type: 'success', text: `Invitation sent to ${inviteForm.email}` });
      setInviteForm({ email: '', role: 'member' });
      setShowInviteModal(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send invitation' });
    } finally {
      setLoading(false);
    }
  }

  function addSpecialty() {
    if (specialtyInput.trim() && !practiceForm.specialties.includes(specialtyInput.trim())) {
      setPracticeForm({
        ...practiceForm,
        specialties: [...practiceForm.specialties, specialtyInput.trim()],
      });
      setSpecialtyInput('');
    }
  }

  function removeSpecialty(specialty: string) {
    setPracticeForm({
      ...practiceForm,
      specialties: practiceForm.specialties.filter(s => s !== specialty),
    });
  }

  function addRecipient() {
    if (newRecipient.trim() && !notificationSettings.additional_recipients.includes(newRecipient.trim())) {
      setNotificationSettings({
        ...notificationSettings,
        additional_recipients: [...notificationSettings.additional_recipients, newRecipient.trim()],
      });
      setNewRecipient('');
    }
  }

  function removeRecipient(email: string) {
    setNotificationSettings({
      ...notificationSettings,
      additional_recipients: notificationSettings.additional_recipients.filter(e => e !== email),
    });
  }

  // Tab headers
  const tabs = [
    { id: 'profile', label: 'Practice Profile', icon: '◉' },
    { id: 'security', label: 'Account & Security', icon: '🔐' },
    { id: 'team', label: 'Team & Access', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'payers', label: 'Payer Connections', icon: '🏥' },
    { id: 'automation', label: 'Agent & Automation', icon: '⚡' },
  ];

  return (
    <div style={styles.container}>
      {/* Tab Navigation */}
      <div style={styles.tabNav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              ...styles.tabButton,
              color: activeTab === tab.id ? colors.navy : colors.navyLight,
              borderBottom: activeTab === tab.id ? `3px solid ${colors.gold}` : 'none',
              fontWeight: activeTab === tab.id ? 600 : 500,
            }}
          >
            <span style={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Message Alert */}
      {message.text && (
        <div style={{
          ...styles.alert,
          background: message.type === 'success' ? '#D4E5DB' : '#F5D5D5',
          color: message.type === 'success' ? colors.green : colors.red,
          borderLeft: `4px solid ${message.type === 'success' ? colors.green : colors.red}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      <div style={styles.content}>
        {/* Tab 1: Practice Profile */}
        {activeTab === 'profile' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Practice Profile</h2>
            <div style={styles.formSection}>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Practice Name</label>
                  <input
                    type="text"
                    value={practiceForm.practice_name}
                    onChange={e => setPracticeForm({ ...practiceForm, practice_name: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Organization NPI</label>
                  <input
                    type="text"
                    value={practiceForm.organization_npi}
                    onChange={e => setPracticeForm({ ...practiceForm, organization_npi: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Primary Address</label>
                <input
                  type="text"
                  value={practiceForm.primary_address}
                  onChange={e => setPracticeForm({ ...practiceForm, primary_address: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City</label>
                  <input
                    type="text"
                    value={practiceForm.city}
                    onChange={e => setPracticeForm({ ...practiceForm, city: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>State</label>
                  <input
                    type="text"
                    value={practiceForm.state}
                    onChange={e => setPracticeForm({ ...practiceForm, state: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ZIP Code</label>
                  <input
                    type="text"
                    value={practiceForm.zip_code}
                    onChange={e => setPracticeForm({ ...practiceForm, zip_code: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Website URL</label>
                <input
                  type="url"
                  value={practiceForm.website_url}
                  onChange={e => setPracticeForm({ ...practiceForm, website_url: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Primary Phone</label>
                  <input
                    type="tel"
                    value={practiceForm.primary_phone}
                    onChange={e => setPracticeForm({ ...practiceForm, primary_phone: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Primary Fax</label>
                  <input
                    type="tel"
                    value={practiceForm.primary_fax}
                    onChange={e => setPracticeForm({ ...practiceForm, primary_fax: e.target.value })}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Practice Specialties</label>
                <div style={styles.tagInput}>
                  <div style={styles.tagList}>
                    {practiceForm.specialties.map(specialty => (
                      <div key={specialty} style={styles.tag}>
                        {specialty}
                        <button
                          onClick={() => removeSpecialty(specialty)}
                          style={styles.tagRemove}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={specialtyInput}
                    onChange={e => setSpecialtyInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    placeholder="Type and press Enter to add"
                    style={styles.tagInputField}
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>States of Operation</label>
                  <div style={styles.readOnlyField}>
                    {practiceForm.states_of_operation.join(', ')}
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Subscription Tier</label>
                  <div style={styles.readOnlyField}>
                    {practiceForm.subscription_tier}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={savePracticeSettings}
              disabled={loading}
              style={{
                ...styles.primaryButton,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Tab 2: Account & Security */}
        {activeTab === 'security' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Account & Security</h2>

            {/* Change Password */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Change Password</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    style={styles.input}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Confirm Password</label>
                <div style={styles.passwordWrapper}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    style={styles.input}
                  />
                  <button
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeButton}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                onClick={changePassword}
                disabled={loading}
                style={{
                  ...styles.primaryButton,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            {/* Current Email */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Email Address</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Email</label>
                <div style={styles.readOnlyField}>
                  {currentEmail}
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Active Sessions</h3>
              <p style={styles.placeholder}>
                Your active sessions will appear here. You can manage your logged-in devices.
              </p>
            </div>

            {/* Two-Factor Authentication */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Two-Factor Authentication</h3>
                <span style={styles.comingSoonBadge}>Coming Soon</span>
              </div>
              <p style={styles.placeholder}>
                Enhanced security with two-factor authentication will be available soon.
              </p>
            </div>

            {/* Delete Account */}
            <div style={{ ...styles.card, borderLeft: `4px solid ${colors.red}` }}>
              <h3 style={{ ...styles.cardTitle, color: colors.red }}>Delete Account</h3>
              <p style={styles.placeholder}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{ ...styles.dangerButton }}
                >
                  Delete Account
                </button>
              ) : (
                <div style={styles.confirmBox}>
                  <p style={{ marginBottom: 12, color: colors.navy }}>
                    Are you sure? This will permanently delete your account and all data.
                  </p>
                  <div style={styles.confirmButtons}>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={styles.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={deleteAccount}
                      disabled={loading}
                      style={{
                        ...styles.dangerButton,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Team & Access */}
        {activeTab === 'team' && (
          <div style={styles.tabContent}>
            <div style={styles.teamHeader}>
              <h2 style={styles.sectionTitle}>Team & Access</h2>
              <button
                onClick={() => setShowInviteModal(true)}
                style={styles.primaryButton}
              >
                <Plus size={16} style={{ marginRight: 6 }} />
                Invite Team Member
              </button>
            </div>

            {/* Team Members Table */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Team Members</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Name & Email</th>
                      <th style={styles.tableHeader}>Role</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Last Active</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map(member => (
                      <tr key={member.user_id} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div>
                            <div style={styles.memberName}>{member.name}</div>
                            <div style={styles.memberEmail}>{member.email}</div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.roleBadge,
                            background: member.role === 'Admin' ? colors.gold : colors.navyLight,
                            color: member.role === 'Admin' ? colors.navy : '#fff',
                          }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{member.status}</td>
                        <td style={styles.tableCell}>{member.last_active}</td>
                        <td style={styles.tableCell}>
                          <button style={styles.menuButton}>
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Role Permission Matrix */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Role Permissions</h3>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Permission</th>
                      <th style={styles.tableHeader}>Admin</th>
                      <th style={styles.tableHeader}>Manager</th>
                      <th style={styles.tableHeader}>Member</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      'View dashboard',
                      'Manage providers',
                      'Manage team',
                      'Manage billing',
                      'Edit settings',
                    ].map(permission => (
                      <tr key={permission} style={styles.tableRow}>
                        <td style={styles.tableCell}>{permission}</td>
                        <td style={styles.tableCell}>✓</td>
                        <td style={styles.tableCell}>✓</td>
                        <td style={styles.tableCell}>{permission === 'View dashboard' ? '✓' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
              <div style={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                <div style={styles.modal} onClick={e => e.stopPropagation()}>
                  <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Invite Team Member</h3>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      style={styles.closeButton}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div style={styles.modalBody}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address</label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        placeholder="colleague@example.com"
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Role</label>
                      <select
                        value={inviteForm.role}
                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                        style={styles.select}
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.modalFooter}>
                    <button
                      onClick={() => setShowInviteModal(false)}
                      style={styles.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={inviteTeamMember}
                      disabled={loading}
                      style={{
                        ...styles.primaryButton,
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? 'Sending...' : 'Send Invitation'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === 'notifications' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Notification Preferences</h2>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Notification Types</h3>
              {[
                { key: 'drift_alerts', label: 'Drift Alerts', description: 'Receive alerts when credentials drift' },
                { key: 'scan_complete', label: 'Scan Complete', description: 'Notification when scans finish' },
                { key: 'monthly_report', label: 'Monthly Report', description: 'Receive monthly summaries' },
                { key: 'credential_expiry', label: 'Credential Expiry', description: 'Alerts for expiring credentials' },
                { key: 'workflow_updates', label: 'Workflow Updates', description: 'Updates on workflow execution' },
                { key: 'payer_changes', label: 'Payer Directory Changes', description: 'Changes in payer directories' },
              ].map(item => (
                <div key={item.key} style={styles.toggleRow}>
                  <div>
                    <div style={styles.toggleLabel}>{item.label}</div>
                    <div style={styles.toggleDescription}>{item.description}</div>
                  </div>
                  <label style={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationSettings[item.key as keyof NotificationSettings] === true}
                      onChange={e => setNotificationSettings({
                        ...notificationSettings,
                        [item.key]: e.target.checked,
                      })}
                      style={styles.checkboxInput}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Drift Alert Frequency</h3>
              <select
                value={notificationSettings.drift_frequency}
                onChange={e => setNotificationSettings({
                  ...notificationSettings,
                  drift_frequency: e.target.value as any,
                })}
                style={styles.select}
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
              </select>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Delivery Settings</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Delivery Email</label>
                <input
                  type="email"
                  value={notificationSettings.delivery_email}
                  onChange={e => setNotificationSettings({
                    ...notificationSettings,
                    delivery_email: e.target.value,
                  })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Additional Recipients</label>
                <div style={styles.tagInput}>
                  <div style={styles.tagList}>
                    {notificationSettings.additional_recipients.map(email => (
                      <div key={email} style={styles.tag}>
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          style={styles.tagRemove}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={e => setNewRecipient(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
                    placeholder="Add email and press Enter"
                    style={styles.tagInputField}
                  />
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Quiet Hours</h3>
              <label style={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={notificationSettings.quiet_hours_enabled}
                  onChange={e => setNotificationSettings({
                    ...notificationSettings,
                    quiet_hours_enabled: e.target.checked,
                  })}
                  style={styles.checkboxInput}
                />
                <span style={{ marginLeft: 8 }}>Enable quiet hours</span>
              </label>
              {notificationSettings.quiet_hours_enabled && (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Start Time</label>
                      <input
                        type="time"
                        value={notificationSettings.quiet_start}
                        onChange={e => setNotificationSettings({
                          ...notificationSettings,
                          quiet_start: e.target.value,
                        })}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>End Time</label>
                      <input
                        type="time"
                        value={notificationSettings.quiet_end}
                        onChange={e => setNotificationSettings({
                          ...notificationSettings,
                          quiet_end: e.target.value,
                        })}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Timezone</h3>
              <select
                value={notificationSettings.timezone}
                onChange={e => setNotificationSettings({
                  ...notificationSettings,
                  timezone: e.target.value,
                })}
                style={styles.select}
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
              </select>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Last 5 Notifications</h3>
              <div style={styles.notificationList}>
                {[
                  { time: '2 hours ago', message: 'Credential expiry: Dr. Smith license expires in 30 days' },
                  { time: '5 hours ago', message: 'Scan completed: 12 providers scanned' },
                  { time: '1 day ago', message: 'Drift detected: 3 credentials changed status' },
                  { time: '2 days ago', message: 'Monthly report generated and sent' },
                  { time: '3 days ago', message: 'New payer directory update available' },
                ].map((notif, i) => (
                  <div key={i} style={styles.notificationItem}>
                    <div style={styles.notificationTime}>{notif.time}</div>
                    <div style={styles.notificationMessage}>{notif.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Payer Connections */}
        {activeTab === 'payers' && (
          <div style={styles.tabContent}>
            <div style={styles.teamHeader}>
              <h2 style={styles.sectionTitle}>Payer Connections</h2>
              <div style={styles.buttonGroup}>
                <button style={styles.secondaryButton}>Sync All</button>
                <button
                  onClick={() => setShowRequestModal(true)}
                  style={styles.primaryButton}
                >
                  <Plus size={16} style={{ marginRight: 6 }} />
                  Request Payer
                </button>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Payer Name</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Last Sync</th>
                      <th style={styles.tableHeader}>Providers Found</th>
                      <th style={styles.tableHeader}>Sync Frequency</th>
                      <th style={styles.tableHeader}>Auth Status</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payerConnections.map(payer => (
                      <tr key={payer.payer_id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{payer.payer_name}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            background: payer.status === 'Connected' ? colors.green :
                                       payer.status === 'Pending' ? colors.gold : colors.red,
                            color: payer.status === 'Connected' ? '#fff' :
                                   payer.status === 'Pending' ? colors.navy : '#fff',
                          }}>
                            {payer.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>{payer.last_sync}</td>
                        <td style={styles.tableCell}>{payer.providers_found}</td>
                        <td style={styles.tableCell}>{payer.sync_frequency}</td>
                        <td style={styles.tableCell}>{payer.auth_status}</td>
                        <td style={styles.tableCell}>
                          <button style={styles.linkButton}>Sync Now</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Request Payer Modal */}
            {showRequestModal && (
              <div style={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
                <div style={styles.modal} onClick={e => e.stopPropagation()}>
                  <div style={styles.modalHeader}>
                    <h3 style={styles.modalTitle}>Request Payer Connection</h3>
                    <button
                      onClick={() => setShowRequestModal(false)}
                      style={styles.closeButton}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div style={styles.modalBody}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Payer Name</label>
                      <input
                        type="text"
                        value={payerRequest.payer_name}
                        onChange={e => setPayerRequest({ payer_name: e.target.value })}
                        placeholder="Enter payer name"
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={styles.modalFooter}>
                    <button
                      onClick={() => setShowRequestModal(false)}
                      style={styles.secondaryButton}
                    >
                      Cancel
                    </button>
                    <button style={styles.primaryButton}>
                      Submit Request
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Agent & Automation */}
        {activeTab === 'automation' && (
          <div style={styles.tabContent}>
            <h2 style={styles.sectionTitle}>Agent & Automation Settings</h2>
            <div style={styles.comingSoonContainer}>
              <span style={styles.comingSoonBadge}>Coming Soon</span>
              <p style={styles.placeholder}>
                Automation and AI agent features are currently in development. These advanced settings will allow you to configure auto-approval thresholds, credential monitoring, and intelligent workflow automation.
              </p>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Auto-Approval Threshold</h3>
              <div style={styles.disabledSection}>
                <input
                  type="range"
                  min="70"
                  max="100"
                  defaultValue="85"
                  disabled
                  style={styles.slider}
                />
                <div style={styles.sliderLabel}>Confidence: 85%</div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Monitoring & Automation</h3>
              {[
                { label: 'Auto-submit NPPES updates', description: 'Automatically submit NPPES credential updates' },
                { label: 'Auto-submit CAQH updates', description: 'Automatically submit CAQH credential updates' },
                { label: 'Payer auto-submit', description: 'Automatically submit credentials to payers' },
              ].map(item => (
                <div key={item.label} style={styles.toggleRow}>
                  <div>
                    <div style={styles.toggleLabel}>{item.label}</div>
                    <div style={styles.toggleDescription}>{item.description}</div>
                  </div>
                  <label style={styles.checkbox}>
                    <input type="checkbox" disabled style={styles.checkboxInput} />
                  </label>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Monitor Frequency</h3>
              <select disabled style={styles.select}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Escalation Settings</h3>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Escalate after (days)</label>
                  <input type="number" defaultValue="5" disabled style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Critical after (days)</label>
                  <input type="number" defaultValue="10" disabled style={styles.input} />
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Agent Digest Frequency</h3>
              <select disabled style={styles.select}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: '#f8f9fa',
    minHeight: '100vh',
  },
  tabNav: {
    display: 'flex',
    gap: 0,
    borderBottom: `1px solid ${colors.navyLight}`,
    background: '#fff',
    paddingLeft: 24,
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  tabIcon: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px 32px',
  },
  tabContent: {
    maxWidth: 1000,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.navy,
    marginBottom: 24,
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    border: `1px solid #e0e4ea`,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 16,
  },
  formSection: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    border: `1px solid #e0e4ea`,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 16,
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid #d0d5dc`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid #d0d5dc`,
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    background: '#fff',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  readOnlyField: {
    padding: '10px 12px',
    background: '#f5f6f7',
    borderRadius: 6,
    fontSize: 13,
    color: colors.navyMid,
    border: `1px solid #e0e4ea`,
  },
  tagInput: {
    border: `1px solid #d0d5dc`,
    borderRadius: 6,
    padding: 8,
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    minHeight: 40,
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    flex: 1,
    alignItems: 'center',
  },
  tag: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: colors.green,
    color: '#fff',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  },
  tagRemove: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
    fontFamily: 'inherit',
  },
  tagInputField: {
    flex: 1,
    minWidth: 150,
    border: 'none',
    outline: 'none',
    fontSize: 13,
    fontFamily: 'inherit',
    background: 'transparent',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: colors.gold,
    color: colors.navy,
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: '#f5f6f7',
    color: colors.navy,
    border: `1px solid #d0d5dc`,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  dangerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    background: colors.red,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.2s',
  },
  alert: {
    margin: '0 32px 20px 32px',
    padding: 16,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    marginTop: 24,
  },
  passwordWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  eyeButton: {
    position: 'absolute' as const,
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.navyLight,
    display: 'flex',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 13,
    color: colors.navyLight,
    lineHeight: 1.6,
    marginBottom: 0,
  },
  comingSoonBadge: {
    display: 'inline-block',
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  confirmBox: {
    background: '#f5f6f7',
    border: `1px solid #d0d5dc`,
    borderRadius: 6,
    padding: 16,
    marginTop: 12,
  },
  confirmButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
  },
  teamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 13,
  },
  tableHeaderRow: {
    borderBottom: `1px solid #e0e4ea`,
    background: '#f8f9fa',
  },
  tableHeader: {
    padding: '12px',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 700,
    color: colors.navyMid,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  tableRow: {
    borderBottom: `1px solid #e0e4ea`,
    transition: 'background 0.2s',
  },
  tableCell: {
    padding: '12px',
    color: colors.navy,
  },
  memberName: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.navy,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.navyLight,
    marginTop: 2,
  },
  roleBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.navyLight,
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: colors.gold,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: '#fff',
    borderRadius: 8,
    maxWidth: 500,
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid #e0e4ea`,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: colors.navy,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.navyLight,
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
  modalBody: {
    padding: '20px 24px',
  },
  modalFooter: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: `1px solid #e0e4ea`,
    background: '#f8f9fa',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid #e0e4ea`,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.navy,
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 11,
    color: colors.navyLight,
  },
  checkbox: {
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  checkboxInput: {
    width: 16,
    height: 16,
    cursor: 'pointer',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  notificationItem: {
    padding: 12,
    background: '#f8f9fa',
    borderRadius: 6,
    borderLeft: `4px solid ${colors.gold}`,
  },
  notificationTime: {
    fontSize: 10,
    color: colors.navyLight,
    fontWeight: 600,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: colors.navy,
    lineHeight: 1.5,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
  },
  disabledSection: {
    opacity: 0.6,
    pointerEvents: 'none' as const,
  },
  slider: {
    width: '100%',
    cursor: 'pointer',
  },
  sliderLabel: {
    fontSize: 12,
    color: colors.navyLight,
    marginTop: 8,
  },
  comingSoonContainer: {
    background: '#fff',
    border: `1px solid #e0e4ea`,
    borderRadius: 8,
    padding: 24,
    textAlign: 'center' as const,
    marginBottom: 20,
  },
};
