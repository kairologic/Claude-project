'use client';

import { colors } from '@/lib/design-tokens';

interface AuthorCardProps {
  name?: string;
  bio?: string;
  avatar_url?: string | null;
}

export default function AuthorCard({
  name = 'KairoLogic Team',
  bio = 'Building the future of provider data intelligence.',
  avatar_url,
}: AuthorCardProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        padding: '24px',
        borderRadius: '12px',
        backgroundColor: colors.gray100,
        border: `1px solid ${colors.gray200}`,
        marginTop: '40px',
      }}
    >
      {/* Avatar */}
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={name}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: colors.gold,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            fontSize: '20px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: colors.navy,
            margin: 0,
          }}
        >
          {name}
        </h4>
        <p
          style={{
            fontSize: '14px',
            color: colors.gray600,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {bio}
        </p>
      </div>
    </div>
  );
}
