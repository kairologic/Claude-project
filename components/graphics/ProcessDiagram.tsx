'use client';

import React from 'react';
import GraphicFrame, { BRAND } from './GraphicFrame';

interface ProcessStep {
  label: string;
  detail?: string;
}

interface ProcessDiagramProps {
  title: string;
  subtitle?: string;
  steps: ProcessStep[];
  attribution?: string;
}

export default function ProcessDiagram({
  title,
  subtitle,
  steps,
  attribution,
}: ProcessDiagramProps) {
  const maxSteps = Math.min(steps.length, 6);
  const visibleSteps = steps.slice(0, maxSteps);

  return (
    <GraphicFrame title={title} subtitle={subtitle} attribution={attribution}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          gap: 0,
          padding: '0 20px',
        }}
      >
        {visibleSteps.map((step, i) => (
          <React.Fragment key={i}>
            {/* Step node */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 120,
                maxWidth: 160,
                flex: 1,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: i === 0
                    ? `linear-gradient(135deg, ${BRAND.gold} 0%, ${BRAND.goldLight} 100%)`
                    : 'rgba(255,255,255,0.08)',
                  border: i === 0 ? 'none' : `2px solid ${BRAND.gold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: i === 0 ? BRAND.navy : BRAND.gold,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: BRAND.white,
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {step.label}
              </div>
              {step.detail && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: BRAND.gray400,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    maxWidth: 140,
                  }}
                >
                  {step.detail}
                </div>
              )}
            </div>

            {/* Arrow between steps */}
            {i < visibleSteps.length - 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  marginTop: -30,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 2,
                    background: `linear-gradient(90deg, ${BRAND.gold}, ${BRAND.goldLight})`,
                  }}
                />
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderLeft: `8px solid ${BRAND.goldLight}`,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </GraphicFrame>
  );
}
