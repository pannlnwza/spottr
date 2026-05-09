#!/usr/bin/env python3
"""Download SAM2, SigLIP2, and InsightFace model weights for Spottr.

Run from the project root:
    python scripts/download_models.py

Idempotent, re-running skips files that already exist.

Paths must stay in sync with backend/app/services/ml_engine.py.
"""

from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "backend" / "models"
SAM2_DIR = MODELS_DIR / "sam2"
HF_CACHE = MODELS_DIR / "hf"

SAM2_VARIANT = "sam2.1_hiera_base_plus.pt"
SAM2_URL = f"https://dl.fbaipublicfiles.com/segment_anything_2/092824/{SAM2_VARIANT}"

SIGLIP2_REPO = "timm/ViT-B-16-SigLIP2-256"

INSIGHTFACE_PACK = "buffalo_l"


def _progress(block_num: int, block_size: int, total_size: int) -> None:
    if total_size <= 0:
        return
    downloaded = min(block_num * block_size, total_size)
    pct = downloaded * 100 / total_size
    mb = downloaded / 1e6
    total_mb = total_size / 1e6
    sys.stdout.write(f"\r    {pct:5.1f}%  {mb:7.1f} / {total_mb:7.1f} MB")
    sys.stdout.flush()


def download_url(url: str, dest: Path) -> None:
    if dest.exists():
        size_mb = dest.stat().st_size / 1e6
        print(f"  [skip] {dest.name} already exists ({size_mb:.1f} MB)")
        return
    print(f"  [download] {url}")
    print(f"             -> {dest}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest, reporthook=_progress)
    print()


def download_sam2() -> None:
    print("\n[1/3] SAM2 checkpoint")
    download_url(SAM2_URL, SAM2_DIR / SAM2_VARIANT)


def download_siglip2() -> None:
    print("\n[2/3] SigLIP2 model")
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print("  [error] huggingface_hub not installed — run: pip install huggingface_hub")
        return

    HF_CACHE.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(HF_CACHE)
    os.environ["HUGGINGFACE_HUB_CACHE"] = str(HF_CACHE / "hub")

    print(f"  [download] {SIGLIP2_REPO}")
    print(f"             -> {HF_CACHE / 'hub'}")
    snapshot_download(repo_id=SIGLIP2_REPO)


def download_insightface() -> None:
    print("\n[3/3] InsightFace model pack")
    try:
        from insightface.app import FaceAnalysis
    except ImportError:
        print("  [error] insightface not installed — run: pip install insightface onnxruntime")
        return

    print(f"  [init] preparing {INSIGHTFACE_PACK} (cached at ~/.insightface)")
    app = FaceAnalysis(name=INSIGHTFACE_PACK)
    app.prepare(ctx_id=0)
    print(f"  [done] {INSIGHTFACE_PACK} ready")


def main() -> None:
    print(f"Models directory: {MODELS_DIR}")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    download_sam2()
    download_siglip2()
    download_insightface()

    print("\nAll models ready.")


if __name__ == "__main__":
    main()
