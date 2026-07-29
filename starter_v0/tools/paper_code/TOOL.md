---
name: paper_code
track: bonus
kind: live_api
provider: GitHub Search API
requires_env: []
inputs: [query, paper_title, arxiv_id, max_results]
outputs: [items, total_count]
side_effect: false
---
# paper_code

Searches public GitHub repositories that may contain code for a paper.
`GITHUB_TOKEN` is optional and only raises GitHub rate limits.
