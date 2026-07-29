import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


class ResearchPaperToolsTest(unittest.TestCase):
    def test_registry_exposes_research_paper_tools(self):
        from tools import TOOL_FUNCTIONS

        for name in ["paper_code", "citation_lookup", "method_extract", "rerank"]:
            self.assertIn(name, TOOL_FUNCTIONS)

    def test_rerank_orders_items_by_query_terms(self):
        from tools.rerank.tool import rerank_items

        result = rerank_items(
            query="retrieval augmented generation benchmark",
            items=[
                {"title": "A survey of neural networks", "summary": "General deep learning."},
                {"title": "RAG benchmark", "summary": "Retrieval augmented generation evaluation."},
            ],
        )

        self.assertEqual(result["items"][0]["title"], "RAG benchmark")
        self.assertGreater(result["items"][0]["rerank_score"], result["items"][1]["rerank_score"])

    def test_method_extract_returns_relevant_sections(self):
        from tools.method_extract.tool import extract_method_sections

        text = """
Abstract
We introduce a model.

Method
We retrieve evidence, rerank passages, and generate answers.

Experiments
We evaluate on benchmark datasets.
"""
        result = extract_method_sections(text=text, max_chars=500)

        sections = [item["section"] for item in result["items"]]
        self.assertIn("Method", sections)
        self.assertIn("Experiments", sections)


if __name__ == "__main__":
    unittest.main()
