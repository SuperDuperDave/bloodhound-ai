import { NextRequest, NextResponse } from "next/server";
import { runCypher } from "@/lib/bloodhound/client";

export async function POST(req: NextRequest) {
  const { query, include_properties = true } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Block write operations for safety
  const upper = query.toUpperCase().replace(/\s+/g, " ");
  if (
    upper.includes("DELETE ") ||
    upper.includes("DETACH ") ||
    upper.includes("CREATE ") ||
    upper.includes(" SET ") ||
    upper.includes("REMOVE ") ||
    upper.includes("MERGE ")
  ) {
    return NextResponse.json(
      { error: "Write operations are not permitted" },
      { status: 403 }
    );
  }

  try {
    const data = await runCypher(query, include_properties);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Query execution failed" },
      { status: 500 }
    );
  }
}
