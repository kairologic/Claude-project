'use client';

import React, { useRef, useState } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import StatCard from '@/components/graphics/StatCard';
import DataVizChart from '@/components/graphics/DataVizChart';
import ProcessDiagram from '@/components/graphics/ProcessDiagram';
import ComparisonGraphic from '@/components/graphics/ComparisonGraphic';

interface GraphicData {
  id: string;
  graphic_type: string;
  config: Record<string, unknown>;
  image_url?: string;
}

interface GraphicPreviewProps {
  graphic: GraphicData;
  onCapture: (graphicId: string, dataUrl: string) => void;
}

export default function GraphicPreview({ graphic, onCapture }: GraphicPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = async () => {
    if (!containerRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(containerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: 1200,
        height: 675,
      });
      const dataUrl = canvas.toDataURL('image/png');
      onCapture(graphic.id, dataUrl);
    } catch (err) {
      console.error('Capture failed:', err);
    } finally {
      setCapturing(false);
    }
  };

  const config = graphic.config as Record<string, any>;

  const renderGraphic = () => {
    switch (graphic.graphic_type) {
      case 'stat_card':
        return (
          <StatCard
            title={config.title || ''}
            subtitle={config.subtitle}
            heroNumber={config.heroNumber || config.hero_number || ''}
            heroContext={config.heroContext || config.hero_context || ''}
            attribution={config.attribution}
          />
        );
      case 'data_viz':
        return (
          <DataVizChart
            title={config.title || ''}
            subtitle={config.subtitle}
            chartType={config.chartType || config.chart_type || 'bar'}
            data={config.data || []}
            dataKey={config.dataKey || config.data_key}
            nameKey={config.nameKey || config.name_key}
            attribution={config.attribution}
          />
        );
      case 'process_diagram':
        return (
          <ProcessDiagram
            title={config.title || ''}
            subtitle={config.subtitle}
            steps={config.steps || []}
            attribution={config.attribution}
          />
        );
      case 'comparison':
        return (
          <ComparisonGraphic
            title={config.title || ''}
            subtitle={config.subtitle}
            items={config.items || []}
            beforeLabel={config.beforeLabel || config.before_label}
            afterLabel={config.afterLabel || config.after_label}
            attribution={config.attribution}
          />
        );
      default:
        return (
          <div className="text-slate-400 text-sm p-4">
            Unknown graphic type: {graphic.graphic_type}
          </div>
        );
    }
  };

  return (
    <div>
      {/* Scaled-down preview */}
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          aspectRatio: '1200/675',
          overflow: 'hidden',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          position: 'relative',
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: 1200,
            height: 675,
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
          }}
        >
          {renderGraphic()}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleCapture}
          disabled={capturing}
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 transition-colors"
        >
          {capturing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {capturing ? 'Capturing...' : 'Capture PNG'}
        </button>
      </div>
    </div>
  );
}
