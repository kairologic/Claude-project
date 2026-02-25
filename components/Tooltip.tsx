'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
}

export default function Tooltip({ content, children, position = 'top', maxWidth = 260 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = trigger.top - tooltip.height - gap;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2;
        break;
      case 'bottom':
        top = trigger.bottom + gap;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2;
        left = trigger.left - tooltip.width - gap;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2;
        left = trigger.right + gap;
        break;
    }

    // Clamp to viewport
    if (left < 8) left = 8;
    if (left + tooltip.width > window.innerWidth - 8) left = window.innerWidth - tooltip.width - 8;
    if (top < 8) {
      top = trigger.bottom + gap;
    }

    setCoords({ top, left });
  }, [visible, position]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex items-center cursor-help"
        aria-describedby={visible ? 'kl-tooltip' : undefined}
      >
        {children}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="ml-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </span>
      {visible && (
        <div
          ref={tooltipRef}
          id="kl-tooltip"
          role="tooltip"
          className="fixed z-[9999] px-3 py-2 rounded-lg text-xs text-slate-200 leading-relaxed shadow-xl pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            maxWidth,
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}
