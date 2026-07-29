import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  Collection, 
  CitationStyle, 
  SyncStatus, 
  DeviceInfo 
} from './types';
import { INITIAL_PAPERS, INITIAL_COLLECTIONS } from './data/samplePapers';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PaperList } from './components/PaperList';
import { PaperReaderModal } from './components/PaperReaderModal';
import { AddPaperModal } from './components/AddPaperModal';
import { ExportModal } from './components/ExportModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { CitationToolsModal } from './components/CitationToolsModal';
import { AiAssistantModal } from './components/AiAssistantModal';
import { downloadBibTeXFile } from './utils/citation';

export default function App() {
  // Papers Local Persistence
  const [papers, setPapers] = useState<Paper[]>(() => {
    try {
      const saved = localStorage.getItem('scholarhub_papers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load papers from localStorage:', e);
    }
    return INITIAL_PAPERS;
  });
  const [backendReady, setBackendReady] = useState(false);

  // Collections Local Persistence
  const [collections, setCollections] = useState<Collection[]>(() => {
    try {
      const saved = localStorage.getItem('scholarhub_collections');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
    return INITIAL_COLLECTIONS;
  });

  // Selected Default Citation Style
  const [selectedCitationStyle, setSelectedCitationStyle] = useState<CitationStyle>('APA');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'unread' | 'reading' | 'completed' | 'tag'>('all');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Modals & Reader States
  const [selectedPaperForReader, setSelectedPaperForReader] = useState<Paper | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCitationToolsOpen, setIsCitationToolsOpen] = useState(false);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Cloud Sync Status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'synced',
    lastSynced: new Date().toISOString(),
    deviceCount: 3,
    storageUsedMb: 142.8,
    storageLimitMb: 5000.0,
    autoSync: true,
  });

  const [devices, setDevices] = useState<DeviceInfo[]>([
    { id: 'dev-1', name: 'MacBook Pro M3 (Máy tính này)', type: 'desktop', lastActive: 'Vừa xong', current: true, location: 'Hà Nội, Việt Nam' },
    { id: 'dev-2', name: 'iPad Pro 12.9" (Scholar Reader)', type: 'tablet', lastActive: '5 phút trước', current: false, location: 'Hà Nội, Việt Nam' },
    { id: 'dev-3', name: 'iPhone 16 Pro (Scholar Sync)', type: 'mobile', lastActive: '1 giờ trước', current: false, location: 'Đà Nẵng, Việt Nam' },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadLibrary() {
      try {
        const [libraryRes, syncRes] = await Promise.all([
          fetch('/api/library'),
          fetch('/api/sync/status'),
        ]);
        const libraryData = await libraryRes.json();
        const syncData = await syncRes.json();

        if (cancelled) return;
        if (libraryData.library) {
          setPapers(libraryData.library.papers || INITIAL_PAPERS);
          setCollections(libraryData.library.collections || INITIAL_COLLECTIONS);
        }
        if (syncData.syncState) setSyncStatus(syncData.syncState);
        if (syncData.devices) setDevices(syncData.devices);
      } catch (e) {
        console.error('Failed to load backend library, using localStorage:', e);
      } finally {
        if (!cancelled) setBackendReady(true);
      }
    }

    loadLibrary();
    return () => { cancelled = true; };
  }, []);

  // Persist papers & collections
  useEffect(() => {
    if (!backendReady) return;
    try {
      localStorage.setItem('scholarhub_papers', JSON.stringify(papers));
      localStorage.setItem('scholarhub_collections', JSON.stringify(collections));
    } catch (e) {
      console.error('Failed to save library:', e);
    }
    fetch('/api/library', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papers, collections }),
    }).catch((e) => console.error('Failed to save backend library:', e));
  }, [papers, collections, backendReady]);

  // Compute all unique tags
  const allTags = Array.from(new Set(papers.flatMap(p => p.tags || [])));

  // Filter papers logic
  const filteredPapers = papers.filter((paper) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = paper.title.toLowerCase().includes(q);
      const matchAuthor = paper.authors.some(a => a.toLowerCase().includes(q));
      const matchJournal = paper.journal.toLowerCase().includes(q);
      const matchDoi = paper.doi?.toLowerCase().includes(q);
      const matchAbstract = paper.abstract.toLowerCase().includes(q);
      const matchTag = paper.tags.some(t => t.toLowerCase().includes(q));

      if (!matchTitle && !matchAuthor && !matchJournal && !matchDoi && !matchAbstract && !matchTag) {
        return false;
      }
    }

    // Collection filter
    if (activeCollectionId) {
      return paper.collectionId === activeCollectionId;
    }

    // Tag filter
    if (activeTag) {
      return paper.tags.includes(activeTag);
    }

    // Status / Starred filter
    switch (activeFilter) {
      case 'starred': return paper.starred;
      case 'unread': return paper.status === 'unread';
      case 'reading': return paper.status === 'reading';
      case 'completed': return paper.status === 'completed';
      case 'all': default: return true;
    }
  });

  // Action Handlers
  const handleAddPaper = (newPaper: Paper) => {
    setPapers([newPaper, ...papers]);
  };

  const handleUpdatePaper = (updatedPaper: Paper) => {
    setPapers(papers.map(p => p.id === updatedPaper.id ? updatedPaper : p));
    if (selectedPaperForReader?.id === updatedPaper.id) {
      setSelectedPaperForReader(updatedPaper);
    }
  };

  const handleToggleStar = (paperId: string) => {
    setPapers(papers.map(p => p.id === paperId ? { ...p, starred: !p.starred } : p));
  };

  const handleDeletePaper = (paperId: string) => {
    setPapers(papers.filter(p => p.id !== paperId));
    if (selectedPaperForReader?.id === paperId) {
      setSelectedPaperForReader(null);
    }
  };

  const handleUpdateStatus = (paperId: string, status: Paper['status']) => {
    setPapers(papers.map(p => p.id === paperId ? { ...p, status } : p));
  };

  const handleCreateCollection = (name: string, description?: string) => {
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      name,
      description,
      color: '#3b82f6',
      icon: 'Folder',
    };
    setCollections([...collections, newCol]);
  };

  const handleBatchExportBibTeX = (selectedIds: string[]) => {
    const selected = papers.filter(p => selectedIds.includes(p.id));
    downloadBibTeXFile(selected);
  };

  const handleBatchDelete = (selectedIds: string[]) => {
    setPapers(papers.filter(p => !selectedIds.includes(p.id)));
  };

  const handleTriggerCloudSync = async () => {
    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    try {
      const res = await fetch('/api/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papers, collections }),
      });
      const data = await res.json();
      if (data.syncState) setSyncStatus(data.syncState);
    } catch (e) {
      console.log('Simulated offline mode or local sync');
    } finally {
      setTimeout(() => {
        setSyncStatus(prev => ({
          ...prev,
          status: 'synced',
          lastSynced: new Date().toISOString(),
        }));
      }, 1000);
    }
  };

  const handleExportBackupJson = () => {
    const backupData = {
      version: '2.6',
      exportDate: new Date().toISOString(),
      papers,
      collections,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholarhub_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine Title for current view
  const getFilterTitle = () => {
    if (activeCollectionId) {
      const col = collections.find(c => c.id === activeCollectionId);
      return col ? `Bộ sưu tập: ${col.name}` : 'Bộ sưu tập';
    }
    if (activeTag) {
      return `Thẻ phân loại: #${activeTag}`;
    }
    switch (activeFilter) {
      case 'starred': return 'Tài liệu Quan trọng / Đã đánh dấu';
      case 'reading': return 'Hàng đợi Đang đọc & Ghi chú';
      case 'completed': return 'Tài liệu Đã đọc hoàn thành';
      case 'unread': return 'Tài liệu Chưa đọc';
      default: return 'Tất cả Tài liệu Khoa học';
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        syncStatus={syncStatus}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenCitationTools={() => setIsCitationToolsOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        selectedCitationStyle={selectedCitationStyle}
        setSelectedCitationStyle={setSelectedCitationStyle}
        totalPapersCount={papers.length}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          collections={collections}
          activeCollectionId={activeCollectionId}
          setActiveCollectionId={setActiveCollectionId}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          papers={papers}
          allTags={allTags}
          onCreateCollection={handleCreateCollection}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        />

        {/* Papers Main View Container */}
        <PaperList
          papers={filteredPapers}
          collections={collections}
          selectedCitationStyle={selectedCitationStyle}
          onSelectPaper={(paper) => setSelectedPaperForReader(paper)}
          onToggleStar={handleToggleStar}
          onDeletePaper={handleDeletePaper}
          onUpdateStatus={handleUpdateStatus}
          onBatchExportBibTeX={handleBatchExportBibTeX}
          onBatchDelete={handleBatchDelete}
          onAnalyzeWithAi={(paper) => {
            setSelectedPaperForReader(paper);
          }}
          activeFilterTitle={getFilterTitle()}
        />

      </div>

      {/* --- MODALS & READER --- */}

      {/* 1. Paper Reader Modal */}
      {selectedPaperForReader && (
        <PaperReaderModal
          paper={selectedPaperForReader}
          onClose={() => setSelectedPaperForReader(null)}
          onUpdatePaper={handleUpdatePaper}
          selectedCitationStyle={selectedCitationStyle}
        />
      )}

      {/* 2. Add Paper Modal */}
      {isAddModalOpen && (
        <AddPaperModal
          onClose={() => setIsAddModalOpen(false)}
          onAddPaper={handleAddPaper}
          collections={collections}
        />
      )}

      {/* 3. Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          papers={papers}
          selectedCitationStyle={selectedCitationStyle}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {/* 4. Cloud Sync Modal */}
      {isSyncModalOpen && (
        <CloudSyncModal
          syncStatus={syncStatus}
          devices={devices}
          onTriggerSync={handleTriggerCloudSync}
          onClose={() => setIsSyncModalOpen(false)}
          onExportBackupJson={handleExportBackupJson}
        />
      )}

      {/* 5. Citation Tools Modal */}
      {isCitationToolsOpen && (
        <CitationToolsModal
          papers={papers}
          selectedCitationStyle={selectedCitationStyle}
          onClose={() => setIsCitationToolsOpen(false)}
        />
      )}

      {/* 6. AI Assistant Modal */}
      {isAiAssistantOpen && (
        <AiAssistantModal
          papers={papers}
          onClose={() => setIsAiAssistantOpen(false)}
          onAddPaper={handleAddPaper}
        />
      )}

    </div>
  );
}
