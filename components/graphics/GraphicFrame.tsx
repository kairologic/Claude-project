'use client';

import React from 'react';

interface GraphicFrameProps {
  title: string;
  subtitle?: string;
  attribution?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
}

const BRAND = {
  navy: '#1B2A4A',
  navyMid: '#1A3249',
  gold: '#D4A017',
  goldLight: '#F0C040',
  white: '#FFFFFF',
  gray100: '#F4F5F7',
  gray400: '#9AA3AE',
  gray600: '#5A6472',
};

export default function GraphicFrame({
  title,
  subtitle,
  attribution,
  children,
  width = 1200,
  height = 675,
}: GraphicFrameProps) {
  return (
    <div
      className="graphic-frame"
      style={{
        width,
        height,
        background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.navyMid} 100%)`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        position: 'relative',
        color: BRAND.white,
      }}
    >
      {/* Header */}
      <div style={{ padding: '32px 40px 16px 40px', flexShrink: 0 }}>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            lineHeight: 1.3,
            color: BRAND.white,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: 16,
              color: BRAND.gray400,
              margin: '8px 0 0',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          padding: '8px 40px 16px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {children}
      </div>

      {/* Footer with attribution + logo */}
      <div
        style={{
          padding: '12px 40px 20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        {attribution && <span style={{ fontSize: 12, color: BRAND.gray400 }}>{attribution}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.white }}>Kairo</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: BRAND.gold }}>Logic</span>
        </div>
      </div>

      {/* Gold accent line at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${BRAND.gold} 0%, ${BRAND.goldLight} 100%)`,
        }}
      />
    </div>
  );
}

export { BRAND };
