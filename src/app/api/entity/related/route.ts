import { NextRequest, NextResponse } from "next/server";
import { getRelatedObjects } from "@/lib/bloodhound/client";
import type { ADNodeKind } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const objectId = searchParams.get("objectId");
  const kind = searchParams.get("kind");
  const section = searchParams.get("section");
  const skip = parseInt(searchParams.get("skip") ?? "0", 10);
  const limit = parseInt(searchParams.get("limit") ?? "10", 10);

  if (!objectId || !kind || !section) {
    return NextResponse.json(
      { error: "objectId, kind, and section are required" },
      { status: 400 }
    );
  }

  try {
    const result = await getRelatedObjects(objectId, kind, section, skip, limit);

    // Transform BH response into the format expected by RelationshipSection
    const items = (result.data ?? []).map((item) => ({
      objectId: item.objectId,
      label: item.label,
      kind: (item.kind ?? "Base") as ADNodeKind,
    }));

    return NextResponse.json({
      count: result.count ?? items.length,
      items,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
