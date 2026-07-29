import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Search,
  Check,
  Download,
  Plus,
  ExternalLink,
  FileText,
  Globe,
  Filter,
  Tag,
  ArrowDownToLine,
  Bookmark,
  Wrench
} from 'lucide-react';
import { Paper } from '../types';
import { STARTER_TOOL_UI_ACTIONS, StarterToolName, lookupCitations } from '../utils/starterTools';

interface AiAssistantModalProps {
  papers: Paper[];
  onClose: () => void;
  onAddPaper?: (paper: Paper) => void;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  papers,
  onClose,
  onAddPaper,
}) => {
  const [activeTab, setActiveTab] = useState<'arxiv' | 'gemini' | 'tools'>('arxiv');

  // arXiv Agent Search State
  const [arxivQuery, setArxivQuery] = useState('');
  const [isArxivLoading, setIsArxivLoading] = useState(false);
  const [arxivResults, setArxivResults] = useState<any[]>([]);
  const [agentSynthesis, setAgentSynthesis] = useState('');
  const [searchIntent, setSearchIntent] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Gemini References State
  const [topicInput, setTopicInput] = useState('');
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [runningTool, setRunningTool] = useState<StarterToolName | null>(null);
  const [toolOutput, setToolOutput] = useState<any>(null);

  // Execute arXiv Internet Search via AI Agent
  const handleArxivSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arxivQuery.trim()) return;

    setIsArxivLoading(true);
    setArxivResults([]);
    setAgentSynthesis('');

    try {
      const res = await fetch('/api/arxiv/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: arxivQuery.trim(), maxResults: 10 }),
      });
      const data = await res.json();
      if (data.success) {
        setArxivResults(data.papers || []);
        setAgentSynthesis(data.agentSynthesis || '');
        setSearchIntent(data.intent || arxivQuery);
      }
    } catch (err) {
      console.error('Error executing arXiv search:', err);
    } finally {
      setIsArxivLoading(false);
    }
  };

  // Direct PDF Download to local machine
  const handleDirectDownloadPdf = (pdfUrl: string, title: string) => {
    setDownloadingUrl(pdfUrl);
    const downloadApi = `/api/arxiv/download-pdf?url=${encodeURIComponent(pdfUrl)}&title=${encodeURIComponent(title)}`;
    const a = document.createElement('a');
    a.href = downloadApi;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadingUrl(null);
    }, 1500);
  };

  // Import paper directly into ScholarHub Library
  const handleImportToLibrary = (item: any) => {
    if (!onAddPaper) return;

    const newPaper: Paper = {
      id: `paper-arxiv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: item.title,
      authors: item.authors && item.authors.length > 0 ? item.authors : ['Nhiều tác giả arXiv'],
      journal: item.journal || `arXiv:${item.arxivId}`,
      year: item.year || new Date().getFullYear(),
      volume: '',
      issue: '',
      pages: '',
      doi: item.doi || (item.arxivId ? `10.48550/arXiv.${item.arxivId}` : ''),
      url: item.absUrl || `https://arxiv.org/abs/${item.arxivId}`,
      pdfUrl: item.pdfUrl || `https://arxiv.org/pdf/${item.arxivId}.pdf`,
      abstract: item.abstract || 'Không có tóm tắt.',
      tags: item.tags || ['arXiv', 'AI Agent Search'],
      status: 'unread',
      starred: false,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      highlights: [],
      notes: item.agentSynthesis ? `[AI Agent Notes]: ${item.agentSynthesis}` : '',
      bibtex: item.bibtex || `@article{arxiv${item.arxivId},\n  author = {${(item.authors || []).join(' and ')}},\n  title = {${item.title}},\n  journal = {arXiv preprint arXiv:${item.arxivId}},\n  year = {${item.year}}\n}`,
      publisher: 'arXiv.org',
    };

    onAddPaper(newPaper);
    setAddedIds(prev => new Set(prev).add(item.arxivId || item.title));
  };

  // Gemini Topic Reference Suggestions
  const handleSuggestReferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsGeminiLoading(true);
    setRecommendations([]);

    try {
      const agentData = await lookupCitations({ query: topicInput.trim(), max_results: 4 });
      const items = (agentData?.result?.result as { items?: any[] } | undefined)?.items;
      if (Array.isArray(items) && items.length > 0) {
        setRecommendations(items.map((item: any) => ({
          title: item.title,
          authors: item.authors || [],
          journal: item.source || 'Semantic Scholar',
          year: item.year,
          reason: item.summary || `Citation count: ${item.citation_count ?? 'n/a'}`,
        })));
        return;
      }

      const fallbackRes = await fetch('/api/ai/suggest-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicInput.trim() }),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackData.success && fallbackData.recommendations) {
        setRecommendations(fallbackData.recommendations);
      }
    } catch (err) {
      console.error('Error suggesting references:', err);
    } finally {
      setIsGeminiLoading(false);
    }
  };

  const handleRunStarterTool = async (action: typeof STARTER_TOOL_UI_ACTIONS[number]) => {
    setRunningTool(action.tool);
    setToolOutput(null);
    try {
      setToolOutput(await action.run(action.args));
    } catch (err: any) {
      setToolOutput({ success: false, tool: action.tool, error: err?.message || String(err) });
    } finally {
      setRunningTool(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600/60 rounded-lg text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>AI Agent Research Internet & Tải arXiv Trực tiếp</span>
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30">
                  Live Agent
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Tìm kiếm tài liệu khoa học trên internet, phân tích tổng quan và tải ngay bản toàn văn PDF từ arXiv
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('arxiv')}
            className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'arxiv'
                ? 'bg-white text-indigo-950 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Tìm & Tải bài báo arXiv trực tiếp (Internet Agent)</span>
          </button>
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'gemini'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Gợi ý Công trình Kinh điển Gemini AI</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'tools'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4 text-slate-700" />
            <span>Starter Tools</span>
          </button>
        </div>

        {/* Tab 1: arXiv Internet Search & Downloader Agent */}
        {activeTab === 'arxiv' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-3 shrink-0">
              <form onSubmit={handleArxivSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={arxivQuery}
                    onChange={(e) => setArxivQuery(e.target.value)}
                    placeholder="Nhập từ khóa, chủ đề nghiên cứu (ví dụ: Deep learning climate downscaling, Quantum NLP, Transformer 2025...)"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 shadow-2xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isArxivLoading}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs disabled:opacity-50 shrink-0"
                >
                  <Sparkles className={`w-4 h-4 ${isArxivLoading ? 'animate-spin' : ''}`} />
                  <span>{isArxivLoading ? 'AI Agent đang tìm arXiv...' : 'Tìm bài báo arXiv'}</span>
                </button>
              </form>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Mẫu từ khóa nhanh:</span>
                {['LLM Reasoning 2024', 'Graph Neural Networks', 'Quantum Error Correction', 'Generative Diffusion Models'].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      setArxivQuery(sample);
                    }}
                    className="px-2 py-0.5 bg-white border border-slate-200 hover:border-indigo-300 rounded text-slate-600 hover:text-indigo-600"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {isArxivLoading ? (
                <div className="py-16 text-center space-y-3">
                  <Sparkles className="w-10 h-10 text-indigo-600 animate-pulse mx-auto" />
                  <h4 className="font-serif font-bold text-slate-800 text-sm">
                    AI Agent đang truy vấn kho lưu trữ trực tuyến arXiv.org...
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Gemini AI Agent đang đồng thời dịch ý định nghiên cứu, trích xuất dữ liệu bài báo mới nhất và tạo bản tổng quan phân tích.
                  </p>
                </div>
              ) : arxivResults.length > 0 ? (
                <div className="space-y-4">

                  {/* AI Agent Overview Banner */}
                  {agentSynthesis && (
                    <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Tổng quan Phân tích từ AI Agent (Chủ đề: {searchIntent}):</span>
                      </div>
                      <p className="text-xs text-indigo-900 leading-relaxed font-sans">
                        {agentSynthesis}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pt-1">
                    <span>Tìm thấy {arxivResults.length} công trình arXiv thực tế trên internet:</span>
                    <span className="font-mono text-slate-400">Nguồn: arXiv.org API</span>
                  </div>

                  {/* ArXiv Cards List */}
                  {arxivResults.map((item, idx) => {
                    const isAdded = addedIds.has(item.arxivId || item.title) || papers.some(p => p.title.toLowerCase() === item.title.toLowerCase());
                    const isDownloadingThis = downloadingUrl === item.pdfUrl;

                    return (
                      <div
                        key={idx}
                        className="p-5 bg-white border border-slate-200/90 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 transition-all"
                      >
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                                arXiv:{item.arxivId}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {item.year}
                              </span>
                              {item.tags?.map((tag: string, tidx: number) => (
                                <span key={tidx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>

                            <h4 className="font-serif font-bold text-base text-slate-900 leading-snug">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {/* Authors & Publication */}
                        <p className="text-xs text-slate-600">
                          <strong>Tác giả:</strong> {(item.authors || []).join(', ')} • <em className="text-slate-500">{item.journal}</em>
                        </p>

                        {/* Abstract */}
                        <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-3 hover:line-clamp-none transition-all">
                          {item.abstract}
                        </p>

                        {/* Action Toolbar */}
                        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={item.absUrl || `https://arxiv.org/abs/${item.arxivId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Trang arXiv gốc</span>
                          </a>

                          <div className="flex items-center gap-2">
                            {/* Direct PDF Download Button */}
                            <button
                              onClick={() => handleDirectDownloadPdf(item.pdfUrl, item.title)}
                              disabled={isDownloadingThis}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200"
                              title="Tải tệp .pdf về máy tính của bạn"
                            >
                              <Download className={`w-3.5 h-3.5 ${isDownloadingThis ? 'animate-bounce text-indigo-600' : 'text-slate-600'}`} />
                              <span>{isDownloadingThis ? 'Đang tải PDF...' : 'Tải về PDF'}</span>
                            </button>

                            {/* Import to Library Button */}
                            <button
                              onClick={() => handleImportToLibrary(item)}
                              disabled={isAdded}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                isAdded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã có trong Thư viện</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tải & Thêm vào Thư viện</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}

                </div>
              ) : (
                <div className="py-16 text-center text-xs text-slate-400 space-y-3">
                  <Globe className="w-10 h-10 mx-auto text-slate-300" />
                  <h4 className="font-serif font-bold text-slate-700 text-sm">
                    Tìm kiếm kho bài báo khoa học toàn cầu arXiv
                  </h4>
                  <p className="max-w-md mx-auto text-slate-500">
                    Nhập tên công nghệ, mô hình AI, thuật toán hoặc lĩnh vực khoa học để AI Agent tìm kiếm bài báo arXiv mới nhất và tải toàn văn PDF.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Gemini References Suggestion */}
        {activeTab === 'gemini' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <form onSubmit={handleSuggestReferences} className="flex gap-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="Nhập chủ đề nghiên cứu (ví dụ: Climate AI, Generative Models...)"
                  className="flex-1 text-xs px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="submit"
                  disabled={isGeminiLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeminiLoading ? 'animate-spin' : ''}`} />
                  <span>Gợi ý Công trình</span>
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isGeminiLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    Gemini đang tổng hợp các công trình khoa học nền tảng...
                  </p>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-serif font-bold text-sm text-slate-900">
                          {rec.title}
                        </h5>
                        <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                          {rec.year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {(rec.authors || []).join(', ')} • <em>{rec.journal}</em>
                      </p>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                        <strong>Tầm quan trọng:</strong> {rec.reason}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Nhập chủ đề bất kỳ để nhận danh sách các công trình kinh điển do Gemini đề xuất.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STARTER_TOOL_UI_ACTIONS.map((action) => {
                const isRunning = runningTool === action.tool;
                return (
                  <button
                    key={action.tool}
                    type="button"
                    onClick={() => handleRunStarterTool(action)}
                    disabled={runningTool !== null}
                    className="text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-xs disabled:opacity-60"
                    title={`${action.webFunction} -> ${action.tool}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{action.label}</span>
                      <span className="text-[10px] font-mono text-slate-500">{action.tool}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{action.description}</p>
                    <div className="mt-2 text-[10px] font-mono text-indigo-700">
                      {isRunning ? 'running...' : action.webFunction}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-950 text-slate-100 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-slate-900 border-b border-slate-800">
                Tool Result
              </div>
              <pre className="p-3 text-[11px] leading-relaxed overflow-auto max-h-72 whitespace-pre-wrap">
                {toolOutput ? JSON.stringify(toolOutput, null, 2) : 'Bấm một tool để chạy smoke test.'}
              </pre>
            </div>
          </div>
        )}

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
