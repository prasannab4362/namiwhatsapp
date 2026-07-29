import { createClient } from "@supabase/supabase-js";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { sendEmail } from "@/lib/email";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Typed row shapes for tables that are not in the generated DB schema ──────
interface AiSettingsRow {
  enabled: boolean;
  api_key?: string | null;
  model_name?: string | null;
  system_prompt?: string | null;
  knowledge_base?: string | null;
  notification_email?: string | null;
}

interface MessageRow {
  sender_type: string;
  content_text: string | null;
  created_at: string;
}

interface ContactRow {
  name?: string | null;
  phone: string;
}

interface MessageInsert {
  conversation_id: string;
  sender_type: string;
  content_type: string;
  content_text: string;
  message_id?: string;
  status: string;
  created_at: string;
}

interface ConversationUpdate {
  last_message_text?: string;
  last_message_at?: string;
  bot_active?: boolean;
}

// Helper: cast the untyped admin client so we can call typed helpers
// without TS complaining that every table is `never`.
type UntypedClient = {
  from: (table: string) => UntypedBuilder;
};
type UntypedBuilder = PromiseLike<{ data: unknown; error: { message: string } | null }> & {
  select: (cols?: string) => UntypedBuilder;
  insert: (row: MessageInsert) => Promise<{ error: { message: string } | null }>;
  upsert: (row: unknown, opts?: { onConflict?: string }) => UntypedBuilder;
  update: (patch: ConversationUpdate) => UntypedBuilder;
  eq: (col: string, val: string | boolean) => UntypedBuilder;
  order: (col: string, opts?: { ascending: boolean }) => UntypedBuilder;
  limit: (n: number) => UntypedBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  single: () => Promise<{ data: unknown; error: { message: string } | null }>;
};

let supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}

/**
 * Handles incoming customer messages and generates replies using Google Gemini.
 * It builds a sanitized, alternating role history to comply with Gemini's SDK constraints,
 * fallback-resolving to the GEMINI_API_KEY environment variable if no custom key is provided.
 */
