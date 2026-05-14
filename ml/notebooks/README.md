# Notebooks

The notebook `02_pipeline_setup.ipynb` automatically downloads the COCO val2017 dataset on first run. It then runs the SAM2 + SigLIP2 pipeline on a sample of 500 images and writes cached artifacts to `cache/` that are reused by `03_trained_scoring_head.ipynb` and `04_explainability_trained_model.ipynb`.

Run the notebooks in order (01, 02, 03, 04) to reproduce the full training and evaluation flow.

## Cached artifacts

Written by `02_pipeline_setup.ipynb` to `cache/` (or a Drive-backed path on Colab):

| File | Contents | Used by |
|---|---|---|
| `sample_manifest.pkl` | Sampled image IDs, paths, per-image categories, and the COCO category list | 03, 04 |
| `clip_embeddings.npy` | Whole-frame CLIP embeddings for the sampled images | 03 |
| `siglip_embeddings.npy` | Whole-frame SigLIP2 embeddings for the sampled images | 03, 04 |
| `sam2_region_index.pkl` | SAM2 region embeddings, region→image mapping, areas, IoUs, and bounding boxes | 03, 04 |

Written by `03_trained_scoring_head.ipynb`:

| File | Contents | Used by |
|---|---|---|
| `trained_scoring_head.pkl` | Trained MLP scoring head that combines region and whole-frame signals | 04, backend |

Each notebook reloads cached artifacts if present, so re-running 02 is only needed if you change the sample size or want to regenerate embeddings.
