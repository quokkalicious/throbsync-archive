// src/app/api/test/route.js

import { NextResponse } from 'next/server';

// Handle GET requests
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is working (GET)!'
  });
}

// Handle POST requests
export async function POST(request) {
  return NextResponse.json({
    success: true,
    message: 'API is working (POST)!'
  });
}
