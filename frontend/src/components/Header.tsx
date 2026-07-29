import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  CloudCheck, 
  RefreshCw, 
  Download, 
  Sparkles, 
  Laptop, 
  FileText,
  Bookmark
} from 'lucide-react';
import { SyncStatus, CitationStyle } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  syncStatus: SyncStatus;
  onOpenAddModal: () => void;
  onOpenExportModal: () => void;
  onOpenSyncModal: () => void;
  onOpenCitationTools: () => void;
  onOpenAiAssistant?: () => void;
  selectedCitationStyle: CitationStyle;
  setSelectedCitationStyle: (style: CitationStyle) => void;
  totalPapersCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  syncStatus,
  onOpenAddModal,
  onOpenExportModal,
  onOpenSyncModal,
  onOpenCitationTools,
  onOpenAiAssistant,
  selectedCitationStyle,
  setSelectedCitationStyle,
  totalPapersCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3 min-w-fit">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                ScholarHub
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-mono font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                v2.6 Research
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans hidden sm:block">
              Quản lý tài liệu khoa học & Trích dẫn tự động
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, tác giả, DOI, từ khóa, tạp chí..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200/60 rounded-lg transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 lg:gap-3">
          
          {/* AI Agent Internet Research arXiv button */}
          {onOpenAiAssistant && (
            <button
              onClick={onOpenAiAssistant}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs transition-all"
              title="Tìm kiếm & Tải bài báo arXiv với AI Agent"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
              <span>AI Agent arXiv</span>
            </button>
          )}
          
          {/* Default Citation Style Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium px-1.5">Chuẩn trích dẫn:</span>
            <select
              value={selectedCitationStyle}
              onChange={(e) => setSelectedCitationStyle(e.target.value as CitationStyle)}
              className="bg-white border border-slate-200 text-slate-800 font-semibold rounded px-2 py-1 focus:outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="APA">APA 7th</option>
              <option value="IEEE">IEEE</option>
              <option value="BibTeX">BibTeX</option>
              <option value="Chicago">Chicago 17th</option>
              <option value="Harvard">Harvard</option>
              <option value="Nature">Nature</option>
            </select>
          </div>

          {/* Citation Generator Tool Button */}
          <button
            onClick={onOpenCitationTools}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
            title="Công cụ Trích dẫn & Chuyển đổi Định dạng"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
            <span>Trắc thư</span>
          </button>

          {/* Cloud Sync Status Indicator */}
          <button
            onClick={onOpenSyncModal}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
            title="Trạng thái Đồng bộ hóa Đám mây"
          >
            {syncStatus.status === 'syncing' ? (
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
            ) : (
              <CloudCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span className="hidden xl:inline text-slate-600">
              Đám mây: <strong className="text-slate-900 font-semibold">{syncStatus.status === 'syncing' ? 'Đang đồng bộ' : 'Đã đồng bộ'}</strong>
            </span>
          </button>

          {/* Export BibTeX / PDF */}
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-all"
            title="Xuất dữ liệu BibTeX và PDF"
          >
            <Download className="w-3.5 h-3.5 text-slate-700" />
            <span className="hidden sm:inline">Xuất BibTeX / PDF</span>
          </button>

          {/* Add Paper Button */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Tài liệu</span>
          </button>

        </div>

      </div>
    </header>
  );
};
