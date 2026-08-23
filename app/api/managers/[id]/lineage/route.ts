import { NextResponse } from "next/server";
import { getManagerLineage } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  const hopsParam = url.searchParams.get("hops");
  const hops = hopsParam ? Number(hopsParam) : 3;

  try {
    const graph = await getManagerLineage(params.id, hops);
    if (graph.nodes.length === 0) {
      return NextResponse.json(
        { error: `No manager found with id "${params.id}".` },
        { status: 404 }
      );
    }
    return NextResponse.json(graph);
  } catch (error) {
    console.error("Failed to load manager lineage:", error);
    return NextResponse.json(
      { error: "Could not reach the database. Check your CognoDB instance is running." },
      { status: 503 }
    );
  }
}