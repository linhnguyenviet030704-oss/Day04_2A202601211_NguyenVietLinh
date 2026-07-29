import { Paper, CitationStyle } from '../types';

/**
 * Formats authors list according to citation conventions
 */
export function formatAuthors(authors: string[], style: CitationStyle): string {
  if (!authors || authors.length === 0) return 'Tác giả không xác định';

  if (style === 'APA') {
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  if (style === 'IEEE' || style === 'Nature') {
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    return `${authors[0]} et al.`;
  }

  if (style === 'Chicago' || style === 'Harvard') {
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
    if (authors.length <= 3) return `${authors.slice(0, -1).join(', ')}, and ${authors[authors.length - 1]}`;
    return `${authors[0]} et al.`;
  }

  return authors.join(', ');
}

/**
 * Generates clean BibTeX string for a paper
 */
export function generateBibTeX(paper: Paper): string {
  const firstAuthorLastName = paper.authors[0]
    ? paper.authors[0].split(' ').pop()?.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'author'
    : 'author';

  const citationKey = `${firstAuthorLastName}${paper.year}${paper.title.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/gi, '')}`;

  const authorsFormatted = paper.authors.join(' and ');

  let bib = `@article{${citationKey},\n`;
  bib += `  author    = {${authorsFormatted}},\n`;
  bib += `  title     = {${paper.title}},\n`;
  bib += `  journal   = {${paper.journal}},\n`;
  bib += `  year      = {${paper.year}},\n`;
  if (paper.volume) bib += `  volume    = {${paper.volume}},\n`;
  if (paper.issue) bib += `  number    = {${paper.issue}},\n`;
  if (paper.pages) bib += `  pages     = {${paper.pages}},\n`;
  if (paper.doi) bib += `  doi       = {${paper.doi}},\n`;
  if (paper.publisher) bib += `  publisher = {${paper.publisher}},\n`;
  if (paper.url) bib += `  url       = {${paper.url}},\n`;
  bib += `}`;

  return bib;
}

/**
 * Formats a full scientific citation string based on standard styles
 */
export function formatCitation(paper: Paper, style: CitationStyle): string {
  const authorsStr = formatAuthors(paper.authors, style);
  const volStr = paper.volume ? `vol. ${paper.volume}` : '';
  const issueStr = paper.issue ? `no. ${paper.issue}` : '';
  const pagesStr = paper.pages ? `pp. ${paper.pages}` : '';
  const doiStr = paper.doi ? `https://doi.org/${paper.doi}` : '';

  switch (style) {
    case 'APA':
      // Author, A. A. (Year). Title of article. Title of Periodical, volume(issue), pages. https://doi.org/xxx
      return `${authorsStr} (${paper.year}). ${paper.title}. ${paper.journal}${paper.volume ? `, ${paper.volume}` : ''}${paper.issue ? `(${paper.issue})` : ''}${paper.pages ? `, ${paper.pages}` : ''}.${doiStr ? ` ${doiStr}` : ''}`;

    case 'IEEE':
      // A. Author, "Title of paper," Abbrev. Title of Periodical, vol. x, no. x, pp. xxx-xxx, Abbrev. Month, year, doi: xxx.
      return `${authorsStr}, "${paper.title}," ${paper.journal}${volStr ? `, ${volStr}` : ''}${issueStr ? `, ${issueStr}` : ''}${pagesStr ? `, ${pagesStr}` : ''}, ${paper.year}.${paper.doi ? ` doi: ${paper.doi}.` : ''}`;

    case 'Chicago':
      // Author Last Name, First Name. "Title of Article." Journal Title volume, no. issue (Year): page range. DOI/URL.
      return `${authorsStr}. "${paper.title}." ${paper.journal} ${paper.volume || ''}${paper.issue ? `, no. ${paper.issue}` : ''} (${paper.year})${paper.pages ? `: ${paper.pages}` : ''}.${doiStr ? ` ${doiStr}` : ''}`;

    case 'Harvard':
      // Author(s) (Year) 'Title of article', Journal Title, Volume(Issue), pp. page range.
      return `${authorsStr} (${paper.year}) '${paper.title}', ${paper.journal}${paper.volume ? `, ${paper.volume}` : ''}${paper.issue ? `(${paper.issue})` : ''}${pagesStr ? `, ${pagesStr}` : ''}.${doiStr ? ` Available at: ${doiStr}` : ''}`;

    case 'Nature':
      // Author, A. Title of article. Journal Title volume, pages (year).
      return `${authorsStr} ${paper.title}. ${paper.journal} ${paper.volume || ''}${paper.pages ? `, ${paper.pages}` : ''} (${paper.year}).${doiStr ? ` DOI: ${paper.doi}` : ''}`;

    case 'BibTeX':
      return generateBibTeX(paper);

    default:
      return `${authorsStr} (${paper.year}). ${paper.title}. ${paper.journal}.`;
  }
}

/**
 * Formats in-text citation string (e.g., "(Nguyen et al., 2025)" or "[1]")
 */
export function formatInTextCitation(paper: Paper, style: CitationStyle, index: number = 1): string {
  const firstAuthorName = paper.authors[0] ? paper.authors[0].split(' ').pop() || paper.authors[0] : 'Author';

  if (style === 'IEEE' || style === 'Nature') {
    return `[${index}]`;
  }

  if (paper.authors.length === 1) {
    return `(${firstAuthorName}, ${paper.year})`;
  } else if (paper.authors.length === 2) {
    const secondAuthorName = paper.authors[1].split(' ').pop() || paper.authors[1];
    return `(${firstAuthorName} & ${secondAuthorName}, ${paper.year})`;
  } else {
    return `(${firstAuthorName} et al., ${paper.year})`;
  }
}

/**
 * Triggers file download for BibTeX (.bib) file
 */
export function downloadBibTeXFile(papers: Paper[], filename = 'scholar_citations.bib') {
  const bibContent = papers.map(generateBibTeX).join('\n\n');
  const blob = new Blob([bibContent], { type: 'text/x-bibtex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an printable HTML document window for PDF printing
 */
export function printBibliographyPDF(papers: Paper[], style: CitationStyle = 'APA', reportTitle = 'Danh mục Trích dẫn Nghiên cứu Khoa học') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const citationsList = papers.map((p, idx) => {
    const citation = formatCitation(p, style);
    return `
      <div style="margin-bottom: 18px; line-height: 1.6; text-indent: -24px; padding-left: 24px;">
        <span style="font-weight: 600; color: #374151;">${style === 'IEEE' || style === 'Nature' ? `[${idx + 1}] ` : ''}</span>
        ${citation}
        ${p.notes ? `<div style="text-indent: 0px; padding-left: 0px; font-size: 13px; color: #4b5563; background: #f9fafb; padding: 8px 12px; border-left: 3px solid #cbd5e1; margin-top: 6px; border-radius: 4px;"><strong>Ghi chú nghiên cứu:</strong> ${p.notes}</div>` : ''}
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>${reportTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 2.5cm;
        }
        body {
          font-family: 'Times New Roman', Times, Georgia, serif;
          color: #111827;
          background: #ffffff;
          padding: 0;
          margin: 0;
          font-size: 12pt;
        }
        .header {
          border-bottom: 2px solid #1e293b;
          padding-bottom: 12px;
          margin-bottom: 24px;
        }
        .title {
          font-size: 18pt;
          font-weight: bold;
          color: #0f172a;
          margin: 0 0 6px 0;
        }
        .meta {
          font-size: 10pt;
          color: #64748b;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .badge {
          display: inline-block;
          padding: 2px 8px;
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          font-size: 9pt;
          font-weight: 600;
          color: #334155;
        }
        .content {
          margin-top: 20px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9pt;
          color: #94a3b8;
          text-align: center;
          font-family: system-ui, -apple-system, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">${reportTitle}</h1>
        <div class="meta">
          <span>Định dạng trích dẫn: <span class="badge">${style}</span></span> |
          <span>Số lượng tài liệu: <strong>${papers.length}</strong></span> |
          <span>Thời gian xuất: ${new Date().toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
      <div class="content">
        ${citationsList}
      </div>
      <div class="footer">
        Được xuất từ ScholarHub - Hệ thống Quản lý Nghiên cứu Khoa học & Trích dẫn Tự động
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
