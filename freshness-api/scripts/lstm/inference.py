"""
LSTM Food Freshness Model Inference Module

Provides reusable inference utilities for the LSTM Food Freshness ONNX model
with dual outputs: Binary Classification and RSL (Remaining Shelf Life).
"""

import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, List
import onnxruntime as ort
from sklearn.preprocessing import StandardScaler
import pandas as pd


# Model Configuration
SEQUENCE_LENGTH = 10
NUM_FEATURES = 3  # MQ135, MQ3, MiCS5524
SENSOR_NAMES = ["MQ135_Analog", "MQ3_Analog", "MiCS5524_Analog"]
CLASSIFICATION_THRESHOLD = 0.5

# GitHub dataset URL for scaler fitting
DATA_URL = "https://raw.githubusercontent.com/PenyelamatPangan/Models/main/food_freshness_dataset.csv"


class ONNXFoodFreshnessInference:
    """
    ONNX Runtime inference for Food Freshness model with dual outputs.
    
    The model outputs:
    1. Classification probability (0-1, where >0.5 = Fresh, <=0.5 = Bad)
    2. RSL (Remaining Shelf Life in hours)
    """
    
    def __init__(self, model_path: str, fit_scaler: bool = True):
        """
        Initialize with ONNX model path.
        
        Args:
            model_path: Path to ONNX model file
            fit_scaler: If True, downloads dataset and fits scaler (recommended)
        """
        self.model_path = Path(model_path)
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {self.model_path}")
        
        # Load ONNX model
        print(f"Loading ONNX model from {self.model_path}...")
        self.session = ort.InferenceSession(str(self.model_path))
        
        # Get input/output names
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [output.name for output in self.session.get_outputs()]
        
        print(f"✓ Model loaded successfully")
        print(f"  Input: {self.input_name}")
        print(f"  Outputs: {self.output_names}")
        print(f"  Expected shape: (batch_size, {SEQUENCE_LENGTH}, {NUM_FEATURES})")
        
        # Initialize and fit scaler
        self.scaler = StandardScaler()
        if fit_scaler:
            self._fit_scaler_from_dataset()
        else:
            print("⚠️  Warning: Scaler not fitted. Call fit_scaler() or predictions may be incorrect.")
    
    def _fit_scaler_from_dataset(self):
        """Fit scaler using the training dataset from GitHub"""
        try:
            print("📥 Downloading dataset to fit scaler...")
            df = pd.read_csv(DATA_URL)
            X = df[SENSOR_NAMES].values
            self.scaler.fit(X)
            print(f"✓ Scaler fitted on {len(X)} samples")
            print(f"  Feature means: {self.scaler.mean_}")
            print(f"  Feature std devs: {self.scaler.scale_}")
        except Exception as e:
            print(f"⚠️  Warning: Could not fit scaler from dataset: {e}")
            print("   Predictions may be inaccurate without proper scaling!")
    
    def fit_scaler(self, sensor_data: np.ndarray):
        """
        Manually fit scaler with provided sensor data.
        
        Args:
            sensor_data: Array of shape (n_samples, 3) with raw sensor values
        """
        self.scaler.fit(sensor_data)
        print(f"✓ Scaler fitted on {len(sensor_data)} samples")
    
    def predict(self, sequence: np.ndarray, apply_scaling: bool = True) -> Dict[str, Any]:
        """
        Run inference on sensor sequence.
        
        Args:
            sequence: Input array of shape (1, sequence_length, num_features)
                     or (sequence_length, num_features)
            apply_scaling: If True, applies StandardScaler transformation
        
        Returns:
            Dictionary with prediction results including both outputs
        """
        # Ensure correct shape
        if sequence.ndim == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        if sequence.shape[1:] != (SEQUENCE_LENGTH, NUM_FEATURES):
            raise ValueError(
                f"Expected shape (*, {SEQUENCE_LENGTH}, {NUM_FEATURES}), "
                f"got {sequence.shape}"
            )
        
        # Apply scaling if requested
        if apply_scaling:
            # Reshape to 2D for scaling
            original_shape = sequence.shape
            sequence_2d = sequence.reshape(-1, NUM_FEATURES)
            sequence_2d = self.scaler.transform(sequence_2d)
            sequence = sequence_2d.reshape(original_shape)
        
        # Run inference
        ort_inputs = {self.input_name: sequence.astype(np.float32)}
        ort_outputs = self.session.run(None, ort_inputs)
        
        # Parse outputs
        # Output 0: Classification probability (sigmoid output, 0-1)
        classification_prob = float(ort_outputs[0][0][0])
        
        # Output 1: RSL (Remaining Shelf Life in hours)
        rsl_hours = max(0.0, float(ort_outputs[1][0][0]))
        
        # Interpret classification
        classification_label = 1 if classification_prob > CLASSIFICATION_THRESHOLD else 0
        classification_text = "Fresh" if classification_label == 1 else "Bad"
        confidence = classification_prob if classification_label == 1 else (1 - classification_prob)
        
        return {
            "classification_prob": classification_prob,
            "classification_label": classification_label,
            "classification_text": classification_text,
            "rsl_hours": rsl_hours,
            "confidence": confidence * 100,
            "raw_outputs": {
                "classification": float(ort_outputs[0][0][0]),
                "rsl": float(ort_outputs[1][0][0])
            }
        }
    
    def predict_from_sensors(
        self,
        mq135_values: List[float],
        mq3_values: List[float],
        mics5524_values: List[float]
    ) -> Dict[str, Any]:
        """
        Predict from individual sensor readings (raw, unscaled values).
        
        Args:
            mq135_values: MQ135 sensor readings (length=SEQUENCE_LENGTH)
            mq3_values: MQ3 sensor readings (length=SEQUENCE_LENGTH)
            mics5524_values: MiCS5524 sensor readings (length=SEQUENCE_LENGTH)
        
        Returns:
            Prediction dictionary with both classification and RSL
        """
        if len(mq135_values) != SEQUENCE_LENGTH or \
           len(mq3_values) != SEQUENCE_LENGTH or \
           len(mics5524_values) != SEQUENCE_LENGTH:
            raise ValueError(f"All sensor lists must have length {SEQUENCE_LENGTH}")
        
        # Stack into sequence array
        sequence = np.column_stack([mq135_values, mq3_values, mics5524_values])
        
        # Predict with scaling
        return self.predict(sequence, apply_scaling=True)


