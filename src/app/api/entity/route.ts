import { NextRequest, NextResponse } from "next/server";
import { getEntityDetails } from "@/lib/bloodhound/client";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const objectId = searchParams.get("objectId");
  const kind = searchParams.get("kind") ?? undefined;

  if (!objectId) {
    return NextResponse.json(
      { error: "objectId is required" },
      { status: 400 }
    );
  }

  try {
    const result = await getEntityDetails(objectId, kind);
    const entity = result.data;

    // Transform BH response into EntityInfo format
    const props = entity.props ?? {};
    return NextResponse.json({
      objectId: (props.objectid as string) ?? objectId,
      kind: entity.kind ?? kind ?? "Base",
      label: (props.name as string) ?? (props.displayname as string) ?? objectId,
      isTierZero: (props.system_tags as string)?.includes("admin_tier_0") ?? false,
      isOwned: (props.system_tags as string)?.includes("owned") ?? false,
      properties: props,
      counts: entity.counts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
