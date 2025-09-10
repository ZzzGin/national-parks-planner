import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { systemInstruction, userPrompt, modelType, apiKey } = await req.json();

    // Log the request details (be careful not to log API keys)
    console.log('=== AI API Request ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Model Type: ${modelType || 'default (gemini-2.5-pro)'}`);
    console.log(`System Instruction Length: ${systemInstruction?.length || 0} characters`);
    console.log(`User Prompt Length: ${userPrompt?.length || 0} characters`);
    console.log(`User Prompt Preview: ${userPrompt?.substring(0, 200)}${userPrompt?.length > 200 ? '...' : ''}`);
    console.log('=====================');

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

    const startTime = Date.now();
    console.log(`Starting AI generation with model: ${modelName}`);
    
    const result = await model.generateContentStream(userPrompt);

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        let totalChunks = 0;
        let totalCharacters = 0;
        
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            totalChunks++;
            totalCharacters += text.length;
            controller.enqueue(encoder.encode(text));
          }
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          console.log(`=== AI Generation Complete ===`);
          console.log(`Duration: ${duration}ms`);
          console.log(`Total chunks: ${totalChunks}`);
          console.log(`Total characters generated: ${totalCharacters}`);
          console.log(`Average chars per chunk: ${totalChunks > 0 ? Math.round(totalCharacters / totalChunks) : 0}`);
          console.log(`Characters per second: ${duration > 0 ? Math.round(totalCharacters / (duration / 1000)) : 0}`);
          console.log('==============================');
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode('\n[Error generating content]'));
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
    console.error('=== API Error ===');
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
    console.error(`Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    console.error('=================');
    
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}