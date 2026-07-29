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
SUPPORTED_STYLES = {"markdown", "apa", "bibtex"}


def _text(value: Any) -> str:
    if value is None or isinstance(value, (dict, list, tuple, set)):
        return ""
    try:
        return " ".join(str(value).split())
    except Exception:
        return ""


def _normalize_title(value: Any) -> str:
    text = unicodedata.normalize("NFKC", _text(value)).casefold()
    return " ".join(re.sub(r"[^\w]+", " ", text, flags=re.UNICODE).split())


def _canonicalize_url(value: Any) -> str:
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
            if not (key.casefold().startswith("utm_") or key.casefold() in TRACKING_PARAMETERS)
        ]
        query = urlencode(sorted(query_pairs, key=lambda pair: (pair[0].casefold(), pair[0], pair[1])), doseq=True)
        return urlunsplit((scheme, netloc, path, query, ""))
    except (TypeError, ValueError, UnicodeError):
        return ""


def _domain(url: str) -> str:
    try:
        return (urlsplit(url).hostname or "").casefold()
    except (TypeError, ValueError):
        return ""


def _person_name(value: Any) -> str:
    if isinstance(value, dict):
        given = _text(value.get("given") or value.get("first") or value.get("first_name"))
        family = _text(value.get("family") or value.get("last") or value.get("last_name"))
        literal = _text(value.get("name") or value.get("literal"))
        return " ".join(part for part in (given, family) if part) or literal
    return _text(value)


def _authors(item: dict[str, Any]) -> list[str]:
    raw = item.get("authors")
    if isinstance(raw, (list, tuple)):
        names = [_person_name(value) for value in raw]
        return [name for name in names if name]
    one = _person_name(raw) or _person_name(item.get("author"))
    return [one] if one else []


def _source(item: dict[str, Any], url: str) -> str:
    candidates = (
        item.get("source"),
        item.get("journal"),
        item.get("publisher"),
        item.get("container_title"),
    )
    return next((text for value in candidates if (text := _text(value))), "") or _domain(url)


def _date(item: dict[str, Any]) -> str:
    candidates = (item.get("published"), item.get("date"), item.get("year"), item.get("updated"))
    return next((text for value in candidates if (text := _text(value))), "")


def _year(date: str) -> str:
    match = re.search(r"(?<!\d)((?:19|20)\d{2})(?!\d)", date)
    return match.group(1) if match else ""


def _doi(value: Any) -> str:
    doi = _text(value)
    doi = re.sub(r"^(?:https?://(?:dx\.)?doi\.org/|doi:\s*)", "", doi, flags=re.IGNORECASE)
    return doi.strip()


def _record(item: dict[str, Any], original_index: int) -> dict[str, Any]:
    url = _canonicalize_url(item.get("url"))
    doi = _doi(item.get("doi"))
    title = _text(item.get("title")) or _text(item.get("name"))
    source = _source(item, url)
    return {
        "original_index": original_index,
        "title": title or source or url or (f"https://doi.org/{doi}" if doi else ""),
        "url": url,
        "source": source,
        "authors": _authors(item),
        "date": _date(item),
        "doi": doi,
    }


def _escape_markdown(value: str) -> str:
    return value.replace("\\", "\\\\").replace("[", "\\[").replace("]", "\\]")


def _markdown_url(value: str) -> str:
    return value.replace("(", "%28").replace(")", "%29")


def _markdown_citation(record: dict[str, Any]) -> str:
    authors = "; ".join(record["authors"])
    year = _year(record["date"])
    title = _escape_markdown(record["title"] or "Untitled source")
    target = record["url"] or (f"https://doi.org/{record['doi']}" if record["doi"] else "")
    linked_title = f"[{title}]({_markdown_url(target)})" if target else title
    parts = [part for part in (authors, f"({year})" if year else "", linked_title) if part]
    if record["source"]:
        parts.append(f"*{_escape_markdown(record['source'])}*")
    return ". ".join(part.rstrip(".") for part in parts) + "."


def _apa_authors(authors: list[str], fallback: str) -> str:
    if not authors:
        return fallback or "Unknown author"
    if len(authors) == 1:
        return authors[0]
    if len(authors) == 2:
        return f"{authors[0]}, & {authors[1]}"
    return f"{', '.join(authors[:-1])}, & {authors[-1]}"


def _apa_citation(record: dict[str, Any]) -> str:
    author_text = _apa_authors(record["authors"], record["source"])
    year = _year(record["date"]) or "n.d."
    parts = [author_text, f"({year})", record["title"] or "Untitled source"]
    if record["source"] and record["source"].casefold() != author_text.casefold():
        parts.append(record["source"])
    identifier = f"https://doi.org/{record['doi']}" if record["doi"] else record["url"]
    text = ". ".join(part.rstrip(".") for part in parts if part) + "."
    return f"{text} {identifier}" if identifier else text


