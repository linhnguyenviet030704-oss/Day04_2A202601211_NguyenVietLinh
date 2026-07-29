export type ReadingStatus = 'unread' | 'reading' | 'completed' | 'cited';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface HighlightNote {
  id: string;
  text: string;
  comment?: string;
  color: HighlightColor;
  pageNumber?: number;
  createdAt: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract: string;
  fullText?: string;
  tags: string[];
  collectionId?: string;
  status: ReadingStatus;
  starred: boolean;
  rating?: number; // 1 to 5
  dateAdded: string;
  lastModified: string;
  highlights: HighlightNote[];
  notes: string;
  bibtex: string;
  pdfUrl?: string;
  publisher?: string;
  citationsCount?: number;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  paperCount?: number;
}

export type CitationStyle = 'APA' | 'IEEE' | 'BibTeX' | 'Chicago' | 'Harvard' | 'Nature';

export interface SyncStatus {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  lastSynced: string;
  deviceCount: number;
  storageUsedMb: number;
  storageLimitMb: number;
  autoSync: boolean;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'desktop' | 'tablet' | 'mobile';
  lastActive: string;
  current: boolean;
  location?: string;
}

export interface ReaderSettings {
  fontSize: 'sm' | 'md' | 'lg' | 'xl'; // 14px, 16px, 18px, 20px
  fontFamily: 'serif' | 'sans';
  lineHeight: 'compact' | 'normal' | 'relaxed';
  theme: 'clean-white' | 'warm-paper' | 'subtle-cream';
  maxWidth: 'ch65' | 'ch75' | 'ch85';
}
