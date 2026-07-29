from __future__ import annotations

from typing import Any

from tools._shared import terms


def _score(query_terms: set[str], item: dict[str, Any]) -> int:
    title_terms = terms(str(item.get("title") or ""))
    summary_terms = terms(str(item.get("summary") or ""))
    section_terms = terms(str(item.get("section") or ""))
    return 3 * len(query_terms & title_terms) + len(query_terms & summary_terms) + len(query_terms & section_terms)


def rerank_items(query: str = "", items: list[dict[str, Any]] | None = None, top_k: int = 5) -> dict[str, Any]:
    items = items or []
    query_terms = terms(query)
    top_k = max(1, min(int(top_k or 5), len(items) or 1))
    ranked = []
    for index, item in enumerate(items):
        enriched = dict(item)
        enriched["original_rank"] = index + 1
        enriched["rerank_score"] = _score(query_terms, item)
        ranked.append(enriched)
    ranked.sort(key=lambda item: (item["rerank_score"], -item["original_rank"]), reverse=True)
    return {"tool": "rerank_items", "query": query, "items": ranked[:top_k], "item_count": len(items), "method": "lexical_overlap"}