def _ascii_slug(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(char for char in folded if ord(char) < 128 and not unicodedata.combining(char))
    return "".join(re.findall(r"[A-Za-z0-9]+", ascii_text)).lower()


def _bibtex_key(record: dict[str, Any], used: set[str]) -> str:
    author_or_source = record["authors"][0] if record["authors"] else record["source"]
    first = _ascii_slug(author_or_source.split()[-1] if author_or_source else "") or "source"
    year = _year(record["date"]) or "nd"
    title_words = re.findall(r"[\w]+", record["title"], flags=re.UNICODE)
    title_part = _ascii_slug(" ".join(title_words[:3])) or "untitled"
    base = f"{first}{year}{title_part}"
    key = base
    suffix = 2
    while key in used:
        key = f"{base}{suffix}"
        suffix += 1
    used.add(key)
    return key


def _escape_bibtex(value: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "{": r"\{",
        "}": r"\}",
        "%": r"\%",
        "#": r"\#",
        "&": r"\&",
        "_": r"\_",
    }
    return "".join(replacements.get(character, character) for character in value)


def _bibtex_citation(record: dict[str, Any], used_keys: set[str]) -> str:
    key = _bibtex_key(record, used_keys)
    fields: list[tuple[str, str]] = []
    if record["authors"]:
        fields.append(("author", " and ".join(record["authors"])))
    fields.append(("title", record["title"] or "Untitled source"))
    year = _year(record["date"])
    if year:
        fields.append(("year", year))
    if record["source"]:
        fields.append(("publisher", record["source"]))
    if record["url"]:
        fields.append(("url", record["url"]))
    if record["doi"]:
        fields.append(("doi", record["doi"]))
    body = ",\n".join(f"  {name} = {{{_escape_bibtex(value)}}}" for name, value in fields)
    return f"@misc{{{key},\n{body}\n}}"


def export_citations(
    items: list[dict[str, Any]] | None = None,
    style: str = "markdown",
    deduplicate: bool = True,
) -> dict[str, Any]:
    """Format supplied metadata as citation text without filesystem writes."""
    issues: list[str] = []
    if items is None:
        input_items: list[Any] = []
    elif isinstance(items, list):
        input_items = items
    else:
        input_items = []
        issues.append("items must be a list; the invalid value was treated as an empty list.")

    raw_style = _text(style).casefold()
    style_aliases = {"md": "markdown", "bib": "bibtex", "bibtex": "bibtex", "apa": "apa"}
    normalized_style = style_aliases.get(raw_style, raw_style)
    if normalized_style not in SUPPORTED_STYLES:
        issues.append(f"Unsupported style {raw_style or repr(style)}; markdown was used.")
        normalized_style = "markdown"

    records: list[dict[str, Any]] = []
    duplicates: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    invalid_urls: list[dict[str, Any]] = []
    seen_urls: dict[str, int] = {}
    seen_titles: dict[str, int] = {}
    seen_dois: dict[str, int] = {}

    for index, item in enumerate(input_items):
        if not isinstance(item, dict):
            skipped.append({"index": index, "reason": "item is not an object"})
            continue
        record = _record(item, index)
        raw_url = _text(item.get("url"))
        if raw_url and not record["url"]:
            invalid_urls.append({"index": index, "url": raw_url})
        if not record["title"] and not record["url"] and not record["doi"]:
            skipped.append({"index": index, "reason": "item has no usable title, URL, DOI, or source"})
            continue

        normalized_title = _normalize_title(record["title"])
        matching: dict[str, int] = {}
        if record["url"] and record["url"] in seen_urls:
            matching["url"] = seen_urls[record["url"]]
        if normalized_title and normalized_title in seen_titles:
            matching["title"] = seen_titles[normalized_title]
        doi_key = record["doi"].casefold()
        if doi_key and doi_key in seen_dois:
            matching["doi"] = seen_dois[doi_key]

        if matching:
            duplicates.append(
                {
                    "index": index,
                    "duplicate_of": min(matching.values()),
                    "matched_by": sorted(matching),
                    "matched_indices": matching,
                }
            )
        if not bool(deduplicate) or not matching:
            records.append(record)

        if record["url"] and record["url"] not in seen_urls:
            seen_urls[record["url"]] = index
        if normalized_title and normalized_title not in seen_titles:
            seen_titles[normalized_title] = index
        if doi_key and doi_key not in seen_dois:
            seen_dois[doi_key] = index

    if skipped:
        issues.append(f"{len(skipped)} item(s) had no usable citation metadata and were skipped.")
    if invalid_urls:
        issues.append(f"{len(invalid_urls)} item(s) contained a URL that could not be canonicalized.")
    if duplicates:
        action = "removed" if bool(deduplicate) else "retained"
        issues.append(f"{len(duplicates)} duplicate item(s) were detected and {action}.")
    if not input_items:
        issues.append("No source items were provided.")

    if normalized_style == "apa":
        rendered = [_apa_citation(record) for record in records]
        citations = "\n".join(rendered)
    elif normalized_style == "bibtex":
        used_keys: set[str] = set()
        rendered = [_bibtex_citation(record, used_keys) for record in records]
        citations = "\n\n".join(rendered)
    else:
        rendered = [_markdown_citation(record) for record in records]
        citations = "\n".join(f"{index}. {citation}" for index, citation in enumerate(rendered, start=1))

    return {
        "tool": "citation_export",
        "style": normalized_style,
        "citations": citations,
        "citation_count": len(records),
        "input_count": len(input_items),
        "duplicates": duplicates,
        "skipped": skipped,
        "invalid_urls": invalid_urls,
        "issues": issues,
        "deduplicated": bool(deduplicate),
        "trust_boundary": (
            "Citation formatting only. Metadata is used as supplied; this tool "
            "does not fetch, validate, or fact-check sources."
        ),
    }
