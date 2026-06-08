'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, Trash2, Upload, FileText, FileSpreadsheet, Bot } from 'lucide-react'

export function AiSettings() {
  const { user, accountId } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [prompt, setPrompt] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documents, setDocuments] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)
    
    // Load settings
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (settings) {
      setIsEnabled(settings.is_bot_enabled)
      setPrompt(settings.system_prompt)
    }

    // Load documents
    const { data: docs } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (docs) {
      setDocuments(docs)
    }

    setLoading(false)
  }

  async function handleSaveSettings() {
    if (!user) return
    setSaving(true)
    const { error } = await supabase
      .from('ai_settings')
      .upsert({
        account_id: accountId,
        is_bot_enabled: isEnabled,
        system_prompt: prompt,
        updated_at: new Date().toISOString()
      }, { onConflict: 'account_id' })

    setSaving(false)
    if (error) {
      toast.error('Failed to save AI settings')
      console.error(error)
    } else {
      toast.success('AI Settings saved!')
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', user.id)

    try {
      const res = await fetch('/api/ai/documents', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      toast.success('Document added to Knowledge Base!')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document')
      console.error(error)
    } finally {
      setUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  async function handleDeleteDocument(docId: string) {
    const { error } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', docId)

    if (error) {
      toast.error('Failed to delete document')
    } else {
      toast.success('Document removed')
      setDocuments(docs => docs.filter(d => d.id !== docId))
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-slate-400 size-8" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Settings Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              AI Bot Settings
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure how the Gemini-powered AI responds to incoming messages.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="ai-toggle" className="text-slate-300">
              {isEnabled ? 'Bot Active' : 'Bot Disabled'}
            </Label>
            <Switch
              id="ai-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="system-prompt" className="text-slate-200">
            System Prompt
          </Label>
          <Textarea
            id="system-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[150px] bg-slate-950 border-slate-700 text-slate-200 font-mono text-sm placeholder:text-slate-600"
            placeholder="You are a helpful assistant for our business..."
          />
          <p className="text-xs text-slate-500">
            Tell the AI how to behave, what tone to use, and any strict rules it should follow.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
            Save AI Settings
          </Button>
        </div>
      </div>

      {/* Knowledge Base Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload documents (PDF, TXT, CSV, XLSX) for the AI to use as context when replying.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-950/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <Loader2 className="animate-spin size-8 text-primary mb-3" />
                ) : (
                  <Upload className="size-8 text-slate-400 mb-3" />
                )}
                <p className="mb-2 text-sm text-slate-300">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">PDF, TXT, CSV, or XLSX</p>
              </div>
              <Input
                id="dropzone-file"
                type="file"
                className="hidden"
                accept=".txt,.pdf,.csv,.xlsx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Uploaded Documents ({documents.length})</h3>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500 italic border border-slate-800 rounded-lg p-4 text-center bg-slate-950/30">
                No documents uploaded yet.
              </p>
            ) : (
              <div className="grid gap-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-3">
                      {doc.filename.endsWith('.pdf') ? (
                        <FileText className="size-5 text-red-400" />
                      ) : doc.filename.endsWith('.xlsx') || doc.filename.endsWith('.csv') ? (
                        <FileSpreadsheet className="size-5 text-green-400" />
                      ) : (
                        <FileText className="size-5 text-blue-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-200">{doc.filename}</p>
                        <p className="text-xs text-slate-500">
                          {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => handleDeleteDocument(doc.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
