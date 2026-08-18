#!/bin/bash
# Starts the Ollama server, then pulls the chat model once it is reachable.
set -e

MODEL="${OLLAMA_MODEL:-falcon3:1b}"

ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama to become ready..."
until ollama list >/dev/null 2>&1; do
  sleep 1
done

if ollama list | grep -q "^${MODEL%%:*}"; then
  echo "Model ${MODEL} already present, skipping pull."
else
  echo "Pulling ${MODEL}..."
  ollama pull "${MODEL}"
fi

echo "Ollama ready with model ${MODEL}."
wait "${SERVER_PID}"
