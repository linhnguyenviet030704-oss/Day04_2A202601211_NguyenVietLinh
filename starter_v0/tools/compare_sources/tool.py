from __future__ import annotations

import re
import unicodedata
from collections import Counter
from typing import Any
from urllib.parse import urlparse


TRUST_BOUNDARY = (
    "Deterministic lexical overlap only. Shared or distinctive terms do not "
    "establish semantic agreement or contradiction, source independence, or factual truth."
)

_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "but",
    "by",
    "for",
    "from",
    "had",
    "has",
    "have",
    "he",
    "her",
    "his",
    "i",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "she",
    "that",
    "the",
    "their",
    "them",
    "they",
    "this",
    "to",
    "was",
    "were",
    "will",
    "with",
    "you",
    "ban",
    "bao",
    "bi",
    "boi",
    "cac",
    "can",
    "cho",
    "co",
    "cua",
    "da",
    "dang",
    "de",
    "den",
    "do",
    "duoc",
    "gi",
    "giup",
    "hon",
    "khi",
    "khong",
    "la",
    "lai",
    "lam",
    "minh",
    "mot",
    "nay",
    "nhung",
    "o",
    "se",
    "thi",
    "theo",
    "tren",
    "trong",
    "tu",
    "va",
    "ve",
    "voi",
}


