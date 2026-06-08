import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
const pdfParse = require('pdf-parse')
import * as xlsx from 'xlsx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_API_KEY')

const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

function chunkText(text: string): string[] {
  const chunks: string[] = []
  let index = 0
  while (index < text.length) {
    chunks.push(text.slice(index, index + CHUNK_SIZE))
    index += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('user_id') as string

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in environment variables.' }, { status: 500 })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_id')
      .eq('user_id', userId)
      .single()

    const accountId = profile?.account_id
    if (!accountId) {
      return NextResponse.json({ error: 'No account found for user' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let text = ''

    if (file.name.endsWith('.pdf')) {
      const data = await pdfParse(buffer)
      text = data.text
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      text = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name]
        return xlsx.utils.sheet_to_csv(sheet)
      }).join('\n\n')
    } else if (file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from document' }, { status: 400 })
    }

    // 1. Insert into knowledge_documents
    const { data: doc, error: docError } = await supabaseAdmin
      .from('knowledge_documents')
      .insert({
        account_id: accountId,
        user_id: userId,
        filename: file.name,
        file_url: 'local', // We don't use Supabase Storage yet, so this satisfies NOT NULL
        file_size: file.size,
      })
      .select()
      .single()

    if (docError || !doc) {
      console.error('Error inserting document:', docError)
      return NextResponse.json({ error: 'Failed to record document in database' }, { status: 500 })
    }

    // 2. Chunk text
    const chunks = chunkText(text)

    // 3. Generate embeddings using Gemini and insert
    for (const chunk of chunks) {
      if (chunk.trim().length === 0) continue

      const model = ai.getGenerativeModel({ model: 'text-embedding-004' })
      const response = await model.embedContent(chunk)

      const embedding = response.embedding?.values

      if (!embedding) continue

      const { error: chunkError } = await supabaseAdmin
        .from('knowledge_chunks')
        .insert({
          account_id: accountId,
          document_id: doc.id,
          content: chunk,
          embedding: `[${embedding.join(',')}]`, // pgvector format
        })

      if (chunkError) {
        console.error('Error inserting chunk:', chunkError)
      }
    }

    return NextResponse.json({ success: true, document: doc }, { status: 200 })
  } catch (error) {
    console.error('Error processing document upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
