# ONNX Runtime QNN Wheel Installation Guide

## Option 1: Auto-detect wheel file (Current Dockerfile)

The current Dockerfile automatically detects and installs any `.whl` file in the `app/ai/` directory.

### Steps:
1. Download your ONNX Runtime QNN wheel file
2. Place it in `app/ai/` directory:
   ```
   app/ai/onnxruntime_qnn-1.16.0-cp311-cp311-linux_x86_64.whl
   ```
3. Build with docker-compose:
   ```bash
   docker-compose build lstm_api
   ```

## Option 2: Explicit wheel file (Dockerfile.wheel)

For more control, use the alternative Dockerfile that specifies the exact wheel filename.

### Steps:
1. Download your ONNX Runtime QNN wheel file
2. Place it in `app/ai/` directory
3. Update docker-compose.yml to use the alternative Dockerfile:
   ```yaml
   lstm_api:
     build:
       context: .
       dockerfile: app/ai/Dockerfile.wheel
       args:
         ONNX_WHEEL: onnxruntime_qnn-1.16.0-cp311-cp311-linux_x86_64.whl
   ```
4. Build:
   ```bash
   docker-compose build lstm_api
   ```

## Option 3: Download wheel during build

Add this to Dockerfile after pip upgrade:

```dockerfile
# Download ONNX Runtime QNN wheel
RUN wget https://your-source/onnxruntime_qnn-1.16.0-cp311-cp311-linux_x86_64.whl -O /tmp/onnxruntime_qnn.whl && \
    pip install --no-cache-dir /tmp/onnxruntime_qnn.whl && \
    rm /tmp/onnxruntime_qnn.whl
```

## Where to get ONNX Runtime QNN wheels

- **Qualcomm Package Manager**: https://qpm.qualcomm.com/
- **Official ONNX Runtime releases**: https://github.com/microsoft/onnxruntime/releases
- **Custom builds**: Build from source if needed

## Verify Installation

After container starts, verify the installation:

```bash
docker exec -it food_freshness_ai python -c "import onnxruntime; print(onnxruntime.get_available_providers())"
```

You should see `QNNExecutionProvider` in the list.

## Current Dockerfile Behavior

The current Dockerfile:
1. Filters out all `onnxruntime` entries from requirements.txt
2. Installs all other dependencies
3. Looks for any `.whl` file in the build context
4. Installs the wheel if found

This means you can simply drop your wheel file in `app/ai/` and rebuild!
