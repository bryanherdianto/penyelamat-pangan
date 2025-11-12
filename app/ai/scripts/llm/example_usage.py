"""
Example usage of the Falcon3-7B LLM Inference Module

This script demonstrates how to use the inference module directly
without the API server.
"""

from inference import (
    Falcon3LLMInference,
    format_response_text,
    generate_test_prompts
)
from pathlib import Path


def main():
    print("\n" + "="*70)
    print("  Falcon3-7B LLM - Direct Inference Example")
    print("="*70)
    
    # Check if model exists
    model_path = "app/ai/models/llm/falcon3_7b_instruct.pte"
    if not Path(model_path).exists():
        print(f"\n❌ Error: Model not found at {model_path}")
        print("Please export your model to ExecuTorch .pte format first")
        print("See: https://pytorch.org/executorch/")
        return
    
    # Initialize the inference model
    print("\n📦 Initializing Falcon3-7B model with ExecuTorch...")
    print("⚠️  Note: First load may take 10-30 seconds...")
    llm = Falcon3LLMInference(model_path, use_qnn=False, verbose=False)
    
    # Example 1: Simple text generation
    print("\n" + "="*70)
    print("Example 1: Simple Text Generation")
    print("="*70)
    
    prompt = "What is the capital of France?"
    print(f"\nPrompt: {prompt}")
    
    result = llm.generate(prompt, max_tokens=100, temperature=0.7)
    print(format_response_text(result))
    
    # Example 2: Instruction following
    print("\n" + "="*70)
    print("Example 2: Instruction Following")
    print("="*70)
    
    instruction = "Write a haiku about artificial intelligence"
    print(f"\nInstruction: {instruction}")
    
    result = llm.instruct(instruction, max_tokens=100, temperature=0.8)
    print(format_response_text(result))
    
    # Example 3: Chat completion
    print("\n" + "="*70)
    print("Example 3: Chat Completion")
    print("="*70)
    
    messages = [
        {"role": "user", "content": "Tell me a fun fact about space"}
    ]
    print(f"\nUser: {messages[0]['content']}")
    
    result = llm.chat(messages, max_tokens=150, temperature=0.7)
    print(format_response_text(result))
    
    # Example 4: Instruction with context
    print("\n" + "="*70)
    print("Example 4: Instruction with Context")
    print("="*70)
    
    context = "Machine learning is a subset of artificial intelligence that focuses on training algorithms to learn from data."
    instruction = "What is the main topic discussed?"
    print(f"\nContext: {context}")
    print(f"Instruction: {instruction}")
    
    result = llm.instruct(instruction, context=context, max_tokens=50, temperature=0.5)
    print(format_response_text(result))
    
    # Example 5: Multi-turn conversation
    print("\n" + "="*70)
    print("Example 5: Multi-Turn Conversation")
    print("="*70)
    
    conversation = [
        {"role": "user", "content": "What is Python?"},
    ]
    
    print("\nUser: What is Python?")
    result = llm.chat(conversation, max_tokens=100)
    print(f"Assistant: {result['message']}")
    
    # Add assistant response and continue
    conversation.append({"role": "assistant", "content": result['message']})
    conversation.append({"role": "user", "content": "Can you give me a simple example?"})
    
    print("\nUser: Can you give me a simple example?")
    result = llm.chat(conversation, max_tokens=150)
    print(f"Assistant: {result['message']}")
    
    # Example 6: Different temperatures
    print("\n" + "="*70)
    print("Example 6: Temperature Comparison")
    print("="*70)
    
    prompt = "The future of AI is"
    print(f"\nPrompt: {prompt}")
    
    temperatures = [0.3, 0.7, 1.0]
    for temp in temperatures:
        print(f"\n--- Temperature: {temp} ---")
        result = llm.generate(prompt, max_tokens=50, temperature=temp)
        print(f"Generated: {result['generated_text']}")
    
    print("\n" + "="*70)
    print("✅ All examples completed successfully!")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
