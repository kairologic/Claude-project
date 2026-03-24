'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import GraphicFrame, { BRAND } from './GraphicFrame';

interface DataVizChartProps {
  title: string;
  subtitle?: string;
  chartType: 'bar' | 'donut' | 'line' | 'stacked_bar';
  data: Record<string, unknown>[];
  dataKey?: string;
  nameKey?: string;
  attribution?: string;
}

const CHART_COLORS = [
  BRAND.gold, '#5B9BD5', '#70AD47', '#ED7D31', '#FFC000',
  '#4472C4', '#A5A5A5', '#255E91', '#9B2335', '#43682B',
];

export default function DataVizChart({
  title,
  subtitle,
  chartType,
  data,
  dataKey = 'count',
  nameKey = 'name',
  attribution,
}: DataVizChartProps) {
  // Normalize data keys
  const chartData = data.map((d) => {
    const name = String(d[nameKey] || d.status || d.state || d.category || d.method || d.week || '');
    const value = Number(d[dataKey] || d.count || d.value || 0);
    return { name, value };
  });

  return (
    <GraphicFrame title={title} subtitle={subtitle} attribution={attribution}>
      <div style={{ width: '100%', height: '100%' }}>
        {chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <YAxis tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Tooltip
                contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.gold}`, borderRadius: 8, color: BRAND.white }}
                labelStyle={{ color: BRAND.gold }}
              />
              <Bar dataKey="value" fill={BRAND.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {chartType === 'donut' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="75%"
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: BRAND.gray400 }}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.gold}`, borderRadius: 8, color: BRAND.white }}
              />
              <Legend
                wrapperStyle={{ color: BRAND.gray400, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}

        {chartType === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <YAxis tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Tooltip
                contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.gold}`, borderRadius: 8, color: BRAND.white }}
                labelStyle={{ color: BRAND.gold }}
              />
              <Line type="monotone" dataKey="value" stroke={BRAND.gold} strokeWidth={3} dot={{ fill: BRAND.gold, r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === 'stacked_bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <YAxis tick={{ fill: BRAND.gray400, fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.2)' }} />
              <Tooltip
                contentStyle={{ background: BRAND.navy, border: `1px solid ${BRAND.gold}`, borderRadius: 8, color: BRAND.white }}
              />
              <Bar dataKey="value" fill={BRAND.gold} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </GraphicFrame>
  );
}
