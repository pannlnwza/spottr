import numpy as np
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
import io
from app.services.ml_engine import global_index, encode_text_siglip

router = APIRouter()

@router.get("/search")
async def search_video(q: str = Query(..., description="The search query"), top_k: int = Query(5, description="Number of results")):
    if global_index.index is None or global_index.index.shape[0] == 0:
        return {"error": "No indexed video found. Please upload a video first."}
    
    text_emb = encode_text_siglip(q)
    sims = global_index.index @ text_emb
    
    best_score = np.full(len(global_index.frames_cache), -np.inf, dtype=np.float32)
    best_region = np.full(len(global_index.frames_cache), -1, dtype=np.int64)
    
    for region_idx, frame_idx in enumerate(global_index.region_to_frame):
        if sims[region_idx] > best_score[frame_idx]:
            best_score[frame_idx] = sims[region_idx]
            best_region[frame_idx] = region_idx
            
    order = np.argsort(-best_score)[:top_k]
    
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
            "score": float(best_score[frame_idx]),
            "box": {"x": x, "y": y, "w": w, "h": h}
        })
        
    return {"query": q, "results": results}

@router.get("/frame/{frame_idx}")
async def get_frame(frame_idx: int):
    if not hasattr(global_index, "frames_cache") or global_index.frames_cache is None or frame_idx < 0 or frame_idx >= len(global_index.frames_cache):
        raise HTTPException(status_code=404, detail="Frame not found")
        
    img = global_index.frames_cache[frame_idx]
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    return StreamingResponse(img_byte_arr, media_type="image/jpeg")
