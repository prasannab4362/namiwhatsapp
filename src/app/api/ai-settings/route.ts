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
      select: (cols?: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          single: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
      upsert: (row: unknown, opts?: { onConflict?: string }) => {
        select: (cols?: string) => {
          single: () => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
}

const DEFAULT_SETTINGS = {
  enabled: true,
  model_name: "gemini-3.1-flash-lite",
  api_key: "",
  system_prompt: `You are an intelligent, polite, and efficient AI sales & support assistant for our business on WhatsApp. 
Your goal is to assist customers, answer questions accurately, and provide relevant information.

Important Rules:
1. Always maintain a friendly and professional tone.
2. Rely on the provided Business Knowledge Base & FAQs for facts. If you do not know the answer, politely offer to connect them with a human agent.
3. If a customer asks to buy, requests custom pricing, or explicitly asks to speak to a human, include the exact phrase "HUMAN_HANDOVER_REQUIRED" in your response so a human team member is notified instantly.`,
  knowledge_base: `Business Name: GAS AI
Services: AI Automation, WhatsApp CRM Integration, Lead Generation, & Custom Software Solutions.
Working Hours: Mon-Fri 9:00 AM - 6:00 PM (EST).
Support Email: support@gasai.in`,
  notification_email: "",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ ...DEFAULT_SETTINGS });
    }

    const { data, error } = await supabaseAdmin()
      .from("ai_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) {
      console.warn("[ai-settings GET] DB error or table not created yet:", error.message);
      return NextResponse.json({ ...DEFAULT_SETTINGS });
    }

    if (!data) {
      return NextResponse.json({ ...DEFAULT_SETTINGS });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    console.error("[ai-settings GET] Error:", err);
    return NextResponse.json({ ...DEFAULT_SETTINGS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, enabled, model_name, api_key, system_prompt, knowledge_base, notification_email } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {
      account_id: accountId,
      enabled: enabled ?? true,
      model_name: model_name || "gemini-3.1-flash-lite",
      system_prompt: system_prompt ?? DEFAULT_SETTINGS.system_prompt,
      knowledge_base: knowledge_base ?? "",
      notification_email: notification_email ?? "",
      updated_at: new Date().toISOString(),
    };

    if (typeof api_key === "string") {
      payload.api_key = api_key;
    }

    const { data, error } = await supabaseAdmin()
      .from("ai_settings")
      .upsert(payload, { onConflict: "account_id" })
      .select()
      .single();

    if (error) {
      console.error("[ai-settings POST] Supabase error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to save AI settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[ai-settings POST] Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
