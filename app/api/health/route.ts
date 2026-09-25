import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'GF Chatbot Backend API',
    timestamp: new Date().toISOString(),
  });
}
