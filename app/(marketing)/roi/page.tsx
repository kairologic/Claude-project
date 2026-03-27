'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * #83 — One-page ROI Calculator
 *
 * Inputs: # of providers, current hours/week on data management, hourly cost
 * Outputs: annual cost of manual work, KairoLogic cost, net savings, ROI %
 */

const DEFAULTS = {
  providers: 15,
  hoursPerWeek: 6,
  hourlyCost: 45,
};

// Average: 30% of payer directory entries have at least one mismatch
const MISMATCH_RATE = 0.3;
// Average cost of a denied claim due to data mismatch
const DENIED_CLAIM_COST = 250;
// Average denied claims per mismatched provider per year
const DENIED_CLAIMS_PER_MISMATCH = 4;
// KairoLogic Protect price per provider/month
const KL_PRICE_PER_PROVIDER = 99;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function ROICalculatorPage() {
  const [providers, setProviders] = useState(DEFAULTS.providers);
  const [hours, setHours] = useState(DEFAULTS.hoursPerWeek);
  const [rate, setRate] = useState(DEFAULTS.hourlyCost);

  // Calculations
  const annualLaborCost = hours * rate * 52;
  const mismatchedProviders = Math.round(providers * MISMATCH_RATE);
  const annualDeniedClaimCost = mismatchedProviders * DENIED_CLAIMS_PER_MISMATCH * DENIED_CLAIM_COST;
  const totalCurrentCost = annualLaborCost + annualDeniedClaimCost;
  const kairoCost = providers * KL_PRICE_PER_PROVIDER * 12;
  const savings = totalCurrentCost - kairoCost;
  const roiPercent = kairoCost > 0 ? Math.round((savings / kairoCost) * 100) : 0;

  return (
    <>
      {/* Hero */}
      <section style={{ padding: '80px 0 40px', textAlign: 'center' }}>
        <div className="m-container">
          <p style={{
            color: '#D4A017', fontWeight: 600, fontSize: 13,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>ROI Calculator</p>
          <h1 style={{
            fontSize: 40, fontWeight: 800, color: '#0F1E2E',
            lineHeight: 1.15, margin: '0 0 16px',
          }}>
            How much is provider data drift costing you?
          </h1>
          <p style={{
            fontSize: 17, color: '#5A6472', maxWidth: 560,
            margin: '0 auto', lineHeight: 1.6,
          }}>
            Adjust the sliders to see your current cost and potential savings with KairoLogic.
          </p>
        </div>
      </section>

      {/* Calculator */}
      <section style={{ padding: '20px 0 80px' }}>
        <div className="m-container" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 40,
          }}>
            {/* Left: Inputs */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid #E8EAED',
              borderRadius: 16,
              padding: 32,
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F1E2E', margin: '0 0 28px' }}>
                Your practice
              </h2>

              <SliderInput
                label="Number of providers"
                value={providers}
                min={1}
                max={200}
                step={1}
                display={`${providers}`}
                onChange={setProviders}
              />
              <SliderInput
                label="Hours per week on data management"
                value={hours}
                min={1}
                max={40}
                step={1}
                display={`${hours} hrs`}
                onChange={setHours}
              />
              <SliderInput
                label="Hourly cost (staff + overhead)"
                value={rate}
                min={20}
                max={120}
                step={5}
                display={formatCurrency(rate)}
                onChange={setRate}
              />

              <div style={{
                background: '#FDF6E3',
                border: '1px solid #D4A017',
                borderRadius: 10,
                padding: 16,
                marginTop: 24,
                fontSize: 13,
                color: '#0F1E2E',
                lineHeight: 1.6,
              }}>
                <strong>Assumptions:</strong> {Math.round(MISMATCH_RATE * 100)}% payer directory
                mismatch rate, {DENIED_CLAIMS_PER_MISMATCH} denied claims per mismatched
                provider/year, {formatCurrency(DENIED_CLAIM_COST)} average denied claim cost.
              </div>
            </div>

            {/* Right: Results */}
            <div>
              <div style={{
                background: '#0F1E2E',
                borderRadius: 16,
                padding: 32,
                marginBottom: 20,
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#8BA3B8', margin: '0 0 24px' }}>
                  Annual comparison
                </h2>

                <ResultRow
                  label="Manual labor cost"
                  value={formatCurrency(annualLaborCost)}
                  color="#D64545"
                  sublabel={`${hours} hrs/wk × $${rate}/hr × 52 weeks`}
                />
                <ResultRow
                  label="Denied claims from mismatches"
                  value={formatCurrency(annualDeniedClaimCost)}
                  color="#D64545"
                  sublabel={`${mismatchedProviders} mismatched providers × ${DENIED_CLAIMS_PER_MISMATCH} claims × $${DENIED_CLAIM_COST}`}
                />
                <div style={{
                  borderTop: '1px solid #1A3249',
                  margin: '16px 0',
                  paddingTop: 16,
                }}>
                  <ResultRow
                    label="Total current cost"
                    value={formatCurrency(totalCurrentCost)}
                    color="#FFFFFF"
                    bold
                  />
                </div>

                <div style={{
                  background: '#1A3249',
                  borderRadius: 10,
                  padding: 16,
                  margin: '20px 0 0',
                }}>
                  <ResultRow
                    label="KairoLogic Protect"
                    value={formatCurrency(kairoCost)}
                    color="#D4A017"
                    sublabel={`${providers} providers × $${KL_PRICE_PER_PROVIDER}/mo × 12`}
                  />
                </div>
              </div>

              {/* Savings card */}
              <div style={{
                background: savings > 0 ? '#E6F7F2' : '#FDEEEE',
                border: `2px solid ${savings > 0 ? '#1A9E6D' : '#D64545'}`,
                borderRadius: 16,
                padding: 28,
                textAlign: 'center',
              }}>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: savings > 0 ? '#1A9E6D' : '#D64545',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 4px',
                }}>
                  {savings > 0 ? 'Annual savings' : 'Additional investment'}
                </p>
                <p style={{
                  fontSize: 42, fontWeight: 800,
                  color: savings > 0 ? '#1A9E6D' : '#D64545',
                  margin: '0 0 4px', lineHeight: 1,
                }}>
                  {formatCurrency(Math.abs(savings))}
                </p>
                <p style={{
                  fontSize: 16, fontWeight: 700,
                  color: '#0F1E2E', margin: 0,
                }}>
                  {roiPercent > 0 ? `${roiPercent}% ROI` : 'ROI grows with scale'}
                </p>
              </div>

              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link href="/contact" style={{
                  display: 'inline-block',
                  background: '#D4A017',
                  color: '#0F1E2E',
                  padding: '14px 32px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: 'none',
                }}>
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '60px 0',
        background: '#F4F5F7',
        textAlign: 'center',
      }}>
        <div className="m-container">
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#0F1E2E', margin: '0 0 8px' }}>
            See real results in your first week
          </h2>
          <p style={{ fontSize: 16, color: '#5A6472', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
            We scan your providers within 24 hours and show you exactly where data is out of sync.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href="/contact" style={{
              display: 'inline-block',
              background: '#0F1E2E',
              color: '#FFFFFF',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}>
              Get Free Trial
            </Link>
            <Link href="/pricing" style={{
              display: 'inline-block',
              background: '#FFFFFF',
              color: '#0F1E2E',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              border: '1px solid #E8EAED',
            }}>
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────

function SliderInput({
  label, value, min, max, step, display, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: '#0F1E2E' }}>
          {label}
        </label>
        <span style={{
          fontSize: 16, fontWeight: 700, color: '#D4A017',
          background: '#FDF6E3', padding: '2px 10px', borderRadius: 6,
        }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          appearance: 'none',
          background: `linear-gradient(to right, #D4A017 ${((value - min) / (max - min)) * 100}%, #E8EAED ${((value - min) / (max - min)) * 100}%)`,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

function ResultRow({
  label, value, color, sublabel, bold,
}: {
  label: string;
  value: string;
  color: string;
  sublabel?: string;
  bold?: boolean;
}) {
  return (
    <div style={{ marginBottom: sublabel ? 14 : 8 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: bold ? 15 : 13,
          color: '#8BA3B8',
          fontWeight: bold ? 700 : 400,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: bold ? 24 : 18,
          fontWeight: 700,
          color,
        }}>
          {value}
        </span>
      </div>
      {sublabel && (
        <p style={{
          fontSize: 11,
          color: '#5A6472',
          margin: '2px 0 0',
        }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
