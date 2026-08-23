import { NextResponse } from "next/server";
import { getFullNetwork } from "@/lib/queries";

export async function GET() {
  try {
    const graph = await getFullNetwork();
    return NextResponse.json(graph);
  } catch (error) {
    console.error("Failed to load network:", error);
    return NextResponse.json(
      { error: "Could not reach the database. Check your CognoDB instance is running." },
      { status: 503 }
    );
  }
}