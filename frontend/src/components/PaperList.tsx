import React, { useState } from 'react';
import {
  Paper,
  CitationStyle,
  Collection
} from '../types';
import {
  Star,
  BookOpen,
  Copy,
  Check,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Tag,
  List,
  Grid,
  Table,
  Sparkles,
  Filter,
  Quote,
  MoreVertical,
  CheckSquare,
  Square,
  Clock,
  Folder
} from 'lucide-react';
import { formatCitation, generateBibTeX } from '../utils/citation';

interface PaperListProps {
  papers: Paper[];
  collections: Collection[];
  selectedCitationStyle: CitationStyle;
  onSelectPaper: (paper: Paper) => void;
  onToggleStar: (paperId: string) => void;
  onDeletePaper: (paperId: string) => void;
  onUpdateStatus: (paperId: string, status: Paper['status']) => void;
  onBatchExportBibTeX: (selectedPaperIds: string[]) => void;
  onBatchDelete: (selectedPaperIds: string[]) => void;
  onAnalyzeWithAi: (paper: Paper) => void;
  activeFilterTitle: string;
}

export const PaperList: React.FC<PaperListProps> = ({
  papers,
  collections,
  selectedCitationStyle,
  onSelectPaper,
  onToggleStar,
  onDeletePaper,
  onUpdateStatus,
  onBatchExportBibTeX,
  onBatchDelete,
  onAnalyzeWithAi,
  activeFilterTitle,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('list');
  const [sortBy, setSortBy] = useState<'year-desc' | 'year-asc' | 'title' | 'author' | 'date-added'>('year-desc');
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting logic
  const sortedPapers = [...papers].sort((a, b) => {
    switch (sortBy) {
      case 'year-desc': return b.year - a.year;
      case 'year-asc': return a.year - b.year;
      case 'title': return a.title.localeCompare(b.title);
      case 'author': return (a.authors[0] || '').localeCompare(b.authors[0] || '');
      case 'date-added': return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      default: return 0;
    }
  });

  const handleSelectAll = () => {
    if (selectedPaperIds.length === sortedPapers.length) {
      setSelectedPaperIds([]);
    } else {
      setSelectedPaperIds(sortedPapers.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPaperIds.includes(id)) {
      setSelectedPaperIds(selectedPaperIds.filter(i => i !== id));
    } else {
      setSelectedPaperIds([...selectedPaperIds, id]);
    }
  };

  const handleCopyCitation = (paper: Paper, e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = formatCitation(paper, selectedCitationStyle);
    navigator.clipboard.writeText(formatted);
    setCopiedId(paper.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCollectionName = (colId?: string) => {
    if (!colId) return null;
    return collections.find(c => c.id === colId)?.name;
  };

  const getStatusBadge = (status: Paper['status']) => {
    switch (status) {
      case 'unread':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">Chưa đọc</span>;
      case 'reading':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 rounded">Đang đọc</span>;
      case 'completed':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded">Đã xong</span>;
      case 'cited':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60 rounded">Đã trích dẫn</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">

      {/* List Header Controls */}
      <div className="p-4 lg:px-6 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{activeFilterTitle}</span>
            <span className="text-xs font-sans font-normal text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
              {sortedPapers.length} bài báo
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">

          {/* Batch Operations Bar (if items selected) */}
          {selectedPaperIds.length > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-900 animate-in fade-in">
              <span>Đã chọn <strong>{selectedPaperIds.length}</strong></span>
              <div className="h-4 w-px bg-indigo-200 mx-1" />
              <button
                onClick={() => onBatchExportBibTeX(selectedPaperIds)}
                className="hover:underline flex items-center gap-1 text-indigo-700 font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất BibTeX</span>
              </button>
              <div className="h-4 w-px bg-indigo-200 mx-1" />
              <button
                onClick={() => {
                  onBatchDelete(selectedPaperIds);
                  setSelectedPaperIds([]);
                }}
                className="hover:underline flex items-center gap-1 text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 text-slate-800 rounded px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value="year-desc">Năm: Mới nhất</option>
              <option value="year-asc">Năm: Cũ nhất</option>
              <option value="title">Tiêu đề (A-Z)</option>
              <option value="author">Tác giả chính (A-Z)</option>
              <option value="date-added">Mới thêm gần đây</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="Xem danh sách chi tiết"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="Xem bảng thu gọn"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              title="Xem dạng thẻ Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Papers Container */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {sortedPapers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
            <BookOpen className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy tài liệu phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Thử thay đổi từ khóa tìm kiếm hoặc nhấn nút "+ Thêm Tài liệu" để nhập DOI/tệp bài báo mới.
            </p>
          </div>
        ) : viewMode === 'list' ? (

          /* DETAILED LIST VIEW */
          <div className="space-y-3">
            {sortedPapers.map((paper) => {
              const isSelected = selectedPaperIds.includes(paper.id);
              const colName = getCollectionName(paper.collectionId);

              return (
                <div
                  key={paper.id}
                  onClick={() => onSelectPaper(paper)}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/40 border-indigo-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">

                    {/* Checkbox */}
                    <button
                      onClick={(e) => handleToggleSelect(paper.id, e)}
                      className="mt-1 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    {/* Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(paper.id);
                      }}
                      className="mt-1 text-slate-300 hover:text-amber-500 transition-colors"
                    >
                      <Star className={`w-4 h-4 ${paper.starred ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>

                    {/* Paper Meta Body */}
                    <div className="flex-1 min-w-0 space-y-1.5">

                      {/* Title & Reading Trigger */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-serif text-base font-semibold text-slate-900 group-hover:text-indigo-900 leading-snug">
                          {paper.title}
                        </h3>
                        {getStatusBadge(paper.status)}
                      </div>

                      {/* Authors & Journal Year */}
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans">
                        <span className="font-medium text-slate-800">
                          {paper.authors.join(', ')}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="italic text-slate-700">{paper.journal}</span>
                        <span className="font-semibold text-slate-900">({paper.year})</span>
                        {paper.doi && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[11px] text-slate-500">DOI: {paper.doi}</span>
                          </>
                        )}
                      </div>

                      {/* Abstract Preview */}
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {paper.abstract}
                      </p>

                      {/* Tags & Collections Footer */}
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {colName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
                              <Folder className="w-2.5 h-2.5 text-slate-500" />
                              {colName}
                            </span>
                          )}
                          {paper.tags.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-100 text-slate-600 rounded">
                              #{t}
                            </span>
                          ))}
                          {paper.highlights?.length > 0 && (
                            <span className="px-2 py-0.5 text-[10px] bg-amber-50 text-amber-800 rounded border border-amber-200/60 font-mono">
                              {paper.highlights.length} ghi chú lề
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleCopyCitation(paper, e)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded transition-all"
                            title={`Sao chép trích dẫn chuẩn ${selectedCitationStyle}`}
                          >
                            {copiedId === paper.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Đã sao chép</span>
                              </>
                            ) : (
                              <>
                                <Quote className="w-3 h-3 text-indigo-600" />
                                <span>Trích dẫn ({selectedCitationStyle})</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnalyzeWithAi(paper);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded transition-all"
                            title="Phân tích AI Gemini"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Tóm tắt AI</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPaper(paper);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-all shadow-xs"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>Đọc & Ghi chú</span>
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        ) : viewMode === 'table' ? (

          /* COMPACT TABLE VIEW */
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedPaperIds.length === sortedPapers.length && sortedPapers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-indigo-600 cursor-pointer"
                    />
                  </th>
                  <th className="p-3">Tiêu đề bài báo</th>
                  <th className="p-3">Tác giả</th>
                  <th className="p-3">Tạp chí / Xuất bản</th>
                  <th className="p-3 text-center">Năm</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {sortedPapers.map((paper) => (
                  <tr
                    key={paper.id}
                    onClick={() => onSelectPaper(paper)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPaperIds.includes(paper.id)}
                        onChange={(e) => handleToggleSelect(paper.id, e as any)}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-serif font-medium text-slate-900 max-w-xs truncate">
                      {paper.title}
                    </td>
                    <td className="p-3 text-slate-600 max-w-xs truncate">
                      {paper.authors.join(', ')}
                    </td>
                    <td className="p-3 text-slate-600 italic truncate max-w-[180px]">
                      {paper.journal}
                    </td>
                    <td className="p-3 text-center font-mono font-semibold text-slate-800">
                      {paper.year}
                    </td>
                    <td className="p-3">
                      {getStatusBadge(paper.status)}
                    </td>
                    <td className="p-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleCopyCitation(paper, e)}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded"
                        title="Sao chép trích dẫn"
                      >
                        <Quote className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectPaper(paper)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                        title="Mở đọc"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (

          /* GRID CARDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedPapers.map((paper) => (
              <div
                key={paper.id}
                onClick={() => onSelectPaper(paper)}
                className="p-4 bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(paper.status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(paper.id);
                      }}
                      className="text-slate-300 hover:text-amber-500"
                    >
                      <Star className={`w-4 h-4 ${paper.starred ? 'text-amber-500 fill-amber-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="font-serif font-semibold text-sm text-slate-900 leading-snug line-clamp-2">
                    {paper.title}
                  </h3>

                  <p className="text-xs text-slate-600 font-sans line-clamp-1">
                    {paper.authors.join(', ')}
                  </p>

                  <p className="text-[11px] text-slate-500 italic">
                    {paper.journal} ({paper.year})
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pt-1">
                    {paper.abstract}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={(e) => handleCopyCitation(paper, e)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600"
                  >
                    <Quote className="w-3 h-3" />
                    <span>Trích dẫn</span>
                  </button>

                  <button
                    onClick={() => onSelectPaper(paper)}
                    className="px-3 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-all"
                  >
                    Đọc & Ghi chú
                  </button>
                </div>
              </div>
            ))}
          </div>

        )}
      </div>

    </div>
  );
};
