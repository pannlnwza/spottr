import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from app.services.video_processor import process_and_index_video

router = APIRouter()

TEMP_DIR = Path("data/temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Global dict to store indexing progress
upload_progress = {
    "status": "idle",
    "progress": 0,
    "total": 0,
    "percent": 0
}

def update_progress(current: int, total: int):
    upload_progress["progress"] = current
    upload_progress["total"] = total
    if total > 0:
        upload_progress["percent"] = int((current / total) * 100)

@router.post("/upload")
def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    upload_progress["status"] = "processing"
    upload_progress["progress"] = 0
    upload_progress["total"] = 0
    upload_progress["percent"] = 0
    
    temp_file_path = TEMP_DIR / file.filename
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process the video directly
    process_and_index_video(temp_file_path, progress_callback=update_progress)
    
    upload_progress["status"] = "idle"
    
    return {
        "message": "Video uploaded and indexed successfully",
        "filename": file.filename
    }

@router.get("/upload/progress")
async def get_progress():
    return upload_progress
