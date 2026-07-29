"""Offline smoke tests for the team's five research-quality tools.

Run from starter_v0 after activating the virtual environment:
    python scripts/smoke_test_group_tools.py

These tests call local implementations only. They do not need API keys and do
not fetch feeds from the network; RSS parsing uses the documented local helper.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from env_loader import load_lab_env

load_lab_env(ROOT)

from tools import TOOL_FUNCTIONS
from tools.rss_search.tool import parse_feed_xml


ITEMS = [
    {
        "title": "AI agent evaluation",
        "url": "https://www.example.org/research/agents?utm_source=smoke",
        "source": "Example Research",
        "summary": "AI agents improve evaluation workflows.",
        "date": "2026-01-20",
        "author": "Nguyen Van A",
    },
    {
        "title": "AI agent evaluation",
        "url": "https://example.org/research/agents",
        "source": "Example Research",
        "summary": "Duplicate record used to exercise deduplication.",
        "date": "2026-01-20",
    },
    {
        "title": "Reliable evaluation",
        "url": "https://example.net/evaluation",
        "source": "Example News",
        "summary": "Evaluation needs diverse sources and transparent citations.",
        "date": "2026-01-21",
    },
]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_case(name: str, test: Callable[[], dict[str, Any]]) -> bool:
    try:
        result = test()
        print(f"PASS {name}: {result}")
        return True
    except Exception as exc:
        print(f"FAIL {name}: {type(exc).__name__}: {exc}")
        return False


def test_source_audit() -> dict[str, Any]:
    result = TOOL_FUNCTIONS["source_audit"](ITEMS, min_unique_sources=2, require_urls=True, deduplicate=True)
    require(result["tool"] == "source_audit", "wrong tool marker")
    require(result["input_count"] == 3 and result["audited_count"] == 2, "deduplication did not work")
    require(len(result["duplicates"]) == 1, "expected one duplicate")
    require(result["unique_source_count"] == 2, "expected two unique sources")
    return {"audited_count": result["audited_count"], "quality_score": result["quality_score"]}


def test_citation_export() -> dict[str, Any]:
    result = TOOL_FUNCTIONS["citation_export"](ITEMS, style="bibtex", deduplicate=True)
    require(result["tool"] == "citation_export" and result["style"] == "bibtex", "wrong citation format")
    require(result["citation_count"] == 2 and "@misc{" in result["citations"], "BibTeX output is incomplete")
    return {"citation_count": result["citation_count"], "duplicates": len(result["duplicates"])}


def test_compare_sources() -> dict[str, Any]:
    result = TOOL_FUNCTIONS["compare_sources"](ITEMS[:2], max_terms=5)
    require(result["tool"] == "compare_sources", "wrong tool marker")
    require(result["source_count"] == 2, "expected two sources")
    require("pairwise_similarity" in result, "missing similarity output")
    return {"source_count": result["source_count"], "shared_keywords": result["shared_keywords"]}


def test_claim_extract() -> dict[str, Any]:
    text = "Báo cáo ngày 12/03/2026 cho biết doanh thu tăng 18%. Nhóm mô tả kiến trúc mới."
    result = TOOL_FUNCTIONS["claim_extract"](text, max_claims=2)
    require(result["tool"] == "claim_extract", "wrong tool marker")
    require(1 <= result["claim_count"] <= 2, "claim count is outside requested limit")
    return {"claim_count": result["claim_count"], "sentence_count": result["sentence_count"]}


def test_rss_parser() -> dict[str, Any]:
    fixture = """<?xml version='1.0'?><rss version='2.0'><channel><title>Demo feed</title><item><title>AI evaluation update</title><link>https://example.org/ai</link><description>Evaluation news</description><pubDate>Tue, 21 Jan 2026 12:00:00 GMT</pubDate></item></channel></rss>"""
    items = parse_feed_xml(fixture, "https://example.org/feed.xml")
    require(len(items) == 1, "expected one RSS entry")
    require(items[0]["title"] == "AI evaluation update", "RSS title was not parsed")
    require(items[0]["url"] == "https://example.org/ai", "RSS URL was not parsed")
    return {"item_count": len(items), "first_title": items[0]["title"]}


def main() -> None:
    tests = {
        "source_audit": test_source_audit,
        "citation_export": test_citation_export,
        "compare_sources": test_compare_sources,
        "claim_extract": test_claim_extract,
        "rss_search_offline_parser": test_rss_parser,
    }
    passed = sum(run_case(name, test) for name, test in tests.items())
    print(f"\n{passed}/{len(tests)} smoke tests passed")
    if passed != len(tests):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
