# Spottr

Open-vocabulary video search. Type a description, get the matching frames and the regions inside them.

Built around three frozen models (SAM2 for region segmentation, SigLIP2 for image-text matching, InsightFace for face matching) plus a small trained scoring head that learns to combine region and whole-frame signals into a single relevance score.

## Quick start

Requires Python 3.10+, Node.js with [Bun](https://bun.sh), and ~2 GB of disk for model weights.

### Backend

```bash
cd backend
pip install -r requirements.txt
cd ..
python scripts/download_models.py    # one-time, ~2 GB
cd backend
uvicorn main:app --reload            # http://localhost:8000
```

### Frontend

```bash
cd frontend
bun install
bun dev                              # http://localhost:5173
```

Open the frontend, upload a video, then search.

## How it works

1. Upload: frontend sends a video to `POST /api/upload`. Backend extracts frames at fixed intervals.
2. Index: for each frame, SAM2 generates region proposals. SigLIP2 encodes every region (and the whole frame) into a 768-d embedding. All embeddings live in an in-memory index.
3. Search: text query goes to `GET /api/search?q=...`. The query is encoded by SigLIP2; cosine similarity is computed against every region. For each frame, nine summary features (best region score, top-3 mean, region area, IoU, etc.) are fed to a trained MLP that outputs a single relevance probability. Frames are ranked by that probability.
4. Display: top results are returned with bounding boxes; frontend renders them on the matching frame.

## Models

| Model | Variant | Size | Role |
|---|---|---|---|
| SAM2 | `sam2.1_hiera_base_plus.pt` | ~310 MB | Region segmentation |
| SigLIP2 | `timm/ViT-B-16-SigLIP2-256` | ~700 MB | Image-text encoder |
| InsightFace | `buffalo_l` | ~280 MB | Face detection and matching |
| Scoring head | `trained_scoring_head.pkl` | ~340 KB | Trained MLP that ranks frames |

The scoring head is trained in `notebooks/03_trained_scoring_head.ipynb` and shipped with the repo. The other three are downloaded by `scripts/download_models.py`.

## Notebooks

| Notebook | What it does |
|---|---|
| `01_data_exploration.ipynb` | COCO val2017 analysis, motivates the region-level approach |
| `02_pipeline_setup.ipynb` | Builds the full retrieval pipeline and caches embeddings |
| `03_trained_scoring_head.ipynb` | Trains and compares 4 scoring head variants (logreg, MLP small/medium, XGBoost) |
| `04_explainability_trained_model.ipynb` | SHAP values, per-feature importance, qualitative test cases |

## Evaluation Data

The notebooks evaluate on [COCO val2017](https://cocodataset.org/), publicly available and downloaded automatically by `02_pipeline_setup.ipynb`. The full dataset is not bundled with this repo.
