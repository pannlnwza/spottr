import numpy as np
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
import io
from app.services.ml_engine import global_index, encode_text_siglip
from app.services import ml_engine

router = APIRouter()

@router.get("/search")
async def search_video(q: str = Query(..., description="The search query"), top_k: int = Query(5, description="Number of results")):
    if global_index.index is None or global_index.index.shape[0] == 0:
        return {"error": "No indexed video found. Please upload a video first."}
    
    text_emb = encode_text_siglip(q)
    sims = global_index.index @ text_emb
    
    num_frames = len(global_index.frames_cache)
    best_score = np.full(num_frames, -np.inf, dtype=np.float32)
    best_region = np.full(num_frames, -1, dtype=np.int64)
    
    # Feature matrix for the MLP (9 features)
    # [whole, best, mean_top3, std_r, num_r, best_area, best_iou, diff, max_score]
    feats = np.zeros((num_frames, 9), dtype=np.float32)
    
    for frame_idx in range(num_frames):
        idxs = np.where(global_index.region_to_frame == frame_idx)[0]
        if len(idxs) == 0:
            continue
            
        rs = sims[idxs]
        
        # In video_processor.py, the last region per frame is the whole frame
        whole = float(rs[-1])
        
        # Local regions (excluding the whole frame)
        local_rs = rs[:-1]
        
        if len(local_rs) > 0:
            best_local_idx = int(local_rs.argmax())
            best = float(local_rs[best_local_idx])
            mean_top3 = float(np.sort(local_rs)[-3:].mean())
            std_r = float(local_rs.std()) if len(local_rs) > 1 else 0.0
            num_r = int(len(local_rs))
            
            # Approximate best_area from bounding box
            x, y, w, h = global_index.region_boxes[idxs[best_local_idx]]
            img = global_index.frames_cache[frame_idx]
            
            # If region_areas and region_ious are in global_index (after re-upload)
            if hasattr(global_index, "region_areas") and global_index.region_areas is not None:
                best_area = float(global_index.region_areas[idxs[best_local_idx]])
                best_iou = float(global_index.region_ious[idxs[best_local_idx]])
            else:
                # Fallback for already indexed video: w*h ratio and mock IOU
                best_area = float((w * h) / (img.width * img.height))
                best_iou = 0.95 # SAM2 predicted_iou is typically 0.9+, passing 0.0 breaks the scaler
            
            best_score[frame_idx] = max(best, whole)
            best_region[frame_idx] = idxs[best_local_idx] if best >= whole else idxs[-1]
        else:
            best, mean_top3, std_r, num_r, best_area, best_iou = whole, whole, 0.0, 0, 0.0, 0.0
            best_score[frame_idx] = whole
            best_region[frame_idx] = idxs[-1]
            
        feats[frame_idx] = [whole, best, mean_top3, std_r, num_r, best_area, best_iou, best - whole, max(best, whole)]
        
    if ml_engine.mlp_model is not None and ml_engine.mlp_scaler is not None:
        feats_scaled = ml_engine.mlp_scaler.transform(feats)
        probs = ml_engine.mlp_model.predict_proba(feats_scaled)[:, 1]
        order = np.argsort(-probs)[:top_k]
        scores_to_return = probs
    else:
        order = np.argsort(-best_score)[:top_k]
        scores_to_return = best_score
    
    results = []
    for i in order:
        frame_idx = int(i)
        if best_score[frame_idx] == -np.inf:
            continue
            
        region_idx = int(best_region[frame_idx])
        x, y, w, h = map(int, global_index.region_boxes[region_idx])
        
        results.append({
            "frame_idx": frame_idx,
            "timestamp": float(global_index.timestamps[frame_idx]),
            "score": float(scores_to_return[frame_idx]),
            "box": {"x": x, "y": y, "w": w, "h": h}
        })
        
    return {"query": q, "results": results,
    "scoring_method": "mlp" if ml_engine.mlp_model is not None else "baseline"}

@router.get("/frame/{frame_idx}")
async def get_frame(frame_idx: int):
    if not hasattr(global_index, "frames_cache") or global_index.frames_cache is None or frame_idx < 0 or frame_idx >= len(global_index.frames_cache):
        raise HTTPException(status_code=404, detail="Frame not found")
        
    img = global_index.frames_cache[frame_idx]
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    return StreamingResponse(img_byte_arr, media_type="image/jpeg")