class SensorBuffer:
    """
    Rolling buffer for sensor readings (useful for real-time applications).
    
    This class maintains a sliding window of sensor readings and can produce
    sequences ready for LSTM inference once enough readings are collected.
    """
    
    def __init__(self, buffer_size: int = SEQUENCE_LENGTH, scaler: Optional[StandardScaler] = None):
        """
        Initialize sensor buffer.
        
        Args:
            buffer_size: Number of readings to maintain
            scaler: Optional sklearn StandardScaler for normalization
        """
        self.buffer_size = buffer_size
        self.buffer = []
        self.scaler = scaler
    
    def add_reading(self, mq135: float, mq3: float, mics5524: float):
        """
        Add a new sensor reading to the buffer.
        
        Args:
            mq135: MQ135 analog value
            mq3: MQ3 analog value
            mics5524: MiCS5524 analog value
        """
        reading = [mq135, mq3, mics5524]
        self.buffer.append(reading)
        
        # Keep only last buffer_size readings
        if len(self.buffer) > self.buffer_size:
            self.buffer.pop(0)
    
    def is_ready(self) -> bool:
        """Check if buffer has enough readings for prediction."""
        return len(self.buffer) >= self.buffer_size
    
    def get_sequence(self) -> Optional[np.ndarray]:
        """
        Get the current sequence ready for prediction.
        
        Returns:
            Array of shape (1, buffer_size, 3) or None if not ready
        """
        if not self.is_ready():
            return None
        
        # Get last buffer_size readings
        sequence = np.array(self.buffer[-self.buffer_size:])
        
        # Apply scaling if scaler provided
        if self.scaler is not None:
            sequence = self.scaler.transform(sequence)
        
        # Reshape for model input (add batch dimension)
        return sequence.reshape(1, self.buffer_size, -1).astype(np.float32)
    
    def clear(self):
        """Clear the buffer."""
        self.buffer = []
    
    def __len__(self):
        """Return current buffer length."""
        return len(self.buffer)


