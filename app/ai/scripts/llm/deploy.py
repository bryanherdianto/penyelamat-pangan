"""
Falcon3-7B-Instruct LLM Backend API

A simple backend API service that loads the Falcon3-7B-Instruct model
and waits for text generation requests.

Endpoints:
  - GET  /health      : Health check
  - POST /generate    : Generate text from prompt
  - POST /chat        : Chat completion
  - POST /instruct    : Instruction following
  - GET  /model/info  : Get model information
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from pathlib import Path
import uvicorn

# Import inference utilities
from inference import Falcon3LLMInference, format_response_text

# Initialize FastAPI app
app = FastAPI(
    title="Falcon3-7B LLM Backend",
    description="Falcon3-7B-Instruct text generation API",
    version="1.0.0"
)

# Global model instance
model = None
MODEL_PATH = "app/ai/models/llm/falcon3_7b_instruct.pte"


class GenerateRequest(BaseModel):
    """Text generation request"""
    prompt: str = Field(..., description="Input text prompt")
    max_tokens: int = Field(512, description="Maximum tokens to generate", ge=1, le=2048)
    temperature: float = Field(0.7, description="Sampling temperature", ge=0.0, le=2.0)
    top_p: float = Field(0.95, description="Nucleus sampling parameter", ge=0.0, le=1.0)
    stop: Optional[List[str]] = Field(None, description="Stop sequences")


class ChatMessage(BaseModel):
    """Chat message"""
    role: str = Field(..., description="Message role (user/assistant/system)")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat completion request"""
    messages: List[ChatMessage] = Field(..., description="Conversation messages")
    max_tokens: int = Field(512, description="Maximum tokens to generate", ge=1, le=2048)
    temperature: float = Field(0.7, description="Sampling temperature", ge=0.0, le=2.0)
    top_p: float = Field(0.95, description="Nucleus sampling parameter", ge=0.0, le=1.0)


class InstructRequest(BaseModel):
    """Instruction following request"""
    instruction: str = Field(..., description="The instruction to follow")
    context: Optional[str] = Field(None, description="Optional context for the instruction")
    max_tokens: int = Field(512, description="Maximum tokens to generate", ge=1, le=2048)
    temperature: float = Field(0.7, description="Sampling temperature", ge=0.0, le=2.0)


class GenerateResponse(BaseModel):
    """Generation result"""
    generated_text: str
    tokens_prompt: int
    tokens_generated: int
    total_tokens: int
    finish_reason: str
    status: str


class ChatResponse(BaseModel):
    """Chat completion result"""
    message: str
    role: str
    tokens_prompt: int
    tokens_generated: int
    total_tokens: int
    finish_reason: str
    status: str


@app.on_event("startup")
async def load_model():
    """Load the GGUF model on startup"""
    global model
    
    model_path = Path(MODEL_PATH)
    if not model_path.exists():
        print(f"⚠️  Warning: Model not found at {model_path}")
        print("    Run 'python app/ai/scripts/llm/fetch-model.py' to download the model")
        return
    
    try:
        print(f"🔄 Loading Falcon3-7B model from {model_path}...")
        # Initialize model with ExecuTorch (set use_qnn=True for Qualcomm NPU)
        model = Falcon3LLMInference(str(model_path), use_qnn=True, verbose=True)
        print("✓ Model loaded and ready for inference!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Falcon3-7B LLM Backend",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "generate": "/generate",
            "chat": "/chat",
            "instruct": "/instruct",
            "model_info": "/model/info"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    model_loaded = model is not None
    return {
        "status": "healthy" if model_loaded else "model_not_loaded",
        "model_loaded": model_loaded
    }


@app.get("/model/info")
async def model_info():
    """Get model information"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_path": MODEL_PATH,
        "model_name": "Falcon3-7B-Instruct",
        "backend": "ExecuTorch",
        "format": "PTE",
        "context_length": 4096,
        "parameters": "7B",
        "capabilities": ["text_generation", "chat", "instruction_following"]
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """
    Generate text completion from prompt
    
    Args:
        request: Generation request with prompt and parameters
    
    Returns:
        Generated text with metadata
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs."
        )
    
    try:
        # Run generation
        result = model.generate(
            prompt=request.prompt,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            stop=request.stop
        )
        
        return GenerateResponse(
            generated_text=result["generated_text"],
            tokens_prompt=result["tokens_prompt"],
            tokens_generated=result["tokens_generated"],
            total_tokens=result["total_tokens"],
            finish_reason=result["finish_reason"],
            status="success"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation error: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat completion with message history
    
    Args:
        request: Chat request with message history
    
    Returns:
        Assistant response with metadata
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs."
        )
    
    try:
        # Convert to dict format for llama-cpp-python
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Run chat completion
        result = model.chat(
            messages=messages,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p
        )
        
        return ChatResponse(
            message=result["message"],
            role=result["role"],
            tokens_prompt=result["tokens_prompt"],
            tokens_generated=result["tokens_generated"],
            total_tokens=result["total_tokens"],
            finish_reason=result["finish_reason"],
            status="success"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/instruct", response_model=GenerateResponse)
async def instruct(request: InstructRequest):
    """
    Instruction following completion
    
    Args:
        request: Instruction request with instruction and optional context
    
    Returns:
        Generated response with metadata
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please check server logs."
        )
    
    try:
        # Run instruction following
        result = model.instruct(
            instruction=request.instruction,
            context=request.context,
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return GenerateResponse(
            generated_text=result["generated_text"],
            tokens_prompt=result["tokens_prompt"],
            tokens_generated=result["tokens_generated"],
            total_tokens=result["total_tokens"],
            finish_reason=result["finish_reason"],
            status="success"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Instruction error: {str(e)}")


def start_server(host: str = "0.0.0.0", port: int = 8001):
    """Start the API server"""
    print(f"\n{'='*70}")
    print("🚀 Starting Falcon3-7B LLM Backend")
    print(f"{'='*70}\n")
    
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    start_server()