export async function handleAIAssistant(
  accountId: string,
  conversationId: string,
  contactId: string,
  inboundText: string,
  _configOwnerUserId: string,
  phoneNumberId: string,
  accessToken: string
) {
  let customApiKey = "";
  try {
    const supabase = getSupabaseAdmin() as unknown as UntypedClient;

    // 0. Fetch account AI settings
    let modelName = "gemini-3.1-flash-lite";
    let systemPrompt = `You are a helpful and professional customer support AI assistant for our business on WhatsApp. Answer customer inquiries clearly and concisely. If a customer asks to buy, requests custom pricing, or wants to talk to a human agent, include the exact phrase "HUMAN_HANDOVER_REQUIRED" in your response.`;
    let knowledgeBase = "";
    let notificationEmail = process.env.NOTIFICATION_EMAIL || "";

    const { data: aiSettingsRaw } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();
    const aiSettings = aiSettingsRaw as AiSettingsRow | null;

    if (aiSettings) {
      if (aiSettings.enabled === false) {
        console.log("[AI Assistant] AI is globally disabled for this account.");
        return;
      }
      if (aiSettings.api_key) customApiKey = aiSettings.api_key as string;
      if (aiSettings.model_name) {
        modelName = aiSettings.model_name as string;
      }
      if (aiSettings.system_prompt) systemPrompt = aiSettings.system_prompt as string;
      if (aiSettings.knowledge_base) knowledgeBase = aiSettings.knowledge_base as string;
      if (aiSettings.notification_email) notificationEmail = aiSettings.notification_email as string;
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in Environment or AI Settings.");
    }

    const fullSystemInstruction = `${systemPrompt}

${knowledgeBase ? `BUSINESS KNOWLEDGE BASE & FAQS:\n${knowledgeBase}\n` : ""}
CRITICAL RULE: If you feel the lead is getting hot, asking to purchase, or requires human intelligence, you MUST include the exact phrase "HUMAN_HANDOVER_REQUIRED" in your response.`;

    // 1. Fetch recent messages to build context
    const { data: messages } = await supabase
      .from("messages")
      .select("sender_type, content_text, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build alternating chat history for Gemini
    const dbMessages = (messages as MessageRow[] | null) || [];
    
    // The latest message in the DB is the current inbound message.
    // We exclude it from the history as it will be passed to sendMessage.
    const rawHistory = dbMessages.slice(1).reverse().map((msg: { sender_type: string; content_text: string | null }) => ({
      role: msg.sender_type === "customer" ? "user" : "model",
      text: msg.content_text || "",
    }));

    // Merge consecutive messages of the same role
    const mergedHistory: { role: string; text: string }[] = [];
    for (const item of rawHistory) {
      if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === item.role) {
        mergedHistory[mergedHistory.length - 1].text += "\n" + item.text;
      } else {
        mergedHistory.push(item);
      }
    }

    // Ensure history starts with a 'user' message (Gemini SDK requirement)
    while (mergedHistory.length > 0 && mergedHistory[0].role === "model") {
      mergedHistory.shift();
    }

    // Ensure history does not end with a 'user' message, as the new inbound message is a 'user' message
    let finalInboundText = inboundText;
    if (mergedHistory.length > 0 && mergedHistory[mergedHistory.length - 1].role === "user") {
      const lastUserTurn = mergedHistory.pop();
      if (lastUserTurn) {
        finalInboundText = lastUserTurn.text + "\n" + finalInboundText;
      }
    }

    const history = mergedHistory.map(item => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: fullSystemInstruction,
    });

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(finalInboundText);
    let responseText = result.response.text();

    const handoverRequired = responseText.includes("HUMAN_HANDOVER_REQUIRED");
    
    if (handoverRequired) {
      responseText = responseText.replace("HUMAN_HANDOVER_REQUIRED", "").trim();
      
      // Send an email notification about the hot lead
      const contact = await supabase.from('contacts').select('name, phone').eq('id', contactId).single();
      const contactData = contact.data as ContactRow | null;
      const contactInfo = contactData ? `${contactData.name} (${contactData.phone})` : contactId;

      if (notificationEmail) {
        await sendEmail({
          to: notificationEmail,
          subject: "🔥 HOT LEAD ALERT: Human Intelligence Needed",
          text: `A lead requires human attention.\n\nContact: ${contactInfo}\nConversation ID: ${conversationId}\n\nPlease check the CRM dashboard immediately.`,
          html: `<p>A lead requires human attention.</p><p><strong>Contact:</strong> ${contactInfo}</p><p><strong>Conversation ID:</strong> ${conversationId}</p><p>Please check the CRM dashboard immediately.</p>`
        });
      }

      // Automatically disabling AI is disabled per user request. 
      // User will manually toggle the AI status from the CRM interface instead.
      // await supabase.from("conversations").update({ bot_active: false }).eq("id", conversationId);
    }

    if (responseText) {
      // 2. Send the AI response via WhatsApp
      const targetContactResult = await supabase.from('contacts').select('phone').eq('id', contactId).single();
      const targetContact = targetContactResult.data as ContactRow | null;
      if (!targetContact) return;

      const metaSendResult = await sendTextMessage({
        phoneNumberId,
        accessToken,
        to: targetContact.phone,
        text: responseText,
      });

      // 3. Insert the AI response into the database
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        content_type: "text",
        content_text: responseText,
        message_id: metaSendResult.messageId,
        status: "sent",
        created_at: new Date().toISOString(),
      });

      // Update conversation last message
      await supabase.from("conversations").update({
        last_message_text: responseText,
        last_message_at: new Date().toISOString(),
      }).eq("id", conversationId);
    }

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in AI Assistant:", error);
    try {
      let diagInfo = "";
      const apiKey = customApiKey || process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const diagRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          const diagData = await diagRes.json().catch(() => ({}));
          if (diagData.error) {
            diagInfo = ` [Key Diagnostic: ${diagData.error.message || JSON.stringify(diagData.error)}]`;
          } else if (diagData.models && Array.isArray(diagData.models)) {
            const names = diagData.models.slice(0, 5).map((m: { name: string }) => m.name.replace("models/", "")).join(", ");
            diagInfo = ` [Supported models: ${names}]`;
          }
        } catch (diagErr: unknown) {
          const dMsg = diagErr instanceof Error ? diagErr.message : String(diagErr);
          diagInfo = ` [Diagnostic fetch failed: ${dMsg}]`;
        }
      }

      (getSupabaseAdmin() as unknown as UntypedClient).from("messages").insert({
        conversation_id: conversationId,
        sender_type: "agent",
        content_type: "text",
        content_text: `⚠️ [AI Assistant Error]: ${errMessage}${diagInfo}`,
        status: "failed",
        created_at: new Date().toISOString(),
      });
    } catch (insertErr) {
      console.error("Failed to log AI error to database:", insertErr);
    }
  }
}
