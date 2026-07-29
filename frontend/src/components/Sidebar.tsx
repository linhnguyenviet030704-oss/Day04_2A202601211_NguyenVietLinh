import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  BookMarked,
  Star,
  Clock,
  CheckCircle2,
  Tag,
  Plus,
  Cloud,
  Layers,
  Sparkles,
  FileCode,
  HardDrive
} from 'lucide-react';
import { Collection, Paper } from '../types';

interface SidebarProps {
  collections: Collection[];
  activeCollectionId: string | null;
  setActiveCollectionId: (id: string | null) => void;
  activeFilter: 'all' | 'starred' | 'unread' | 'reading' | 'completed' | 'tag';
  setActiveFilter: (filter: 'all' | 'starred' | 'unread' | 'reading' | 'completed' | 'tag') => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  papers: Paper[];
  allTags: string[];
  onCreateCollection: (name: string, description?: string) => void;
  onOpenSyncModal: () => void;
  onOpenAiAssistant: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collections,
  activeCollectionId,
  setActiveCollectionId,
  activeFilter,
  setActiveFilter,
  activeTag,
  setActiveTag,
  papers,
  allTags,
  onCreateCollection,
  onOpenSyncModal,
  onOpenAiAssistant,
}) => {
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  const handleCreateCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onCreateCollection(newColName.trim(), newColDesc.trim());
    setNewColName('');
    setNewColDesc('');
    setIsCreatingCollection(false);
  };

  const getPaperCount = (type: 'all' | 'starred' | 'unread' | 'reading' | 'completed') => {
    switch (type) {
      case 'all': return papers.length;
      case 'starred': return papers.filter(p => p.starred).length;
      case 'unread': return papers.filter(p => p.status === 'unread').length;
      case 'reading': return papers.filter(p => p.status === 'reading').length;
      case 'completed': return papers.filter(p => p.status === 'completed').length;
      default: return 0;
    }
  };

  return (
    <aside className="w-64 bg-slate-50/90 border-r border-slate-200/80 p-4 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="space-y-6">

        {/* Main Navigation */}
        <div className="space-y-1">
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Thư viện Nghiên cứu
          </p>

          <button
            onClick={() => {
              setActiveFilter('all');
              setActiveCollectionId(null);
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeFilter === 'all' && !activeCollectionId && !activeTag
                ? 'bg-slate-900 text-white font-semibold shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookMarked className="w-4 h-4 text-indigo-400" />
              <span>Tất cả tài liệu</span>
            </div>
            <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
              activeFilter === 'all' && !activeCollectionId && !activeTag
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-200/80 text-slate-600'
            }`}>
              {getPaperCount('all')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('starred');
              setActiveCollectionId(null);
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeFilter === 'starred'
                ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Quan trọng / Đánh dấu</span>
            </div>
            <span className="text-[11px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
              {getPaperCount('starred')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('reading');
              setActiveCollectionId(null);
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeFilter === 'reading'
                ? 'bg-blue-50 text-blue-900 border border-blue-200/80 font-semibold'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Đang đọc & Ghi chú</span>
            </div>
            <span className="text-[11px] font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
              {getPaperCount('reading')}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveFilter('completed');
              setActiveCollectionId(null);
              setActiveTag(null);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
              activeFilter === 'completed'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-semibold'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Đã hoàn thành</span>
            </div>
            <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              {getPaperCount('completed')}
            </span>
          </button>
        </div>

        {/* Collections / Folders */}
        <div className="space-y-2 pt-2 border-t border-slate-200/80">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Bộ sưu tập / Chuyên đề
            </span>
            <button
              onClick={() => setIsCreatingCollection(!isCreatingCollection)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded transition-all"
              title="Tạo bộ sưu tập mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Collection Inline Form */}
          {isCreatingCollection && (
            <form onSubmit={handleCreateCollectionSubmit} className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-2">
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="Tên bộ sưu tập..."
                className="w-full text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-400"
                autoFocus
              />
              <input
                type="text"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                placeholder="Mô tả ngắn (tùy chọn)..."
                className="w-full text-[11px] px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingCollection(false)}
                  className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 text-[11px] bg-slate-900 text-white font-medium rounded hover:bg-slate-800"
                >
                  Tạo
                </button>
              </div>
            </form>
          )}

          {/* Collections List */}
          <div className="space-y-0.5">
            {collections.map((col) => {
              const count = papers.filter(p => p.collectionId === col.id).length;
              const isSelected = activeCollectionId === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setActiveCollectionId(col.id);
                    setActiveFilter('all');
                    setActiveTag(null);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    isSelected
                      ? 'bg-slate-200/90 text-slate-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: col.color || '#64748b' }} />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 px-1.5">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags Filtering */}
        {allTags.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200/80">
            <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Thẻ Phân loại
            </span>
            <div className="flex flex-wrap gap-1 px-1">
              {allTags.map((tag) => {
                const isSelected = activeTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      if (isSelected) {
                        setActiveTag(null);
                      } else {
                        setActiveTag(tag);
                        setActiveFilter('all');
                        setActiveCollectionId(null);
                      }
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-md transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Panel: AI Assistant & Cloud Sync */}
      <div className="pt-4 border-t border-slate-200/80 space-y-2">
        <button
          onClick={onOpenAiAssistant}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-800 bg-linear-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/70 rounded-lg transition-all shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Trợ lý Phân tích AI Gemini</span>
        </button>

        <button
          onClick={onOpenSyncModal}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition-all"
        >
          <div className="flex items-center gap-2">
            <Cloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Đồng bộ Đám mây</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Đã bật
          </span>
        </button>
      </div>

    </aside>
  );
};
