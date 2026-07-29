from __future__ import annotations

import re
from typing import Any


DEFAULT_KEYWORDS = ["method", "methodology", "approach", "model", "experiment", "evaluation", "result", "limitation"]


def _heading(line: str) -> str:
    line = line.strip().strip("#").strip()
    line = re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", line)
    return line[:80]


def _sections(text: str) -> list[tuple[str, str]]:
    matches = list(re.finditer(r"(?m)^(?:#{1,3}\s*)?(?:\d+(?:\.\d+)*\.?\s+)?([A-Z][A-Za-z /-]{2,80})\s*$", text or ""))
    if not matches:
        return [("Excerpt", text.strip())] if text.strip() else []
    sections = []
    for index, match in enumerate(matches):
        title = _heading(match.group(1))
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if body:
            sections.append((title, body))
    return sections


def extract_method_sections(text: str = "", section_keywords: list[str] | None = None, max_chars: int = 4000) -> dict[str, Any]:
    keywords = [item.lower() for item in (section_keywords or DEFAULT_KEYWORDS)]
    max_chars = max(500, min(int(max_chars or 4000), 12000))
    items = []
    for title, body in _sections(text):
        folded_title = title.lower()
        if any(keyword in folded_title for keyword in keywords):
            excerpt = body[:max_chars]
            items.append({
                "title": title,
                "section": title,
                "source": "paper_text",
                "summary": excerpt,
                "chars_returned": len(excerpt),
            })
    if not items and text.strip():
        excerpt = text.strip()[:max_chars]
        items.append({"title": "Excerpt", "section": "Excerpt", "source": "paper_text", "summary": excerpt, "chars_returned": len(excerpt)})
    return {"tool": "extract_method_sections", "items": items, "section_count": len(items)}