def _fold_text(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    without_marks = "".join(
        char for char in decomposed if unicodedata.category(char) != "Mn"
    )
    return without_marks.replace("đ", "d")


def _tokens(value: str) -> list[str]:
    folded = _fold_text(value)
    return [
        token
        for token in re.findall(r"[a-z0-9]+", folded)
        if len(token) > 1 and token not in _STOPWORDS
    ]


def _text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return ""


def _domain(url: str) -> str:
    try:
        hostname = (urlparse(url).hostname or "").casefold()
        return hostname[4:] if hostname.startswith("www.") else hostname
    except (TypeError, ValueError):
        return ""


def _empty_result(
    error: str,
    message: str,
    warnings: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "tool": "compare_sources",
        "error": error,
        "message": message,
        "source_count": 0,
        "shared_keywords": [],
        "universally_shared_keywords": [],
        "source_profiles": [],
        "pairwise_similarity": [],
        "warnings": warnings or [],
        "trust_boundary": TRUST_BOUNDARY,
    }


def compare_sources(
    items: list[dict[str, Any]] | None = None,
    max_terms: int = 10,
) -> dict[str, Any]:
    """Compare source items using deterministic term-set overlap.

    Invalid non-object entries are skipped with warnings. At least two object
    entries are required. ``max_terms`` must be an integer from 1 through 50.
    """

    if not isinstance(items, list):
        return _empty_result("InvalidInput", "items must be a list of source objects.")
    if isinstance(max_terms, bool) or not isinstance(max_terms, int) or not 1 <= max_terms <= 50:
        return _empty_result("InvalidInput", "max_terms must be an integer between 1 and 50.")

    warnings: list[str] = []
    valid_items: list[tuple[int, dict[str, Any]]] = []
    for original_index, item in enumerate(items):
        if not isinstance(item, dict):
            warnings.append(f"Item {original_index} was skipped because it is not an object.")
            continue
        valid_items.append((original_index, item))

    if len(valid_items) < 2:
        return _empty_result(
            "InsufficientSources",
            "At least two source objects are required for comparison.",
            warnings,
        )

    profiles: list[dict[str, Any]] = []
    counters: list[Counter[str]] = []
    term_sets: list[set[str]] = []
    seen_urls: dict[str, int] = {}
    identifiers: list[str] = []

    for comparison_index, (original_index, item) in enumerate(valid_items):
        title = _text(item.get("title"))
        summary = _text(item.get("summary"))
        content = _text(item.get("content"))
        alternate_text = _text(item.get("text"))
        source = _text(item.get("source"))
        url = _text(item.get("url"))

        parts: list[str] = []
        for part in (title, summary, content, alternate_text):
            if part and part not in parts:
                parts.append(part)
        counter = Counter(_tokens(" ".join(parts)))
        term_set = set(counter)
        counters.append(counter)
        term_sets.append(term_set)

        source_domain = _domain(url)
        identifier = source or source_domain or title[:80] or f"source_{comparison_index + 1}"
        identifiers.append(identifier.casefold())

        if not (source or source_domain):
            warnings.append(
                f"Source {comparison_index + 1} has no source name or URL domain; "
                "its label is inferred."
            )
        if not term_set:
            warnings.append(f"Source {comparison_index + 1} has no comparable terms.")

        normalized_url = url.casefold().rstrip("/")
        if normalized_url:
            if normalized_url in seen_urls:
                first = seen_urls[normalized_url] + 1
                warnings.append(
                    f"Sources {first} and {comparison_index + 1} use the same URL."
                )
            else:
                seen_urls[normalized_url] = comparison_index

        profiles.append(
            {
                "id": f"source_{comparison_index + 1}",
                "input_index": original_index,
                "label": identifier,
                "source": source or source_domain,
                "url": url,
                "term_count": len(term_set),
                "distinctive_terms": [],
            }
        )

    repeated_identifiers = sorted(
        identifier
        for identifier, count in Counter(identifiers).items()
        if identifier and count > 1
    )
    if repeated_identifiers:
        warnings.append(
            "Repeated source labels/domains: " + ", ".join(repeated_identifiers) + "."
        )

    document_frequency: Counter[str] = Counter()
    total_frequency: Counter[str] = Counter()
    for term_set, counter in zip(term_sets, counters):
        document_frequency.update(term_set)
        total_frequency.update(counter)

    shared = [term for term, count in document_frequency.items() if count >= 2]
    shared.sort(
        key=lambda term: (
            -document_frequency[term],
            -total_frequency[term],
            term,
        )
    )
    universally_shared = sorted(
        set.intersection(*term_sets) if term_sets else set(),
        key=lambda term: (-total_frequency[term], term),
    )

    for profile, counter in zip(profiles, counters):
        distinctive = [term for term in counter if document_frequency[term] == 1]
        distinctive.sort(key=lambda term: (-counter[term], term))
        profile["distinctive_terms"] = distinctive[:max_terms]

    pairwise: list[dict[str, Any]] = []
    for left_index in range(len(term_sets)):
        for right_index in range(left_index + 1, len(term_sets)):
            left_terms = term_sets[left_index]
            right_terms = term_sets[right_index]
            intersection = left_terms & right_terms
            union = left_terms | right_terms
            similarity = len(intersection) / len(union) if union else 0.0
            pair_shared = sorted(
                intersection,
                key=lambda term: (
                    -min(counters[left_index][term], counters[right_index][term]),
                    term,
                ),
            )
            pairwise.append(
                {
                    "source_a": profiles[left_index]["id"],
                    "source_b": profiles[right_index]["id"],
                    "jaccard_similarity": round(similarity, 4),
                    "shared_terms": pair_shared[:max_terms],
                }
            )

    if not shared:
        warnings.append("No lexical keyword occurs in at least two sources.")
    if all(not terms for terms in term_sets):
        warnings.append("Similarity scores are uninformative because all term sets are empty.")

    return {
        "tool": "compare_sources",
        "source_count": len(profiles),
        "shared_keywords": shared[:max_terms],
        "shared_keyword_details": [
            {
                "term": term,
                "source_count": document_frequency[term],
                "total_occurrences": total_frequency[term],
            }
            for term in shared[:max_terms]
        ],
        "universally_shared_keywords": universally_shared[:max_terms],
        "source_profiles": profiles,
        "pairwise_similarity": pairwise,
        "warnings": warnings,
        "method": (
            "Unicode accents are folded, common English/Vietnamese stopwords are removed, "
            "and pairwise similarity is Jaccard intersection-over-union on unique terms."
        ),
        "trust_boundary": TRUST_BOUNDARY,
    }
