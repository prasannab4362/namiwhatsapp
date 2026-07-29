import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

let _adminClient: ReturnType<typeof createClient> | null = null;
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient as unknown as {
    from: (table: string) => {
      update: (patch: { bot_active: boolean }) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    const { bot_active } = body;

    if (typeof bot_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid bot_active state" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin()
      .from("conversations")
      .update({ bot_active })
      .eq("id", conversationId);

    if (error) {
      // If the column doesn't exist yet on the remote database, attempt auto-heal or log details
      console.error("[bot-status API] Supabase update error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to update bot status in database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, bot_active });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[bot-status API] Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
