import { NextRequest, NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'falcon3:1b'; // Use falcon3:1b as per your Docker setup

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Build the prompt with conversation history for Ollama /api/generate endpoint
    let fullPrompt = `You are an AI assistant for Penyelamat Pangan, a food safety monitoring system. You help users understand their sensor data, provide food safety advice, and answer questions about temperature, humidity, CO2, NH3, and ethanol levels in food storage. Keep responses concise and helpful. Focus on food freshness, spoilage prevention, and optimal storage conditions.\n\n`;
    
    // Add conversation history
    conversationHistory.forEach((msg: { role: string; content: string }) => {
      if (msg.role === 'user') {
        fullPrompt += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        fullPrompt += `Assistant: ${msg.content}\n`;
      }
    });
    
    // Add current message
    fullPrompt += `User: ${message}\nAssistant:`;

    // Call Ollama API using /api/generate endpoint
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      response: data.response || 'No response from model',
      model: data.model || OLLAMA_MODEL,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get response from AI',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure Ollama is running: docker ps | grep ollama'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    
    if (!response.ok) {
      throw new Error('Ollama service not available');
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: 'ok',
      ollama_url: OLLAMA_URL,
      models: data.models?.map((m: any) => m.name) || [],
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Ollama service unavailable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
