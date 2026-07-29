---
name: method_extract
track: bonus
kind: local_formatter
requires_env: []
inputs: [text, section_keywords, max_chars]
outputs: [items]
side_effect: false
---
# method_extract

Extracts method/experiment/result-like sections from already available paper
text. It does not download PDFs; call `paper_text` first when needed.
