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

    // Log the requests sent to AI models
    console.log('=== AI REQUEST LOG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('System Instruction:');
    console.log(systemInstruction);
    console.log('\nUser Prompt:');
    console.log(userPrompt);
    console.log('=== END AI REQUEST LOG ===\n');

    // For now, only support Gemini Pro 2.5, but accept modelType for future extensibility
    const modelName = modelType === 'gemini-pro-2.5' ? 'models/gemini-2.5-pro' : 'models/gemini-2.5-pro';
    
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
    let fullResponse = '';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('=== AI RESPONSE LOG ===');
          console.log('Timestamp:', new Date().toISOString());
          console.log('Response chunks:');
          
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            console.log('Chunk:', text);
            controller.enqueue(encoder.encode(text));
          }
          
          console.log('\nFull Response:');
          console.log(fullResponse);
          console.log('=== END AI RESPONSE LOG ===\n');
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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}