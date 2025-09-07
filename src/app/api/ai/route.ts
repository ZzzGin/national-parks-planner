import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { systemInstruction, userPrompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // Log the requests sent to AI models
    console.log('=== AI REQUEST LOG ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('System Instruction:');
    console.log(systemInstruction);
    console.log('\nUser Prompt:');
    console.log(userPrompt);
    console.log('=== END AI REQUEST LOG ===\n');

    const model = genAI.getGenerativeModel({
      model: 'models/gemini-2.5-pro',
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