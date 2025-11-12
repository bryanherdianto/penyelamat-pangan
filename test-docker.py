"""
Docker Services Test Script

Tests the deployed Docker services:
1. LSTM Food Freshness API
2. Ollama LLM Service

Usage:
    python test-docker.py
"""

import requests
import json
import time
from typing import Dict, Any


class DockerServiceTester:
    def __init__(self, lstm_url: str = "http://localhost:8000", ollama_url: str = "http://localhost:11434"):
        self.lstm_url = lstm_url
        self.ollama_url = ollama_url
        self.results = {}
    
    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{'='*70}")
        print(f"  {text}")
        print(f"{'='*70}\n")
    
    def print_result(self, test_name: str, passed: bool, message: str = ""):
        """Print test result"""
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status:12} | {test_name}")
        if message:
            print(f"             | {message}")
        self.results[test_name] = passed
    
    def test_lstm_health(self) -> bool:
        """Test LSTM API health endpoint"""
        try:
            response = requests.get(f"{self.lstm_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                model_loaded = data.get("model_loaded", False)
                self.print_result("LSTM Health Check", True, f"Status: {data.get('status')}")
                return model_loaded
            else:
                self.print_result("LSTM Health Check", False, f"HTTP {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.print_result("LSTM Health Check", False, "Connection refused - Is the container running?")
            return False
        except Exception as e:
            self.print_result("LSTM Health Check", False, str(e))
            return False
    
    def test_lstm_root(self) -> bool:
        """Test LSTM API root endpoint"""
        try:
            response = requests.get(f"{self.lstm_url}/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.print_result("LSTM Root Endpoint", True, f"Version: {data.get('version')}")
                return True
            else:
                self.print_result("LSTM Root Endpoint", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.print_result("LSTM Root Endpoint", False, str(e))
            return False
    
    def test_lstm_model_info(self) -> bool:
        """Test LSTM model info endpoint"""
        try:
            response = requests.get(f"{self.lstm_url}/model/info", timeout=5)
            if response.status_code == 200:
                data = response.json()
                sensors = data.get("sensors", [])
                self.print_result("LSTM Model Info", True, f"Sensors: {', '.join(sensors)}")
                return True
            else:
                self.print_result("LSTM Model Info", False, f"HTTP {response.status_code}")
                return False
        except Exception as e:
            self.print_result("LSTM Model Info", False, str(e))
            return False
    
    def test_lstm_prediction(self) -> bool:
        """Test LSTM prediction endpoint with sample data"""
        try:
            # Sample sensor data (10 readings each)
            payload = {
                "mq135_values": [450.2, 455.1, 460.3, 465.5, 470.2, 475.8, 480.1, 485.3, 490.2, 495.5],
                "mq3_values": [320.5, 325.2, 330.1, 335.8, 340.3, 345.1, 350.2, 355.5, 360.1, 365.3],
                "mics5524_values": [280.1, 285.3, 290.2, 295.5, 300.1, 305.8, 310.2, 315.5, 320.1, 325.3]
            }
            
            response = requests.post(f"{self.lstm_url}/predict", json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                classification = data.get("classification_text", "Unknown")
                confidence = data.get("confidence", 0)
                rsl_hours = data.get("rsl_hours", 0)
                
                message = f"{classification} (Confidence: {confidence:.2%}, RSL: {rsl_hours:.1f}h)"
                self.print_result("LSTM Prediction", True, message)
                return True
            else:
                error_detail = response.json().get("detail", "Unknown error")
                self.print_result("LSTM Prediction", False, f"{error_detail}")
                return False
        except Exception as e:
            self.print_result("LSTM Prediction", False, str(e))
            return False
    
    def test_ollama_health(self) -> bool:
        """Test Ollama service health"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                data = response.json()
                models = data.get("models", [])
                model_names = [m.get("name", "") for m in models]
                
                if model_names:
                    self.print_result("Ollama Health Check", True, f"Models: {', '.join(model_names)}")
                else:
                    self.print_result("Ollama Health Check", True, "No models loaded yet")
                return True
            else:
                self.print_result("Ollama Health Check", False, f"HTTP {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self.print_result("Ollama Health Check", False, "Connection refused - Is the container running?")
            return False
        except Exception as e:
            self.print_result("Ollama Health Check", False, str(e))
            return False
    
    def test_ollama_falcon3(self) -> bool:
        """Test Ollama with Falcon3:1b model"""
        try:
            # Check if falcon3:1b is available
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code != 200:
                self.print_result("Ollama Falcon3:1b", False, "Cannot check available models")
                return False
            
            models = response.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            
            # Check if falcon3 is in the list
            falcon3_available = any("falcon3" in name.lower() for name in model_names)
            
            if not falcon3_available:
                self.print_result("Ollama Falcon3:1b", False, "Model not found. Run: docker exec -it ollama_service ollama pull falcon3:1b")
                return False
            
            # Try to generate text
            payload = {
                "model": "falcon3:1b",
                "prompt": "Say 'Hello from Falcon3!' in one sentence.",
                "stream": False
            }
            
            response = requests.post(f"{self.ollama_url}/api/generate", json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                generated_text = data.get("response", "")[:100]  # First 100 chars
                self.print_result("Ollama Falcon3:1b", True, f"Generated: {generated_text}...")
                return True
            else:
                self.print_result("Ollama Falcon3:1b", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.print_result("Ollama Falcon3:1b", False, str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests and print summary"""
        self.print_header("Docker Services Test Suite")
        
        print("Testing LSTM Food Freshness API...")
        print("-" * 70)
        
        lstm_health = self.test_lstm_health()
        time.sleep(0.5)
        
        self.test_lstm_root()
        time.sleep(0.5)
        
        if lstm_health:
            self.test_lstm_model_info()
            time.sleep(0.5)
            self.test_lstm_prediction()
        else:
            print("⚠️  Skipping LSTM tests - model not loaded")
        
        print("\n" + "-" * 70)
        print("\nTesting Ollama LLM Service...")
        print("-" * 70)
        
        ollama_health = self.test_ollama_health()
        time.sleep(0.5)
        
        if ollama_health:
            self.test_ollama_falcon3()
        
        # Print summary
        self.print_header("Test Summary")
        
        total = len(self.results)
        passed = sum(1 for v in self.results.values() if v)
        failed = total - passed
        
        print(f"Total Tests:  {total}")
        print(f"Passed:       {passed} ✓")
        print(f"Failed:       {failed} ✗")
        print(f"Success Rate: {(passed/total*100) if total > 0 else 0:.1f}%")
        
        if failed == 0:
            print("\n🎉 All tests passed!")
        else:
            print("\n⚠️  Some tests failed. Check the output above for details.")
        
        print("\n" + "="*70 + "\n")
        
        return failed == 0


def main():
    """Main test runner"""
    print("\n🧪 Starting Docker Services Test...")
    print("Make sure your Docker containers are running:")
    print("  docker-compose up -d\n")
    
    # Wait a moment for services to be ready
    print("Waiting for services to initialize...")
    time.sleep(2)
    
    tester = DockerServiceTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if success else 1)


if __name__ == "__main__":
    main()
