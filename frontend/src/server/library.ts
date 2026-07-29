import fs from 'node:fs/promises';
import path from 'node:path';
import type { CitationStyle, Collection, Paper } from '../types';

export type { CitationStyle, Collection, Paper };

export interface LibraryData {
  papers: Paper[];
  collections: Collection[];
  updatedAt: string;
}

const now = () => new Date().toISOString();

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function clean(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function bibValue(value: unknown): string {
  return clean(value).replace(/[{}]/g, '');
}

function firstWord(value: string): string {
  return clean(value).split(' ')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'paper';
}

function lastName(value: string): string {
  return clean(value).split(' ').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'author';
}

export function normalizeLibrary(input: unknown): LibraryData {
  const data = input && typeof input === 'object' ? input as Partial<LibraryData> : {};
  return {
    papers: asArray<Paper>(data.papers),
    collections: asArray<Collection>(data.collections),
    updatedAt: now(),
  };
}

export function buildBibTeX(papers: Paper[]): string {
  return papers.map((paper) => {
    const key = `${lastName(paper.authors?.[0] || '')}${paper.year || new Date().getFullYear()}${firstWord(paper.title)}`;
    const lines = [
      `@article{${key},`,
      `  author    = {${(paper.authors || []).map(bibValue).join(' and ')}},`,
      `  title     = {${bibValue(paper.title)}},`,
      `  journal   = {${bibValue(paper.journal)}},`,
      `  year      = {${paper.year || new Date().getFullYear()}},`,
    ];

    if (paper.volume) lines.push(`  volume    = {${bibValue(paper.volume)}},`);
    if (paper.issue) lines.push(`  number    = {${bibValue(paper.issue)}},`);
    if (paper.pages) lines.push(`  pages     = {${bibValue(paper.pages)}},`);
    if (paper.doi) lines.push(`  doi       = {${bibValue(paper.doi)}},`);
    if (paper.publisher) lines.push(`  publisher = {${bibValue(paper.publisher)}},`);
    if (paper.url || paper.pdfUrl) lines.push(`  url       = {${bibValue(paper.url || paper.pdfUrl)}},`);

    lines.push('}');
    return lines.join('\n');
  }).join('\n\n');
}

function formatCitation(paper: Paper, style: CitationStyle): string {
  const authors = (paper.authors || []).join(', ') || 'Unknown author';
  if (style === 'BibTeX') return buildBibTeX([paper]);
  return `${authors} (${paper.year || 'n.d.'}). ${clean(paper.title)}. ${clean(paper.journal)}${paper.doi ? `. doi:${paper.doi}` : ''}`;
}

function pdfText(value: string): string {
  return clean(value).replace(/[^\x20-\x7E]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(value: string, width = 92): string[] {
  const words = pdfText(value).split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (`${line} ${word}`.trim().length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function buildPdf(papers: Paper[], style: CitationStyle, title = 'Bibliography'): Buffer {
  const textLines = [
    title,
    `Style: ${style} | Documents: ${papers.length} | Exported: ${new Date().toLocaleDateString('en-CA')}`,
    '',
    ...papers.flatMap((paper, index) => wrap(`${index + 1}. ${formatCitation(paper, style)}`)),
  ].slice(0, 52);

  const stream = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${pdfText(textLines[0] || title)}) Tj`,
    '/F1 10 Tf',
    '14 TL',
    ...textLines.slice(1).map((line) => `T* (${line}) Tj`),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = Buffer.byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefAt = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;

  return Buffer.from(pdf);
}

export class LibraryStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<LibraryData | null> {
    try {
      return normalizeLibrary(JSON.parse(await fs.readFile(this.filePath, 'utf8')));
    } catch (error: any) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }

  async write(input: unknown): Promise<LibraryData> {
    const data = normalizeLibrary(input);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    return data;
  }
}
