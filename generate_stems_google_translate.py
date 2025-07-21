import asyncio
import aiohttp
import re
from pathlib import Path
from fake_useragent import UserAgent
from itertools import product
from pydub import AudioSegment  # Import pydub

# --- Configuration ---
OUTPUT_DIR = Path("./public/media/audio_stems")
CACHE_DIR = Path("./public/media/audio_cache/multi")
CONCURRENCY_LIMIT = 20
REQUEST_TIMEOUT = 5
MAX_RETRIES = 10
GOOGLE_TTS_URL = "https://translate.google.com/translate_tts"
# New: Set desired bitrate for compression (e.g., "64k", "48k")
COMPRESSION_BITRATE = "24k"
ua = UserAgent()

THAI_PHRASE_FILENAME_MAP = {
    "หมายเลข": "phrase_number",
    "เชิญช่อง": "phrase_to_counter"
}

PARTS_TO_GENERATE = {
    "th": {
        "phrases": list(THAI_PHRASE_FILENAME_MAP.keys()),
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord('A'), ord('Z') + 1)]
    },
    "en": {
        "phrases": ["Number", "to counter"],
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord('A'), ord('Z') + 1)]
    }
}

# --- New: Configuration for Cache Pre-generation ---
CACHE_CONFIG = {
    "chars": [chr(i) for i in range(ord('A'), ord('C') + 1)],
    "numbers": range(1, 61),  # 1 to 60
    "counters": range(1, 6)    # 1 to 5
}


def get_filename_for_text(text, lang):
    """Generates a consistent, English-based filename for any text stem."""
    if lang == "th" and text in THAI_PHRASE_FILENAME_MAP:
        return f"{THAI_PHRASE_FILENAME_MAP[text]}.mp3"

    sanitized = re.sub(r'[\\/*?:"<>|]', "", text).replace(" ", "_").lower()

    if text.isnumeric():
        return f"number_{int(text):03d}.mp3"
    elif text.isalpha() and len(text) == 1:
        return f"char_{sanitized}.mp3"
    else:
        return f"phrase_{sanitized}.mp3"

# --- New: Function to compress an MP3 file ---


def compress_mp3_file(file_path):
    """Compresses an MP3 file using pydub to the specified bitrate."""
    if not COMPRESSION_BITRATE:
        return  # Skip compression if bitrate is not set

    try:
        # pydub may need the file extension to correctly identify the format
        audio = AudioSegment.from_file(str(file_path), format="mp3")
        # Export over the original file with the new bitrate
        audio.export(str(file_path), format="mp3", bitrate=COMPRESSION_BITRATE)
        print(
            f"      -> COMPRESSED: {file_path.name} to {COMPRESSION_BITRATE}")
    except Exception as e:
        print(
            f"      -> WARN: Could not compress {file_path.name}. Error: {e}")
        print("           Ensure FFmpeg is installed and accessible in your system's PATH.")


async def fetch_tts(session, text, lang):
    """
    Fetches a single TTS audio file with timeout and retry logic.
    Returns audio content as bytes on success, None on failure.
    """
    lang_code = 'en-gb' if lang == 'en' else lang
    params = {'ie': 'UTF-8', 'q': text, 'tl': lang_code, 'client': 'tw-ob'}

    for attempt in range(MAX_RETRIES):
        try:
            headers = {'User-Agent': ua.random}
            print(
                f"    Attempt {attempt+1}/{MAX_RETRIES}: Fetching '{text}' ({lang_code})...")
            async with session.get(GOOGLE_TTS_URL, params=params, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status == 200:
                    content = await response.read()
                    if len(content) > 100:
                        return content
                    else:
                        print(
                            f"      -> WARN: Invalid or empty data for '{text}'. Retrying...")
                else:
                    print(
                        f"      -> WARN: HTTP {response.status} for '{text}'. Retrying...")
        except Exception as e:
            print(
                f"      -> WARN: FAILED on attempt {attempt+1} for '{text}': {e}")

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(1)
        else:
            print(
                f"    -> ERROR: GIVING UP on '{text}' after {MAX_RETRIES} attempts.")
            return None


async def fetch_and_save_tts(session, semaphore, text, lang, output_path):
    """Fetches a single TTS audio file, saves it, and then compresses it."""
    async with semaphore:
        if output_path.exists():
            print(f"  Skipping existing file: {output_path}")
            return

        content = await fetch_tts(session, text, lang)
        if content:
            output_path.write_bytes(content)
            print(f"    -> SUCCESS: Saved {output_path}")
            # --- Add compression step ---
            compress_mp3_file(output_path)


async def generate_and_save_combined_tts(session, semaphore, char, num, counter):
    """
    Generates a combined TTS file, saves it, and then compresses it.
    """
    async with semaphore:
        number_str = f"{char}{num:02d}"
        filename = f"{number_str}-{counter}.mp3"
        output_path = CACHE_DIR / filename

        if output_path.exists():
            return

        print(f"  Generating cache file: {filename}")

        thai_phrase = f"หมายเลข {number_str} เชิญช่อง {counter}"
        english_phrase = f"Number {number_str} to counter {counter}"

        thai_bytes_task = fetch_tts(session, thai_phrase, 'th')
        english_bytes_task = fetch_tts(session, english_phrase, 'en')
        thai_bytes, english_bytes = await asyncio.gather(thai_bytes_task, english_bytes_task)

        if thai_bytes and english_bytes:
            combined_content = thai_bytes + english_bytes
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(combined_content)
            print(f"    -> SUCCESS: Saved combined cache {output_path}")
            # --- Add compression step ---
            compress_mp3_file(output_path)
        else:
            print(
                f"    -> ERROR: Failed to create combined file for {filename} due to fetch error.")


async def generate_stems():
    """Main function to orchestrate the INDIVIDUAL STEM generation process."""
    print("--- Starting Audio Stem Generation ---")
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
                    print(f"  Skipping existing stem file: {output_path}")
        if tasks:
            print(
                f"\nFound {len(tasks)} new audio stems to generate. Starting workers...")
            await asyncio.gather(*tasks)
        else:
            print("\nAll audio stem files already exist.")
    print("\n--- Audio Stem Generation Complete ---")


async def pregenerate_cache():
    """Main function to orchestrate the COMBINED CACHE generation process."""
    print("\n--- Starting TTS Cache Pre-generation ---")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    tasks = []

    all_combinations = list(product(
        CACHE_CONFIG["chars"],
        CACHE_CONFIG["numbers"],
        CACHE_CONFIG["counters"]
    ))

    tasks_to_create = []
    print("Checking for existing cache files...")
    for char, num, counter in all_combinations:
        number_str = f"{char}{num:02d}"
        filename = f"{number_str}-{counter}.mp3"
        output_path = CACHE_DIR / filename
        if not output_path.exists():
            tasks_to_create.append((char, num, counter))

    if not tasks_to_create:
        print("\nAll cache files already exist.")
        print("\n--- TTS Cache Pre-generation Complete ---")
        return

    print(
        f"\nFound {len(tasks_to_create)} new cache files to generate. Starting workers...")

    async with aiohttp.ClientSession() as session:
        for char, num, counter in tasks_to_create:
            task = generate_and_save_combined_tts(
                session, semaphore, char, num, counter)
            tasks.append(task)
        await asyncio.gather(*tasks)

    print("\n--- TTS Cache Pre-generation Complete ---")


if __name__ == "__main__":
    asyncio.run(generate_stems())
    asyncio.run(pregenerate_cache())
