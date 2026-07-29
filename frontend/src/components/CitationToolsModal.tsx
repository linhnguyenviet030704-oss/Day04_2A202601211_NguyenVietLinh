import React, { useState } from 'react';
import {
  X,
  Bookmark,
  Copy,
  Check,
  Quote,
  Sparkles,
  Download,
  FileCode
} from 'lucide-react';
import { Paper, CitationStyle } from '../types';
import { formatCitation, formatInTextCitation, generateBibTeX, downloadBibTeXFile } from '../utils/citation';

interface CitationToolsModalProps {
  papers: Paper[];
  selectedCitationStyle: CitationStyle;
  onClose: () => void;
}

export const CitationToolsModal: React.FC<CitationToolsModalProps> = ({
  papers,
  selectedCitationStyle,
  onClose,
}) => {
  const [style, setStyle] = useState<CitationStyle>(selectedCitationStyle);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedPaperId, setSelectedPaperId] = useState<string>(papers[0]?.id || '');

  const selectedPaper = papers.find(p => p.id === selectedPaperId) || papers[0];

  const handleCopyCitation = (paper: Paper) => {
    const formatted = formatCitation(paper, style);
    navigator.clipboard.writeText(formatted);
    setCopiedId(paper.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyInText = (paper: Paper, idx: number) => {
    const formatted = formatInTextCitation(paper, style, idx + 1);
    navigator.clipboard.writeText(formatted);
    setCopiedId(`intext-${paper.id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Công cụ Trích dẫn Khoa học Tự động</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Selector Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Chọn Chuẩn Trích dẫn:</span>
            <div className="flex flex-wrap gap-1">
              {(['APA', 'IEEE', 'Chicago', 'Harvard', 'Nature', 'BibTeX'] as CitationStyle[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStyle(st)}
                  className={`px-3 py-1 text-xs font-mono font-semibold rounded-lg transition-all ${
                    style === st ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => downloadBibTeXFile(papers)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải về toàn bộ BibTeX</span>
          </button>
        </div>

        {/* Body list of generated citations */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {papers.map((paper, idx) => {
            const citationText = formatCitation(paper, style);
            const inTextCitation = formatInTextCitation(paper, style, idx + 1);

            return (
              <div key={paper.id} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-serif font-semibold text-sm text-slate-900">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-slate-500 font-sans">
                      {paper.authors.join(', ')} ({paper.year})
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    #{idx + 1}
                  </span>
                </div>

                {/* Formatted Full Citation */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Trích dẫn Đầy đủ ({style}):</span>
                    <button
                      onClick={() => handleCopyCitation(paper)}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-600 font-sans normal-case text-xs"
                    >
                      {copiedId === paper.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-serif text-xs text-slate-900 leading-relaxed font-normal">
                    {citationText}
                  </p>
                </div>

                {/* In-text Citation */}
                <div className="flex items-center justify-between p-2.5 bg-indigo-50/60 border border-indigo-200/60 rounded-lg text-xs">
                  <span className="text-indigo-950">
                    Trích dẫn trong văn bản (In-text citation): <strong className="font-mono text-indigo-900">{inTextCitation}</strong>
                  </span>
                  <button
                    onClick={() => handleCopyInText(paper, idx)}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:text-indigo-900"
                  >
                    {copiedId === `intext-${paper.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy In-text</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
