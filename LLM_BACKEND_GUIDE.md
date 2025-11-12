# Falcon3-7B-Instruct LLM Backend

## Overview

This deployment provides a backend API for the Falcon3-7B-Instruct language model. The model is a 7-billion parameter instruction-tuned model optimized for conversational AI and text generation tasks.

## Key Features

### ✅ GGUF Format with llama.cpp
- Uses quantized Q4_0 format for efficient CPU inference
- ~4GB model size (vs ~14GB for full precision)
- CPU-optimized with optional GPU offloading

### ✅ Multiple Generation Modes
- **Text Generation**: Complete prompts with generated text
- **Chat Completion**: Multi-turn conversations with message history
- **Instruction Following**: Execute specific instructions with optional context

### ✅ FastAPI Backend
- RESTful API endpoints
- Automatic input validation
- Comprehensive error handling

## Files Structure

```
app/ai/scripts/llm/
├── deploy.py           # FastAPI backend server
├── inference.py        # Core inference module
├── example_usage.py    # Direct inference examples
├── test-model.py       # API test script
└── fetch-model.py      # Model download script

app/ai/models/llm/
└── Falcon3-7B-Instruct-Q4_0.gguf  # Downloaded model
```

## Installation

### Dependencies

```bash
pip install llama-cpp-python fastapi uvicorn requests
```

Or if you have CUDA/GPU support:

```bash
CMAKE_ARGS="-DLLAMA_CUBLAS=on" pip install llama-cpp-python
```

### Download Model

```bash
python app/ai/scripts/llm/fetch-model.py
```

This will download the Falcon3-7B-Instruct-Q4_0.gguf model (~4GB) to `app/ai/models/llm/`.

## Usage

### 1. Start the API Server

```bash
python app/ai/scripts/llm/deploy.py
```

The server will:
- Load the GGUF model (takes 10-30 seconds first time)
- Start listening on `http://localhost:8001`

**Note:** Port 8001 is used to avoid conflicts with the LSTM API on port 8000.

### 2. Test the API

In a new terminal:

```bash
python app/ai/scripts/llm/test-model.py
```

This runs a comprehensive test suite including:
- Health checks
- Text generation
- Chat completion
- Instruction following
- Error handling validation

### 3. Direct Inference (Without API)

```bash
python app/ai/scripts/llm/example_usage.py
```

This demonstrates:
- Simple text generation
- Instruction following
- Multi-turn conversations
- Temperature comparison

## API Endpoints

### POST /generate

Generate text completion from a prompt.

**Request:**
```json
{
  "prompt": "What is the capital of France?",
  "max_tokens": 100,
  "temperature": 0.7,
  "top_p": 0.95,
  "stop": ["</s>"]
}
```

**Response:**
```json
{
  "generated_text": "The capital of France is Paris.",
  "tokens_prompt": 8,
  "tokens_generated": 7,
  "total_tokens": 15,
  "finish_reason": "stop",
  "status": "success"
}
```

### POST /chat

Chat completion with message history.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Tell me a fun fact about space"}
  ],
  "max_tokens": 150,
  "temperature": 0.8,
  "top_p": 0.95
}
```

**Response:**
```json
{
  "message": "Did you know that...",
  "role": "assistant",
  "tokens_prompt": 12,
  "tokens_generated": 45,
  "total_tokens": 57,
  "finish_reason": "stop",
  "status": "success"
}
```

### POST /instruct

Instruction following with optional context.

**Request:**
```json
{
  "instruction": "What is the main topic discussed?",
  "context": "Machine learning is a subset of artificial intelligence...",
  "max_tokens": 50,
  "temperature": 0.5
}
```

**Response:**
```json
{
  "generated_text": "The main topic is machine learning...",
  "tokens_prompt": 25,
  "tokens_generated": 12,
  "total_tokens": 37,
  "finish_reason": "stop",
  "status": "success"
}
```

### GET /health

Check if model is loaded and ready.

### GET /model/info

Get model configuration details.

## Model Configuration

### Falcon3-7B-Instruct
- **Parameters**: 7 billion
- **Quantization**: Q4_0 (4-bit)
- **File Size**: ~4GB
- **Context Length**: 4096 tokens
- **Format**: GGUF (llama.cpp)

### Generation Parameters
- **max_tokens**: Maximum tokens to generate (1-2048)
- **temperature**: Sampling temperature (0.0-2.0)
  - 0.0-0.3: More focused and deterministic
  - 0.7-0.9: Balanced creativity
  - 1.0+: More creative and random
- **top_p**: Nucleus sampling (0.0-1.0)
  - Default: 0.95

## Performance

### CPU Inference
- **Model Load Time**: 10-30 seconds (first time)
- **Generation Speed**: ~5-15 tokens/second (depends on CPU)
- **Memory Usage**: ~5-6GB RAM

### GPU Acceleration (Optional)
To enable GPU acceleration, modify `deploy.py`:

```python
model = Falcon3LLMInference(
    str(model_path), 
    n_gpu_layers=32,  # Offload layers to GPU
    verbose=False
)
```

## Use Cases

### 1. Conversational AI
```python
from inference import Falcon3LLMInference

llm = Falcon3LLMInference("path/to/model.gguf")

result = llm.chat([
    {"role": "user", "content": "Hello! How are you?"}
])
print(result["message"])
```

### 2. Text Completion
```python
result = llm.generate("The future of AI is", max_tokens=100)
print(result["generated_text"])
```

### 3. Instruction Following
```python
result = llm.instruct("Summarize this text in 2 sentences", 
                      context="Long article text here...")
print(result["generated_text"])
```

### 4. Code Generation
```python
result = llm.generate("Write a Python function to calculate factorial:")
print(result["generated_text"])
```

## Troubleshooting

### Model Not Found
```bash
python app/ai/scripts/llm/fetch-model.py
```

### Slow Generation
- First generation is slower (model loading)
- Subsequent generations are faster
- Consider GPU acceleration for better performance

### Out of Memory
- Reduce `n_ctx` (context length) in `Falcon3LLMInference`
- Close other applications
- Use a machine with more RAM

### Import Errors
```bash
pip install llama-cpp-python fastapi uvicorn
```

## Comparison with LSTM API

| Feature | LSTM API | LLM API |
|---------|----------|---------|
| Port | 8000 | 8001 |
| Task | Food freshness prediction | Text generation |
| Input | Sensor sequences | Text prompts |
| Output | Classification + RSL | Generated text |
| Model Size | ~5MB | ~4GB |
| Speed | ~1ms | ~1-2s |

## Development

### Run API Server
```bash
python app/ai/scripts/llm/deploy.py
```

### Run Tests
```bash
python app/ai/scripts/llm/test-model.py
```

### Direct Inference
```bash
python app/ai/scripts/llm/example_usage.py
```

### Custom Integration
```python
from app.ai.scripts.llm.inference import Falcon3LLMInference

# Initialize
llm = Falcon3LLMInference("app/ai/models/llm/Falcon3-7B-Instruct-Q4_0.gguf")

# Generate
result = llm.generate("Your prompt here", max_tokens=200)
print(result["generated_text"])
```

## References

- Model: Falcon3-7B-Instruct by Technology Innovation Institute
- Quantization: bartowski/Falcon3-7B-Instruct-GGUF
- Backend: llama-cpp-python
- Framework: FastAPI

## License

Model license follows Falcon-3 license terms from Technology Innovation Institute.
