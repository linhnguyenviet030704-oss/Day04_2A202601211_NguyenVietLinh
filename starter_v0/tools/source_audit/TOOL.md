---
name: source_audit
track: bonus
kind: local_formatter
requires_env: []
inputs: [items, min_unique_sources, require_urls, deduplicate]
outputs: [audited_items, duplicates, unique_source_count, unique_domains, missing_fields, invalid_urls, issues, quality_score, trust_boundary]
side_effect: false
---
# source_audit

Performs a deterministic structural audit of already-collected source items.
It canonicalizes HTTP(S) URLs, removes common tracking parameters and URL
fragments, detects duplicates by canonical URL or normalized title, reports
missing fields, and measures source diversity.

This tool does not fetch sources and does not determine whether a claim is
factually correct. Its quality score describes only the structure and diversity
of the supplied evidence set.
