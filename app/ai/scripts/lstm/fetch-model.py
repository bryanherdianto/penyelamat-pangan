# Python script to fetch and validate the model
# Usage: python fetch-model.py

import os
import sys
import hashlib
import requests
from pathlib import Path

# Configuration
REPO_URL = "https://github.com/PenyelamatPangan/Models"
MODEL_FILE = "lstm_food_freshness.onnx"
BRANCH = "main"
RAW_URL = f"https://raw.githubusercontent.com/PenyelamatPangan/Models/{BRANCH}/{MODEL_FILE}"
MODEL_DIR = "app/ai/models/lstm"
MODEL_PATH = os.path.join(MODEL_DIR, MODEL_FILE)

# Colors for terminal output
class Colors:
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'

def print_header():
    print(f"\n{Colors.CYAN}{'='*40}")
    print("Model Auto-Fetch Script")
    print(f"{'='*40}{Colors.END}")
    print(f"{Colors.YELLOW}Repository: {REPO_URL}{Colors.END}")
    print(f"{Colors.YELLOW}Model: {MODEL_FILE}{Colors.END}")
    print(f"{Colors.YELLOW}Branch: {BRANCH}{Colors.END}")
    print(f"{Colors.CYAN}{'='*40}\n{Colors.END}")

def create_model_dir():
    """Create models directory if it doesn't exist"""
    if not os.path.exists(MODEL_DIR):
        print(f"{Colors.YELLOW}[1] Creating models directory...{Colors.END}")
        os.makedirs(MODEL_DIR)
        print(f"{Colors.GREEN}✓ Directory created: {MODEL_DIR}{Colors.END}")
    else:
        print(f"{Colors.GREEN}[1] Models directory exists: {MODEL_DIR}{Colors.END}")

def check_existing_model():
    """Check if model already exists and ask for overwrite"""
    if os.path.exists(MODEL_PATH):
        file_size = os.path.getsize(MODEL_PATH) / (1024 * 1024)  # MB
        print(f"\n{Colors.YELLOW}[2] Model already exists at: {MODEL_PATH}{Colors.END}")
        print(f"{Colors.CYAN}    Size: {file_size:.2f}MB{Colors.END}")
        
        response = input("\nDo you want to re-download? (y/N): ").strip().lower()
        if response != 'y':
            print(f"\n{Colors.GREEN}✓ Using existing model{Colors.END}")
            return False
        print(f"\n{Colors.YELLOW}Re-downloading model...{Colors.END}")
    return True

def download_model():
    """Download the model from GitHub"""
    print(f"\n{Colors.YELLOW}[3] Downloading model from GitHub...{Colors.END}")
    print(f"{Colors.CYAN}    URL: {RAW_URL}{Colors.END}")
    
    try:
        response = requests.get(RAW_URL, stream=True)
        response.raise_for_status()
        
        # Get total file size
        total_size = int(response.headers.get('content-length', 0))
        block_size = 8192
        downloaded = 0
        
        with open(MODEL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=block_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r    Progress: {percent:.1f}% ({downloaded / (1024*1024):.2f}MB / {total_size / (1024*1024):.2f}MB)", end='')
        
        print()  # New line after progress
        return True
        
    except requests.exceptions.HTTPError as e:
        print(f"\n{Colors.RED}✗ HTTP Error: {e}{Colors.END}")
        if e.response.status_code == 404:
            print(f"\n{Colors.YELLOW}⚠ Model not found. Please check:{Colors.END}")
            print(f"{Colors.CYAN}  1. Repository exists: {REPO_URL}{Colors.END}")
            print(f"{Colors.CYAN}  2. File exists in repository: {MODEL_FILE}{Colors.END}")
            print(f"{Colors.CYAN}  3. Branch is correct: {BRANCH}{Colors.END}")
            print(f"{Colors.CYAN}  4. Repository is public or you have access{Colors.END}")
        return False
    except Exception as e:
        print(f"\n{Colors.RED}✗ Error downloading model: {e}{Colors.END}")
        return False

def verify_model():
    """Verify the downloaded model"""
    if not os.path.exists(MODEL_PATH):
        print(f"{Colors.RED}✗ Model file not found{Colors.END}")
        return False
    
    file_size = os.path.getsize(MODEL_PATH) / (1024 * 1024)  # MB
    
    # Calculate SHA256 hash
    sha256_hash = hashlib.sha256()
    with open(MODEL_PATH, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    file_hash = sha256_hash.hexdigest()[:16]
    
    print(f"\n{Colors.GREEN}✓ Model downloaded successfully!{Colors.END}")
    print(f"{Colors.CYAN}  Location: {MODEL_PATH}{Colors.END}")
    print(f"{Colors.CYAN}  Size: {file_size:.2f}MB{Colors.END}")
    print(f"{Colors.CYAN}  Hash: {file_hash}...{Colors.END}")
    
    # Try to validate with onnx if available
    try:
        import onnx
        model = onnx.load(MODEL_PATH)
        onnx.checker.check_model(model)
        print(f"{Colors.GREEN}✓ Valid ONNX file format detected{Colors.END}")
        print(f"{Colors.CYAN}  ONNX IR Version: {model.ir_version}{Colors.END}")
    except ImportError:
        print(f"{Colors.YELLOW}⚠ Install onnx to validate: pip install onnx{Colors.END}")
    except Exception as e:
        print(f"{Colors.YELLOW}⚠ Warning: {e}{Colors.END}")
    
    return True

def print_next_steps():
    """Print next steps after download"""
    print(f"\n{Colors.CYAN}{'='*40}")
    print("Download Complete")
    print(f"{'='*40}{Colors.END}")
    print(f"\n{Colors.YELLOW}Next steps:{Colors.END}")
    print(f"{Colors.CYAN}  1. Verify model: python -c 'import onnx; onnx.checker.check_model(\"{MODEL_PATH}\")'")
    print(f"  2. Test model: python -c 'import onnxruntime; onnxruntime.InferenceSession(\"{MODEL_PATH}\")'")
    print(f"  3. Start service: docker-compose up -d\n{Colors.END}")

def main():
    """Main function"""
    print_header()
    create_model_dir()
    
    if not check_existing_model():
        return 0
    
    if download_model():
        if verify_model():
            print_next_steps()
            return 0
    
    return 1

if __name__ == "__main__":
    sys.exit(main())
