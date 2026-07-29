from __future__ import annotations

import re
import unicodedata
from typing import Any, Iterable


TRUST_BOUNDARY = (
    "Heuristic pattern matching only. Extracted statements are claim candidates, "
    "not verified facts; evidence spans point to input text and do not establish "
    "truth, entailment, or source reliability."
)

_ABBREVIATIONS = {
    "dr",
    "e.g",
    "etc",
    "i.e",
    "jr",
    "mr",
    "mrs",
    "ms",
    "prof",
    "sr",
    "ths",
    "tp",
    "ts",
    "u.k",
    "u.s",
    "vs",
}

_DATE_PATTERNS = (
    re.compile(
        r"\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.]"
        r"(?:0?[1-9]|[12]\d|3[01])\b"
    ),
    re.compile(
        r"\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.]"
        r"(?:19|20)\d{2}\b"
    ),
    re.compile(
        r"\b(?:january|february|march|april|may|june|july|august|"
        r"september|october|november|december)\s+\d{1,2}"
        r"(?:st|nd|rd|th)?(?:,\s*|\s+)(?:19|20)\d{2}\b",
        re.IGNORECASE,
    ),
    re.compile(r"\btháng\s+(?:0?[1-9]|1[0-2])(?:\s+năm)?\s+(?:19|20)\d{2}\b", re.IGNORECASE),
    re.compile(r"(?<!\d)(?:19|20)\d{2}(?!\d)"),
)

_NUMBER_PATTERN = re.compile(
    r"(?<![\w.])(?:[$€£¥₫]\s*)?[+-]?"
    r"(?:\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)"
    r"(?:\s?(?:%|percent|percentage|million|billion|trillion|"
    r"thousand|triệu|tỷ|nghìn|ngàn|km|kg|gb|mb|usd|eur|vnd))?",
    re.IGNORECASE,
)

_ASSERTIVE_PATTERN = re.compile(
    r"\b(?:"
    r"announc(?:e|ed|es)|confirm(?:s|ed)?|demonstrat(?:e|ed|es)|"
    r"decreas(?:e|ed|es)|found|grew|has|have|had|"
    r"increas(?:e|ed|es)|indicat(?:e|ed|es)|is|are|was|were|will|must|"
    r"mean(?:s|t)?|report(?:s|ed)?|result(?:s|ed)?|"
    r"show(?:s|ed)?|stat(?:e|ed|es)|"
    r"bao cao|cho thay|co|cong bo|da|du kien|giam|ghi nhan|"
    r"khang dinh|la|se|tang"
    r")\b",
    re.IGNORECASE,
)


def _fold_text(value: str) -> str:
    # ``lower`` avoids the multi-character expansions that ``casefold`` can
    # produce, so regex offsets remain aligned with the original sentence.
    decomposed = unicodedata.normalize("NFD", value.lower())
    without_marks = "".join(
        char for char in decomposed if unicodedata.category(char) != "Mn"
    )
    return without_marks.replace("đ", "d")


def _trimmed_span(text: str, start: int, end: int) -> tuple[int, int] | None:
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return (start, end) if start < end else None


def _is_abbreviation(text: str, sentence_start: int, dot_index: int) -> bool:
    fragment = text[sentence_start : dot_index + 1]
    match = re.search(r"([\w.]+)\.$", fragment, re.UNICODE)
    if not match:
        return False
    token = _fold_text(match.group(1))
    if token in _ABBREVIATIONS or len(token) == 1:
        return True
    return bool(re.fullmatch(r"(?:[a-z]\.)+[a-z]?", token))


