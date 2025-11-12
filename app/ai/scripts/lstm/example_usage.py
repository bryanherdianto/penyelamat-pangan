"""
Example usage of the LSTM Food Freshness Inference Module

This script demonstrates how to use the inference module directly
without the API server.
"""

from ai.inference import (
    ONNXFoodFreshnessInference,
    generate_test_data,
    format_prediction_text,
    SensorBuffer
)
from pathlib import Path


def main():
    print("\n" + "="*70)
    print("  LSTM Food Freshness - Direct Inference Example")
    print("="*70)
    
    # Check if model exists
    model_path = "app/ai/models/lstm_food_freshness.onnx"
    if not Path(model_path).exists():
        print(f"\n❌ Error: Model not found at {model_path}")
        print("Please run: python fetch-model.py")
        return
    
    # Initialize the inference model
    print("\n📦 Initializing model...")
    predictor = ONNXFoodFreshnessInference(model_path, fit_scaler=True)
    
    # Example 1: Test with fresh food data
    print("\n" + "="*70)
    print("Example 1: Fresh Food Prediction")
    print("="*70)
    
    fresh_data = generate_test_data("fresh", seed=42)
    print(f"\nGenerated fresh food sensor data:")
    print(f"  MQ135 avg: {fresh_data[:, 0].mean():.1f}")
    print(f"  MQ3 avg: {fresh_data[:, 1].mean():.1f}")
    print(f"  MiCS5524 avg: {fresh_data[:, 2].mean():.1f}")
    
    result = predictor.predict(fresh_data, apply_scaling=True)
    print(format_prediction_text(result))
    
    # Example 2: Test with spoiled food data
    print("\n" + "="*70)
    print("Example 2: Spoiled Food Prediction")
    print("="*70)
    
    spoiled_data = generate_test_data("spoiled", seed=43)
    print(f"\nGenerated spoiled food sensor data:")
    print(f"  MQ135 avg: {spoiled_data[:, 0].mean():.1f}")
    print(f"  MQ3 avg: {spoiled_data[:, 1].mean():.1f}")
    print(f"  MiCS5524 avg: {spoiled_data[:, 2].mean():.1f}")
    
    result = predictor.predict(spoiled_data, apply_scaling=True)
    print(format_prediction_text(result))
    
    # Example 3: Using predict_from_sensors (API-style input)
    print("\n" + "="*70)
    print("Example 3: Using Individual Sensor Arrays")
    print("="*70)
    
    print("\nPredicting with custom sensor values (fresh food pattern)...")
    result = predictor.predict_from_sensors(
        mq135_values=[150, 145, 160, 155, 148, 152, 158, 151, 149, 153],
        mq3_values=[120, 125, 130, 128, 122, 127, 131, 124, 126, 129],
        mics5524_values=[180, 175, 185, 180, 178, 182, 188, 179, 181, 183]
    )
    print(format_prediction_text(result))
    
    # Example 4: Real-time buffer simulation
    print("\n" + "="*70)
    print("Example 4: Real-Time Sensor Buffer Simulation")
    print("="*70)
    
    print("\nSimulating real-time sensor readings (like Arduino/IoT device)...")
    buffer = SensorBuffer(scaler=predictor.scaler)
    
    import numpy as np
    np.random.seed(100)
    
    print("\nAdding 15 sensor readings (fresh food pattern):")
    for i in range(15):
        mq135 = np.random.randint(140, 160)
        mq3 = np.random.randint(120, 135)
        mics5524 = np.random.randint(175, 190)
        
        buffer.add_reading(mq135, mq3, mics5524)
        
        if buffer.is_ready():
            seq = buffer.get_sequence()
            result = predictor.predict(seq, apply_scaling=False)  # Already scaled
            status_emoji = "✅" if result['classification_text'] == "Fresh" else "❌"
            print(f"  Reading {i+1:2d}: MQ135={mq135:3d}, MQ3={mq3:3d}, MiCS={mics5524:3d} "
                  f"→ {status_emoji} {result['classification_text']} "
                  f"({result['confidence']:.1f}%, RSL: {result['rsl_hours']:.0f}h)")
        else:
            print(f"  Reading {i+1:2d}: MQ135={mq135:3d}, MQ3={mq3:3d}, MiCS={mics5524:3d} "
                  f"→ Buffering... ({len(buffer)}/10)")
    
    print("\n" + "="*70)
    print("✅ All examples completed successfully!")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
