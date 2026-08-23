import { NextResponse } from "next/server";
import { isDatabaseReachable } from "@/lib/db";

export async function GET() {
  const reachable = await isDatabaseReachable();
  return NextResponse.json(
    { reachable },
    { status: reachable ? 200 : 503 }
  );
}
