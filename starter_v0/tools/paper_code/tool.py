from __future__ import annotations

import os
from typing import Any

import requests

from tools._shared import TIMEOUT, err


def _clean_query(*parts: str) -> str:
    return " ".join(part.strip() for part in parts if part and part.strip())


def find_paper_code(query: str = "", paper_title: str = "", arxiv_id: str = "", max_results: int = 5) -> dict[str, Any]:
    try:
        search_query = _clean_query(paper_title, query, arxiv_id)
        if not search_query:
            raise ValueError("Provide query, paper_title, or arxiv_id")

        max_results = max(1, min(int(max_results or 5), 10))
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        token = os.getenv("GITHUB_TOKEN")
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = requests.get(
            "https://api.github.com/search/repositories",
            params={"q": search_query, "sort": "stars", "order": "desc", "per_page": max_results},
            headers=headers,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        items = []
        for repo in data.get("items", []):
            items.append({
                "title": repo.get("full_name"),
                "url": repo.get("html_url"),
                "source": "github.com",
                "summary": repo.get("description") or "",
                "stars": repo.get("stargazers_count"),
                "language": repo.get("language"),
                "updated_at": repo.get("updated_at"),
                "license": (repo.get("license") or {}).get("spdx_id"),
            })
        return {"tool": "find_paper_code", "query": search_query, "total_count": data.get("total_count"), "items": items}
    except Exception as exc:
        return err("find_paper_code", exc)
