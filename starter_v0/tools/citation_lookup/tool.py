from __future__ import annotations

import os
import re
from typing import Any

import requests

from tools._shared import TIMEOUT, err


BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS = "title,year,authors,url,abstract,citationCount,referenceCount,influentialCitationCount,externalIds,tldr,citationStyles"


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
    if key:
        headers["x-api-key"] = key
    return headers


def _paper_id(value: str) -> str:
    value = (value or "").strip()
    if re.fullmatch(r"\d{4}\.\d{4,5}(?:v\d+)?", value):
        return f"ARXIV:{value}"
    if value.startswith("10."):
        return f"DOI:{value}"
    return value


def _item(raw: dict[str, Any]) -> dict[str, Any]:
    tldr = raw.get("tldr") or {}
    citation_styles = raw.get("citationStyles") or {}
    return {
        "title": raw.get("title"),
        "url": raw.get("url"),
        "source": "semanticscholar.org",
        "summary": raw.get("abstract") or tldr.get("text") or "",
        "year": raw.get("year"),
        "authors": [author.get("name") for author in raw.get("authors") or [] if author.get("name")],
        "citation_count": raw.get("citationCount"),
        "reference_count": raw.get("referenceCount"),
        "influential_citation_count": raw.get("influentialCitationCount"),
        "external_ids": raw.get("externalIds") or {},
        "bibtex": citation_styles.get("bibtex"),
    }


def lookup_citations(paper_id: str = "", query: str = "", max_results: int = 5) -> dict[str, Any]:
    try:
        if paper_id:
            response = requests.get(
                f"{BASE_URL}/paper/{_paper_id(paper_id)}",
                params={"fields": FIELDS},
                headers=_headers(),
                timeout=TIMEOUT,
            )
            response.raise_for_status()
            return {"tool": "lookup_citations", "paper_id": paper_id, "items": [_item(response.json())]}

        if not query.strip():
            raise ValueError("Provide paper_id or query")

        max_results = max(1, min(int(max_results or 5), 10))
        response = requests.get(
            f"{BASE_URL}/paper/search",
            params={"query": query, "limit": max_results, "fields": FIELDS},
            headers=_headers(),
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        return {"tool": "lookup_citations", "query": query, "items": [_item(item) for item in data.get("data", [])]}
    except Exception as exc:
        return err("lookup_citations", exc)
