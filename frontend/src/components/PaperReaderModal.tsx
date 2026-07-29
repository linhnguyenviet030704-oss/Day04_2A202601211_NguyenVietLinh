import React, { useState } from 'react';
import { 
  Paper, 
  HighlightNote, 
  HighlightColor, 
  ReaderSettings, 
  CitationStyle 
} from '../types';
import { 
  X, 
  Highlighter, 
  MessageSquare, 
  FileText, 
  Sparkles, 
  Quote, 
  Download, 
  Copy, 
  Check, 
  Type, 
  Maximize2, 
  Minimize2, 
  Trash2, 
  Save, 
  Bookmark, 
  ExternalLink,
  ChevronRight,
  Printer,
  Sliders,
  BookOpen
} from 'lucide-react';
import { formatCitation, generateBibTeX, printBibliographyPDF } from '../utils/citation';

interface PaperReaderModalProps {
  paper: Paper;
  onClose: () => void;
  onUpdatePaper: (updatedPaper: Paper) => void;
  selectedCitationStyle: CitationStyle;
}

export const PaperReaderModal: React.FC<PaperReaderModalProps> = ({
  paper,
  onClose,
  onUpdatePaper,
  selectedCitationStyle,
}) => {
  const [activeTab, setActiveTab] = useState<'highlights' | 'notes' | 'ai' | 'citations'>('highlights');
  
  // Reader Typography Settings
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 'md',
    fontFamily: 'serif',
    lineHeight: 'normal',
    theme: 'clean-white',
    maxWidth: 'ch75',
  });

  // Local state for paper updates
  const [notesText, setNotesText] = useState(paper.notes || '');
  const [selectedText, setSelectedText] = useState('');
  const [newHighlightComment, setNewHighlightComment] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('yellow');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);

  // Text selection handler inside reader
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
    }
  };

  const handleAddHighlight = () => {
    if (!selectedText) return;
    const newHl: HighlightNote = {
      id: `hl-${Date.now()}`,
      text: selectedText,
      comment: newHighlightComment.trim() || undefined,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    const updated = {
      ...paper,
      highlights: [newHl, ...(paper.highlights || [])],
      lastModified: new Date().toISOString(),
    };

    onUpdatePaper(updated);
    setSelectedText('');
    setNewHighlightComment('');
    setActiveTab('highlights');
  };

  const handleDeleteHighlight = (id: string) => {
    const updated = {
      ...paper,
      highlights: paper.highlights.filter(h => h.id !== id),
      lastModified: new Date().toISOString(),
    };
    onUpdatePaper(updated);
  };

  const handleSaveNotes = () => {
    const updated = {
      ...paper,
      notes: notesText,
      lastModified: new Date().toISOString(),
    };
    onUpdatePaper(updated);
  };

  // Trigger Gemini API for Paper Analysis
  const handleAnalyzeWithAi = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.abstract,
          fullText: paper.fullText,
          notes: paper.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing paper:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCopyCitationText = (style: CitationStyle) => {
    const text = formatCitation(paper, style);
    navigator.clipboard.writeText(text);
    setCopiedFormat(style);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Typography Class Mappings
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
    }
  };

  const getLineHeightClass = () => {
    switch (settings.lineHeight) {
      case 'compact': return 'leading-normal';
      case 'normal': return 'leading-relaxed';
      case 'relaxed': return 'leading-loose';
    }
  };

  const getThemeBgClass = () => {
    switch (settings.theme) {
      case 'clean-white': return 'bg-white text-slate-900';
      case 'warm-paper': return 'bg-[#fbf9f5] text-slate-900';
      case 'subtle-cream': return 'bg-[#f6f4ee] text-slate-900';
    }
  };

  const getColorBgClass = (color: HighlightColor) => {
    switch (color) {
      case 'yellow': return 'bg-amber-100 border-amber-300 text-amber-900';
      case 'green': return 'bg-emerald-100 border-emerald-300 text-emerald-900';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-900';
      case 'pink': return 'bg-pink-100 border-pink-300 text-pink-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 lg:p-4 animate-in fade-in">
      <div className="w-full max-w-7xl h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Reader Top Header Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="truncate">
              <h2 className="font-serif font-semibold text-sm text-slate-100 truncate">
                {paper.title}
              </h2>
              <p className="text-xs text-slate-400 truncate font-sans">
                {paper.authors.join(', ')} ({paper.year}) — {paper.journal}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            
            {/* Reading Typography Controls Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsPopover(!showSettingsPopover)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-700"
                title="Tùy chỉnh font chữ & chế độ đọc"
              >
                <Type className="w-3.5 h-3.5" />
                <span>Kiểu đọc</span>
              </button>

              {/* Typography Popover */}
              {showSettingsPopover && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 p-4 rounded-xl shadow-xl border border-slate-200 z-50 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
                    Cấu hình Trải nghiệm Đọc
                  </h4>

                  {/* Font Family */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Phông chữ:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setSettings({ ...settings, fontFamily: 'serif' })}
                        className={`px-3 py-1.5 text-xs rounded border font-serif ${
                          settings.fontFamily === 'serif' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        Serif (Sách)
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, fontFamily: 'sans' })}
                        className={`px-3 py-1.5 text-xs rounded border font-sans ${
                          settings.fontFamily === 'sans' ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        Sans (Hiện đại)
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Cỡ chữ:</label>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSettings({ ...settings, fontSize: sz })}
                          className={`py-1 rounded border uppercase font-mono ${
                            settings.fontSize === sz ? 'bg-slate-900 text-white font-bold' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Theme Background Tone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Màu nền giấy:</label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <button
                        onClick={() => setSettings({ ...settings, theme: 'clean-white' })}
                        className={`py-1.5 rounded border ${settings.theme === 'clean-white' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'} bg-white text-slate-900`}
                      >
                        Trắng
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, theme: 'warm-paper' })}
                        className={`py-1.5 rounded border ${settings.theme === 'warm-paper' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'} bg-[#fbf9f5] text-slate-900`}
                      >
                        Ấm
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, theme: 'subtle-cream' })}
                        className={`py-1.5 rounded border ${settings.theme === 'subtle-cream' ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'} bg-[#f6f4ee] text-slate-900`}
                      >
                        Kem
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Print / Export Report Button */}
            <button
              onClick={() => printBibliographyPDF([paper], selectedCitationStyle, `Tóm tắt Nghiên cứu: ${paper.title}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all border border-slate-700"
              title="Xuất bản in PDF chuẩn"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">In PDF</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* Reader Workspace Split View */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          
          {/* LEFT: Main Paper Text Canvas */}
          <div className={`flex-1 overflow-y-auto p-6 md:p-10 transition-colors ${getThemeBgClass()}`}>
            
            <div className={`mx-auto max-w-2xl space-y-8 ${settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}>
              
              {/* Paper Meta Header */}
              <div className="border-b border-slate-200/80 pb-6 space-y-3 font-sans">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 font-semibold rounded border border-indigo-200">
                    {paper.journal} ({paper.year})
                  </span>
                  {paper.doi && (
                    <a
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 font-mono text-[11px]"
                    >
                      <span>DOI: {paper.doi}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {paper.pdfUrl && (
                    <a
                      href={`/api/arxiv/download-pdf?url=${encodeURIComponent(paper.pdfUrl)}&title=${encodeURIComponent(paper.title)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs shadow-2xs transition-all ml-auto"
                      title="Tải tệp toàn văn PDF từ arXiv về máy tính"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về PDF (arXiv)</span>
                    </a>
                  )}
                </div>

                <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  {paper.title}
                </h1>

                <p className="text-sm text-slate-700 font-medium">
                  {paper.authors.join(', ')}
                </p>
              </div>

              {/* Text Selection Floating Highlighter Helper */}
              {selectedText && (
                <div className="sticky top-2 z-40 p-3 bg-slate-900 text-white rounded-xl shadow-xl space-y-2 animate-in slide-in-from-top-2 border border-slate-700">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1">
                      <Highlighter className="w-3.5 h-3.5" />
                      Đoạn văn đã chọn:
                    </span>
                    <button
                      onClick={() => setSelectedText('')}
                      className="text-slate-400 hover:text-white"
                    >
                      Hủy
                    </button>
                  </div>
                  <p className="text-xs italic text-slate-200 line-clamp-2 bg-slate-800/80 p-2 rounded">
                    "{selectedText}"
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex items-center gap-1">
                      {(['yellow', 'green', 'blue', 'pink'] as const).map((clr) => (
                        <button
                          key={clr}
                          onClick={() => setSelectedColor(clr)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            selectedColor === clr ? 'border-white scale-110' : 'border-transparent'
                          } ${
                            clr === 'yellow' ? 'bg-amber-300' :
                            clr === 'green' ? 'bg-emerald-300' :
                            clr === 'blue' ? 'bg-blue-300' : 'bg-pink-300'
                          }`}
                        />
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newHighlightComment}
                      onChange={(e) => setNewHighlightComment(e.target.value)}
                      placeholder="Thêm ghi chú lề..."
                      className="flex-1 text-xs px-2 py-1 bg-slate-800 border border-slate-700 text-white rounded focus:outline-none"
                    />
                    <button
                      onClick={handleAddHighlight}
                      className="px-3 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow-xs"
                    >
                      Lưu Highlight
                    </button>
                  </div>
                </div>
              )}

              {/* Abstract Section */}
              <div className="bg-slate-100/60 p-5 rounded-xl border border-slate-200/80 space-y-2">
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-500">
                  Tóm tắt Khoa học (Abstract)
                </h3>
                <p 
                  onMouseUp={handleTextSelection}
                  className={`${getFontSizeClass()} ${getLineHeightClass()} text-slate-800 selection:bg-indigo-100 selection:text-indigo-900 cursor-text`}
                >
                  {paper.abstract}
                </p>
              </div>

              {/* Full Text Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-500 border-b pb-1">
                  Nội dung Toàn văn & Phân tích
                </h3>
                <div 
                  onMouseUp={handleTextSelection}
                  className={`${getFontSizeClass()} ${getLineHeightClass()} text-slate-800 space-y-4 whitespace-pre-line selection:bg-indigo-100 selection:text-indigo-900 cursor-text`}
                >
                  {paper.fullText || 'Tài liệu này chưa có bản ghi đầy đủ toàn văn. Bạn có thể sử dụng Trợ lý Gemini để tóm tắt hoặc tự nhập ghi chú lề ở bảng bên phải.'}
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT: Notes, Margin Highlights, AI & Citations Tabs */}
          <div className="w-96 bg-slate-50 border-l border-slate-200/80 flex flex-col shrink-0">
            
            {/* Tabs Header */}
            <div className="grid grid-cols-4 bg-slate-200/70 p-1 gap-0.5 text-xs font-medium border-b border-slate-200">
              <button
                onClick={() => setActiveTab('highlights')}
                className={`py-2 text-center rounded transition-all ${
                  activeTab === 'highlights' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ghi chú lề & Trích dẫn"
              >
                Ghi chú Lề ({paper.highlights?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-2 text-center rounded transition-all ${
                  activeTab === 'notes' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => {
                  setActiveTab('ai');
                  if (!aiAnalysis && !isAiLoading) handleAnalyzeWithAi();
                }}
                className={`py-2 text-center rounded transition-all flex items-center justify-center gap-1 ${
                  activeTab === 'ai' ? 'bg-white text-indigo-900 font-bold shadow-xs' : 'text-slate-600 hover:text-indigo-700'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>AI</span>
              </button>
              <button
                onClick={() => setActiveTab('citations')}
                className={`py-2 text-center rounded transition-all ${
                  activeTab === 'citations' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trích dẫn
              </button>
            </div>

            {/* TAB 1: Margin Highlights & Quotes */}
            {activeTab === 'highlights' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Bôi đen đoạn văn bất kỳ trong bài báo để tạo ghi chú lề và trích dẫn.
                </p>

                {(!paper.highlights || paper.highlights.length === 0) ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                    Chưa có trích dẫn lề nào. Bôi đen văn bản để bắt đầu.
                  </div>
                ) : (
                  paper.highlights.map((hl) => (
                    <div
                      key={hl.id}
                      className={`p-3 rounded-xl border space-y-1.5 ${getColorBgClass(hl.color)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Quote className="w-3.5 h-3.5 shrink-0 opacity-70" />
                        <button
                          onClick={() => handleDeleteHighlight(hl.id)}
                          className="text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs italic font-serif leading-relaxed">
                        "{hl.text}"
                      </p>
                      {hl.comment && (
                        <div className="text-xs font-sans pt-1 border-t border-slate-900/10 font-medium">
                          <strong>Ghi chú:</strong> {hl.comment}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: Markdown Research Notes */}
            {activeTab === 'notes' && (
              <div className="flex-1 flex flex-col p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Sổ tay Nghiên cứu (Markdown)
                  </span>
                  <button
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs"
                  >
                    <Save className="w-3 h-3" />
                    <span>Lưu Ghi chú</span>
                  </button>
                </div>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Ghi lại nhận xét, phương pháp luận, giả thuyết hoặc công thức toán học..."
                  className="flex-1 w-full p-3 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 resize-none leading-relaxed"
                />
              </div>
            )}

            {/* TAB 3: AI Gemini Research Assistant */}
            {activeTab === 'ai' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isAiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
                    <p className="text-xs font-medium text-slate-600">
                      Gemini đang đọc và phân tích bài báo khoa học...
                    </p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-4 text-xs">
                    
                    {/* Executive Summary */}
                    <div className="p-3.5 bg-indigo-50/60 border border-indigo-200/80 rounded-xl space-y-1">
                      <h4 className="font-bold text-indigo-900 uppercase tracking-wider text-[10px]">
                        Tóm tắt Điều hành (Executive Summary)
                      </h4>
                      <p className="text-slate-800 leading-relaxed font-sans">
                        {aiAnalysis.summary}
                      </p>
                    </div>

                    {/* Key Contributions */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                        Đóng góp Khoa học Chính
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        {aiAnalysis.keyContributions?.map((c: string, idx: number) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Methodology */}
                    <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                        Phương pháp luận
                      </h4>
                      <p className="text-slate-700 leading-relaxed">
                        {aiAnalysis.methodology}
                      </p>
                    </div>

                    {/* Research Gaps */}
                    <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5">
                      <h4 className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">
                        Kẽ hở Nghiên cứu (Research Gaps)
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-amber-900">
                        {aiAnalysis.researchGaps?.map((g: string, idx: number) => (
                          <li key={idx}>{g}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-8">
                    <button
                      onClick={handleAnalyzeWithAi}
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs"
                    >
                      Bắt đầu Phân tích với Gemini AI
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Instant Citations & BibTeX Generator */}
            {activeTab === 'citations' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                
                <p className="text-slate-500">
                  Trích dẫn tự động theo các chuẩn quốc tế chính xác:
                </p>

                {(['APA', 'IEEE', 'Chicago', 'Harvard', 'Nature', 'BibTeX'] as CitationStyle[]).map((style) => {
                  const citationText = formatCitation(paper, style);
                  const isCopied = copiedFormat === style;

                  return (
                    <div key={style} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                          {style}
                        </span>
                        <button
                          onClick={() => handleCopyCitationText(style)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-indigo-600"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="font-serif text-slate-800 leading-relaxed bg-slate-50/80 p-2 rounded border border-slate-100 break-words">
                        {citationText}
                      </p>
                    </div>
                  );
                })}

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