def format_prediction_text(prediction: Dict[str, Any]) -> str:
    """
    Format prediction results as a readable string.
    
    Args:
        prediction: Prediction dictionary
    
    Returns:
        Formatted string
    """
    lines = [
        "="*60,
        "FOOD FRESHNESS PREDICTION",
        "="*60,
        "",
        f"Status: {prediction['classification_text']}",
        f"Confidence: {prediction['confidence']:.2f}%",
        f"Classification Probability: {prediction['classification_prob']:.4f}",
        "",
        f"Remaining Shelf Life: {prediction['rsl_hours']:.1f} hours",
    ]
    
    if prediction['rsl_hours'] > 0:
        days = prediction['rsl_hours'] / 24
        lines.append(f"                      (~{days:.1f} days)")
    
    lines.extend([
        "",
        "="*60
    ])
    
    return "\n".join(lines)


def generate_test_data(
    data_type: str = "random",
    seed: Optional[int] = None
) -> np.ndarray:
    """
    Generate test sensor data (raw, unscaled values).
    
    Args:
        data_type: Type of data ("random", "fresh", "spoiled")
        seed: Random seed for reproducibility
    
    Returns:
        Array of shape (SEQUENCE_LENGTH, NUM_FEATURES)
    """
    if seed is not None:
        np.random.seed(seed)
    
    if data_type == "fresh":
        # Fresh food: low gas levels (based on notebook examples)
        mq135 = np.random.randint(140, 160, size=SEQUENCE_LENGTH)
        mq3 = np.random.randint(120, 135, size=SEQUENCE_LENGTH)
        mics5524 = np.random.randint(175, 190, size=SEQUENCE_LENGTH)
        return np.column_stack([mq135, mq3, mics5524]).astype(np.float32)
    
    elif data_type == "spoiled":
        # Spoiled food: high gas levels (based on notebook examples)
        mq135 = np.random.randint(650, 700, size=SEQUENCE_LENGTH)
        mq3 = np.random.randint(720, 770, size=SEQUENCE_LENGTH)
        mics5524 = np.random.randint(680, 720, size=SEQUENCE_LENGTH)
        return np.column_stack([mq135, mq3, mics5524]).astype(np.float32)
    
    else:
        # Random values in typical range
        mq135 = np.random.randint(100, 750, size=SEQUENCE_LENGTH)
        mq3 = np.random.randint(100, 800, size=SEQUENCE_LENGTH)
        mics5524 = np.random.randint(100, 750, size=SEQUENCE_LENGTH)
        return np.column_stack([mq135, mq3, mics5524]).astype(np.float32)


# Example usage
if __name__ == "__main__":
    import sys
    
    model_path = "models/lstm_food_freshness.onnx"
    
    if not Path(model_path).exists():
        print(f"Model not found at {model_path}")
        print("Please run: python fetch-model.py")
        sys.exit(1)
    
    # Initialize inference
    predictor = ONNXFoodFreshnessInference(model_path)
    
    # Test with fresh food data
    print("\n--- Testing with FRESH food data ---")
    fresh_data = generate_test_data("fresh", seed=42)
    result = predictor.predict(fresh_data, apply_scaling=True)
    print(format_prediction_text(result))
    
    # Test with spoiled food data
    print("\n--- Testing with SPOILED food data ---")
    spoiled_data = generate_test_data("spoiled", seed=43)
    result = predictor.predict(spoiled_data, apply_scaling=True)
    print(format_prediction_text(result))
    
    # Test predict_from_sensors method
    print("\n--- Testing predict_from_sensors method ---")
    result = predictor.predict_from_sensors(
        mq135_values=[150, 145, 160, 155, 148, 152, 158, 151, 149, 153],
        mq3_values=[120, 125, 130, 128, 122, 127, 131, 124, 126, 129],
        mics5524_values=[180, 175, 185, 180, 178, 182, 188, 179, 181, 183]
    )
    print(format_prediction_text(result))
    
    # Test sensor buffer
    print("\n--- Testing Sensor Buffer ---")
    buffer = SensorBuffer(scaler=predictor.scaler)
    
    print("Adding fresh food readings...")
    for i in range(12):
        mq135 = np.random.randint(140, 160)
        mq3 = np.random.randint(120, 135)
        mics5524 = np.random.randint(175, 190)
        buffer.add_reading(mq135, mq3, mics5524)
        
        if buffer.is_ready():
            seq = buffer.get_sequence()
            result = predictor.predict(seq, apply_scaling=False)  # Already scaled by buffer
            print(f"Reading {i+1}: {result['classification_text']} "
                  f"(Confidence: {result['confidence']:.1f}%, "
                  f"RSL: {result['rsl_hours']:.0f}h)")
