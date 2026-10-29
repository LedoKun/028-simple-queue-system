import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

spec = importlib.util.spec_from_file_location("audio_helper", Path(__file__).parents[1] / "generate_stems_google_translate.py")
import sys
helper = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = helper
spec.loader.exec_module(helper)


class AudioHelperTests(unittest.IsolatedAsyncioTestCase):
    async def test_http_errors_wait_before_retrying(self):
        class Response:
            status = 429
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                pass
        class Session:
            def get(self, *args, **kwargs):
                return Response()
        with patch.object(helper.asyncio, "sleep", new_callable=AsyncMock) as delay:
            result = await helper.fetch_tts(Session(), "Number", "en-GB", helper.TTSConfig(max_retries=2))
        self.assertIsNone(result)
        delay.assert_awaited_once_with(1)

    def test_failed_compression_preserves_the_original_audio(self):
        class BrokenEncoder:
            def export(self, path, **kwargs):
                Path(path).write_bytes(b"partial")
                raise RuntimeError("encoder failed")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "audio.mp3"
            path.write_bytes(b"original audio")
            with patch.object(helper.AudioSegment, "from_file", return_value=BrokenEncoder()):
                helper.compress_mp3_file(path, helper.TTSConfig())
            self.assertEqual(path.read_bytes(), b"original audio")
            self.assertEqual(list(Path(folder).iterdir()), [path])

    def test_stem_names_match_runtime_paths(self):
        self.assertEqual(helper.derive_stem_filename("หมายเลข", "th"), "phrase_number.mp3")
        self.assertEqual(helper.derive_stem_filename("Number", "en-GB"), "phrase_number.mp3")
        self.assertEqual(helper.derive_stem_filename("A", "th"), "char_a.mp3")
        self.assertEqual(helper.derive_stem_filename("4", "en-GB"), "number_004.mp3")


if __name__ == "__main__":
    unittest.main()
