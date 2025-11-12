"""
Test script for Food Freshness AI Backend API

This script sends test requests to the deployed API to verify it's working correctly.
"""

import requests
import json
import numpy as np
from typing import Dict, Any


# API Configuration
API_BASE_URL = "http://localhost:8000"


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


def test_prediction_fresh():
    """Test prediction with fresh food data"""
    print_section("Testing Prediction - FRESH Food Data")
    
    # Generate fresh food sensor readings (low gas levels)
    np.random.seed(42)
    fresh_data = {
        "mq135_values": [float(x) for x in np.random.randint(140, 160, 10)],
        "mq3_values": [float(x) for x in np.random.randint(120, 135, 10)],
        "mics5524_values": [float(x) for x in np.random.randint(175, 190, 10)]
    }
    
    print("Input Data:")
    print(f"  MQ135:    {fresh_data['mq135_values']}")
    print(f"  MQ3:      {fresh_data['mq3_values']}")
    print(f"  MiCS5524: {fresh_data['mics5524_values']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/predict",
            json=fresh_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Prediction Result:")
            print(f"  Status: {result['classification_text']}")
            print(f"  Confidence: {result['confidence']:.2f}%")
            print(f"  Classification Probability: {result['classification_prob']:.4f}")
            print(f"  Remaining Shelf Life (RSL): {result['rsl_hours']:.1f} hours")
            
            if result['rsl_hours'] > 0:
                days = result['rsl_hours'] / 24
                print(f"                            (~{days:.1f} days)")
            
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_prediction_spoiled():
    """Test prediction with spoiled food data"""
    print_section("Testing Prediction - SPOILED Food Data")
    
    # Generate spoiled food sensor readings (high gas levels)
    np.random.seed(43)
    spoiled_data = {
        "mq135_values": [float(x) for x in np.random.randint(650, 700, 10)],
        "mq3_values": [float(x) for x in np.random.randint(720, 770, 10)],
        "mics5524_values": [float(x) for x in np.random.randint(680, 720, 10)]
    }
    
    print("Input Data:")
    print(f"  MQ135:    {spoiled_data['mq135_values']}")
    print(f"  MQ3:      {spoiled_data['mq3_values']}")
    print(f"  MiCS5524: {spoiled_data['mics5524_values']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/predict",
            json=spoiled_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("\n🎯 Prediction Result:")
            print(f"  Status: {result['classification_text']}")
            print(f"  Confidence: {result['confidence']:.2f}%")
            print(f"  Classification Probability: {result['classification_prob']:.4f}")
            print(f"  Remaining Shelf Life (RSL): {result['rsl_hours']:.1f} hours")
            
            return True
        else:
            print(f"Error Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_prediction_invalid():
    """Test prediction with invalid data"""
    print_section("Testing Prediction - Invalid Data (Error Handling)")
    
    # Invalid data - wrong number of values
    invalid_data = {
        "mq135_values": [150, 152, 148],  # Only 3 values instead of 10
        "mq3_values": [125, 127, 126],
        "mics5524_values": [180, 182, 181]
    }
    
    print("Input Data (Invalid - only 3 values instead of 10):")
    print(f"  MQ135:    {invalid_data['mq135_values']}")
    print(f"  MQ3:      {invalid_data['mq3_values']}")
    print(f"  MiCS5524: {invalid_data['mics5524_values']}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/predict",
            json=invalid_data,
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
    print("  🧪 FOOD FRESHNESS API TEST SUITE")
    print("="*70)
    print(f"\nAPI URL: {API_BASE_URL}")
    print("\nMake sure the API server is running:")
    print("  python app/ai/deploy.py")
    print("\nPress Enter to start tests...")
    input()
    
    results = {}
    
    # Run tests
    results["Root Endpoint"] = test_root_endpoint()
    results["Health Check"] = test_health_endpoint()
    results["Model Info"] = test_model_info()
    results["Fresh Food Prediction"] = test_prediction_fresh()
    results["Spoiled Food Prediction"] = test_prediction_spoiled()
    results["Invalid Data Handling"] = test_prediction_invalid()
    
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
        print("  python app/ai/deploy.py")
