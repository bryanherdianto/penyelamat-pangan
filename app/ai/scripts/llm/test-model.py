"""
Test script for Falcon3-7B LLM Backend API

This script sends test requests to the deployed API to verify it's working correctly.
"""

import requests
import json
from typing import Dict, Any


# API Configuration
API_BASE_URL = "http://localhost:8001"


def print_section(title: str):
    """Print a formatted section header"""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def test_root_endpoint():
    """Test the root endpoint"""
    print_section("Testing Root Endpoint")
    
    try:
        response = requests.get(f"{API_BASE_URL}/")
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_health_endpoint():
    """Test the health check endpoint"""
    print_section("Testing Health Endpoint")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response:\n{json.dumps(data, indent=2)}")
        
        if data.get("model_loaded"):
            print("\n✓ Model is loaded and ready!")
        else:
            print("\n⚠️  Warning: Model is not loaded")
        
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_model_info():
    """Test the model info endpoint"""
    print_section("Testing Model Info Endpoint")
    
    try:
        response = requests.get(f"{API_BASE_URL}/model/info")
        print(f"Status Code: {response.status_code}")
        print(f"Response:\n{json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_generate():
    """Test text generation"""
    print_section("Testing Text Generation - /generate")
    
    request_data = {
        "prompt": "What is the capital of France?",
        "max_tokens": 50,
        "temperature": 0.7
    }
    
    print("Request:")
    print(f"  Prompt: {request_data['prompt']}")
    print(f"  Max tokens: {request_data['max_tokens']}")
    print(f"  Temperature: {request_data['temperature']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/generate",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Generation Result:")
            print(f"  Generated Text: {result['generated_text']}")
            print(f"  Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}")
            print(f"  Finish Reason: {result['finish_reason']}")
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_chat():
    """Test chat completion"""
    print_section("Testing Chat Completion - /chat")
    
    request_data = {
        "messages": [
            {"role": "user", "content": "Tell me a fun fact about space"}
        ],
        "max_tokens": 100,
        "temperature": 0.8
    }
    
    print("Request:")
    print(f"  Messages: {request_data['messages']}")
    print(f"  Max tokens: {request_data['max_tokens']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/chat",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Chat Result:")
            print(f"  Assistant: {result['message']}")
            print(f"  Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}")
            print(f"  Finish Reason: {result['finish_reason']}")
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_instruct():
    """Test instruction following"""
    print_section("Testing Instruction Following - /instruct")
    
    request_data = {
        "instruction": "Write a haiku about artificial intelligence",
        "max_tokens": 100,
        "temperature": 0.7
    }
    
    print("Request:")
    print(f"  Instruction: {request_data['instruction']}")
    print(f"  Max tokens: {request_data['max_tokens']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/instruct",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Instruction Result:")
            print(f"  Response: {result['generated_text']}")
            print(f"  Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}")
            print(f"  Finish Reason: {result['finish_reason']}")
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_instruct_with_context():
    """Test instruction following with context"""
    print_section("Testing Instruction with Context - /instruct")
    
    request_data = {
        "instruction": "What is the main topic discussed?",
        "context": "Machine learning is a subset of artificial intelligence that focuses on training algorithms to learn from data and make predictions.",
        "max_tokens": 50,
        "temperature": 0.5
    }
    
    print("Request:")
    print(f"  Context: {request_data['context']}")
    print(f"  Instruction: {request_data['instruction']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/instruct",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Result:")
            print(f"  Response: {result['generated_text']}")
            print(f"  Tokens (prompt/generated/total): {result['tokens_prompt']}/{result['tokens_generated']}/{result['total_tokens']}")
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_invalid_request():
    """Test with invalid request"""
    print_section("Testing Invalid Request (Error Handling)")
    
    request_data = {
        "prompt": "Test",
        "max_tokens": -1,  # Invalid: negative value
        "temperature": 0.7
    }
    
    print("Request (Invalid - negative max_tokens):")
    print(f"  Prompt: {request_data['prompt']}")
    print(f"  Max tokens: {request_data['max_tokens']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/generate",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 422:
            print("✓ API correctly rejected invalid input")
            print(f"Error Details:\n{json.dumps(response.json(), indent=2)}")
            return True
        else:
            print(f"Unexpected response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def run_all_tests():
    """Run all API tests"""
    print("\n" + "="*70)
    print("  🧪 FALCON3-7B LLM API TEST SUITE")
    print("="*70)
    print(f"\nAPI URL: {API_BASE_URL}")
    print("\nMake sure the API server is running:")
    print("  python app/ai/scripts/llm/deploy.py")
    print("\nPress Enter to start tests...")
    input()
    
    results = {}
    
    # Run tests
    results["Root Endpoint"] = test_root_endpoint()
    results["Health Check"] = test_health_endpoint()
    results["Model Info"] = test_model_info()
    results["Text Generation"] = test_generate()
    results["Chat Completion"] = test_chat()
    results["Instruction Following"] = test_instruct()
    results["Instruction with Context"] = test_instruct_with_context()
    results["Invalid Request Handling"] = test_invalid_request()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, passed_test in results.items():
        status = "✓ PASS" if passed_test else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    print("\n" + "="*70 + "\n")


if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
    except requests.exceptions.ConnectionError:
        print("\n\n❌ Error: Could not connect to API")
        print("Make sure the API server is running:")
        print("  python app/ai/scripts/llm/deploy.py")
