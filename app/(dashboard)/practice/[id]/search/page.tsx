'use client';

import SearchBar from '@/components/dashboard/SearchBar';
import { useParams } from 'next/navigation';

export default function SearchPage() {
  const params = useParams();
  const practiceId = params.id as string;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F1E2E', marginBottom: 8 }}>
        Natural Language Search
      </h1>
      <p style={{ fontSize: 14, color: '#5A6472', marginBottom: 24 }}>
        Ask questions about your provider data in plain English. Try &quot;Show me providers with address mismatches in Texas&quot; or &quot;Which providers have expiring credentials?&quot;
      </p>
      <SearchBar practiceId={practiceId} />
    </div>
  );
}
