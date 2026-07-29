import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBibTeX,
  buildPdf,
  normalizeLibrary,
  type Paper,
} from '../src/server/library.ts';

const paper: Paper = {
  id: 'p1',
  title: 'Attention Is All You Need',
  authors: ['Ashish Vaswani', 'Noam Shazeer'],
  journal: 'NeurIPS',
  year: 2017,
  doi: '10.48550/arXiv.1706.03762',
  abstract: 'Transformer paper',
  tags: ['NLP'],
  status: 'unread',
  starred: false,
  dateAdded: '2026-01-01T00:00:00.000Z',
  lastModified: '2026-01-01T00:00:00.000Z',
  highlights: [],
  notes: '',
  bibtex: '',
};

test('buildBibTeX exports a usable article entry', () => {
  const bibtex = buildBibTeX([paper]);

  assert.match(bibtex, /^@article\{vaswani2017attention,/);
  assert.match(bibtex, /author    = \{Ashish Vaswani and Noam Shazeer\}/);
  assert.match(bibtex, /doi       = \{10\.48550\/arXiv\.1706\.03762\}/);
});

test('buildPdf returns a PDF buffer', () => {
  const pdf = buildPdf([paper], 'APA', 'Bibliography');

  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 200);
});

test('normalizeLibrary keeps arrays and fixes missing metadata', () => {
  const library = normalizeLibrary({ papers: [paper], collections: [{ id: 'c1', name: 'AI' }] });

  assert.equal(library.papers[0].id, 'p1');
  assert.equal(library.collections[0].name, 'AI');
  assert.match(library.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
});
