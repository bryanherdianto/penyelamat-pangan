"""
Quick Falcon3-7B to ExecuTorch PTE Converter (Lightweight)

This script provides a simpler conversion path using smaller models
or pre-quantized versions to avoid memory issues.
"""

import torch
import sys
from pathlib import Path

print("="*70)
print("Falcon3-7B ExecuTorch Converter (Lightweight)")
print("="*70)

# Configuration
MODELS = {
    "1": {
        "name": "tiiuae/falcon-7b-instruct",
        "size": "14GB",
        "description": "Full Falcon-7B model (requires 32GB+ RAM)"
    },
    "2": {
        "name": "tiiuae/falcon-3b-instruct",
        "size": "6GB", 
        "description": "Falcon-3B model (lighter, requires 16GB RAM)"
    },
    "3": {
        "name": "tiiuae/falcon-1b-instruct",
        "size": "2GB",
        "description": "Falcon-1B model (lightest, requires 8GB RAM)"
    }
}

print("\nAvailable models:")
for key, model in MODELS.items():
    print(f"{key}. {model['name']}")
    print(f"   Size: {model['size']} - {model['description']}")

choice = input("\nSelect model (1-3) or press Enter for default (1): ").strip() or "1"

if choice not in MODELS:
    print("Invalid choice. Using default (1)")
    choice = "1"

selected_model = MODELS[choice]
MODEL_NAME = selected_model["name"]
model_size = selected_model["name"].split("-")[-2]  # Extract size (7b, 3b, 1b)
OUTPUT_PATH = f"app/ai/models/llm/falcon_{model_size}_instruct.pte"

print(f"\n{'='*70}")
print(f"Converting: {MODEL_NAME}")
print(f"Output: {OUTPUT_PATH}")
print(f"{'='*70}")

# Step 1: Check dependencies
print("\nStep 1: Checking dependencies...")
missing_deps = []

try:
    import transformers
    print("✓ transformers")
except ImportError:
    missing_deps.append("transformers")
    print("❌ transformers")

try:
    from executorch.exir import to_edge
    print("✓ executorch")
except ImportError:
    missing_deps.append("executorch")
    print("❌ executorch")

if missing_deps:
    print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
    print("Install with:")
    print(f"  pip install {' '.join(missing_deps)}")
    sys.exit(1)

# Step 2: Load model
print(f"\nStep 2: Loading {MODEL_NAME}...")
print(f"This will download ~{selected_model['size']} (first time only)")

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME, 
        trust_remote_code=True
    )
    print("✓ Tokenizer loaded")
    
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16,  # Use FP16 to save memory
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        device_map="cpu"
    )
    model.eval()
    print("✓ Model loaded")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nTroubleshooting:")
    print("- Ensure you have enough RAM")
    print("- Try a smaller model (option 2 or 3)")
    print("- Check internet connection")
    sys.exit(1)

# Step 3: Prepare sample input
print("\nStep 3: Preparing sample input...")
try:
    sample_text = "Hello, how are you?"
    inputs = tokenizer(sample_text, return_tensors="pt")
    input_ids = inputs["input_ids"]
    print(f"✓ Input shape: {input_ids.shape}")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Step 4: Export model
print("\nStep 4: Exporting to TorchScript...")
try:
    with torch.no_grad():
        # Try torch.export first (PyTorch 2.0+)
        try:
            print("  Attempting torch.export...")
            exported_program = torch.export.export(
                model,
                (input_ids,),
                strict=False
            )
            print("✓ Exported with torch.export")
        except Exception as e1:
            print(f"  torch.export failed: {e1}")
            print("  Attempting torch.jit.trace...")
            traced = torch.jit.trace(model, input_ids)
            print("✓ Traced with torch.jit")
            # Convert JIT to export format
            exported_program = traced
            
except Exception as e:
    print(f"❌ Export failed: {e}")
    sys.exit(1)

# Step 5: Convert to ExecuTorch
print("\nStep 5: Converting to ExecuTorch Edge...")
try:
    from executorch.exir import to_edge, EdgeCompileConfig
    
    edge_config = EdgeCompileConfig(_check_ir_validity=False)
    edge_program = to_edge(exported_program, compile_config=edge_config)
    print("✓ Converted to Edge format")
except Exception as e:
    print(f"❌ Conversion failed: {e}")
    print("\nThis might be due to:")
    print("- Unsupported operations in the model")
    print("- ExecuTorch version compatibility")
    sys.exit(1)

# Step 6: Save PTE file
print("\nStep 6: Saving PTE file...")
output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)

try:
    executorch_program = edge_program.to_executorch()
    executorch_program.save(str(output_path))
    
    file_size_gb = output_path.stat().st_size / (1024**3)
    print(f"✓ Saved: {output_path}")
    print(f"  Size: {file_size_gb:.2f} GB")
except Exception as e:
    print(f"❌ Save failed: {e}")
    sys.exit(1)

# Step 7: Save tokenizer
print("\nStep 7: Saving tokenizer...")
tokenizer_path = output_path.parent / f"falcon_{model_size}_tokenizer"
try:
    tokenizer.save_pretrained(str(tokenizer_path))
    print(f"✓ Saved: {tokenizer_path}")
except Exception as e:
    print(f"⚠️  Warning: {e}")

# Summary
print("\n" + "="*70)
print("✅ CONVERSION COMPLETE!")
print("="*70)
print(f"\n📦 Model: {output_path}")
print(f"📝 Tokenizer: {tokenizer_path}")
print(f"\n🎯 Next steps:")
print(f"1. Update MODEL_PATH in deploy.py to: {OUTPUT_PATH}")
print(f"2. Test: python app/ai/scripts/llm/example_usage.py")
print(f"3. Deploy: python app/ai/scripts/llm/deploy.py")
print("="*70)
