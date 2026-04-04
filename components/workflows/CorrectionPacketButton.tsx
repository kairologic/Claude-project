'use client';

/**
 * components/workflows/CorrectionPacketButton.tsx
 *
 * Client component that provides a button to download correction report PDF.
 * Includes filter options (All/Outstanding/Completed) and date range selection.
 */

import { useState } from 'react';
import { colors } from '@/lib/design-tokens';

interface CorrectionPacketButtonProps {
  practiceId: string;
}

type FilterType = 'all' | 'outstanding' | 'completed';
type DateRangeType = 'this-month' | 'last-month' | 'custom';

interface DateRangeValue {
  start: string;
  end: string;
}

/**
 * Get date range for quick selections
 */
function getDateRange(
  type: DateRangeType,
  customRange?: DateRangeValue,
): DateRangeValue | undefined {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (type) {
    case 'this-month': {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: startDate.toISOString().split('T')[0],
        end: today,
      };
    }

    case 'last-month': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
    }

    case 'custom':
      return customRange;

    default:
      return undefined;
  }
}

/**
 * CorrectionPacketButton component
 */
export function CorrectionPacketButton({ practiceId }: CorrectionPacketButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeType>('this-month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Get date range
      let dateRange: DateRangeValue | undefined;
      if (selectedDateRange === 'custom') {
        if (!customStart || !customEnd) {
          setError('Please select both start and end dates');
          setIsLoading(false);
          return;
        }
        dateRange = { start: customStart, end: customEnd };
      } else {
        dateRange = getDateRange(selectedDateRange);
      }

      // Call API
      const response = await fetch('/api/corrections/export-packet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          practiceId,
          filter: selectedFilter,
          dateRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `Error: ${response.statusText}`;
        setError(errorMsg);
        return;
      }

      // Get filename from content-disposition header
      const contentDisposition = response.headers.get('content-disposition') || '';
      let filename = 'correction-packet.pdf';
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }

      // Convert response to blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close dropdown after successful download
      setIsOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download correction packet';
      setError(message);
      console.error('[CorrectionPacketButton] Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getDateRangeLabel = (): string => {
    switch (selectedDateRange) {
      case 'this-month':
        return 'This Month';
      case 'last-month':
        return 'Last Month';
      case 'custom':
        return 'Custom Range';
      default:
        return 'Select Date Range';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: colors.navy,
          color: colors.gold,
          border: `1px solid ${colors.gold}`,
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.navyMid;
          e.currentTarget.style.boxShadow = `0 0 12px ${colors.gold}40`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = colors.navy;
          e.currentTarget.style.boxShadow = 'none';
        }}
        disabled={isLoading}
      >
        {/* Download Icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {isLoading ? 'Generating...' : 'Download Correction Report'}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: colors.white,
            border: `1px solid ${colors.gray300}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '300px',
            padding: '12px',
          }}
        >
          {error && (
            <div
              style={{
                padding: '8px 12px',
                marginBottom: '12px',
                backgroundColor: '#FDEEEE',
                border: `1px solid ${colors.red}`,
                borderRadius: '4px',
                fontSize: '13px',
                color: colors.red,
              }}
            >
              {error}
            </div>
          )}

          {/* Filter Section */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: colors.navy,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Filter
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['all', 'outstanding', 'completed'] as const).map((filterOption) => (
                <label
                  key={filterOption}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <input
                    type="radio"
                    name="filter"
                    value={filterOption}
                    checked={selectedFilter === filterOption}
                    onChange={(e) => setSelectedFilter(e.target.value as FilterType)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ color: colors.gray600 }}>
                    {filterOption === 'all' && 'All Corrections'}
                    {filterOption === 'outstanding' && 'Outstanding Only'}
                    {filterOption === 'completed' && 'Completed Only'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Section */}
          <div
            style={{
              marginBottom: '16px',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.gray200}`,
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: colors.navy,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Date Range
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(['this-month', 'last-month', 'custom'] as const).map((dateOption) => (
                <label
                  key={dateOption}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: '4px 0',
                  }}
                >
                  <input
                    type="radio"
                    name="dateRange"
                    value={dateOption}
                    checked={selectedDateRange === dateOption}
                    onChange={(e) => setSelectedDateRange(e.target.value as DateRangeType)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  <span style={{ color: colors.gray600 }}>
                    {dateOption === 'this-month' && 'This Month'}
                    {dateOption === 'last-month' && 'Last Month'}
                    {dateOption === 'custom' && 'Custom Range'}
                  </span>
                </label>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {selectedDateRange === 'custom' && (
              <div
                style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
              >
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="Start date"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="End date"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.gray200}`,
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: colors.gray100,
                color: colors.gray600,
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.gray200;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.gray100;
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: colors.navy,
                color: colors.gold,
                border: 'none',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = colors.navyMid;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.navy;
              }}
            >
              {isLoading ? 'Generating...' : 'Download'}
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
