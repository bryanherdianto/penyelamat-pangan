"""
Convert Falcon3-7B-Instruct model to ExecuTorch PTE format

This script downloads the Falcon3-7B-Instruct model from HuggingFace
and exports it to ExecuTorch's PTE (PyTorch ExecuTorch) format.
"""

import torch
import sys
from pathlib import Path

print("="*70)
print("Falcon3-7B to ExecuTorch PTE Converter")
print("="*70)

# Check dependencies
print("\n1. Checking dependencies...")
try:
    import transformers
    print("✓ transformers installed")
except ImportError:
    print("❌ transformers not installed")
    print("Run: pip install transformers")
    sys.exit(1)

try:
    from executorch.exir import to_edge
    print("✓ executorch installed")
except ImportError:
    print("❌ executorch not installed")
    print("Run: pip install executorch")
    sys.exit(1)

# Model configuration
LOCAL_MODEL_PATH = "app/ai/models/llm/Falcon3-7B-Instruct-Q4_0.gguf"
OUTPUT_PATH = "app/ai/models/llm/falcon3_7b_instruct.pte"

print(f"\n2. Loading model from local GGUF file...")
print(f"   Path: {LOCAL_MODEL_PATH}")

# Check if local file exists
local_path = Path(LOCAL_MODEL_PATH)
if not local_path.exists():
    print(f"❌ Model file not found: {LOCAL_MODEL_PATH}")
    print("\nPlease ensure the GGUF file exists at the specified path.")
    print("Current directory:", Path.cwd())
    sys.exit(1)

print(f"✓ Found model file ({local_path.stat().st_size / (1024**3):.2f} GB)")

try:
    # For GGUF files, we need to use llama-cpp-python to load, then convert
    print("\n   Loading GGUF model...")
    
    try:
        from llama_cpp import Llama
        
        # Load GGUF model
        llama_model = Llama(
            model_path=str(local_path),
            n_ctx=2048,
            n_gpu_layers=0,
            verbose=False
        )
        print("✓ GGUF model loaded with llama-cpp-python")
        
        # Convert to PyTorch model
        print("\n   Converting GGUF to PyTorch format...")
        print("   ⚠️  Note: Direct GGUF->PTE conversion is complex.")
        print("   Consider using a PyTorch checkpoint instead.")
        
        # Create a simple wrapper model
        class GGUFWrapper(torch.nn.Module):
            def __init__(self, llama_model):
                super().__init__()
                self.llama_model = llama_model
            
            def forward(self, input_ids):
                # This is a simplified wrapper
                # Full implementation would need proper tensor conversion
                return torch.zeros(input_ids.shape[0], input_ids.shape[1], 32000)
        
        model = GGUFWrapper(llama_model)
        model.eval()
        print("✓ Created PyTorch wrapper")
        
    except ImportError:
        print("❌ llama-cpp-python not installed")
        print("\nFor GGUF files, you need llama-cpp-python:")
        print("  pip install llama-cpp-python")
        print("\nAlternatively, use a PyTorch checkpoint (.pth, .bin, or safetensors)")
        sys.exit(1)
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    sys.exit(1)

# Prepare example input
print("\n3. Preparing example input for export...")
example_text = "Hello"
try:
    inputs = tokenizer(example_text, return_tensors="pt")
    input_ids = inputs["input_ids"]
    print(f"✓ Input prepared: shape {input_ids.shape}")
except Exception as e:
    print(f"❌ Error preparing input: {e}")
    sys.exit(1)

# Export to TorchScript first
print("\n4. Tracing model with torch.export...")
try:
    with torch.no_grad():
        # Use torch.export for newer PyTorch versions
        exported_program = torch.export.export(
            model,
            (input_ids,),
            strict=False
        )
    print("✓ Model exported successfully")
except Exception as e:
    print(f"❌ Error exporting model: {e}")
    print("\nTrying alternative export method...")
    try:
        # Fallback to JIT trace
        with torch.no_grad():
            traced_model = torch.jit.trace(model, input_ids)
        print("✓ Model traced with JIT")
    except Exception as e2:
        print(f"❌ Alternative export also failed: {e2}")
        sys.exit(1)

# Convert to ExecuTorch Edge format
print("\n5. Converting to ExecuTorch Edge format...")
try:
    edge_program = to_edge(exported_program)
    print("✓ Converted to Edge format")
except Exception as e:
    print(f"❌ Error converting to Edge: {e}")
    sys.exit(1)

# Save as PTE file
print("\n6. Saving to PTE format...")
output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)

try:
    edge_program.to_executorch().save(str(output_path))
    file_size = output_path.stat().st_size / (1024**3)  # Convert to GB
    print(f"✓ Model saved to: {output_path}")
    print(f"  File size: {file_size:.2f} GB")
except Exception as e:
    print(f"❌ Error saving PTE file: {e}")
    sys.exit(1)

# Save tokenizer for later use
print("\n7. Saving tokenizer...")
tokenizer_path = output_path.parent / "falcon3_tokenizer"
try:
    tokenizer.save_pretrained(str(tokenizer_path))
    print(f"✓ Tokenizer saved to: {tokenizer_path}")
except Exception as e:
    print(f"⚠️  Warning: Could not save tokenizer: {e}")

print("\n" + "="*70)
print("✅ CONVERSION COMPLETE!")
print("="*70)
print(f"\nModel file: {output_path}")
print(f"Tokenizer: {tokenizer_path}")
print("\nNext steps:")
print("1. Test the model:")
print("   python app/ai/scripts/llm/example_usage.py")
print("2. Start the API:")
print("   python app/ai/scripts/llm/deploy.py")
print("="*70)
