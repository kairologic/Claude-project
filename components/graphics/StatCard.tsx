'use client';

import React from 'react';
import GraphicFrame, { BRAND } from './GraphicFrame';

interface StatCardProps {
  title: string;
  subtitle?: string;
  heroNumber: string;
  heroContext: string;
  attribution?: string;
}

export default function StatCard({
  title,
  subtitle,
  heroNumber,
  heroContext,
  attribution,
}: StatCardProps) {
  return (
    <GraphicFrame title={title} subtitle={subtitle} attribution={attribution}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: BRAND.gold,
            lineHeight: 1,
            letterSpacing: '-2px',
          }}
        >
          {heroNumber}
        </div>
        <div
          style={{
            fontSize: 22,
            color: BRAND.white,
            marginTop: 16,
            fontWeight: 500,
            opacity: 0.9,
            maxWidth: 600,
            margin: '16px auto 0',
            lineHeight: 1.4,
          }}
        >
          {heroContext}
        </div>
      </div>
    </GraphicFrame>
  );
}
