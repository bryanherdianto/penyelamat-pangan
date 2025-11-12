"""
Convert Falcon3-1B-Instruct to ExecuTorch PTE Format

This script downloads and converts the Falcon3-1B-Instruct model
from HuggingFace to ExecuTorch PTE format.

Model: tiiuae/Falcon3-1B-Instruct (3.35 GB)
"""

import torch
import sys
from pathlib import Path

print("="*70)
print("Falcon3-1B-Instruct → ExecuTorch PTE Converter")
print("="*70)
print("\nModel: tiiuae/Falcon3-1B-Instruct")
print("Size: 3.35 GB")
print("Format: SafeTensors → PTE")

# Configuration
MODEL_NAME = "tiiuae/Falcon3-1B-Instruct"
OUTPUT_PATH = "app/ai/models/llm/falcon3_1b_instruct.pte"
TOKENIZER_PATH = "app/ai/models/llm/falcon3_1b_tokenizer"

# Step 1: Check dependencies
print("\n" + "="*70)
print("Step 1: Checking Dependencies")
print("="*70)

missing = []

try:
    import transformers
    print("✓ transformers installed")
except ImportError:
    missing.append("transformers")
    print("❌ transformers - pip install transformers")

try:
    from executorch.exir import to_edge
    print("✓ executorch installed")
except ImportError:
    missing.append("executorch")
    print("❌ executorch - pip install executorch")

if missing:
    print(f"\n❌ Missing packages. Install with:")
    print(f"   pip install {' '.join(missing)}")
    sys.exit(1)

# Step 2: Download/Load model
print("\n" + "="*70)
print("Step 2: Loading Falcon3-1B-Instruct")
print("="*70)
print("This will download ~3.35 GB on first run (cached after)")

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    
    print("\n📥 Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True
    )
    print("✓ Tokenizer loaded")
    
    print("\n📥 Loading model (may take 2-5 minutes)...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float32,  # FP32 for better compatibility
        trust_remote_code=True,
        low_cpu_mem_usage=True,
        device_map="cpu"
    )
    model.eval()
    print("✓ Model loaded successfully")
    
    # Print model info
    param_count = sum(p.numel() for p in model.parameters())
    print(f"\n   Parameters: {param_count:,} (~{param_count/1e9:.2f}B)")
    
except Exception as e:
    print(f"\n❌ Error loading model: {e}")
    print("\nTroubleshooting:")
    print("- Check internet connection")
    print("- Ensure you have ~8 GB free RAM")
    print("- Try: pip install --upgrade transformers")
    sys.exit(1)

# Step 3: Prepare sample input
print("\n" + "="*70)
print("Step 3: Preparing Sample Input")
print("="*70)

try:
    sample_text = "Hello, how are you today?"
    inputs = tokenizer(sample_text, return_tensors="pt")
    input_ids = inputs["input_ids"]
    
    print(f"✓ Sample input prepared")
    print(f"   Text: '{sample_text}'")
    print(f"   Token IDs shape: {input_ids.shape}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Step 4: Export model
print("\n" + "="*70)
print("Step 4: Exporting to TorchScript")
print("="*70)

try:
    with torch.no_grad():
        print("📤 Exporting with torch.export...")
        
        try:
            # PyTorch 2.0+ export
            exported_program = torch.export.export(
                model,
                (input_ids,),
                strict=False
            )
            print("✓ Exported with torch.export")
            
        except Exception as e1:
            print(f"⚠️  torch.export failed: {e1}")
            print("📤 Trying torch.jit.trace...")
            
            traced_model = torch.jit.trace(model, input_ids)
            print("✓ Traced with torch.jit")
            
            # For JIT models, we need to wrap them
            class JITWrapper:
                def __init__(self, jit_model):
                    self.jit_model = jit_model
            
            exported_program = traced_model
            
except Exception as e:
    print(f"❌ Export failed: {e}")
    sys.exit(1)

# Step 5: Convert to ExecuTorch Edge
print("\n" + "="*70)
print("Step 5: Converting to ExecuTorch Edge Format")
print("="*70)

try:
    from executorch.exir import EdgeCompileConfig
    
    print("🔄 Converting to Edge...")
    edge_config = EdgeCompileConfig(_check_ir_validity=False)
    edge_program = to_edge(exported_program, compile_config=edge_config)
    print("✓ Converted to ExecuTorch Edge format")
    
except Exception as e:
    print(f"❌ Conversion failed: {e}")
    print("\nThis might be due to:")
    print("- Unsupported operations in model")
    print("- ExecuTorch version incompatibility")
    print("- Try: pip install --upgrade executorch torch")
    sys.exit(1)

# Step 6: Save PTE file
print("\n" + "="*70)
print("Step 6: Saving PTE File")
print("="*70)

output_path = Path(OUTPUT_PATH)
output_path.parent.mkdir(parents=True, exist_ok=True)

try:
    print(f"💾 Saving to: {output_path}")
    executorch_program = edge_program.to_executorch()
    executorch_program.save(str(output_path))
    
    file_size_gb = output_path.stat().st_size / (1024**3)
    print(f"✓ PTE file saved")
    print(f"   Size: {file_size_gb:.2f} GB")
    print(f"   Path: {output_path}")
    
except Exception as e:
    print(f"❌ Save failed: {e}")
    sys.exit(1)

# Step 7: Save tokenizer
print("\n" + "="*70)
print("Step 7: Saving Tokenizer")
print("="*70)

tokenizer_path = Path(TOKENIZER_PATH)
try:
    print(f"💾 Saving to: {tokenizer_path}")
    tokenizer.save_pretrained(str(tokenizer_path))
    print(f"✓ Tokenizer saved")
    
except Exception as e:
    print(f"⚠️  Warning: Could not save tokenizer: {e}")

# Final summary
print("\n" + "="*70)
print("✅ CONVERSION COMPLETE!")
print("="*70)

print(f"""
📦 Model Information:
   Name: Falcon3-1B-Instruct
   Original: tiiuae/Falcon3-1B-Instruct
   Format: ExecuTorch PTE

📂 Output Files:
   PTE Model: {output_path}
   Tokenizer: {tokenizer_path}

🎯 Next Steps:

1. Update your deploy.py:
   MODEL_PATH = "{OUTPUT_PATH}"

2. Update your inference.py to use the tokenizer:
   tokenizer = AutoTokenizer.from_pretrained("{TOKENIZER_PATH}")

3. Test the model:
   python app/ai/scripts/llm/example_usage.py

4. Start the API:
   python app/ai/scripts/llm/deploy.py

💡 Tips:
   - This is a 1B parameter model (smaller, faster)
   - Good for testing and development
   - Can scale up to 7B later if needed
""")

print("="*70)
