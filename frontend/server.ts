import express from 'express';
import path from 'path';
import { spawn } from 'node:child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { buildBibTeX, buildPdf, LibraryStore, normalizeLibrary } from './src/server/library.ts';
import type { SyncStatus } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;
const libraryStore = new LibraryStore(path.join(process.cwd(), 'data', 'library.json'));
const starterAgentScript = path.resolve(process.cwd(), '..', 'starter_v0', 'scripts', 'backend_agent.py');

app.use(express.json({ limit: '10mb' }));

function filename(value: string, fallback: string) {
  return (value || fallback).toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 80) || fallback;
}

function pythonCommand() {
  return process.platform === 'win32' ? 'python' : 'python3';
}

function runStarterTool(tool: string, args: Record<string, unknown>) {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand(), [starterAgentScript, tool, JSON.stringify(args || {})], {
      cwd: path.resolve(process.cwd(), '..', 'starter_v0'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `starter_v0 exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch {
        reject(new Error(stdout || 'starter_v0 returned invalid JSON'));
      }
    });
  });
}

// Lazy initializer for GoogleGenAI
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Simulated Sync Store
let syncState: SyncStatus = {
  status: 'synced' as const,
  lastSynced: new Date().toISOString(),
  deviceCount: 3,
  storageUsedMb: 142.8,
  storageLimitMb: 5000.0,
  autoSync: true,
};

let devices = [
  { id: 'dev-1', name: 'MacBook Pro M3 (Máy tính này)', type: 'desktop' as const, lastActive: 'Vừa xong', current: true, location: 'Hà Nội, Việt Nam' },
  { id: 'dev-2', name: 'iPad Pro 12.9" (Scholar Mobile)', type: 'tablet' as const, lastActive: '5 phút trước', current: false, location: 'Hà Nội, Việt Nam' },
  { id: 'dev-3', name: 'iPhone 16 Pro (Scholar Sync)', type: 'mobile' as const, lastActive: '1 giờ trước', current: false, location: 'Đà Nẵng, Việt Nam' },
];

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Library persistence: shared JSON backend, with frontend localStorage as fallback.
app.get('/api/library', async (req, res) => {
  try {
    res.json({ success: true, library: await libraryStore.read() });
  } catch (err: any) {
    res.status(500).json({ error: 'Cannot read library', details: err?.message });
  }
});

app.put('/api/library', async (req, res) => {
  try {
    const library = await libraryStore.write(req.body);
    syncState.lastSynced = library.updatedAt;
    syncState.status = 'synced';
    syncState.storageUsedMb = Number((Buffer.byteLength(JSON.stringify(library)) / 1024 / 1024).toFixed(2));
    res.json({ success: true, library, syncState });
  } catch (err: any) {
    res.status(500).json({ error: 'Cannot save library', details: err?.message });
  }
});

app.post('/api/export/bibtex', async (req, res) => {
  try {
    const library = normalizeLibrary(req.body?.papers ? req.body : await libraryStore.read());
    const content = buildBibTeX(library.papers);
    res.setHeader('Content-Type', 'text/x-bibtex; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename(req.body?.filename, 'scholarhub.bib')}"`);
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ error: 'Cannot export BibTeX', details: err?.message });
  }
});

app.post('/api/export/pdf', async (req, res) => {
  try {
    const library = normalizeLibrary(req.body?.papers ? req.body : await libraryStore.read());
    const pdf = buildPdf(library.papers, req.body?.style || 'APA', req.body?.title || 'ScholarHub Bibliography');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename(req.body?.filename, 'scholarhub.pdf')}"`);
    res.send(pdf);
  } catch (err: any) {
    res.status(500).json({ error: 'Cannot export PDF', details: err?.message });
  }
});

// Cloud Sync Status
app.get('/api/sync/status', (req, res) => {
  res.json({ syncState, devices });
});

