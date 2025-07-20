import os
import time
import random
import io
import wave
from pathlib import Path
from google import genai
from google.genai import types
from google.api_core import exceptions
from pydub import AudioSegment
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type


class GeminiTTSGenerator:
    def __init__(self):
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        self.model_name = "gemini-2.5-flash-preview-tts"

    def _load_api_keys(self):
        """Load API keys from environment variables."""
        keys = []
        if 'GEMINI_API_KEY' in os.environ:
            keys.append(os.environ['GEMINI_API_KEY'])
        i = 2
        while f'GEMINI_API_KEY_{i}' in os.environ:
            keys.append(os.environ[f'GEMINI_API_KEY_{i}'])
            i += 1
        if not keys:
            raise ValueError(
                "No GEMINI_API_KEY found in environment variables")
        print(f"Loaded {len(keys)} API key(s)")
        return keys

    def _get_next_client(self):
        """Get next API client in rotation."""
        client = genai.Client(api_key=self.api_keys[self.current_key_index])
        self.current_key_index = (
            self.current_key_index + 1) % len(self.api_keys)
        return client

    def _create_prompt(self, text, language, speed):
        """Create contextual prompt for TTS."""
        context = {
            'en': "The full announcement sounds like: 'Number C four to counter two.'",
            'th': "The full announcement sounds like: 'หมายเลข ซี สี่ เชิญที่เคาน์เตอร์ สอง.'"
        }
        return f"""
<tts_instruction>
  <context>
    This audio is part of a queue announcement system.
    {context.get(language, context['en'])}
    Speak with clear, professional tone.
  </context>
  <speed>{speed}</speed>
  <speak_this_part_only>{text}</speak_this_part_only>
</tts_instruction>
"""

    @retry(
        retry=retry_if_exception_type((
            exceptions.ResourceExhausted,
            exceptions.ServiceUnavailable,
            exceptions.DeadlineExceeded,
            ConnectionError,
            TimeoutError
        )),
        wait=wait_exponential(multiplier=2, min=5, max=120),
        before_sleep=lambda retry_state: print(
            f"API error (attempt {retry_state.attempt_number}/6). "
            f"Retrying in {int(retry_state.next_action.sleep)}s..."
        ) if retry_state.next_action else None
    )
    def _generate_audio(self, text, voice, speed, language):
        """Generate audio with enhanced retry logic."""
        client = self._get_next_client()
        prompt = self._create_prompt(text, language, speed)
        config = types.GenerateContentConfig(
            response_modalities=["audio"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice)
                )
            )
        )
        try:
            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )

            # FIX: Use getattr for safe, sequential access to nested attributes.
            # This is the most robust way to parse the potentially incomplete structure.
            if (
                not response.candidates
                or not response.candidates[0].content
                or not response.candidates[0].content.parts
            ):
                raise ValueError(
                    "API Error: Invalid response structure (missing candidates, content, or parts).")

            part = response.candidates[0].content.parts[0]

            # Safely get 'inline_data' from the part.
            inline_data = getattr(part, 'inline_data', None)
            if inline_data is None:
                raise ValueError(
                    "API Error: No 'inline_data' in the response part.")

            # Safely get 'data' from 'inline_data'.
            audio_data = getattr(inline_data, 'data', None)
            if not audio_data:
                raise ValueError(
                    "API Error: No audio data found in 'inline_data'.")

            return audio_data

        except Exception as e:
            print(f"API call failed: {e}")
            raise

    def generate_stems(self, stems_config):
        """Generate all audio stems."""
        print(f"Starting generation with {len(stems_config)} stems...")
        success_count = 0
        failed_stems = []

        for i, stem in enumerate(stems_config, 1):
            output_dir = Path("public/media/audio_stems") / stem['lang']
            output_dir.mkdir(parents=True, exist_ok=True)
            filename = f"{stem['type']}_{stem['name']}.mp3"
            output_path = output_dir / filename

            if output_path.exists():
                print(f"[{i}/{len(stems_config)}] Skipping existing: {filename}")
                success_count += 1
                continue

            print(f"[{i}/{len(stems_config)}] Generating: {filename} "
                  f"(Voice: {stem['voice']}, Speed: {stem['speed']})")

            try:
                audio_data = self._generate_audio(
                    stem['text'], stem['voice'], stem['speed'], stem['lang']
                )

                wav_buffer = io.BytesIO()
                with wave.open(wav_buffer, 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(24000)
                    wf.writeframes(audio_data)
                wav_buffer.seek(0)

                audio_segment = AudioSegment.from_file(
                    wav_buffer, format="wav")
                audio_segment.export(str(output_path), format="mp3")

                print(f"✓ Saved: {filename}")
                success_count += 1
                time.sleep(random.uniform(4, 7))

            except Exception as e:
                print(f"✗ Failed: {filename} - {e}")
                failed_stems.append(stem)

        print(f"\n--- Generation Complete ---")
        print(f"Success: {success_count}/{len(stems_config)}")
        print(f"Failed: {len(failed_stems)}")

        if failed_stems:
            print("\nFailed stems:")
            for s in failed_stems:
                print(f"  - {s['name']}: {s['text']}")
        return failed_stems


def create_stems_config():
    """Create the configuration for all stems to generate."""
    stems = [
        {"voice": "Despina", "speed": "normal", "text": "Number",
            "lang": "en", "type": "phrase", "name": "number"},
        {"voice": "Despina", "speed": "normal", "text": "to counter",
            "lang": "en", "type": "phrase", "name": "to_counter"},
        {"voice": "Algieba", "speed": "normal", "text": "หมายเลข",
            "lang": "th", "type": "phrase", "name": "number"},
        {"voice": "Algieba", "speed": "normal", "text": "เชิญที่เคาน์เตอร์",
            "lang": "th", "type": "phrase", "name": "to_counter"},
    ]
    en_numbers = ["Zero", "One", "Two", "Three",
                  "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    th_numbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม",
                  "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
    for i, (en_num, th_num) in enumerate(zip(en_numbers, th_numbers)):
        stems.extend([
            {"voice": "Despina", "speed": "slow", "text": en_num,
                "lang": "en", "type": "number", "name": f"{i:03d}"},
            {"voice": "Algieba", "speed": "slow", "text": th_num,
                "lang": "th", "type": "number", "name": f"{i:03d}"}
        ])
    for char_code in range(ord('a'), ord('z') + 1):
        char = chr(char_code)
        stems.append({"voice": "Despina", "speed": "normal", "text": char.upper(
        ), "lang": "en", "type": "char", "name": char})
    thai_phonetic = {
        'a': 'เอ', 'b': 'บี', 'c': 'ซี', 'd': 'ดี', 'e': 'อี', 'f': 'เอฟ',
        'g': 'จี', 'h': 'เอช', 'i': 'ไอ', 'j': 'เจ', 'k': 'เค', 'l': 'แอล',
        'm': 'เอ็ม', 'n': 'เอ็น', 'o': 'โอ', 'p': 'พี', 'q': 'คิว', 'r': 'อาร์',
        's': 'เอส', 't': 'ที', 'u': 'ยู', 'v': 'วี', 'w': 'ดับเบิลยู',
        'x': 'เอ็กซ์', 'y': 'วาย', 'z': 'แซด'
    }
    for char, phonetic in thai_phonetic.items():
        stems.append({"voice": "Algieba", "speed": "normal",
                     "text": phonetic, "lang": "th", "type": "char", "name": char})
    return stems


def main():
    """Main execution function."""
    try:
        generator = GeminiTTSGenerator()
        stems_config = create_stems_config()
        failed_stems = generator.generate_stems(stems_config)
        if failed_stems:
            print(f"\nRetrying {len(failed_stems)} failed stems...")
            time.sleep(10)
            generator.generate_stems(failed_stems)
    except Exception as e:
        print(f"Error: {e}")
        return 1
    return 0


if __name__ == "__main__":
    exit(main())
