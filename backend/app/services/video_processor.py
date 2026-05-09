import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from tqdm import tqdm
from app.services import ml_engine

CROP_PAD_RATIO = 0.25
FRAME_STRIDE_SECONDS = 2.0
MAX_FRAMES = 30

def load_video(path, stride_seconds=1.0, max_frames=30):
    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, int(round(fps * stride_seconds)))

    frames, timestamps = [], []
    for frame_idx in range(0, total, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ok, bgr = cap.read()
        if not ok:
            continue
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        frames.append(Image.fromarray(rgb))
        timestamps.append(frame_idx / fps)
        if len(frames) >= max_frames:
            break
    cap.release()
    return frames, timestamps, fps

def crops_and_boxes_from_masks(pil_image, masks, pad_ratio=CROP_PAD_RATIO, min_side=10):
    arr = np.array(pil_image)
    H, W = arr.shape[:2]
    crops, boxes, areas, ious = [], [], [], []
    for m in masks:
        x, y, w, h = [int(v) for v in m["bbox"]]
        pad_w, pad_h = int(w * pad_ratio), int(h * pad_ratio)
        x1, y1 = max(0, x - pad_w), max(0, y - pad_h)
        x2, y2 = min(W, x + w + pad_w), min(H, y + h + pad_h)
        if x2 - x1 < min_side or y2 - y1 < min_side:
            continue
        crops.append(Image.fromarray(arr[y1:y2, x1:x2]))
        boxes.append((x1, y1, x2 - x1, y2 - y1))
        areas.append(m["area"] / (W * H))
        ious.append(m["predicted_iou"])
        
    crops.append(pil_image)              # whole frame as a region
    boxes.append((0, 0, W, H))
    areas.append(1.0)
    ious.append(1.0)
    return crops, boxes, areas, ious

def process_and_index_video(video_path: Path, progress_callback=None):
    frames, timestamps, fps = load_video(video_path, FRAME_STRIDE_SECONDS, MAX_FRAMES)
    
    all_embeddings = []
    region_to_frame = []
    region_boxes = []
    region_areas = []
    region_ious = []

    total_frames = len(frames)
    print(f"Total frames to process: {total_frames}")
    for f_idx, frame in enumerate(tqdm(frames, desc="Indexing frames")):
        if progress_callback:
            progress_callback(f_idx, total_frames)
            
        masks = ml_engine.mask_generator.generate(np.array(frame))
        crops, boxes, areas, ious = crops_and_boxes_from_masks(frame, masks)
        embs = ml_engine.encode_images_siglip(crops)
        
        all_embeddings.append(embs)
        region_to_frame.extend([f_idx] * embs.shape[0])
        region_boxes.extend(boxes)
        region_areas.extend(areas)
        region_ious.extend(ious)

    if all_embeddings:
        ml_engine.global_index.index = np.vstack(all_embeddings).astype(np.float32)
    else:
        # fallback empty
        ml_engine.global_index.index = np.zeros((0, 768), dtype=np.float32)

    ml_engine.global_index.region_to_frame = np.array(region_to_frame, dtype=np.int64)
    ml_engine.global_index.region_boxes = np.array(region_boxes, dtype=np.int64)
    ml_engine.global_index.region_areas = np.array(region_areas, dtype=np.float32)
    ml_engine.global_index.region_ious = np.array(region_ious, dtype=np.float32)
    ml_engine.global_index.frames_cache = frames
    ml_engine.global_index.timestamps = timestamps
    ml_engine.global_index.fps = fps
    
    if progress_callback:
        progress_callback(total_frames, total_frames)
