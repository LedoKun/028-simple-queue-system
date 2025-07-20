import asyncio
import aiohttp
import re
from pathlib import Path
from fake_useragent import UserAgent

# --- Configuration ---
OUTPUT_DIR = Path("./public/media/audio_stems")
CONCURRENCY_LIMIT = 20
REQUEST_TIMEOUT = 2
MAX_RETRIES = 10
GOOGLE_TTS_URL = "http://translate.google.com/translate_tts"
ua = UserAgent()

THAI_PHRASE_FILENAME_MAP = {
    "หมายเลข": "phrase_number",
    "เชิญช่อง": "phrase_to_counter"
}

PARTS_TO_GENERATE = {
    "th": {
        "phrases": list(THAI_PHRASE_FILENAME_MAP.keys()),
        # Updated: Generate numbers 0-9
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord('A'), ord('Z') + 1)]
    },
    "en": {
        "phrases": ["Number", "to counter"],
        # Updated: Generate numbers 0-9
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord('A'), ord('Z') + 1)]
    }
}


def get_filename_for_text(text, lang):
    """Generates a consistent, English-based filename for any text stem."""
    if lang == "th" and text in THAI_PHRASE_FILENAME_MAP:
        return f"{THAI_PHRASE_FILENAME_MAP[text]}.mp3"

    sanitized = re.sub(r'[\\/*?:"<>|]', "", text).replace(" ", "_").lower()

    if text.isnumeric():
        # Updated: Pad all numbers to 3 digits for filenames
        return f"number_{int(text):03d}.mp3"
    elif text.isalpha() and len(text) == 1:
        return f"char_{sanitized}.mp3"
    else:
        return f"phrase_{sanitized}.mp3"


async def fetch_and_save_tts(session, semaphore, text, lang, output_path):
    """Fetches a single TTS audio file with timeout and retry logic."""
    async with semaphore:
        if lang == 'en':
            langCode = 'en-gb'

        else:
            langCode = lang

        params = {'ie': 'UTF-8', 'q': text, 'tl': langCode, 'client': 'tw-ob'}
        for attempt in range(MAX_RETRIES + 1):
            try:
                headers = {'User-Agent': ua.random}
                print(
                    f"  Attempt {attempt+1}: Fetching '{text}' in '{langCode}'...")
                async with session.get(GOOGLE_TTS_URL, params=params, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                    if response.status == 200:
                        content = await response.read()
                        if len(content) > 100:
                            output_path.write_bytes(content)
                            print(f"    -> SUCCESS: Saved {output_path}")
                            return
                        else:
                            print(
                                f"    -> ERROR: Invalid data for '{text}'. Retrying...")
                    else:
                        print(
                            f"    -> ERROR: HTTP {response.status} for '{text}'. Retrying...")
            except Exception as e:
                print(
                    f"    -> FAILED on attempt {attempt+1} for '{text}': {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(1)
            else:
                print(
                    f"    -> GIVING UP on '{text}' after {MAX_RETRIES+1} attempts.")


async def main():
    """Main function to orchestrate the generation process."""
    print("Starting audio stem generation...")
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    tasks = []
    async with aiohttp.ClientSession() as session:
        for lang, parts in PARTS_TO_GENERATE.items():
            lang_dir = OUTPUT_DIR / lang
            lang_dir.mkdir(parents=True, exist_ok=True)
            all_stems = parts["phrases"] + \
                parts["numbers"] + parts["characters"]
            for text in all_stems:
                filename = get_filename_for_text(text, lang)
                output_path = lang_dir / filename
                if not output_path.exists():
                    tasks.append(fetch_and_save_tts(
                        session, semaphore, text, lang, output_path))
                else:
                    print(f"  Skipping existing file: {output_path}")
        if tasks:
            print(
                f"\nFound {len(tasks)} new audio files to generate. Starting workers...")
            await asyncio.gather(*tasks)
        else:
            print("\nAll audio files already exist.")
    print("\nAudio stem generation complete.")

if __name__ == "__main__":
    asyncio.run(main())
