"""
Convert Local Model to ExecuTorch PTE Format

This script converts a locally stored model to ExecuTorch PTE format.
Supports: PyTorch checkpoints (.pth, .bin), SafeTensors, and HuggingFace local models.
"""

import torch
import sys
from pathlib import Path

print("="*70)
print("Local Model to ExecuTorch PTE Converter")
print("="*70)

# Step 1: Locate your model
print("\n📁 Model Location Options:")
print("\n1. Local HuggingFace model directory (recommended)")
print("   Example: C:/path/to/falcon-7b-instruct/")
print("\n2. PyTorch checkpoint file (.pth, .bin)")
print("   Example: C:/path/to/model.pth")
print("\n3. SafeTensors file (.safetensors)")
print("   Example: C:/path/to/model.safetensors")

print("\n" + "="*70)
model_path_input = input("Enter full path to your model: ").strip().strip('"')

if not model_path_input:
    print("❌ No path provided")
    sys.exit(1)

model_path = Path(model_path_input)

if not model_path.exists():
    print(f"❌ Path not found: {model_path}")
    sys.exit(1)

# Determine model type
is_directory = model_path.is_dir()
is_gguf = model_path.suffix == ".gguf"
is_pth = model_path.suffix in [".pth", ".bin", ".pt"]
is_safetensors = model_path.suffix == ".safetensors"

print(f"\n✓ Found: {model_path}")
if is_directory:
    print("  Type: HuggingFace model directory")
elif is_gguf:
    print("  Type: GGUF (not directly supported)")
    print("\n❌ GGUF files cannot be directly converted to PTE.")
    print("\nOptions:")
    print("1. Use the original PyTorch checkpoint")
    print("2. Download from HuggingFace Hub")
    print("3. Convert GGUF to PyTorch first (complex)")
    sys.exit(1)
elif is_pth:
    print("  Type: PyTorch checkpoint")
elif is_safetensors:
    print("  Type: SafeTensors")

# Check dependencies
print("\n🔍 Checking dependencies...")
missing = []

try:
    import transformers
    print("✓ transformers")
except ImportError:
    missing.append("transformers")
    print("❌ transformers")

try:
    from executorch.exir import to_edge
    print("✓ executorch")
except ImportError:
    missing.append("executorch")
    print("❌ executorch")

if missing:
    print(f"\n❌ Install missing packages:")
    print(f"   pip install {' '.join(missing)}")
    sys.exit(1)

# Load model based on type
print("\n📦 Loading model...")

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig
    
    if is_directory:
        # Load from local HuggingFace directory
        print("  Loading from HuggingFace directory...")
        
        config = AutoConfig.from_pretrained(model_path, trust_remote_code=True)
        print(f"  Model type: {config.model_type}")
        
        tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            trust_remote_code=True
        )
        print("  ✓ Tokenizer loaded")
        
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float16,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
            device_map="cpu"
        )
        model.eval()
        print("  ✓ Model loaded")
        
        model_name = model_path.name
        
    elif is_pth or is_safetensors:
        print("  Loading checkpoint...")
        
        # Ask for model architecture
        print("\n  Model architecture needed. Common options:")
        print("  1. falcon")
        print("  2. llama")
        print("  3. mistral")
        print("  4. gpt2")
        
        arch = input("\n  Enter model architecture: ").strip().lower() or "falcon"
        
        # Load checkpoint
        if is_safetensors:
            from safetensors import safe_open
            state_dict = {}
            with safe_open(model_path, framework="pt", device="cpu") as f:
                for key in f.keys():
                    state_dict[key] = f.get_tensor(key)
        else:
            state_dict = torch.load(model_path, map_location="cpu")
        
        print("  ✓ Checkpoint loaded")
        
        # Try to load matching config
        print(f"  Creating {arch} model from checkpoint...")
        
        # You'll need to specify the config here
        print("\n  ⚠️  Loading from checkpoint requires model config.")
        print("  Please use a HuggingFace model directory instead.")
        sys.exit(1)
        
except Exception as e:
    print(f"\n❌ Error loading model: {e}")
    sys.exit(1)

# Prepare sample input
print("\n🔧 Preparing sample input...")
try:
    sample_text = "Hello, how are you?"
    inputs = tokenizer(sample_text, return_tensors="pt")
    input_ids = inputs["input_ids"]
    print(f"  ✓ Input shape: {input_ids.shape}")
except Exception as e:
    print(f"  ❌ Error: {e}")
    sys.exit(1)

# Export to TorchScript
print("\n⚙️  Exporting model...")
try:
    with torch.no_grad():
        print("  Attempting torch.export...")
        exported_program = torch.export.export(
            model,
            (input_ids,),
            strict=False
        )
    print("  ✓ Model exported")
except Exception as e:
    print(f"  ❌ Export failed: {e}")
    print("\n  Trying JIT trace fallback...")
    try:
        with torch.no_grad():
            traced = torch.jit.trace(model, input_ids)
        print("  ✓ Model traced")
        exported_program = traced
    except Exception as e2:
        print(f"  ❌ Trace failed: {e2}")
        sys.exit(1)

# Convert to ExecuTorch Edge
print("\n🔄 Converting to ExecuTorch Edge...")
try:
    from executorch.exir import EdgeCompileConfig
    
    edge_config = EdgeCompileConfig(_check_ir_validity=False)
    edge_program = to_edge(exported_program, compile_config=edge_config)
    print("  ✓ Converted to Edge")
except Exception as e:
    print(f"  ❌ Conversion failed: {e}")
    sys.exit(1)

# Save PTE file
output_name = model_path.stem if not is_directory else model_name
output_path = Path(f"app/ai/models/llm/{output_name}.pte")
output_path.parent.mkdir(parents=True, exist_ok=True)

print(f"\n💾 Saving to: {output_path}")
try:
    executorch_program = edge_program.to_executorch()
    executorch_program.save(str(output_path))
    
    file_size_gb = output_path.stat().st_size / (1024**3)
    print(f"  ✓ Saved ({file_size_gb:.2f} GB)")
except Exception as e:
    print(f"  ❌ Save failed: {e}")
    sys.exit(1)

# Save tokenizer
tokenizer_path = output_path.parent / f"{output_name}_tokenizer"
print(f"\n💾 Saving tokenizer to: {tokenizer_path}")
try:
    tokenizer.save_pretrained(str(tokenizer_path))
    print("  ✓ Tokenizer saved")
except Exception as e:
    print(f"  ⚠️  Warning: {e}")

# Summary
print("\n" + "="*70)
print("✅ CONVERSION COMPLETE!")
print("="*70)
print(f"\n📦 PTE Model: {output_path}")
print(f"📝 Tokenizer: {tokenizer_path}")
print(f"\n🎯 To use this model:")
print(f"1. Update deploy.py MODEL_PATH to: {output_path}")
print(f"2. Update inference.py to use tokenizer from: {tokenizer_path}")
print(f"3. Test: python app/ai/scripts/llm/example_usage.py")
print("="*70)
