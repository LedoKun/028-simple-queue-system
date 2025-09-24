"""Utility for pre-generating Google Translate TTS stems and cache files.

The script fetches atomic audio "stems" (phrases, numbers, characters) and a
handful of combined queue announcements used as fallbacks when the online TTS
service is unavailable. Downloads are deduplicated, rate limited, retried on
failure, and compressed in-place once written.
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import re
from dataclasses import dataclass
from itertools import product
from pathlib import Path
from typing import Any, Awaitable, Callable, Iterable, Sequence

import aiohttp
from fake_useragent import UserAgent
from pydub import AudioSegment

LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TTSConfig:
    stems_output_dir: Path = Path("./public/media/audio_stems")
    cache_output_dir: Path = Path("./public/media/audio_cache/multi")
    concurrency_limit: int = 20
    request_timeout: int = 5
    max_retries: int = 10
    compression_bitrate: str | None = "32k"
    google_tts_url: str = "https://translate.google.com/translate_tts"


THAI_PHRASE_FILENAME_MAP = {
    "หมายเลข": "phrase_number",
    "เชิญช่อง": "phrase_to_counter",
}

LANGUAGE_PARTS: dict[str, dict[str, Sequence[str]]] = {
    "th": {
        "phrases": list(THAI_PHRASE_FILENAME_MAP.keys()),
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord("A"), ord("Z") + 1)],
    },
    "en": {
        "phrases": ["Number", "to counter"],
        "numbers": [str(i) for i in range(0, 10)],
        "characters": [chr(i) for i in range(ord("A"), ord("Z") + 1)],
    },
}

CACHE_COMBINATIONS: Sequence[tuple[str, int, int]] = tuple(
    list(product(["A"], range(1, 101), range(1, 6)))
    + list(product([chr(i) for i in range(ord("B"), ord("C") + 1)], range(1, 11), range(1, 6)))
)

FILENAME_SANITIZER = re.compile(r"[\\/*?:\"<>|]")

USER_AGENT = UserAgent()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class StemJob:
    language: str
    text: str
    destination: Path


@dataclass(frozen=True)
class CacheJob:
    prefix: str
    number: int
    counter: int
    destination: Path

    @property
    def composed_number(self) -> str:
        return f"{self.prefix}{self.number:02d}"


def derive_stem_filename(text: str, lang: str) -> str:
    if lang == "th" and text in THAI_PHRASE_FILENAME_MAP:
        return f"{THAI_PHRASE_FILENAME_MAP[text]}.mp3"

    sanitized = FILENAME_SANITIZER.sub("", text).replace(" ", "_").lower()
    if text.isnumeric():
        return f"number_{int(text):03d}.mp3"
    if text.isalpha() and len(text) == 1:
        return f"char_{sanitized}.mp3"
    return f"phrase_{sanitized}.mp3"


def iter_stem_jobs(config: TTSConfig) -> Iterable[StemJob]:
    for lang, parts in LANGUAGE_PARTS.items():
        lang_dir = config.stems_output_dir / lang
        lang_dir.mkdir(parents=True, exist_ok=True)
        for text in (*parts["phrases"], *parts["numbers"], *parts["characters"]):
            yield StemJob(language=lang, text=text, destination=lang_dir / derive_stem_filename(text, lang))


def iter_cache_jobs(config: TTSConfig) -> Iterable[CacheJob]:
    config.cache_output_dir.mkdir(parents=True, exist_ok=True)
    for prefix, number, counter in CACHE_COMBINATIONS:
        filename = f"{prefix}{number:02d}-{counter}.mp3"
        yield CacheJob(prefix, number, counter, config.cache_output_dir / filename)


def compress_mp3_file(path: Path, config: TTSConfig) -> None:
    if not config.compression_bitrate:
        return

    try:
        audio = AudioSegment.from_file(path, format="mp3")
        audio.export(path, format="mp3", bitrate=config.compression_bitrate)
        LOGGER.debug("Compressed %s to %s", path.name, config.compression_bitrate)
    except Exception as exc:  # noqa: BLE001
        LOGGER.warning("Could not compress %s: %s", path.name, exc)
        LOGGER.warning("Ensure FFmpeg is available in PATH if compression is required")


async def fetch_tts(
    session: aiohttp.ClientSession,
    text: str,
    lang: str,
    config: TTSConfig,
) -> bytes | None:
    lang_code = "en-gb" if lang == "en" else lang
    params = {"ie": "UTF-8", "q": text, "tl": lang_code, "client": "tw-ob"}

    for attempt in range(1, config.max_retries + 1):
        try:
            headers = {"User-Agent": USER_AGENT.random}
            async with session.get(
                config.google_tts_url,
                params=params,
                headers=headers,
                timeout=config.request_timeout,
            ) as response:
                if response.status != 200:
                    LOGGER.debug("HTTP %s for '%s'", response.status, text)
                    continue

                content = await response.read()
                if len(content) > 100:
                    return content
                LOGGER.debug("Empty payload for '%s'", text)
        except Exception as exc:  # noqa: BLE001
            LOGGER.debug("Attempt %s failed for '%s': %s", attempt, text, exc)

        if attempt < config.max_retries:
            await asyncio.sleep(1)

    LOGGER.error("Giving up on '%s' after %s attempts", text, config.max_retries)
    return None


async def execute_stem_job(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    job: StemJob,
    config: TTSConfig,
) -> None:
    if job.destination.exists():
        LOGGER.debug("Stem cached: %s", job.destination)
        return

    async with semaphore:
        content = await fetch_tts(session, job.text, job.language, config)
        if not content:
            return
        job.destination.write_bytes(content)
        LOGGER.info("Created stem %s", job.destination)
        compress_mp3_file(job.destination, config)


async def execute_cache_job(
    session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    job: CacheJob,
    config: TTSConfig,
) -> None:
    if job.destination.exists():
        LOGGER.debug("Cache cached: %s", job.destination)
        return

    async with semaphore:
        thai_phrase = f"หมายเลข {job.composed_number} เชิญช่อง {job.counter}"
        english_phrase = f"Number {job.composed_number} to counter {job.counter}"
        thai_bytes, english_bytes = await asyncio.gather(
            fetch_tts(session, thai_phrase, "th", config),
            fetch_tts(session, english_phrase, "en", config),
        )
        if not (thai_bytes and english_bytes):
            LOGGER.error("Failed to build cache %s", job.destination)
            return

        job.destination.write_bytes(thai_bytes + english_bytes)
        LOGGER.info("Created cache %s", job.destination)
        compress_mp3_file(job.destination, config)


WorkerFn = Callable[[aiohttp.ClientSession, asyncio.Semaphore, Any, TTSConfig], Awaitable[None]]


async def run_jobs(jobs: Iterable[Any], worker_fn: WorkerFn, config: TTSConfig) -> None:
    semaphore = asyncio.Semaphore(config.concurrency_limit)
    async with aiohttp.ClientSession() as session:
        await asyncio.gather(*(worker_fn(session, semaphore, job, config) for job in jobs))


async def generate_stems(config: TTSConfig) -> None:
    jobs = [job for job in iter_stem_jobs(config) if not job.destination.exists()]
    if not jobs:
        LOGGER.info("All stem files already exist")
        return

    LOGGER.info("Generating %s stem files", len(jobs))
    await run_jobs(jobs, execute_stem_job, config)


async def generate_cache(config: TTSConfig) -> None:
    jobs = [job for job in iter_cache_jobs(config) if not job.destination.exists()]
    if not jobs:
        LOGGER.info("All cache files already exist")
        return

    LOGGER.info("Generating %s cache files", len(jobs))
    await run_jobs(jobs, execute_cache_job, config)


async def main(config: TTSConfig, *, stems: bool, cache: bool) -> None:
    if stems:
        await generate_stems(config)
    if cache:
        await generate_cache(config)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pre-generate TTS stems and cache audio")
    parser.add_argument(
        "--skip-stems",
        action="store_true",
        help="Skip individual stem generation",
    )
    parser.add_argument(
        "--skip-cache",
        action="store_true",
        help="Skip combined cache generation",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"],
        help="Logging verbosity",
    )
    return parser.parse_args()


def configure_logging(level: str) -> None:
    logging.basicConfig(format="%(levelname)s %(message)s", level=getattr(logging, level))


if __name__ == "__main__":
    cli_args = parse_args()
    configure_logging(cli_args.log_level)

    cfg = TTSConfig()
    asyncio.run(main(cfg, stems=not cli_args.skip_stems, cache=not cli_args.skip_cache))
