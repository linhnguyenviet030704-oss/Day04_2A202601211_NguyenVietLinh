export const STARTER_TOOL_NAMES = [
  'clarify',
  'timeline',
  'social_search',
  'lookup',
  'fetch',
  'format',
  'send',
  'policy',
  'papers',
  'paper_text',
  'paper_code',
  'citation_lookup',
  'method_extract',
  'rerank',
  'source_audit',
  'citation_export',
  'compare_sources',
  'rss_search',
  'claim_extract',
] as const;

export type StarterToolName = typeof STARTER_TOOL_NAMES[number];
export type StarterToolArgs = Record<string, unknown>;
export type StarterToolFetch = (url: string, init?: RequestInit) => Promise<Response>;
export type StarterToolRunner = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => Promise<StarterToolResponse>;

export interface StarterToolResponse<T = unknown> {
  success: boolean;
  result?: {
    tool: StarterToolName;
    args: StarterToolArgs;
    result: T;
  };
  error?: string;
  details?: string;
}

export async function runStarterTool<T = unknown>(
  tool: StarterToolName,
  args: StarterToolArgs = {},
  fetchImpl: StarterToolFetch = fetch,
): Promise<StarterToolResponse<T>> {
  const res = await fetchImpl('/api/agent/run', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({tool, args}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.details || data?.error || `Cannot run starter tool: ${tool}`);
  }
  return data;
}

export const askUser = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('clarify', args, fetchImpl);
export const getTimeline = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('timeline', args, fetchImpl);
export const searchSocial = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('social_search', args, fetchImpl);
export const lookupWeb = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('lookup', args, fetchImpl);
export const fetchUrl = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('fetch', args, fetchImpl);
export const formatDigest = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('format', args, fetchImpl);
export const sendTelegram = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('send', args, fetchImpl);
export const searchPolicy = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('policy', args, fetchImpl);
export const searchPapers = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('papers', args, fetchImpl);
export const readPaperText = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('paper_text', args, fetchImpl);
export const findPaperCode = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('paper_code', args, fetchImpl);
export const lookupCitations = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('citation_lookup', args, fetchImpl);
export const extractMethodSections = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('method_extract', args, fetchImpl);
export const rerankItems = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('rerank', args, fetchImpl);
export const auditSources = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('source_audit', args, fetchImpl);
export const exportCitations = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('citation_export', args, fetchImpl);
export const compareSources = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('compare_sources', args, fetchImpl);
export const searchRss = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('rss_search', args, fetchImpl);
export const extractClaims = (args: StarterToolArgs, fetchImpl?: StarterToolFetch) => runStarterTool('claim_extract', args, fetchImpl);

export const STARTER_TOOL_FUNCTION_MAP = {
  clarify: {webFunction: 'askUser', fn: askUser},
  timeline: {webFunction: 'getTimeline', fn: getTimeline},
  social_search: {webFunction: 'searchSocial', fn: searchSocial},
  lookup: {webFunction: 'lookupWeb', fn: lookupWeb},
  fetch: {webFunction: 'fetchUrl', fn: fetchUrl},
  format: {webFunction: 'formatDigest', fn: formatDigest},
  send: {webFunction: 'sendTelegram', fn: sendTelegram},
  policy: {webFunction: 'searchPolicy', fn: searchPolicy},
  papers: {webFunction: 'searchPapers', fn: searchPapers},
  paper_text: {webFunction: 'readPaperText', fn: readPaperText},
  paper_code: {webFunction: 'findPaperCode', fn: findPaperCode},
  citation_lookup: {webFunction: 'lookupCitations', fn: lookupCitations},
  method_extract: {webFunction: 'extractMethodSections', fn: extractMethodSections},
  rerank: {webFunction: 'rerankItems', fn: rerankItems},
  source_audit: {webFunction: 'auditSources', fn: auditSources},
  citation_export: {webFunction: 'exportCitations', fn: exportCitations},
  compare_sources: {webFunction: 'compareSources', fn: compareSources},
  rss_search: {webFunction: 'searchRss', fn: searchRss},
  claim_extract: {webFunction: 'extractClaims', fn: extractClaims},
} satisfies Record<StarterToolName, {webFunction: string; fn: StarterToolRunner}>;

