
export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'code' | 'document';
  category: string;
  description?: string;
  content?: string;
  url?: string;
  uploaded_at?: string; // ISO string
  uploaded_by?: string;
  lastUpdated?: number;
  metadata?: Record<string, any>;
}
