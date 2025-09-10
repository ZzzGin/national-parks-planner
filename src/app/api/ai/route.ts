import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { systemInstruction, userPrompt, modelType, apiKey } = await req.json();


    // Only use the provided API key, no fallback to environment variable
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please configure your API key in the settings.' },
        { status: 400 }
      );
    }

    // Initialize Gemini with the provided API key
    const genAI = new GoogleGenerativeAI(apiKey);

    // Support both Gemini 2.5 Pro and Gemini 2.5 Flash
    let modelName;
    if (modelType === 'gemini-2.5-flash') {
      modelName = 'models/gemini-2.5-flash';
    } else {
      modelName = 'models/gemini-2.5-pro'; // Default to Pro 2.5
    }
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      },
    });

    const result = await model.generateContentStream(userPrompt);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          controller.enqueue(encoder.encode('\n[Error generating content]'));
          console.error('Stream error:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}