'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Mail, Edit, Save, X, Eye, ToggleLeft, ToggleRight, RefreshCw, Send, Code } from 'lucide-react';

interface EmailTemplateRow {
  id: string;
  slug: string;
  name: string;
  subject: string;
  html_body: string;
  trigger_event: string;
  recipient_type: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface Props {
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mxrtltezhkxhqizvxvsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const EmailTemplatesTab: React.FC<Props> = ({ showNotification }) => {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<EmailTemplateRow>>({});
  const [previewing, setPreviewing] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/email_templates?order=slug.asc`, {
        headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      showNotification('Failed to load email templates', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const startEdit = (t: EmailTemplateRow) => {
    setEditing(t.id);
    setEditForm({ ...t });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({});
  };

  const saveTemplate = async () => {
    if (!editing || !editForm.slug) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/email_templates?id=eq.${editing}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: editForm.name,
          subject: editForm.subject,
          html_body: editForm.html_body,
          trigger_event: editForm.trigger_event,
          recipient_type: editForm.recipient_type,
          is_active: editForm.is_active,
        })
      });
      if (!res.ok) throw new Error('Update failed');
      showNotification('Template updated successfully', 'success');
      setEditing(null);
      setEditForm({});
      loadTemplates();
    } catch (err) {
      showNotification('Failed to update template', 'error');
    }
  };

  const toggleActive = async (t: EmailTemplateRow) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/email_templates?id=eq.${t.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ is_active: !t.is_active })
      });
      showNotification(`Template ${!t.is_active ? 'activated' : 'deactivated'}`, 'success');
      loadTemplates();
    } catch (err) {
      showNotification('Toggle failed', 'error');
    }
  };

  const testSend = async (slug: string) => {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_slug: slug,
          variables: {
            practice_name: 'Test Practice',
            practice_manager_name: 'Test Manager',
            email: 'compliance@kairologic.com',
            npi: '1234567890',
            status_label: 'Critical Drift',
            report_id: 'KL-TEST-999999-TX',
            score: '45',
            top_violation_summary: 'Test violation summary',
          }
        })
      });
      const data = await res.json();
      if (data.sent) {
        showNotification('Test email sent to compliance@kairologic.com', 'success');
      } else {
        showNotification('Email send returned false - check SES SMTP config', 'error');
      }
    } catch (err) {
      showNotification('Test send failed', 'error');
    }
  };

  const triggerLabel: Record<string, string> = {
    'scan_complete': 'After Scan',
    'consultation_booked': 'Briefing Request',
    'purchase_success': 'Stripe Payment',
    'contact_form': 'Contact Form',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
            <Mail size={24} />
            Email Templates
          </h2>
          <p className="text-sm text-gray-500 mt-1">{templates.length} templates configured</p>
        </div>
        <button onClick={loadTemplates} className="flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-lg hover:bg-gold hover:text-navy transition-colors text-sm font-bold">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-navy border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <Mail size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-500 mb-2">No Email Templates Found</h3>
          <p className="text-gray-400 text-sm">Run the database migration to seed the templates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className={`bg-white rounded-xl border ${editing === t.id ? 'border-navy shadow-lg' : 'border-gray-200'} overflow-hidden`}>
              {/* Template Header */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="font-bold text-navy">{t.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{t.slug}</span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                        {triggerLabel[t.trigger_event] || t.trigger_event}
                      </span>
                      <span className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded">
                        {t.recipient_type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(t)} className="p-2 hover:bg-gray-100 rounded-lg" title={t.is_active ? 'Deactivate' : 'Activate'}>
                    {t.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  <button onClick={() => setPreviewing(previewing === t.id ? null : t.id)} className="p-2 hover:bg-gray-100 rounded-lg" title="Preview">
                    <Eye size={16} className="text-gray-500" />
                  </button>
                  <button onClick={() => testSend(t.slug)} className="p-2 hover:bg-gray-100 rounded-lg" title="Send Test">
                    <Send size={16} className="text-blue-500" />
                  </button>
                  <button onClick={() => editing === t.id ? cancelEdit() : startEdit(t)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                    {editing === t.id ? <X size={16} className="text-red-500" /> : <Edit size={16} className="text-gray-500" />}
                  </button>
                </div>
              </div>

              {/* Subject Preview */}
              <div className="px-5 pb-3 text-sm text-gray-500">
                <span className="font-semibold text-gray-400">Subject:</span> {t.subject}
              </div>

              {/* HTML Preview */}
              {previewing === t.id && (
                <div className="border-t border-gray-100 p-5">
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: t.html_body }} />
                  </div>
                </div>
              )}

              {/* Edit Form */}
              {editing === t.id && (
                <div className="border-t border-navy/20 bg-slate-50 p-5 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Subject Line</label>
                    <input
                      type="text"
                      value={editForm.subject || ''}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Trigger Event</label>
                      <select
                        value={editForm.trigger_event || ''}
                        onChange={(e) => setEditForm({ ...editForm, trigger_event: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="scan_complete">After Scan</option>
                        <option value="consultation_booked">Briefing Request</option>
                        <option value="purchase_success">Stripe Payment</option>
                        <option value="contact_form">Contact Form</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Recipient</label>
                      <select
                        value={editForm.recipient_type || 'provider'}
                        onChange={(e) => setEditForm({ ...editForm, recipient_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="provider">Provider</option>
                        <option value="internal">Internal (KairoLogic)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1 block">
                      <Code size={12} />
                      HTML Body
                    </label>
                    <textarea
                      value={editForm.html_body || ''}
                      onChange={(e) => setEditForm({ ...editForm, html_body: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono h-64 resize-y"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Variables: {'{{'} practice_name {'}}'}, {'{{'} npi {'}}'}, {'{{'} status_label {'}}'}, {'{{'} report_id {'}}'}, {'{{'} score {'}}'}, {'{{'} year {'}}'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={saveTemplate} className="flex items-center gap-2 bg-navy text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-gold hover:text-navy transition-colors">
                      <Save size={14} />
                      Save Changes
                    </button>
                    <button onClick={cancelEdit} className="text-gray-500 text-sm hover:text-red-500">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
