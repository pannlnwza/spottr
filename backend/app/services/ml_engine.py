import os
import urllib.request
import pickle
from pathlib import Path
import numpy as np
import torch
import open_clip
from sam2.build_sam import build_sam2
from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
from PIL import Image

if torch.cuda.is_available():
    DEVICE = "cuda"
elif torch.backends.mps.is_available():
    DEVICE = "mps"
else:
    DEVICE = "cpu"

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BACKEND_DIR / "models"
SAM2_DIR = MODELS_DIR / "sam2"
HF_CACHE = MODELS_DIR / "hf"
SAM2_DIR.mkdir(parents=True, exist_ok=True)
HF_CACHE.mkdir(parents=True, exist_ok=True)

os.environ["HF_HOME"] = str(HF_CACHE)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(HF_CACHE / "hub")

# SAM2 Config — must match 02_pipeline_setup.ipynb (the scoring head was trained on base_plus features).
SAM2_VARIANT = "sam2.1_hiera_base_plus.pt"
SAM2_CHECKPOINT_URL = f"https://dl.fbaipublicfiles.com/segment_anything_2/092824/{SAM2_VARIANT}"
SAM2_CHECKPOINT = SAM2_DIR / SAM2_VARIANT
SAM2_CONFIG = "configs/sam2.1/sam2.1_hiera_b+.yaml"

SCORING_HEAD_PATH = MODELS_DIR / "trained_scoring_head.pkl"

sam2_model = None
mask_generator = None
siglip_model = None
siglip_preprocess = None
siglip_tokenizer = None
SIGLIP_DIM = 768 # default for ViT-B-16-SigLIP2-256

mlp_model = None
mlp_scaler = None

# Global State for indexing
class MemoryIndex:
    def __init__(self):
        self.index = None
        self.region_to_frame = None
        self.region_boxes = None
        self.region_areas = None
        self.region_ious = None
        self.frames_cache = [] # Not saving full images in memory for production, but keeping it simple for prototype
        self.timestamps = []
        self.fps = None

global_index = MemoryIndex()

def init_models():
    global sam2_model, mask_generator, siglip_model, siglip_preprocess, siglip_tokenizer, SIGLIP_DIM, mlp_model, mlp_scaler
    if not SAM2_CHECKPOINT.exists():
        print(f"Downloading {SAM2_CHECKPOINT_URL} to {SAM2_CHECKPOINT}")
        urllib.request.urlretrieve(SAM2_CHECKPOINT_URL, str(SAM2_CHECKPOINT))
    
    sam2_model = build_sam2(SAM2_CONFIG, str(SAM2_CHECKPOINT), device=DEVICE)
    mask_generator = SAM2AutomaticMaskGenerator(
        model=sam2_model,
        points_per_side=16,
        pred_iou_thresh=0.7,
    )

    siglip_model, siglip_preprocess = open_clip.create_model_from_pretrained(
        "hf-hub:timm/ViT-B-16-SigLIP2-256"
    )
    siglip_model = siglip_model.to(DEVICE).eval()
    siglip_tokenizer = open_clip.get_tokenizer("hf-hub:timm/ViT-B-16-SigLIP2-256")
    
    with torch.no_grad():
        probe = siglip_tokenizer(["probe"]).to(DEVICE)
        SIGLIP_DIM = siglip_model.encode_text(probe).shape[-1]
    
    if SCORING_HEAD_PATH.exists():
        with open(SCORING_HEAD_PATH, "rb") as f:
            trained = pickle.load(f)
            mlp_model = trained["model"]
            mlp_scaler = trained["scaler"]
        print(f"Scoring head loaded successfully from {SCORING_HEAD_PATH}")
    else:
        print(f"Warning: Scoring head {SCORING_HEAD_PATH} not found.")

    print("Models initialized successfully!")

def encode_images_siglip(pil_images, batch_size=32):
    if not pil_images:
        return np.zeros((0, SIGLIP_DIM), dtype=np.float32)
    out = []
    for i in range(0, len(pil_images), batch_size):
        batch = torch.stack([siglip_preprocess(im) for im in pil_images[i:i+batch_size]]).to(DEVICE)
        with torch.no_grad():
            emb = siglip_model.encode_image(batch)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        out.append(emb.cpu().numpy())
    return np.vstack(out).astype(np.float32)

def encode_text_siglip(text: str):
    tokens = siglip_tokenizer([text]).to(DEVICE)
    with torch.no_grad():
        emb = siglip_model.encode_text(tokens)
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb.cpu().numpy().astype(np.float32)[0]