// Trigger Cloud Sync
app.post('/api/sync/trigger', (req, res) => {
  const incomingLibrary = req.body?.papers || req.body?.collections ? req.body : null;
  Promise.resolve(incomingLibrary ? libraryStore.write(incomingLibrary) : libraryStore.read())
    .then((library) => {
      syncState.lastSynced = library?.updatedAt || new Date().toISOString();
      syncState.status = 'synced';
      syncState.storageUsedMb = Number((Buffer.byteLength(JSON.stringify(library || {})) / 1024 / 1024).toFixed(2));
      res.json({ success: true, syncState, library });
    })
    .catch((err: any) => {
      syncState.status = 'error';
      res.status(500).json({ error: 'Cannot sync library', details: err?.message });
    });
});

app.post('/api/agent/run', async (req, res) => {
  try {
    const { tool, args = {} } = req.body || {};
    if (!tool || typeof tool !== 'string') {
      return res.status(400).json({ error: 'Missing starter_v0 tool name' });
    }
    res.json({ success: true, result: await runStarterTool(tool, args) });
  } catch (err: any) {
    res.status(500).json({ error: 'Cannot run starter_v0 agent tool', details: err?.message });
  }
});

// AI Route 1: Parse DOI or citation text to generate structured Paper Metadata
app.post('/api/ai/parse-doi-or-text', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Nội dung đầu vào không hợp lệ' });
    }

    const ai = getGenAIClient();

    const prompt = `Bạn là một trợ lý nghiên cứu khoa học chuyên nghiệp. 
Hãy phân tích thông tin đầu vào (có thể là mã DOI, đoạn trích dẫn, tiêu đề bài báo, hoặc tóm tắt) và trả về thông tin bài báo khoa học cấu trúc bằng JSON:
Đầu vào: "${input}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia phân tích trích dẫn khoa học. Trả về đúng định dạng JSON theo schema được yêu cầu.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Tiêu đề đầy đủ của bài báo' },
            authors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Danh sách tên các tác giả (ví dụ: ["Ashish Vaswani", "Noam Shazeer"])' 
            },
            journal: { type: Type.STRING, description: 'Tên tạp chí hoặc hội thảo phát hành' },
            year: { type: Type.INTEGER, description: 'Năm xuất bản' },
            volume: { type: Type.STRING, description: 'Tập (Volume)' },
            issue: { type: Type.STRING, description: 'Số (Issue / Number)' },
            pages: { type: Type.STRING, description: 'Trang (ví dụ: 100-115)' },
            doi: { type: Type.STRING, description: 'Mã DOI (ví dụ: 10.1016/j.jclim.2024.02.018)' },
            abstract: { type: Type.STRING, description: 'Tóm tắt bài báo bằng Tiếng Việt hoặc giữ nguyên tiếng Anh nếu là thuật ngữ chuyên sâu' },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: '3-5 từ khóa/thẻ chủ đề chính' 
            },
            publisher: { type: Type.STRING, description: 'Nhà xuất bản (Nature, Elsevier, IEEE, Springer, IEEE...)' }
          },
          required: ['title', 'authors', 'journal', 'year', 'abstract', 'tags']
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsedData = JSON.parse(jsonText);

    // Generate BibTeX automatically if missing
    const firstAuthor = parsedData.authors?.[0] ? parsedData.authors[0].split(' ').pop()?.toLowerCase() || 'author' : 'author';
    const key = `${firstAuthor}${parsedData.year || 2025}paper`;
    const bibtex = `@article{${key},
  author    = {${(parsedData.authors || []).join(' and ')}},
  title     = {${parsedData.title || ''}},
  journal   = {${parsedData.journal || ''}},
  year      = {${parsedData.year || 2025}},
  volume    = {${parsedData.volume || ''}},
  number    = {${parsedData.issue || ''}},
  pages     = {${parsedData.pages || ''}},
  doi       = {${parsedData.doi || ''}}
}`;

    res.json({
      success: true,
      paper: {
        ...parsedData,
        bibtex,
      }
    });

  } catch (err: any) {
    console.error('Error in parse-doi-or-text:', err);
    res.status(500).json({ 
      error: 'Không thể phân tích dữ liệu bài báo.', 
      details: err?.message || 'Lỗi kết nối Gemini API' 
    });
  }
});

// AI Route 2: Analyze Paper (Executive Summary, Research Gaps, Methodology)
app.post('/api/ai/analyze-paper', async (req, res) => {
  try {
    const { title, abstract, fullText, notes } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Cần tiêu đề bài báo để phân tích' });
    }

    const ai = getGenAIClient();

    const prompt = `Bạn là một phản biện khoa học (peer reviewer) và trợ lý nghiên cứu cấp cao.
