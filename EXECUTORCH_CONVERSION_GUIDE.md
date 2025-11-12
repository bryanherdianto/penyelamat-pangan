# Converting Falcon3-7B to ExecuTorch Format

## Overview

This guide explains how to convert the Falcon3-7B-Instruct model from GGUF format to ExecuTorch's PTE (PyTorch ExecuTorch) format for optimized on-device inference.

## Prerequisites

```bash
pip install torch torchvision executorch
pip install transformers sentencepiece
```

## Step 1: Export Model to ExecuTorch

### Option A: Using HuggingFace Transformers

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from executorch.exir import to_edge

# Load the model
model_name = "tiiuae/falcon-7b-instruct"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,
    device_map="cpu"
)
model.eval()

# Prepare example inputs
tokenizer = AutoTokenizer.from_pretrained(model_name)
example_text = "Hello, how are you?"
inputs = tokenizer(example_text, return_tensors="pt")

# Export to ExecuTorch
with torch.no_grad():
    # Capture the model
    exported_program = torch.export.export(
        model,
        (inputs["input_ids"],)
    )
    
    # Convert to edge
    edge_program = to_edge(exported_program)
    
    # Save as PTE file
    edge_program.to_executorch().save("falcon3_7b_instruct.pte")

print("✓ Model exported to falcon3_7b_instruct.pte")
```

### Option B: Using ExecuTorch LLM Export Tool

```bash
# Clone ExecuTorch repo
git clone https://github.com/pytorch/executorch.git
cd executorch

# Install dependencies
./install_requirements.sh

# Export model
python -m examples.models.llama2.export_llama \
    --checkpoint falcon-7b-instruct.pth \
    --params falcon-7b-params.json \
    --output_name falcon3_7b_instruct.pte
```

## Step 2: Optimize for Qualcomm QNN (Optional)

To run on Qualcomm NPU:

```python
from executorch.backends.qualcomm.partition.qnn_partitioner import QnnPartitioner
from executorch.exir import EdgeCompileConfig

# ... after creating edge_program ...

# Partition for QNN
edge_program_qnn = edge_program.to_backend(QnnPartitioner())

# Save QNN-optimized model
edge_program_qnn.save("falcon3_7b_instruct_qnn.pte")

print("✓ QNN-optimized model saved")
```

## Step 3: Place Model in Correct Directory

```bash
# Windows
move falcon3_7b_instruct.pte app\ai\models\llm\

# Linux/Mac
mv falcon3_7b_instruct.pte app/ai/models/llm/
```

## Step 4: Test the Model

```bash
# Test with example script
python app/ai/scripts/llm/example_usage.py

# Or start the API
python app/ai/scripts/llm/deploy.py
```

## Model Format Comparison

| Format | Size | Speed | Hardware |
|--------|------|-------|----------|
| GGUF (Q4_0) | ~4GB | Fast (CPU) | Any CPU |
| ExecuTorch PTE | ~7GB | Fast (CPU/NPU) | Optimized for mobile |
| ExecuTorch PTE + QNN | ~3.5GB | Very Fast | Qualcomm NPU |

## Quantization Options

### INT8 Quantization

```python
from torch.ao.quantization import quantize_dynamic

# Quantize model
model_quantized = quantize_dynamic(
    model,
    {torch.nn.Linear},
    dtype=torch.qint8
)

# Then export as usual
```

### PTQ (Post-Training Quantization)

```python
from executorch.backends.qualcomm.quantizer import QnnQuantizer

quantizer = QnnQuantizer()
quantizer.quantize(edge_program)
```

## Troubleshooting

### Model Too Large
- Use quantization (INT8 or INT4)
- Split model across multiple devices
- Use smaller model variant

### Export Errors
```bash
# Update dependencies
pip install --upgrade torch executorch transformers

# Clear cache
rm -rf ~/.cache/huggingface
```

### QNN Backend Issues
```bash
# Install Qualcomm QNN SDK
# Set environment variables
export QNN_SDK_ROOT=/path/to/qnn-sdk
export LD_LIBRARY_PATH=$QNN_SDK_ROOT/lib:$LD_LIBRARY_PATH
```

## Alternative: Use Pre-Converted Models

Check if pre-converted ExecuTorch models are available:

```bash
# From ExecuTorch Model Zoo
wget https://pytorch.org/executorch/models/falcon-7b.pte

# From Qualcomm AI Hub
qai-hub-models download falcon-7b-instruct --target-runtime executorch
```

## Current Limitations

1. **Tokenizer Integration**: The current implementation uses a placeholder tokenizer. You need to:
   - Include the actual Falcon tokenizer
   - Handle encoding/decoding properly
   - Manage special tokens

2. **Streaming**: Not yet supported with ExecuTorch
3. **Context Length**: Limited by memory constraints

## Next Steps

1. ✅ Export model to PTE format
2. ✅ Place in `app/ai/models/llm/`
3. ✅ Update tokenizer in `inference.py`
4. ✅ Test with example script
5. ✅ Deploy API server

## Resources

- [ExecuTorch Documentation](https://pytorch.org/executorch/)
- [Qualcomm AI Hub](https://aihub.qualcomm.com/)
- [Model Export Tutorial](https://pytorch.org/executorch/stable/tutorials/export-to-executorch-tutorial.html)
- [QNN Backend Guide](https://pytorch.org/executorch/stable/build-run-qualcomm-ai-engine-direct-backend.html)

## Notes

⚠️ **Important**: The current `inference.py` implementation has placeholder tokenization. For production use, you must:

1. Add proper Falcon3 tokenizer
2. Handle token encoding/decoding
3. Implement proper text generation loop
4. Add temperature and top-p sampling

See `app/ai/scripts/llm/inference.py` comments for TODOs.
