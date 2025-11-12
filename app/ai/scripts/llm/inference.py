"""
Falcon3-7B-Instruct LLM Inference Module

Provides reusable inference utilities for the Falcon3-7B-Instruct model using ExecuTorch.
"""

from pathlib import Path
from typing import Dict, Any, Optional, List
import torch
from executorch.extension.pybindings.portable_lib import _load_for_executorch


# Model Configuration
DEFAULT_MAX_TOKENS = 512
DEFAULT_TEMPERATURE = 0.7
DEFAULT_TOP_P = 0.95
DEFAULT_CONTEXT_LENGTH = 4096


class Falcon3LLMInference:
    """
    ExecuTorch-based inference for Falcon3-7B-Instruct model.
    
    The model is a 7B parameter instruction-tuned model optimized for
    conversational AI and text generation tasks, running on ExecuTorch
    for efficient on-device inference.
    """
    
    def __init__(
        self, 
        model_path: str,
        n_ctx: int = DEFAULT_CONTEXT_LENGTH,
        use_qnn: bool = False,
        verbose: bool = False
    ):
        """
        Initialize with ExecuTorch model path (.pte file).
        
        Args:
            model_path: Path to ExecuTorch model file (.pte)
            n_ctx: Context length (default: 4096)
            use_qnn: Use Qualcomm QNN backend (default: False)
            verbose: Enable verbose logging
        """
        self.model_path = Path(model_path)
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        
        self.n_ctx = n_ctx
        self.use_qnn = use_qnn
        self.verbose = verbose
        
        # Load the model
        print(f"Loading Falcon3-7B model from {self.model_path}...")
        print(f"  Context length: {n_ctx}")
        print(f"  Backend: {'QNN (Qualcomm NPU)' if use_qnn else 'CPU'}")
        
        try:
            self.model = _load_for_executorch(str(self.model_path))
            if self.verbose:
                print(f"  Model methods: {dir(self.model)}")
        except Exception as e:
            print(f"❌ Error loading ExecuTorch model: {e}")
            raise
        
        print("✓ Model loaded successfully and ready for inference!")
        
        # Initialize token tracking
        self.total_tokens_generated = 0
    
    def _tokenize(self, text: str) -> torch.Tensor:
        """
        Tokenize input text (placeholder - needs actual tokenizer).
        
        Args:
            text: Input text
        
        Returns:
            Tokenized tensor
        """
        # TODO: Implement proper tokenization for Falcon3
        # This is a simplified version - you'll need the actual tokenizer
        tokens = [ord(c) for c in text[:self.n_ctx]]
        return torch.tensor(tokens, dtype=torch.long).unsqueeze(0)
    
    def _detokenize(self, tokens: torch.Tensor) -> str:
        """
        Convert tokens back to text (placeholder - needs actual tokenizer).
        
        Args:
            tokens: Token tensor
        
        Returns:
            Decoded text
        """
        # TODO: Implement proper detokenization for Falcon3
        # This is a simplified version - you'll need the actual tokenizer
        token_list = tokens.squeeze().tolist()
        return ''.join([chr(t) for t in token_list if 32 <= t < 127])
    
    def generate(
        self,
        prompt: str,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
        stop: Optional[List[str]] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Generate text completion from prompt using ExecuTorch.
        
        Args:
            prompt: Input text prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            top_p: Nucleus sampling parameter
            stop: List of stop sequences
            stream: Enable streaming output (not supported yet)
        
        Returns:
            Dictionary with generated text and metadata
        """
        if stop is None:
            stop = ["</s>", "<|endoftext|>"]
        
        if stream:
            raise NotImplementedError("Streaming is not yet supported with ExecuTorch")
        
        # Tokenize input
        input_tokens = self._tokenize(prompt)
        prompt_length = input_tokens.shape[1]
        
        # Run inference through ExecuTorch model
        try:
            # Forward pass through the model
            output = self.model.forward((input_tokens,))
            
            # Extract output tokens
            if isinstance(output, tuple):
                output_tokens = output[0]
            else:
                output_tokens = output
            
            # Detokenize output
            generated_text = self._detokenize(output_tokens)
            
            # Count tokens
            tokens_generated = min(max_tokens, len(generated_text))
            self.total_tokens_generated += tokens_generated
            
            return {
                "generated_text": generated_text.strip(),
                "prompt": prompt,
                "tokens_generated": tokens_generated,
                "tokens_prompt": prompt_length,
                "total_tokens": prompt_length + tokens_generated,
                "finish_reason": "length"
            }
            
        except Exception as e:
            print(f"❌ Error during generation: {e}")
            return {
                "generated_text": "",
                "prompt": prompt,
                "tokens_generated": 0,
                "tokens_prompt": prompt_length,
                "total_tokens": prompt_length,
                "finish_reason": "error",
                "error": str(e)
            }
    
    def chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Chat completion with message history using ExecuTorch.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
                     Example: [{"role": "user", "content": "Hello!"}]
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            top_p: Nucleus sampling parameter
            stream: Enable streaming output (not supported yet)
        
        Returns:
            Dictionary with generated response and metadata
        """
        if stream:
            raise NotImplementedError("Streaming is not yet supported with ExecuTorch")
        
        # Format messages into a prompt
        prompt_parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        
        prompt_parts.append("Assistant:")
        prompt = "\n".join(prompt_parts)
        
        # Use generate method
        result = self.generate(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p
        )
        
        # Reformat for chat response
        return {
            "message": result["generated_text"],
            "role": "assistant",
            "tokens_generated": result["tokens_generated"],
            "tokens_prompt": result["tokens_prompt"],
            "total_tokens": result["total_tokens"],
            "finish_reason": result["finish_reason"]
        }
    
    def instruct(
        self,
        instruction: str,
        context: Optional[str] = None,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE
    ) -> Dict[str, Any]:
        """
        Instruction-following completion (optimized for Falcon3-Instruct).
        
        Args:
            instruction: The instruction/question to follow
            context: Optional context for the instruction
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
        
        Returns:
            Dictionary with generated response and metadata
        """
        # Format prompt for instruction model
        if context:
            prompt = f"Context: {context}\n\nInstruction: {instruction}\n\nResponse:"
        else:
            prompt = f"Instruction: {instruction}\n\nResponse:"
        
        return self.generate(
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=temperature
        )


def format_response_text(result: Dict[str, Any]) -> str:
    """
    Format LLM response as a readable string.
    
    Args:
        result: Response dictionary from generate() or chat()
    
    Returns:
        Formatted string
    """
    lines = [
        "="*70,
        "LLM RESPONSE",
        "="*70,
    ]
    
    if "generated_text" in result:
        lines.extend([
            "",
            result["generated_text"],
            "",
            f"Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}",
            f"Finish reason: {result['finish_reason']}"
        ])
    elif "message" in result:
        lines.extend([
            "",
            result["message"],
            "",
            f"Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}",
            f"Finish reason: {result['finish_reason']}"
        ])
    
    lines.extend([
        "="*70
    ])
    
    return "\n".join(lines)


def generate_test_prompts() -> List[Dict[str, Any]]:
    """
    Generate test prompts for different use cases.
    
    Returns:
        List of test prompt configurations
    """
    return [
        {
            "name": "Simple Question",
            "prompt": "What is the capital of France?",
            "type": "generate"
        },
        {
            "name": "Instruction Following",
            "instruction": "Write a haiku about artificial intelligence",
            "type": "instruct"
        },
        {
            "name": "Chat Conversation",
            "messages": [
                {"role": "user", "content": "Hello! Can you help me with Python programming?"},
            ],
            "type": "chat"
        },
        {
            "name": "Context-based Query",
            "instruction": "What is the main topic discussed?",
            "context": "Machine learning is a subset of artificial intelligence that focuses on training algorithms to learn from data.",
            "type": "instruct"
        }
    ]


# Example usage
if __name__ == "__main__":
    import sys
    
    model_path = "app/ai/models/llm/falcon3_7b_instruct.pte"
    
    if not Path(model_path).exists():
        print(f"Model not found at {model_path}")
        print("Please export your model to ExecuTorch .pte format first")
        print("See: https://pytorch.org/executorch/")
        sys.exit(1)
    
    # Initialize inference
    print("\nInitializing Falcon3-7B model with ExecuTorch...")
    llm = Falcon3LLMInference(model_path, use_qnn=False)
    
    # Test simple generation
    print("\n--- Test 1: Simple Generation ---")
    result = llm.generate("What is artificial intelligence?", max_tokens=100)
    print(format_response_text(result))
    
    # Test instruction following
    print("\n--- Test 2: Instruction Following ---")
    result = llm.instruct("Explain quantum computing in simple terms")
    print(format_response_text(result))
    
    # Test chat
    print("\n--- Test 3: Chat ---")
    result = llm.chat([
        {"role": "user", "content": "Tell me a fun fact about space"}
    ])
    print(format_response_text(result))
