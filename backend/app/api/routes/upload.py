import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks
from app.services.video_processor import process_and_index_video

router = APIRouter()

TEMP_DIR = Path("data/temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    temp_file_path = TEMP_DIR / file.filename
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process the video directly (can be slow, could use background_tasks.add_task instead)
    # Processing in foreground for prototype so we know when it's done before searching
    process_and_index_video(temp_file_path)
    
    return {
        "message": "Video uploaded and indexed successfully",
        "filename": file.filename
    }
