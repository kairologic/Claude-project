'use client';

import React from 'react';
import { Linkedin, Globe, Mail } from 'lucide-react';

interface ChannelSelectorProps {
  selected: string[];
  onChange: (channels: string[]) => void;
}

const CHANNELS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: Globe,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'substack',
    label: 'Substack',
    icon: Mail,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
];

export default function ChannelSelector({ selected, onChange }: ChannelSelectorProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex gap-2">
      {CHANNELS.map((ch) => {
        const isActive = selected.includes(ch.id);
        const Icon = ch.icon;
        return (
          <button
            key={ch.id}
            onClick={() => toggle(ch.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              isActive
                ? ch.color + ' ring-2 ring-offset-1 ring-current'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Icon size={14} />
            {ch.label}
          </button>
        );
      })}
    </div>
  );
}
