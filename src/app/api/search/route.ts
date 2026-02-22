import { NextRequest, NextResponse } from "next/server";
import { searchNodes } from "@/lib/bloodhound/client";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10");
  const type = req.nextUrl.searchParams.get("type");

  if (!q.trim()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const results = await searchNodes(q, limit);
    const filtered = type
      ? results.filter((r) => r.type.toLowerCase() === type.toLowerCase())
      : results;
    return NextResponse.json({ data: filtered });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
