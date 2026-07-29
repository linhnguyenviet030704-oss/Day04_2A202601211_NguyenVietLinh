import React, { useState } from 'react';
import { X, Download, FileCode, Printer, Copy, Check } from 'lucide-react';
import { Paper, CitationStyle } from '../types';
import { formatCitation, generateBibTeX } from '../utils/citation';

interface ExportModalProps {
  papers: Paper[];
  selectedCitationStyle: CitationStyle;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ papers, selectedCitationStyle, onClose }) => {
  const [style, setStyle] = useState<CitationStyle>(selectedCitationStyle);
  const [exportScope, setExportScope] = useState<'all' | 'starred'>('all');
  const [isCopied, setIsCopied] = useState(false);
  const filteredPapers = exportScope === 'starred' ? papers.filter(p => p.starred) : papers;

  const downloadFromBackend = async (url: string, filename: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        papers: filteredPapers,
        style,
        filename,
        title: `ScholarHub Bibliography (${filteredPapers.length} documents)`,
      }),
    });
    if (!res.ok) throw new Error(await res.text());

    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  };

  const handleCopyRawBibTeX = () => {
    navigator.clipboard.writeText(filteredPapers.map(generateBibTeX).join('\n\n'));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Xuat du lieu BibTeX & PDF</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white" title="Dong">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              <span>Pham vi xuat</span>
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as 'all' | 'starred')}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              >
                <option value="all">Tat ca bai bao ({papers.length})</option>
                <option value="starred">Chi bai da danh dau ({papers.filter(p => p.starred).length})</option>
              </select>
            </label>

            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              <span>Chuan trich dan PDF</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value as CitationStyle)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 font-semibold"
              >
                {(['APA', 'IEEE', 'BibTeX', 'Chicago', 'Harvard', 'Nature'] as CitationStyle[]).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>BibTeX (.bib)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadFromBackend('/api/export/bibtex', `scholarhub_bibliography_${Date.now()}.bib`).catch(console.error)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tai .bib</span>
                </button>
                <button
                  onClick={handleCopyRawBibTeX}
                  className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg"
                  title="Sao chep BibTeX"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>PDF bibliography</span>
              </div>
              <button
                onClick={() => downloadFromBackend('/api/export/pdf', `scholarhub_bibliography_${Date.now()}.pdf`).catch(console.error)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Tai PDF</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Preview ({style})</span>
            <div className="p-3 bg-slate-100 font-serif text-xs text-slate-800 rounded-lg border border-slate-200/80 max-h-36 overflow-y-auto space-y-2">
              {filteredPapers.slice(0, 3).map((p) => (
                <div key={p.id} className="leading-relaxed border-b border-slate-200 pb-1 last:border-0">
                  {formatCitation(p, style)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200/60 rounded-lg">
            Dong
          </button>
        </div>
      </div>
    </div>
  );
};
