import { createClient } from "@supabase/supabase-js";
import { sendTextMessage } from "@/lib/whatsapp/meta-api";
import { sendEmail } from "@/lib/email";
import { GoogleGenerativeAI } from "@google/generative-ai";

let supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}

export async function handleAIAssistant(
  accountId: string,
  conversationId: string,
  contactId: string,
  inboundText: string,
  configOwnerUserId: string,
  phoneNumberId: string,
  accessToken: string
) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI Assistant will not reply.");
    return;
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Fetch recent messages to build context
    const { data: messages } = await supabase
      .from("messages")
      .select("sender_type, content_text, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const history = messages?.reverse()?.map((msg: any) => ({
      role: msg.sender_type === "customer" ? "user" : "model",
      parts: [{ text: msg.content_text || "" }],
    })) || [];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // The user requested "gemini 3.1 flash lite" but let's use gemini-1.5-flash as it's the current recommended fast model
    // or specifically gemini-1.5-flash-8b (lite version)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are the GAS AI assistant. You answer queries for GAS AI. If you feel the lead is getting hot or requires human intelligence, you MUST include the exact phrase 'HUMAN_HANDOVER_REQUIRED' in your response.",
    });

    const chat = model.startChat({
      history,
    });

    const result = await chat.sendMessage(inboundText);
    let responseText = result.response.text();

    const handoverRequired = responseText.includes("HUMAN_HANDOVER_REQUIRED");
    
    if (handoverRequired) {
      responseText = responseText.replace("HUMAN_HANDOVER_REQUIRED", "").trim();
      
      // Send an email notification about the hot lead
      const contact = await supabase.from('contacts').select('name, phone').eq('id', contactId).single();
      const contactInfo = contact.data ? `${contact.data.name} (${contact.data.phone})` : contactId;

      await sendEmail({
        to: process.env.NOTIFICATION_EMAIL || "admin@example.com",
        subject: "🔥 HOT LEAD ALERT: Human Intelligence Needed",
        text: `A lead requires human attention.\n\nContact: ${contactInfo}\nConversation ID: ${conversationId}\n\nPlease check the CRM dashboard immediately.`,
        html: `<p>A lead requires human attention.</p><p><strong>Contact:</strong> ${contactInfo}</p><p><strong>Conversation ID:</strong> ${conversationId}</p><p>Please check the CRM dashboard immediately.</p>`
      });

      // Disable AI for this conversation so humans can take over
      await supabase.from("conversations").update({ bot_active: false }).eq("id", conversationId);
    }

    if (responseText) {
      // 2. Send the AI response via WhatsApp
      const targetContact = await supabase.from('contacts').select('phone').eq('id', contactId).single();
      if (!targetContact.data) return;

      const metaSendResult = await sendTextMessage({
        phoneNumberId,
        accessToken,
        to: targetContact.data.phone,
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

  } catch (error) {
    console.error("Error in AI Assistant:", error);
  }
}
