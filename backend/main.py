from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.routes import upload, search
from app.services.ml_engine import init_models
from app.services.ml_engine import mlp_model, mlp_scaler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize ML models on startup
    init_models()
    yield
    # Clean up on shutdown

app = FastAPI(title="Spottrr Backend", description="Open-Vocabulary Video Search API", lifespan=lifespan)

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(search.router, prefix="/api", tags=["search"])

@app.get("/")
def read_root():
    return {"message": "Spottrr API is running."}

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "scoring_head_loaded": mlp_model is not None,
        "scaler_loaded": mlp_scaler is not None
    }

