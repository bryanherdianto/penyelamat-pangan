#!/bin/bash
# Ollama initialization script - pulls Falcon3:1b if not present

echo "🚀 Starting Ollama initialization..."

# Start Ollama in the background
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama service to start..."
for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✓ Ollama service is ready"
        break
    fi
    sleep 1
done

# Check if falcon3:1b exists
echo "🔍 Checking for Falcon3:1b model..."
if ollama list | grep -q "falcon3:1b"; then
    echo "✓ Falcon3:1b already exists"
else
    echo "📥 Pulling Falcon3:1b model (this may take a while)..."
    ollama pull falcon3:1b
    echo "✓ Falcon3:1b model ready!"
fi

# Keep container running
echo "✓ Ollama is ready and serving models"
wait $OLLAMA_PID
