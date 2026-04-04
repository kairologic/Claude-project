/**
 * lib/corrections/icons.ts
 *
 * Icon mappings for correction systems.
 * Returns Unicode emoji/symbol or Lucide icon names for various correction systems.
 */

/**
 * Get a visual icon for a system name.
 * Returns an emoji or Unicode symbol suitable for display.
 */
export function getSystemIcon(systemName: string): string {
  const iconMap: Record<string, string> = {
    // Federal systems
    NPPES: '📋',
    'NPPES Registry': '📋',

    // CAQH/ProView
    CAQH: '🏥',
    'CAQH ProView': '🏥',
    ProView: '🏥',

    // Payer directories
    'Payer Directory': '🏢',
    UnitedHealthcare: '🏢',
    UHC: '🏢',
    Aetna: '🏢',
    Cigna: '🏢',
    Humana: '🏢',
    'Blue Shield': '🏢',
    'BCBS TX': '🏢',

    // Medicare/CMS
    PECOS: '🛡️',
    Medicare: '🛡️',
    CMS: '🛡️',

    // State medical boards
    'State Medical Board': '⚖️',
    TMB: '⚖️',
    'TX Medical Board': '⚖️',
    'Medical Board': '⚖️',

    // Generic fallbacks
    System: '⚙️',
    Default: '🔗',
  };

  // Try exact match first
  if (iconMap[systemName]) {
    return iconMap[systemName];
  }

  // Try case-insensitive match
  const lowerSystemName = systemName.toLowerCase();
  const matchedKey = Object.keys(iconMap).find((key) => key.toLowerCase() === lowerSystemName);
  if (matchedKey) {
    return iconMap[matchedKey];
  }

  // Try partial match
  if (lowerSystemName.includes('nppes')) return iconMap['NPPES'];
  if (lowerSystemName.includes('caqh') || lowerSystemName.includes('proview'))
    return iconMap['CAQH'];
  if (lowerSystemName.includes('payer')) return iconMap['Payer Directory'];
  if (lowerSystemName.includes('pecos') || lowerSystemName.includes('medicare'))
    return iconMap['PECOS'];
  if (lowerSystemName.includes('medical board') || lowerSystemName.includes('tmb'))
    return iconMap['State Medical Board'];

  // Default
  return iconMap['Default'];
}

/**
 * Get a Lucide icon name for a correction type.
 * Can be used with: import { [IconName] } from 'lucide-react'
 */
export function getCorrectionTypeIcon(correctionType: string): keyof typeof iconNameMap {
  const iconNameMap = {
    address: 'MapPin',
    phone: 'Phone',
    fax: 'Phone',
    email: 'Mail',
    license: 'FileEdit',
    specialty: 'Tag',
    credentials: 'ShieldCheck',
    npi: 'Tag',
    tax_id: 'FileEdit',
    credentialing: 'UserCog',
    status: 'CheckCircle',
    name: 'Tag',
    location: 'MapPin',
  } as const;

  const lowerType = correctionType.toLowerCase();
  const matchedKey = Object.keys(iconNameMap).find(
    (key) => key.toLowerCase().includes(lowerType) || lowerType.includes(key.toLowerCase()),
  ) as keyof typeof iconNameMap | undefined;

  return matchedKey || 'Tag';
}

/**
 * Color for a correction type status
 */
export function getCorrectionTypeColor(correctionType: string): string {
  const colorMap: Record<string, string> = {
    address: '#185FA5', // blue
    phone: '#185FA5',
    fax: '#185FA5',
    email: '#185FA5',
    license: '#D4A017', // gold
    specialty: '#1A9E6D', // green
    credentials: '#1A9E6D',
    npi: '#1A9E6D',
    status: '#1A9E6D',
    credentialing: '#D4A017',
  };

  return colorMap[correctionType.toLowerCase()] || '#5A6472';
}
