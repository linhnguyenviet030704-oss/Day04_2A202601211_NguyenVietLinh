import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  FileText, 
  BookOpen, 
  Check, 
  Link, 
  Tag, 
  Folder 
} from 'lucide-react';
import { Paper, Collection } from '../types';

interface AddPaperModalProps {
  onClose: () => void;
  onAddPaper: (paper: Paper) => void;
  collections: Collection[];
}

export const AddPaperModal: React.FC<AddPaperModalProps> = ({
  onClose,
  onAddPaper,
  collections,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  const [doiInput, setDoiInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Manual Form Fields
  const [title, setTitle] = useState('');
  const [authorsText, setAuthorsText] = useState('');
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [volume, setVolume] = useState('');
  const [issue, setIssue] = useState('');
  const [pages, setPages] = useState('');
  const [doi, setDoi] = useState('');
  const [abstract, setAbstract] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [collectionId, setCollectionId] = useState('');

  // Parse DOI or Citation via Gemini API
  const handleAiParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doiInput.trim()) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/ai/parse-doi-or-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: doiInput.trim() }),
      });

      const data = await res.json();

      if (data.success && data.paper) {
        const p = data.paper;
        const newPaper: Paper = {
          id: `paper-${Date.now()}`,
          title: p.title || 'Bài báo chưa đặt tên',
          authors: p.authors && p.authors.length > 0 ? p.authors : ['Tác giả không xác định'],
          journal: p.journal || 'Tạp chí Khoa học',
          year: p.year || new Date().getFullYear(),
          volume: p.volume || '',
          issue: p.issue || '',
          pages: p.pages || '',
          doi: p.doi || (doiInput.includes('10.') ? doiInput : ''),
          abstract: p.abstract || 'Chưa có tóm tắt',
          tags: p.tags || ['Nghiên cứu'],
          collectionId: collectionId || undefined,
          status: 'unread',
          starred: false,
          dateAdded: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          highlights: [],
          notes: '',
          bibtex: p.bibtex || '',
          publisher: p.publisher || '',
        };

        onAddPaper(newPaper);
        onClose();
      } else {
        setErrorMessage(data.error || 'Không thể tự động phân tích dữ liệu bài báo.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi kết nối máy chủ Gemini API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const authorsList = authorsText.split(',').map(a => a.trim()).filter(Boolean);
    const tagsList = tagsText.split(',').map(t => t.trim()).filter(Boolean);

    const newPaper: Paper = {
      id: `paper-${Date.now()}`,
      title: title.trim(),
      authors: authorsList.length > 0 ? authorsList : ['Tác giả không xác định'],
      journal: journal.trim() || 'Tạp chí Khoa học',
      year: Number(year) || new Date().getFullYear(),
      volume: volume.trim(),
      issue: issue.trim(),
      pages: pages.trim(),
      doi: doi.trim(),
      abstract: abstract.trim() || 'Chưa có tóm tắt',
      tags: tagsList.length > 0 ? tagsList : ['Thư viện'],
      collectionId: collectionId || undefined,
      status: 'unread',
      starred: false,
      dateAdded: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      highlights: [],
      notes: '',
      bibtex: `@article{paper${year},\n  author = {${authorsList.join(' and ')}},\n  title = {${title}},\n  journal = {${journal}},\n  year = {${year}}\n}`,
    };

    onAddPaper(newPaper);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Thêm Tài liệu Khoa học Mới</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 font-medium text-xs border-b">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2 text-center rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'ai' ? 'bg-white text-indigo-950 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tự động qua DOI / Tiêu đề (AI Gemini)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 text-center rounded-lg transition-all ${
              activeTab === 'manual' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Nhập Thủ công
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {activeTab === 'ai' ? (
            <form onSubmit={handleAiParse} className="space-y-4">
              <p className="text-xs text-slate-600">
                Dán mã DOI (ví dụ <code>10.1038/s41586-019-1666-5</code>), tiêu đề bài báo, URL arXiv, hoặc đoạn trích dẫn bất kỳ. Gemini AI sẽ tự động trích xuất metadata và sinh mã BibTeX chuẩn.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã DOI, URL hoặc Trích dẫn thô:
                </label>
                <textarea
                  value={doiInput}
                  onChange={(e) => setDoiInput(e.target.value)}
                  rows={3}
                  placeholder="Ví dụ: 10.48550/arXiv.1706.03762 hoặc Vaswani et al. (2017) Attention Is All You Need..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thêm vào Bộ sưu tập (Tùy chọn):
                </label>
                <select
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">-- Không phân loại --</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                  {errorMessage}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Đang trích xuất với AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Trích xuất & Thêm Tài liệu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề bài báo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tác giả (ngăn cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={authorsText}
                  onChange={(e) => setAuthorsText(e.target.value)}
                  placeholder="Ashish Vaswani, Noam Shazeer"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tạp chí / Hội thảo</label>
                  <input
                    type="text"
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Năm xuất bản</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tập (Vol)</label>
                  <input
                    type="text"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số (Issue)</label>
                  <input
                    type="text"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trang</label>
                  <input
                    type="text"
                    value={pages}
                    onChange={(e) => setPages(e.target.value)}
                    placeholder="100-115"
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã DOI</label>
                <input
                  type="text"
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder="10.1016/j.xxx"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tóm tắt (Abstract)</label>
                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Thẻ phân loại (ngăn cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="Deep Learning, NLP"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Lưu Bài báo
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
