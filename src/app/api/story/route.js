import { NextResponse } from 'next/server';

export async function POST(req) {
  // Always return this stub payload
  return NextResponse.json(
    {
      story: "Hello! This is your stub story.",
      audio: null
    },
    { status: 200 }
  );
}
