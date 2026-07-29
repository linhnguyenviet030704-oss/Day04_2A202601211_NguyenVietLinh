from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from env_loader import load_lab_env
from tools import TOOL_FUNCTIONS


def main() -> int:
    if len(sys.argv) != 3:
      print(json.dumps({"error": "usage", "message": "backend_agent.py <tool> <args_json>"}))
      return 2

    load_lab_env(ROOT)
    tool_name = sys.argv[1]
    args = json.loads(sys.argv[2] or "{}")
    func = TOOL_FUNCTIONS.get(tool_name)

    if not func:
      print(json.dumps({"error": "unknown_tool", "tool": tool_name}, ensure_ascii=False))
      return 1

    try:
      result = func(**args)
      print(json.dumps({"tool": tool_name, "args": args, "result": result}, ensure_ascii=False, default=str))
      return 0
    except Exception as exc:
      print(json.dumps({"error": type(exc).__name__, "message": str(exc)}, ensure_ascii=False))
      return 1


if __name__ == "__main__":
    raise SystemExit(main())