Hãy phân tích bài báo khoa học sau và xuất bản báo cáo tóm tắt phân tích bằng Tiếng Việt chuyên sâu, súc tích:

Tiêu đề: ${title}
Tóm tắt: ${abstract || 'Chưa có tóm tắt'}
Nội dung chi tiết/Ghi chú: ${(fullText || notes || '').slice(0, 3000)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Bạn là chuyên gia phân tích bài báo khoa học. Hãy trình bày kết quả bằng Tiếng Việt rõ ràng, mạch lạc, chia thành các mục:',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'Tóm tắt điều hành 3-4 câu cốt lõi' },
            keyContributions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: '3 điểm đóng góp khoa học chính' 
            },
            methodology: { type: Type.STRING, description: 'Phương pháp luận & Mô hình nghiên cứu chính' },
            researchGaps: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: '2-3 kẽ hở nghiên cứu / Giới hạn cần phát triển thêm' 
            },
            suggestedResearchQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 câu hỏi gợi mở cho công trình tiếp theo'
            }
          },
          required: ['summary', 'keyContributions', 'methodology', 'researchGaps']
        }
      }
    });

    const jsonText = response.text || '{}';
    res.json({ success: true, analysis: JSON.parse(jsonText) });

  } catch (err: any) {
    console.error('Error in analyze-paper:', err);
    res.status(500).json({ error: 'Không thể phân tích bài báo', details: err?.message });
  }
});

// AI Route 3: Suggest Related Academic References
app.post('/api/ai/suggest-references', async (req, res) => {
  try {
    const { topic, abstract } = req.body;
    const ai = getGenAIClient();

    const prompt = `Gợi ý 4 bài báo khoa học nổi bật/kinh điển liên quan đến chủ đề/tóm tắt sau:
Chủ đề: "${topic || ''}"
Tóm tắt: "${abstract || ''}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              authors: { type: Type.ARRAY, items: { type: Type.STRING } },
              journal: { type: Type.STRING },
              year: { type: Type.INTEGER },
              reason: { type: Type.STRING, description: 'Lý do bài báo này quan trọng và có liên quan' }
            },
            required: ['title', 'authors', 'journal', 'year', 'reason']
          }
        }
      }
    });

    res.json({ success: true, recommendations: JSON.parse(response.text || '[]') });
  } catch (err: any) {
    console.error('Error in suggest-references:', err);
    res.status(500).json({ error: 'Không thể tìm bài báo liên quan', details: err?.message });
  }
});

// --- ARXIV API & INTERNET RESEARCH AGENT ---

// Helper function to parse arXiv XML Atom feed
function parseArxivXml(xmlText: string) {
  const entries: any[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[1];

    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Bài báo arXiv';
    title = title.replace(/^Title:\s*/i, '');

    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
    const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';

    const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/);
    const rawId = idMatch ? idMatch[1].trim() : '';
    let arxivId = rawId.split('/abs/').pop() || rawId.split('/pdf/').pop() || '';
    if (arxivId.includes('v')) {
      // keep version or strip version if needed
    }

    const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/);
    const publishedDate = publishedMatch ? publishedMatch[1].trim() : '';
    const year = publishedDate ? new Date(publishedDate).getFullYear() : new Date().getFullYear();

    const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
    const authors: string[] = [];
    let authorMatch;
    while ((authorMatch = authorRegex.exec(entryXml)) !== null) {
      authors.push(authorMatch[1].trim());
    }

    const pdfLinkMatch = entryXml.match(/<link[^>]*title="pdf"[^>]*href="([^"]+)"/);
    let pdfUrl = pdfLinkMatch ? pdfLinkMatch[1] : (arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : '');
    if (pdfUrl && pdfUrl.startsWith('http:')) {
      pdfUrl = pdfUrl.replace('http:', 'https:');
    }
    if (pdfUrl && !pdfUrl.endsWith('.pdf')) {
      pdfUrl += '.pdf';
    }

    const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);
    const doi = doiMatch ? doiMatch[1].trim() : (arxivId ? `10.48550/arXiv.${arxivId.replace('v', '.v')}` : '');

    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    const tags: string[] = [];
    let catMatch;
    while ((catMatch = categoryRegex.exec(entryXml)) !== null) {
      tags.push(catMatch[1]);
    }

    const cleanArxivId = arxivId.split('v')[0];
    const firstAuthorLastName = authors.length > 0 ? authors[0].split(' ').pop() || 'author' : 'author';
    const bibtexKey = `${firstAuthorLastName.toLowerCase()}${year}${cleanArxivId.replace('.', '')}`;
    const bibtex = `@article{${bibtexKey},
  author    = {${authors.join(' and ')}},
  title     = {${title}},
  journal   = {arXiv preprint arXiv:${arxivId}},
  year      = {${year}},
  eprint    = {${arxivId}},
  archivePrefix = {arXiv},
  primaryClass = {${tags[0] || 'cs.AI'}},
  url       = {https://arxiv.org/abs/${arxivId}}
}`;

    entries.push({
      arxivId,
      title,
      authors: authors.length > 0 ? authors : ['Nhiều tác giả'],
      journal: `arXiv:${arxivId}`,
      year,
      abstract: summary,
      pdfUrl,
      absUrl: `https://arxiv.org/abs/${arxivId}`,
      doi,
      tags: tags.length > 0 ? tags.slice(0, 4) : ['arXiv', 'Computer Science'],
      bibtex,
      publisher: 'arXiv.org',
    });
  }

  return entries;
}

