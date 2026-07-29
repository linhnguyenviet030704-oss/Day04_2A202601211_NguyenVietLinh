import sys
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from providers import make_provider


class GroqProviderTest(unittest.TestCase):
    def test_make_provider_returns_groq_defaults(self):
        try:
            provider = make_provider("groq")
        except ValueError as exc:
            self.fail(str(exc))

        self.assertEqual(provider.api_key_env, "GROQ_API_KEY")
        self.assertEqual(provider.default_model, "openai/gpt-oss-120b")

    def test_chat_module_help_imports_local_env_loader(self):
        result = subprocess.run(
            [sys.executable, "-m", "starter_v0.chat", "--help"],
            cwd=ROOT.parent,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)

    def test_run_eval_module_help_imports_local_env_loader(self):
        result = subprocess.run(
            [sys.executable, "-m", "starter_v0.run_eval", "--help"],
            cwd=ROOT.parent,
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
