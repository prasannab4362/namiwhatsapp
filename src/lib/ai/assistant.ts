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
  try {
    const supabase = getSupabaseAdmin();

    // 0. Fetch account AI settings
    let enabled = true;
    let modelName = "gemini-1.5-flash";
    let customApiKey = "";
    let systemPrompt = `You are a helpful and professional customer support AI assistant for our business on WhatsApp. Answer customer inquiries clearly and concisely. If a customer asks to buy, requests custom pricing, or wants to talk to a human agent, include the exact phrase "HUMAN_HANDOVER_REQUIRED" in your response.`;
    let knowledgeBase = "";
    let notificationEmail = process.env.NOTIFICATION_EMAIL || "";

    const { data: aiSettings } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (aiSettings) {
      if (aiSettings.enabled === false) {
        console.log("[AI Assistant] AI is globally disabled for this account.");
        return;
      }
      if (aiSettings.api_key) customApiKey = aiSettings.api_key;
      if (aiSettings.model_name) {
        // Map user model selection to Generative AI SDK model identifier
        const m = aiSettings.model_name.toLowerCase();
        if (m.includes("2.0")) {
          modelName = "gemini-2.0-flash-lite";
        } else if (m.includes("1.5-pro")) {
          modelName = "gemini-1.5-pro";
        } else {
          modelName = "gemini-1.5-flash";
        }
      }
      if (aiSettings.system_prompt) systemPrompt = aiSettings.system_prompt;
      if (aiSettings.knowledge_base) knowledgeBase = aiSettings.knowledge_base;
      if (aiSettings.notification_email) notificationEmail = aiSettings.notification_email;
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in Environment or AI Settings. AI Assistant will not reply.");
      return;
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
    const dbMessages = messages || [];
    
    // The latest message in the DB is the current inbound message.
    // We exclude it from the history as it will be passed to sendMessage.
    const rawHistory = dbMessages.slice(1).reverse().map((msg: any) => ({
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
      const contactInfo = contact.data ? `${contact.data.name} (${contact.data.phone})` : contactId;

      if (notificationEmail) {
        await sendEmail({
          to: notificationEmail,
          subject: "🔥 HOT LEAD ALERT: Human Intelligence Needed",
          text: `A lead requires human attention.\n\nContact: ${contactInfo}\nConversation ID: ${conversationId}\n\nPlease check the CRM dashboard immediately.`,
          html: `<p>A lead requires human attention.</p><p><strong>Contact:</strong> ${contactInfo}</p><p><strong>Conversation ID:</strong> ${conversationId}</p><p>Please check the CRM dashboard immediately.</p>`
        });
      }

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