// arXiv Live Search & AI Research Agent Endpoint
app.post('/api/arxiv/search', async (req, res) => {
  try {
    const { query, maxResults = 8 } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Cần từ khóa hoặc câu hỏi nghiên cứu' });
    }

    // Step 1: Use Gemini to build an optimized arXiv query string and research overview synthesis prompt
    const ai = getGenAIClient();
    const queryOptimizePrompt = `Người dùng muốn tìm bài báo khoa học trên internet / arXiv với yêu cầu: "${query}".
Hãy chuyển đổi yêu cầu này thành từ khóa tìm kiếm tiếng Anh chuẩn cho arXiv API (ví dụ: "all:transformer AND all:attention" hoặc "all:climate model"). Trả về JSON:`;

    const queryOptRes = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: queryOptimizePrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            arxivQueryString: { type: Type.STRING, description: 'Từ khóa tiếng Anh tối ưu cho arXiv search query' },
            searchIntentVietnamese: { type: Type.STRING, description: 'Diễn giải ý định tìm kiếm bằng tiếng Việt' }
          },
          required: ['arxivQueryString', 'searchIntentVietnamese']
        }
      }
    });

    const optData = JSON.parse(queryOptRes.text || '{}');
    const searchParam = optData.arxivQueryString || query;

    // Step 2: Fetch directly from arXiv API
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchParam)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
    
    let rawXml = '';
    try {
      const arxivRes = await fetch(arxivUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScholarHub/1.0',
        }
      });
      if (arxivRes.ok) {
        rawXml = await arxivRes.text();
      }
    } catch (fetchErr) {
      console.warn('arXiv fetch warning:', fetchErr);
    }

    let papers = parseArxivXml(rawXml);

    // Fallback: If arXiv API returned 0 results or failed, use Gemini AI grounded search to synthesize 4 real arXiv papers
    if (papers.length === 0) {
      const fallbackPrompt = `Hãy tìm kiếm và cung cấp 5 bài báo khoa học thực tế có trên arXiv liên quan đến chủ đề: "${query}".
Yêu cầu trả về đúng danh sách bài báo với các trường tiêu đề, tác giả, năm xuất bản, mã arXiv ID thực tế (ví dụ: "1706.03762"), tóm tắt (abstract), link PDF arXiv ("https://arxiv.org/pdf/xxxx.pdf"), và từ khóa tags.`;

      const fallbackRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: fallbackPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                arxivId: { type: Type.STRING },
                title: { type: Type.STRING },
                authors: { type: Type.ARRAY, items: { type: Type.STRING } },
                year: { type: Type.INTEGER },
                abstract: { type: Type.STRING },
                pdfUrl: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                doi: { type: Type.STRING }
              },
              required: ['arxivId', 'title', 'authors', 'year', 'abstract', 'pdfUrl']
            }
          }
        }
      });

      const fallbackList = JSON.parse(fallbackRes.text || '[]');
      papers = fallbackList.map((item: any) => {
        const arxivId = item.arxivId || '2401.00000';
        const pdfUrl = item.pdfUrl || `https://arxiv.org/pdf/${arxivId}.pdf`;
        return {
          arxivId,
          title: item.title,
          authors: item.authors || ['Nhiều tác giả'],
          journal: `arXiv:${arxivId}`,
          year: item.year || 2024,
          abstract: item.abstract,
          pdfUrl,
          absUrl: `https://arxiv.org/abs/${arxivId}`,
          doi: item.doi || `10.48550/arXiv.${arxivId}`,
          tags: item.tags || ['arXiv', 'Nghiên cứu'],
          bibtex: `@article{paper${arxivId.replace('.', '')}, author={${(item.authors || []).join(' and ')}}, title={${item.title}}, journal={arXiv preprint arXiv:${arxivId}}, year={${item.year || 2024}}}`,
          publisher: 'arXiv.org'
        };
      });
    }

    // Step 3: AI Agent Overview Synthesis
    let agentSynthesis = '';
    if (papers.length > 0) {
      const synthesisPrompt = `Bạn là một AI Research Agent chuyên nghiệp. 
Hãy đưa ra một tổng quan phân tích súc tích (3-4 câu bằng tiếng Việt) cho tổng hợp các kết quả nghiên cứu arXiv vừa tìm được với chủ đề "${query}". 
Nội dung nhấn mạnh: Xu hướng công nghệ/nghiên cứu mới nhất và lời khuyên nghiên cứu cho nhà khoa học.`;

      const synthRes = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: synthesisPrompt,
      });
      agentSynthesis = synthRes.text || 'AI Research Agent đã thu thập thành công các tài liệu khoa học mới nhất từ arXiv.';
    }

    res.json({
      success: true,
      query: searchParam,
      intent: optData.searchIntentVietnamese || query,
      agentSynthesis,
      totalFound: papers.length,
      papers,
    });

  } catch (err: any) {
    console.error('Error in arXiv search agent:', err);
    res.status(500).json({ error: 'Lỗi khi thực hiện tìm kiếm AI Agent trên arXiv', details: err?.message });
  }
});

// Proxy arXiv PDF Direct Downloader
app.get('/api/arxiv/download-pdf', async (req, res) => {
  try {
    const pdfUrl = req.query.url as string;
    const title = (req.query.title as string) || 'arxiv_paper';

    if (!pdfUrl) {
      return res.status(400).json({ error: 'Thiếu đường dẫn PDF (pdfUrl)' });
    }

    const targetUrl = pdfUrl.startsWith('http') ? pdfUrl : `https://arxiv.org/pdf/${pdfUrl}.pdf`;

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScholarHub/1.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Không thể tải PDF từ arXiv. Có thể tệp chưa sẵn sàng.' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFilename = title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 45) + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(buffer);

  } catch (err: any) {
    console.error('Error in proxy download PDF:', err);
    res.status(500).json({ error: 'Lỗi tải tệp PDF từ máy chủ arXiv', details: err?.message });
  }
});

// --- VITE & STATIC FILES ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScholarHub Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
