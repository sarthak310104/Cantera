import { NextResponse } from "next/server";
import { getCoachingCousins } from "@/lib/queries";

export async function GET() {
  try {
    const pairs = await getCoachingCousins();
    return NextResponse.json(pairs);
  } catch (error) {
    console.error("Failed to load coaching cousins:", error);
    return NextResponse.json(
      { error: "Could not reach the database. Check your CognoDB instance is running." },
      { status: 503 }
    );
  }
}