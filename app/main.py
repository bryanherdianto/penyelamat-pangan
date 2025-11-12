from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import qai_hub_models

app = FastAPI(
    title="QAI Hub Models API",
    description="API for deploying and running Qualcomm AI Hub models",
    version="0.1.0"
)


class ModelRequest(BaseModel):
    model_name: str
    input_data: dict


@app.get("/")
async def root():
    """Root endpoint returning API information"""
    return {
        "message": "QAI Hub Models Deployment API",
        "version": "0.1.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/models")
async def list_models():
    """List available QAI Hub models"""
    try:
        # Get available models from qai_hub_models
        models = dir(qai_hub_models)
        model_list = [m for m in models if not m.startswith('_')]
        return {
            "models": model_list,
            "count": len(model_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict(request: ModelRequest):
    """Run prediction with specified model"""
    try:
        # This is a placeholder - implement your specific model logic
        return {
            "model": request.model_name,
            "status": "prediction completed",
            "result": "Placeholder result"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
