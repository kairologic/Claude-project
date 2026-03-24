'use client';

import React from 'react';
import GraphicFrame, { BRAND } from './GraphicFrame';

interface ComparisonItem {
  label: string;
  before: string | number;
  after: string | number;
}

interface ComparisonGraphicProps {
  title: string;
  subtitle?: string;
  items: ComparisonItem[];
  beforeLabel?: string;
  afterLabel?: string;
  attribution?: string;
}

export default function ComparisonGraphic({
  title,
  subtitle,
  items,
  beforeLabel = 'Before',
  afterLabel = 'After',
  attribution,
}: ComparisonGraphicProps) {
  const visibleItems = items.slice(0, 5);

  return (
    <GraphicFrame title={title} subtitle={subtitle} attribution={attribution}>
      <div style={{ width: '100%', padding: '0 20px' }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            gap: 16,
            marginBottom: 16,
            padding: '0 16px',
          }}
        >
          <div style={{ fontSize: 13, color: BRAND.gray400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Metric
          </div>
          <div style={{ fontSize: 13, color: BRAND.gray400, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
            {beforeLabel}
          </div>
          <div style={{ fontSize: 13, color: BRAND.gold, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>
            {afterLabel}
          </div>
        </div>

        {/* Rows */}
        {visibleItems.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr',
              gap: 16,
              padding: '14px 16px',
              borderRadius: 8,
              background: i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 15, color: BRAND.white, fontWeight: 500 }}>
              {item.label}
            </div>
            <div
              style={{
                fontSize: 18,
                color: BRAND.gray400,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'line-through',
                opacity: 0.7,
              }}
            >
              {item.before}
            </div>
            <div
              style={{
                fontSize: 20,
                color: BRAND.gold,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {item.after}
            </div>
          </div>
        ))}
      </div>
    </GraphicFrame>
  );
}
