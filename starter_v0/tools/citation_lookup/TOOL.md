---
name: citation_lookup
track: bonus
kind: live_api
provider: Semantic Scholar Graph API
requires_env: []
inputs: [paper_id, query, max_results]
outputs: [items]
side_effect: false
---
# citation_lookup

Looks up paper metadata and citation counts using Semantic Scholar. Use
`paper_id` when an arXiv ID, DOI, CorpusId, or Semantic Scholar paper ID is
known; otherwise use `query`. `SEMANTIC_SCHOLAR_API_KEY` is optional.
