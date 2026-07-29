from __future__ import annotations

import re
import unicodedata
from typing import Any
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit


TRACKING_PARAMETERS = {
    "_ga",
    "_gl",
    "campaign",
    "campaignid",
    "dclid",
    "fbclid",
    "gclid",
    "igshid",
    "mc_cid",
    "mc_eid",
    "mkt_tok",
    "msclkid",
    "ref_src",
    "s_cid",
    "vero_conv",
    "vero_id",
    "yclid",
}
TRUST_BOUNDARY = (
    "Structural evidence audit only. The score measures completeness, "
    "deduplication, and source diversity; it does not prove factual correctness "
    "or source credibility."
)


def _text(value: Any) -> str:
    """Return a cleaned scalar string without stringifying containers."""
    if value is None or isinstance(value, (dict, list, tuple, set)):
        return ""
    try:
        return " ".join(str(value).split())
    except Exception:
        return ""


def _normalized_title(value: Any) -> str:
    text = unicodedata.normalize("NFKC", _text(value)).casefold()
    text = re.sub(r"[^\w]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def _is_tracking_parameter(name: str) -> bool:
    lowered = name.casefold()
    return lowered.startswith("utm_") or lowered in TRACKING_PARAMETERS


def canonicalize_url(value: Any) -> str:
    """Return a deterministic canonical HTTP(S) URL, or an empty string."""
    raw = _text(value)
    if not raw:
        return ""

    candidate = raw
    if "://" not in candidate:
        first_segment = candidate.split("/", 1)[0]
        if "." not in first_segment and first_segment.casefold() != "localhost":
            return ""
        candidate = f"https://{candidate}"

    try:
        parsed = urlsplit(candidate)
        scheme = parsed.scheme.casefold()
        if scheme not in {"http", "https"} or not parsed.hostname:
            return ""

        host = parsed.hostname.rstrip(".").casefold()
        try:
            host = host.encode("idna").decode("ascii")
        except (UnicodeError, UnicodeDecodeError):
            return ""
        if any(character.isspace() for character in host):
            return ""
        if host.startswith("www."):
            host = host[4:]
        if not host:
            return ""

        try:
            port = parsed.port
        except ValueError:
            return ""
        default_port = (scheme == "http" and port == 80) or (scheme == "https" and port == 443)
        display_host = f"[{host}]" if ":" in host else host
        netloc = display_host if port is None or default_port else f"{display_host}:{port}"

        path = re.sub(r"/{2,}", "/", parsed.path or "")
        if path == "/" or path.endswith("/"):
            path = path.rstrip("/")
        path = quote(path, safe="/:@!$&'()*+,;=-._~%")

        query_pairs = [
            (key, val)
            for key, val in parse_qsl(parsed.query, keep_blank_values=True)
            if not _is_tracking_parameter(key)
        ]
        query = urlencode(sorted(query_pairs, key=lambda pair: (pair[0].casefold(), pair[0], pair[1])), doseq=True)
        return urlunsplit((scheme, netloc, path, query, ""))
    except (TypeError, ValueError, UnicodeError):
        return ""


def _domain_from_url(url: str) -> str:
    try:
        return (urlsplit(url).hostname or "").casefold()
    except (TypeError, ValueError):
        return ""


def _source_identity(item: dict[str, Any], canonical_url: str) -> str:
    domain = _domain_from_url(canonical_url)
    if domain:
        return domain
    source = unicodedata.normalize("NFKC", _text(item.get("source"))).casefold()
    return source


def _safe_minimum(value: Any) -> int:
    try:
        return max(1, int(value))
    except (TypeError, ValueError, OverflowError):
        return 2


def audit_sources(
    items: list[dict[str, Any]] | None = None,
    min_unique_sources: int = 2,
    require_urls: bool = True,
    deduplicate: bool = True,
) -> dict[str, Any]:
    """Audit source structure without fetching content or checking facts."""
    minimum = _safe_minimum(min_unique_sources)
    issues: list[str] = []
    input_items: list[Any]
    if items is None:
        input_items = []
    elif isinstance(items, list):
        input_items = items
    else:
        input_items = []
        issues.append("items must be a list; the invalid value was treated as an empty list.")

    required_fields = ["title", "source", "summary"]
    if bool(require_urls):
        required_fields.insert(1, "url")

    audited_items: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    missing_fields: list[dict[str, Any]] = []
    invalid_urls: list[dict[str, Any]] = []
    invalid_item_count = 0
    seen_urls: dict[str, int] = {}
    seen_titles: dict[str, int] = {}
    unique_records: list[tuple[dict[str, Any], str]] = []
    present_field_count = 0

    for index, raw_item in enumerate(input_items):
        if not isinstance(raw_item, dict):
            invalid_item_count += 1
            missing_fields.append({"index": index, "fields": ["item"]})
            continue

        item = dict(raw_item)
        raw_url = _text(item.get("url"))
        canonical_url = canonicalize_url(raw_url)
        normalized_title = _normalized_title(item.get("title"))
        missing = [field for field in required_fields if not _text(item.get(field))]
        present_field_count += len(required_fields) - len(missing)
        if missing:
            missing_fields.append({"index": index, "fields": missing})
        if raw_url and not canonical_url:
            invalid_urls.append({"index": index, "url": raw_url})

        matching: dict[str, int] = {}
        if canonical_url and canonical_url in seen_urls:
            matching["url"] = seen_urls[canonical_url]
        if normalized_title and normalized_title in seen_titles:
            matching["title"] = seen_titles[normalized_title]

        if matching:
            duplicate_of = min(matching.values())
            duplicates.append(
                {
                    "index": index,
                    "duplicate_of": duplicate_of,
                    "matched_by": sorted(matching),
                    "matched_indices": matching,
                    "canonical_url": canonical_url,
                    "title": _text(item.get("title")),
                }
            )

        item["original_index"] = index
        item["canonical_url"] = canonical_url
        item["normalized_source"] = _source_identity(item, canonical_url)
        is_duplicate = bool(matching)
        item["is_duplicate"] = is_duplicate

        if not is_duplicate:
            unique_records.append((item, canonical_url))
        if not bool(deduplicate) or not is_duplicate:
            audited_items.append(item)

        if canonical_url and canonical_url not in seen_urls:
            seen_urls[canonical_url] = index
        if normalized_title and normalized_title not in seen_titles:
            seen_titles[normalized_title] = index

    unique_domains = sorted(
        {
            domain
            for _, canonical_url in unique_records
            if (domain := _domain_from_url(canonical_url))
        }
    )
    unique_sources = sorted(
        {
            identity
            for item, canonical_url in unique_records
            if (identity := _source_identity(item, canonical_url))
        }
    )

    if invalid_item_count:
        issues.append(f"{invalid_item_count} item(s) were not objects and could not be audited.")
    if missing_fields:
        issues.append(f"{len(missing_fields)} item(s) are missing required fields.")
    if invalid_urls:
        issues.append(f"{len(invalid_urls)} item(s) contain a URL that could not be canonicalized.")
    if duplicates:
        issues.append(f"{len(duplicates)} duplicate item(s) were detected by canonical URL or normalized title.")
    if len(unique_sources) < minimum:
        issues.append(
            f"Only {len(unique_sources)} unique source(s) were found; "
            f"the requested minimum is {minimum}."
        )
    if not input_items:
        issues.append("No source items were provided.")

    valid_item_count = sum(isinstance(item, dict) for item in input_items)
    total_required_cells = len(input_items) * len(required_fields)
    completeness = (present_field_count / total_required_cells) if total_required_cells else 0.0
    uniqueness = (len(unique_records) / len(input_items)) if input_items else 0.0
    diversity = min(len(unique_sources) / minimum, 1.0)
    score_parts = {
        "completeness": round(50 * completeness, 2),
        "uniqueness": round(20 * uniqueness, 2),
        "source_diversity": round(30 * diversity, 2),
    }
    quality_score = round(sum(score_parts.values()))

    return {
        "tool": "source_audit",
        "input_count": len(input_items),
        "valid_item_count": valid_item_count,
        "audited_count": len(audited_items),
        "unique_item_count": len(unique_records),
        "audited_items": audited_items,
        "duplicates": duplicates,
        "unique_source_count": len(unique_sources),
        "unique_sources": unique_sources,
        "unique_domain_count": len(unique_domains),
        "unique_domains": unique_domains,
        "missing_fields": missing_fields,
        "invalid_urls": invalid_urls,
        "issues": issues,
        "quality_score": quality_score,
        "score_components": score_parts,
        "settings": {
            "min_unique_sources": minimum,
            "require_urls": bool(require_urls),
            "deduplicate": bool(deduplicate),
        },
        "trust_boundary": TRUST_BOUNDARY,
    }