const sampleItems = [
  {
    title: 'Attention Is All You Need',
    url: 'https://arxiv.org/abs/1706.03762',
    source: 'arXiv',
    summary: 'Transformer paper introducing self-attention for sequence transduction.',
    year: '2017',
    doi: '10.48550/arXiv.1706.03762',
    authors: ['Ashish Vaswani', 'Noam Shazeer'],
  },
  {
    title: 'RAG Survey',
    url: 'https://arxiv.org/abs/2312.10997',
    source: 'arXiv',
    summary: 'Survey of retrieval augmented generation systems.',
    year: '2023',
    authors: ['Yunfan Gao'],
  },
];

const samplePaperText = `Abstract
Retrieval augmented generation combines search with language models.

1 Method
The system retrieves passages, reranks them, and conditions generation on the selected evidence.

2 Results
Evaluation reports improved factuality and lower hallucination on knowledge-intensive tasks.`;

export const STARTER_TOOL_UI_ACTIONS = STARTER_TOOL_NAMES.map((tool) => {
  const base = STARTER_TOOL_FUNCTION_MAP[tool];
  const action = {
    clarify: {
      label: 'Clarify',
      description: 'Ask a user-facing clarification question.',
      args: {question: 'Bạn muốn tìm paper theo chủ đề nào?', response_type: 'text'},
    },
    timeline: {
      label: 'Timeline',
      description: 'Fetch recent posts from one account.',
      args: {screenname: 'OpenAI', limit: 2},
    },
    social_search: {
      label: 'Social Search',
      description: 'Search social posts by keyword.',
      args: {query: 'AI agents', search_type: 'Latest', limit: 2},
    },
    lookup: {
      label: 'Web Lookup',
      description: 'Search current web or news results.',
      args: {query: 'AI research news', topic: 'news', timeframe: 'week', max_results: 2},
    },
    fetch: {
      label: 'Fetch URL',
      description: 'Read a specific web page.',
      args: {url: 'https://example.com'},
    },
    format: {
      label: 'Format Digest',
      description: 'Format existing items into a digest.',
      args: {items: sampleItems, template: 'brief', headline: 'Starter Tool Digest'},
    },
    send: {
      label: 'Send',
      description: 'Dry-run outbound Telegram send.',
      args: {text: 'ScholarHub starter tool dry run', confirmed: false},
    },
    policy: {
      label: 'Policy',
      description: 'Search internal research policy.',
      args: {query: 'arXiv citation', policy_area: 'source_citation', top_k: 2},
    },
    papers: {
      label: 'Papers',
      description: 'Search arXiv papers.',
      args: {query: 'RAG evaluation', max_results: 2, sort_by: 'relevance'},
    },
    paper_text: {
      label: 'Paper Text',
      description: 'Extract text from an arXiv PDF.',
      args: {arxiv_url: '1706.03762', max_pages: 1, max_chars: 2000},
    },
    paper_code: {
      label: 'Paper Code',
      description: 'Find public implementation repositories.',
      args: {paper_title: 'Attention Is All You Need', arxiv_id: '1706.03762', max_results: 2},
    },
    citation_lookup: {
      label: 'Citation Lookup',
      description: 'Search Semantic Scholar metadata.',
      args: {query: 'Attention Is All You Need', max_results: 2},
    },
    method_extract: {
      label: 'Method Extract',
      description: 'Extract method/result sections from text.',
      args: {text: samplePaperText, max_chars: 1200},
    },
    rerank: {
      label: 'Rerank',
      description: 'Rank existing items against a query.',
      args: {query: 'retrieval augmented generation evaluation', items: sampleItems, top_k: 2},
    },
    source_audit: {
      label: 'Source Audit',
      description: 'Check source structure and duplicates.',
      args: {items: sampleItems, min_unique_sources: 1, require_urls: true, deduplicate: true},
    },
    citation_export: {
      label: 'Citation Export',
      description: 'Render existing metadata as citations.',
      args: {items: sampleItems, style: 'bibtex', deduplicate: true},
    },
    compare_sources: {
      label: 'Compare Sources',
      description: 'Compare overlap across existing sources.',
      args: {items: sampleItems, max_terms: 8},
    },
    rss_search: {
      label: 'RSS Search',
      description: 'Search supplied RSS feeds.',
      args: {feed_urls: ['https://export.arxiv.org/rss/cs.CL'], query: 'RAG', max_results: 2},
    },
    claim_extract: {
      label: 'Claim Extract',
      description: 'Extract checkable claims from text.',
      args: {text: samplePaperText, max_claims: 5},
    },
  }[tool];

  return {...action, tool, run: base.fn, webFunction: base.webFunction};
});
