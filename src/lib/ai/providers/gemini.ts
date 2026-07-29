import { GoogleGenerativeAI } from '@google/generative-ai'
import { AiError, type ProviderResult } from '../types'
import { mergeConsecutive, normalizeUsage, toNetworkError, type ProviderArgs } from './shared'

/**
 * Call Google Gemini's generateContent endpoint with the caller's own API key.
 * Returns raw text + token usage.
 */
export async function generateGemini(args: ProviderArgs): Promise<ProviderResult> {
  const { apiKey, model, systemPrompt, messages } = args

  try {
    const ai = new GoogleGenerativeAI(apiKey)
    const genModel = ai.getGenerativeModel({
      model: model || 'gemini-3.1-flash-lite',
      systemInstruction: systemPrompt,
    })

    const contents = mergeConsecutive(messages).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    if (contents.length > 0 && contents[0].role !== 'user') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] })
    }

    const result = await genModel.generateContent({ contents })
    const response = await result.response
    const text = response.text()

    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new AiError('Gemini returned an empty response.', {
        code: 'empty_response',
      })
    }

    const usageMetadata = response.usageMetadata
    const usage = normalizeUsage({
      prompt: usageMetadata?.promptTokenCount,
      completion: usageMetadata?.candidatesTokenCount,
      total: usageMetadata?.totalTokenCount,
    })

    return { text, usage }
  } catch (err: any) {
    if (err instanceof AiError) throw err
    if (err?.message?.includes('API_KEY_INVALID') || err?.status === 400) {
      throw new AiError('Invalid Gemini API Key.', { code: 'invalid_key', status: 401 })
    }
    throw toNetworkError(err)
  }
}
