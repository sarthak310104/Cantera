import { NextResponse } from "next/server";
import { getManagers } from "@/lib/queries";

export async function GET() {
  try {
    const managers = await getManagers();
    return NextResponse.json(managers);
  } catch (error) {
    console.error("Failed to load managers:", error);
    return NextResponse.json(
      { error: "Could not reach the database. Check your CognoDB instance is running." },
      { status: 503 }
    );
  }
}