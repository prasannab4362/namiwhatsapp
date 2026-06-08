import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getMediaUrl, downloadMedia, sendTextMessage, sendMediaMessage } from '../whatsapp/meta-api'
import * as googleTTS from 'google-tts-api'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY')

export async function handleAIBotReply({
  accountId,
  userId,
  contactId,
  conversationId,
  message,
  phoneNumberId,
  accessToken,
  recipientPhone,
}: {
  accountId: string
  userId: string
  contactId: string
  conversationId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any
  phoneNumberId: string
  accessToken: string
  recipientPhone: string
}) {
  if (!process.env.GEMINI_API_KEY) return // AI disabled silently

  try {
    // 1. Check if AI is paused for this conversation
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('ai_paused')
      .eq('id', conversationId)
      .single()

    if (conv?.ai_paused) {
      console.log(`[AI Bot] Paused for conversation ${conversationId}`)
      return
    }

    // 2. Check if AI is enabled for the account
    const { data: aiSettings } = await supabaseAdmin
      .from('ai_settings')
      .select('is_bot_enabled, system_prompt')
      .eq('account_id', accountId)
      .single()

    if (!aiSettings?.is_bot_enabled) {
      return
    }

    let userText = message.text?.body || ''
    const isAudio = message.type === 'audio'

    // 3. Handle Audio Transcribing
    if (isAudio && message.audio?.id) {
      console.log(`[AI Bot] Transcribing audio ${message.audio.id}`)
      try {
        const { url: metaUrl, mimeType } = await getMediaUrl({
          mediaId: message.audio.id,
          accessToken,
        })
        const { buffer } = await downloadMedia({
          downloadUrl: metaUrl,
          accessToken,
        })

        // Transcribe with Gemini Flash
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })
        const transcribeResponse = await model.generateContent([
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType,
            },
          },
          'Please transcribe the speech in this audio exactly. Just output the transcription and nothing else.',
        ])

        userText = transcribeResponse.response.text() || ''
        console.log(`[AI Bot] Transcribed: "${userText}"`)
      } catch (err) {
        console.error('[AI Bot] Failed to transcribe audio:', err)
        return // Can't process if we can't understand
      }
    }

    if (!userText.trim()) return

    // 4. Generate Embedding for Vector Search
    const embedModel = ai.getGenerativeModel({ model: 'text-embedding-004' })
    const embedResponse = await embedModel.embedContent(userText)
    const embedding = embedResponse.embedding?.values

    let knowledgeContext = ''
    if (embedding) {
      // 5. Query Vector DB
      const { data: chunks, error: rpcError } = await supabaseAdmin.rpc('match_knowledge_chunks', {
        query_embedding: `[${embedding.join(',')}]`,
        filter_account_id: accountId,
        match_threshold: 0.3,
        match_count: 5,
      })

      if (rpcError) {
        console.error('[AI Bot] Vector search error:', rpcError)
      } else if (chunks && chunks.length > 0) {
        knowledgeContext = chunks.map((c: any) => c.content).join('\n\n---\n\n')
      }
    }

    // 6. Generate Reply with Gemini
    const systemPrompt = `
${aiSettings.system_prompt}

You are responding to a WhatsApp message. Keep your answer concise, conversational, and helpful. Use emojis naturally.
Format using WhatsApp markdown (*bold*, _italic_, ~strikethrough~).

If relevant context is provided below from the knowledge base, use it to answer the user accurately. If the answer is not in the context, just answer normally but do not hallucinate specific business details.

KNOWLEDGE BASE CONTEXT:
${knowledgeContext || 'No specific knowledge base context found.'}
`

    const chatModel = ai.getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: systemPrompt
    })
    const aiResponse = await chatModel.generateContent(userText)

    const replyText = aiResponse.response.text() || 'Sorry, I am having trouble understanding right now.'

    // 7. Send the Reply back via Meta API
    // If user sent audio, try to reply with audio!
    if (isAudio) {
      try {
        console.log(`[AI Bot] Generating TTS for reply...`)
        // google-tts-api is limited to 200 chars per request, so if it's long, we might just send text.
        // We'll attempt TTS if text is short enough, otherwise fallback to text.
        if (replyText.length < 200) {
           const ttsUrl = googleTTS.getAudioUrl(replyText, {
             lang: 'en',
             slow: false,
             host: 'https://translate.google.com',
           })
           
           await sendMediaMessage({
             phoneNumberId,
             accessToken,
             to: recipientPhone,
             kind: 'audio',
             link: ttsUrl,
           })
           
           // Also log to our DB so it shows up in Inbox
           await supabaseAdmin.from('messages').insert({
             conversation_id: conversationId,
             sender_type: 'bot',
             content_type: 'audio',
             media_url: ttsUrl,
             status: 'sent',
             created_at: new Date().toISOString()
           })
           return
        }
      } catch (err) {
        console.error('[AI Bot] TTS generation failed, falling back to text:', err)
      }
    }

    // Default: Send text reply
    await sendTextMessage({
      phoneNumberId,
      accessToken,
      to: recipientPhone,
      text: replyText,
    })

    // Log the bot's outgoing message to DB
    await supabaseAdmin.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'bot',
      content_type: 'text',
      content_text: replyText,
      status: 'sent',
      created_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('[AI Bot] Handling failed:', error)
  }
}
