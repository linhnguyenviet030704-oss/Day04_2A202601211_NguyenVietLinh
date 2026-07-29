---
name: claim_extract
track: bonus
kind: local_formatter
provider: deterministic_heuristics
requires_env: []
inputs: [text, max_claims]
outputs: [claims, claim_count, sentence_count, warnings, trust_boundary]
side_effect: false
---
# claim_extract

Splits supplied text into sentences and extracts claim-like candidates using
numbers, dates, and assertive-language cues. Each result includes its original
character span, matched signal spans, a coarse claim type, and a heuristic
confidence score.

The output is a review aid, not fact verification. A matched cue can be a false
positive, and an unmatched sentence can still contain a meaningful claim.
