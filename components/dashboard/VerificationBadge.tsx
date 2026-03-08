/**
 * VerificationBadge.tsx
 * 
 * Dashboard component that renders delta event findings with verification-aware
 * badges and action controls.
 * 
 * This file contains BOTH Option A (Info Only) and Option B (Actionable with Warning).
 * The active mode is read from the platform_config table at runtime, or falls back
 * to the PENDING_DISPLAY_MODE constant in validation-gate-status.ts.
 * 
 * Drop this into your existing practice/[id]/page.tsx provider row rendering.
 * 
 * Usage:
 *   import { VerificationBadge, FormGenerateButton } from '@/components/dashboard/VerificationBadge';
 *   
 *   // In provider row mismatch badges:
 *   &lt;VerificationBadge 
 *     verificationStatus={deltaEvent.verification_status} 
 *     fieldName={deltaEvent.field_name}
 *   /&gt;
 *   
 *   // In provider row action buttons:
 *   &lt;FormGenerateButton
 *     deltaEvent={deltaEvent}
 *     displayMode={displayMode}
 *     onGenerate={handleGenerateForm}
 *   /&gt;
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Shield, X, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type VerificationStatus = 'verified' | 'pending_verification' | 'unverified';
type DisplayMode = 'INFO_ONLY' | 'ACTIONABLE_WITH_WARNING';

interface DeltaEvent {
  id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  confidence: number;
  verification_status: VerificationStatus;
  corroborated?: boolean;
  source?: string;
}

// ─── Verification Badge ──────────────────────────────────────────────────────

interface VerificationBadgeProps {
  verificationStatus: VerificationStatus;
  fieldName: string;
  className?: string;
}

export function VerificationBadge({
  verificationStatus,
  fieldName,
  className = '',
}: VerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (verificationStatus === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ${className}`}
      >
        {fieldName}
      </span>
    );
  }

  if (verificationStatus === 'pending_verification') {
    return (
      <span
        className={`relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 cursor-help ${className}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <AlertTriangle className="w-3 h-3" />
        {fieldName}
        <span className="text-[10px] opacity-75">pending</span>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
            This finding is awaiting verification and may change. It will become
            actionable once our verification process completes.
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
          </div>
        )}
      </span>
    );
  }

  // unverified — should rarely appear on dashboard
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 ${className}`}
    >
      {fieldName}
    </span>
  );
}

// ─── Form Generate Button ────────────────────────────────────────────────────
// This is where Option A and Option B diverge.

interface FormGenerateButtonProps {
  deltaEvent: DeltaEvent;
  displayMode: DisplayMode;
  onGenerate: (deltaEventId: string, confirmed?: boolean) => void;
  disabled?: boolean;
}

export function FormGenerateButton({
  deltaEvent,
  displayMode,
  onGenerate,
  disabled = false,
}: FormGenerateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const isVerified = deltaEvent.verification_status === 'verified';
  const isPending = deltaEvent.verification_status === 'pending_verification';

  // ── OPTION A: INFO_ONLY ──
  // Pending findings have NO generate button at all
  if (isPending && displayMode === 'INFO_ONLY') {
    return (
      <div className="flex items-center gap-2 text-amber-600 text-sm">
        <Info className="w-4 h-4" />
        <span>Awaiting verification</span>
      </div>
    );
  }

  // ── OPTION B: ACTIONABLE_WITH_WARNING ──
  // Pending findings have a generate button but it triggers a confirmation modal
  if (isPending && displayMode === 'ACTIONABLE_WITH_WARNING') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Generate Form
        </button>

        {showModal && (
          <PendingVerificationModal
            deltaEvent={deltaEvent}
            onConfirm={() => {
              setShowModal(false);
              onGenerate(deltaEvent.id, true);
            }}
            onCancel={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // ── VERIFIED: standard behavior ──
  if (isVerified) {
    return (
      <button
        onClick={() => onGenerate(deltaEvent.id)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[#0B1E3D] text-white hover:bg-[#152d54] transition-colors disabled:opacity-50"
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Generate NPPES Form
      </button>
    );
  }

  // UNVERIFIED: no action available
  return null;
}

// ─── Confirmation Modal (Option B only) ──────────────────────────────────────

interface PendingVerificationModalProps {
  deltaEvent: DeltaEvent;
  onConfirm: () => void;
  onCancel: () => void;
}

function PendingVerificationModal({
  deltaEvent,
  onConfirm,
  onCancel,
}: PendingVerificationModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Unverified Finding
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-700">
            This finding has <strong>not been fully verified</strong> by our
            validation system. Generating a form based on unverified data may
            result in incorrect NPPES submissions.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="text-xs text-amber-700 space-y-1">
              <div className="flex justify-between">
                <span className="font-medium">Field:</span>
                <span>{deltaEvent.field_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Confidence:</span>
                <span>{Math.round(deltaEvent.confidence * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className="text-amber-800 font-medium">
                  Pending Verification
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            We recommend waiting for verification to complete. If you proceed,
            please manually verify the data before submitting to NPPES.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Wait for Verification
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Generate Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Findings Count Header (updated) ─────────────────────────────────────────
// Updated version of the three metric cards from practice/[id]/page.tsx
// that separates verified vs pending mismatch counts.

interface FindingsCountHeaderProps {
  verifiedMismatches: number;
  pendingMismatches: number;
  unverifiedRecords: number;
  daysSinceLastScan: number;
  scanTier: string;
  costPerMismatch?: number;
  claimsPerMonth?: number;
}

export function FindingsCountHeader({
  verifiedMismatches,
  pendingMismatches,
  unverifiedRecords,
  daysSinceLastScan,
  scanTier,
  costPerMismatch = 118,
  claimsPerMonth = 3,
}: FindingsCountHeaderProps) {
  const totalMismatches = verifiedMismatches + pendingMismatches;
  const estimatedRisk = verifiedMismatches * costPerMismatch * claimsPerMonth;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* NPPES Mismatches — now shows verified + pending breakdown */}
      <div
        className={`rounded-xl p-4 border ${
          verifiedMismatches > 0
            ? 'bg-red-50 border-red-200'
            : pendingMismatches > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="text-sm font-medium text-gray-600 mb-1">
          NPPES Mismatches
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {totalMismatches}
          </span>
          {pendingMismatches > 0 && (
            <span className="text-sm text-amber-600 font-medium">
              ({pendingMismatches} pending)
            </span>
          )}
        </div>
        {verifiedMismatches > 0 && (
          <div className="text-xs text-red-700 mt-1">
            Est. claim risk: ${estimatedRisk.toLocaleString()}/mo
          </div>
        )}
        {verifiedMismatches === 0 && pendingMismatches > 0 && (
          <div className="text-xs text-amber-600 mt-1">
            Pending findings do not affect risk estimate
          </div>
        )}
      </div>

      {/* Unverified Records */}
      <div
        className={`rounded-xl p-4 border ${
          unverifiedRecords > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="text-sm font-medium text-gray-600 mb-1">
          Unverified Records
        </div>
        <span className="text-3xl font-bold text-gray-900">
          {unverifiedRecords}
        </span>
      </div>

      {/* Days Since Last Scan */}
      <div
        className={`rounded-xl p-4 border ${
          daysSinceLastScan > 14
            ? 'bg-amber-50 border-amber-200'
            : 'bg-green-50 border-green-200'
        }`}
      >
        <div className="text-sm font-medium text-gray-600 mb-1">
          Last Scan
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {daysSinceLastScan}
          </span>
          <span className="text-sm text-gray-500">days ago</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Tier: {scanTier}
        </div>
      </div>
    </div>
  );
}

export default VerificationBadge;
