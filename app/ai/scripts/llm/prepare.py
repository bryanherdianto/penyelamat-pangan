
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from executorch.exir import to_edge

# Load the model
model_name = "app\ai\models\llm\Falcon3-7B-Instruct-Q4_0.gguf"
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,
    device_map="npu"
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