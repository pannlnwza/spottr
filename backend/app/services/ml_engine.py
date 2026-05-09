import os
import urllib.request
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

CACHE_DIR = Path("data/cache")
MODEL_CACHE = CACHE_DIR / "models"
HF_CACHE = CACHE_DIR / "hf"
MODEL_CACHE.mkdir(parents=True, exist_ok=True)
HF_CACHE.mkdir(parents=True, exist_ok=True)

os.environ["HF_HOME"] = str(HF_CACHE)
os.environ["HUGGINGFACE_HUB_CACHE"] = str(HF_CACHE / "hub")

# SAM2 Config
SAM2_CHECKPOINT_URL = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt"
SAM2_CHECKPOINT = MODEL_CACHE / "sam2.1_hiera_tiny.pt"
# Depending on where the app runs, the config path in sam2 package is needed.
# Usually sam2 will resolve "configs/sam2.1/sam2.1_hiera_t.yaml" internally, or we need to pass the package name
SAM2_CONFIG = "configs/sam2.1/sam2.1_hiera_t.yaml"

sam2_model = None
mask_generator = None
siglip_model = None
siglip_preprocess = None
siglip_tokenizer = None
SIGLIP_DIM = 768 # default for ViT-B-16-SigLIP2-256

# Global State for indexing
class MemoryIndex:
    def __init__(self):
        self.index = None
        self.region_to_frame = None
        self.region_boxes = None
        self.frames_cache = [] # Not saving full images in memory for production, but keeping it simple for prototype
        self.timestamps = []
        self.fps = None

global_index = MemoryIndex()

def init_models():
    global sam2_model, mask_generator, siglip_model, siglip_preprocess, siglip_tokenizer, SIGLIP_DIM
    if not SAM2_CHECKPOINT.exists():
        print(f"Downloading {SAM2_CHECKPOINT_URL} to {SAM2_CHECKPOINT}")
        urllib.request.urlretrieve(SAM2_CHECKPOINT_URL, str(SAM2_CHECKPOINT))
    
    sam2_model = build_sam2(SAM2_CONFIG, str(SAM2_CHECKPOINT), device=DEVICE)
    mask_generator = SAM2AutomaticMaskGenerator(
        model=sam2_model,
        points_per_side=8,
        pred_iou_thresh=0.86,
        stability_score_thresh=0.92,
        min_mask_region_area=500,
    )

    siglip_model, siglip_preprocess = open_clip.create_model_from_pretrained(
        "hf-hub:timm/ViT-B-16-SigLIP2-256"
    )
    siglip_model = siglip_model.to(DEVICE).eval()
    siglip_tokenizer = open_clip.get_tokenizer("hf-hub:timm/ViT-B-16-SigLIP2-256")
    
    with torch.no_grad():
        probe = siglip_tokenizer(["probe"]).to(DEVICE)
        SIGLIP_DIM = siglip_model.encode_text(probe).shape[-1]
    
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