def _sentence_spans(text: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    length = len(text)
    start = 0
    index = 0

    while index < length:
        char = text[index]
        if char in "\r\n":
            span = _trimmed_span(text, start, index)
            if span:
                spans.append(span)
            index += 1
            while index < length and text[index].isspace():
                index += 1
            start = index
            continue

        if char not in ".!?":
            index += 1
            continue

        if (
            char == "."
            and index > 0
            and index + 1 < length
            and text[index - 1].isdigit()
            and text[index + 1].isdigit()
        ):
            index += 1
            continue

        punctuation_end = index + 1
        while punctuation_end < length and text[punctuation_end] in ".!?":
            punctuation_end += 1
        while punctuation_end < length and text[punctuation_end] in "\"'”’)]}":
            punctuation_end += 1

        followed_by_boundary = (
            punctuation_end == length or text[punctuation_end].isspace()
        )
        if (
            not followed_by_boundary
            or (char == "." and _is_abbreviation(text, start, index))
        ):
            index += 1
            continue

        span = _trimmed_span(text, start, punctuation_end)
        if span:
            spans.append(span)
        index = punctuation_end
        while index < length and text[index].isspace():
            index += 1
        start = index

    final_span = _trimmed_span(text, start, length)
    if final_span:
        spans.append(final_span)
    return spans


def _non_overlapping_matches(
    sentence: str,
    patterns: Iterable[re.Pattern[str]],
) -> list[tuple[int, int]]:
    candidates: list[tuple[int, int]] = []
    for pattern in patterns:
        candidates.extend((match.start(), match.end()) for match in pattern.finditer(sentence))
    candidates.sort(key=lambda span: (span[0], -(span[1] - span[0])))

    selected: list[tuple[int, int]] = []
    for candidate in candidates:
        if any(candidate[0] < end and candidate[1] > start for start, end in selected):
            continue
        selected.append(candidate)
    return sorted(selected)


def _overlaps(span: tuple[int, int], others: list[tuple[int, int]]) -> bool:
    return any(span[0] < end and span[1] > start for start, end in others)


def _confidence(has_number: bool, has_date: bool, has_assertion: bool, word_count: int) -> float:
    signal_count = sum((has_number, has_date, has_assertion))
    if signal_count == 3:
        score = 0.90
    elif has_number and has_assertion:
        score = 0.84
    elif has_date and has_assertion:
        score = 0.81
    elif has_number and has_date:
        score = 0.78
    elif has_date:
        score = 0.70
    elif has_number:
        score = 0.68
    else:
        score = 0.62

    if 4 <= word_count <= 50:
        score += 0.02
    elif word_count > 80:
        score -= 0.05
    return round(max(0.5, min(score, 0.95)), 2)


def _error(error: str, message: str) -> dict[str, Any]:
    return {
        "tool": "claim_extract",
        "error": error,
        "message": message,
        "claims": [],
        "claim_count": 0,
        "sentence_count": 0,
        "warnings": [],
        "trust_boundary": TRUST_BOUNDARY,
    }


def extract_claims(text: str = "", max_claims: int = 10) -> dict[str, Any]:
    """Extract claim-like sentence candidates and their evidence offsets."""

    if not isinstance(text, str):
        return _error("InvalidInput", "text must be a string.")
    if isinstance(max_claims, bool) or not isinstance(max_claims, int) or not 1 <= max_claims <= 50:
        return _error("InvalidInput", "max_claims must be an integer between 1 and 50.")

    if not text.strip():
        return {
            "tool": "claim_extract",
            "claims": [],
            "claim_count": 0,
            "total_candidates": 0,
            "sentence_count": 0,
            "truncated": False,
            "warnings": ["No non-whitespace text was provided."],
            "method": "Sentence splitting plus number, date, and assertive-cue patterns.",
            "trust_boundary": TRUST_BOUNDARY,
        }

    sentence_spans = _sentence_spans(text)
    candidates: list[dict[str, Any]] = []

    for sentence_index, (sentence_start, sentence_end) in enumerate(sentence_spans):
        sentence = text[sentence_start:sentence_end]
        if re.search(r"\?[\s\"'”’)\]]*$", sentence):
            continue

        date_spans = _non_overlapping_matches(sentence, _DATE_PATTERNS)
        number_spans = [
            (match.start(), match.end())
            for match in _NUMBER_PATTERN.finditer(sentence)
            if not _overlaps((match.start(), match.end()), date_spans)
        ]
        folded_sentence = _fold_text(sentence)
        assertion_spans = [
            (match.start(), match.end())
            for match in _ASSERTIVE_PATTERN.finditer(folded_sentence)
        ]

        has_number = bool(number_spans)
        has_date = bool(date_spans)
        has_assertion = bool(assertion_spans)
        word_count = len(re.findall(r"\b\w+\b", sentence, re.UNICODE))

        if not (has_number or has_date or has_assertion):
            continue
        if has_assertion and not (has_number or has_date) and word_count < 3:
            continue

        if has_number:
            claim_type = "quantitative"
        elif has_date:
            claim_type = "dated"
        else:
            claim_type = "assertive"

        signals: list[dict[str, Any]] = []
        for signal_type, spans in (
            ("date", date_spans),
            ("number", number_spans),
            ("assertive_cue", assertion_spans),
        ):
            for local_start, local_end in spans:
                signals.append(
                    {
                        "type": signal_type,
                        "text": sentence[local_start:local_end],
                        "start": sentence_start + local_start,
                        "end": sentence_start + local_end,
                    }
                )
        signals.sort(key=lambda signal: (signal["start"], signal["end"], signal["type"]))

        types = []
        if has_number:
            types.append("number")
        if has_date:
            types.append("date")
        if has_assertion:
            types.append("assertive")

        candidates.append(
            {
                "id": f"claim_{len(candidates) + 1}",
                "sentence_index": sentence_index,
                "text": sentence,
                "type": claim_type,
                "types": types,
                "confidence": _confidence(has_number, has_date, has_assertion, word_count),
                "evidence_span": {
                    "start": sentence_start,
                    "end": sentence_end,
                    "text": sentence,
                },
                "signals": signals,
            }
        )

    total_candidates = len(candidates)
    claims = candidates[:max_claims]
    warnings: list[str] = []
    if not candidates:
        warnings.append("No claim-like sentence matched the configured heuristics.")
    if total_candidates > max_claims:
        warnings.append(
            f"Output was limited to {max_claims} of {total_candidates} claim candidates."
        )

    return {
        "tool": "claim_extract",
        "claims": claims,
        "claim_count": len(claims),
        "total_candidates": total_candidates,
        "sentence_count": len(sentence_spans),
        "truncated": total_candidates > max_claims,
        "warnings": warnings,
        "method": (
            "Sentences are scanned in document order for numeric expressions, dates, "
            "and assertive English/Vietnamese cues; confidence reflects cue combinations."
        ),
        "trust_boundary": TRUST_BOUNDARY,
    }
