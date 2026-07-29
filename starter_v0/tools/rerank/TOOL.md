---
name: rerank
track: bonus
kind: local_formatter
requires_env: []
inputs: [query, items, top_k]
outputs: [items]
side_effect: false
---
# rerank

Lexically reranks already collected paper/search items against a query. It does
not call a model; use it as a cheap first-pass reranker.
