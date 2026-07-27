'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Bot,
  Sparkles,
  Save,
  Loader2,
  Mail,
  BookOpen,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AISettingsPanel() {
  const { accountId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [modelName, setModelName] = useState('gemini-3.1-flash-lite');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  const loadSettings = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-settings?accountId=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled ?? true);
        setModelName(data.model_name || 'gemini-3.1-flash-lite');
        setSystemPrompt(data.system_prompt || '');
        setKnowledgeBase(data.knowledge_base || '');
        setNotificationEmail(data.notification_email || '');
      }
    } catch (err) {
      console.error('Failed to load AI settings:', err);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          enabled,
          model_name: modelName,
          system_prompt: systemPrompt,
          knowledge_base: knowledgeBase,
          notification_email: notificationEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save AI settings');
      }

      toast.success('AI Assistant Settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to save AI settings:', err);
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                <Bot className="h-5 w-5 text-primary" />
                Gemini AI Assistant Configuration
              </CardTitle>
              <CardDescription>
                Customize your AI assistant's model, system prompt, knowledge base, and human handover alerts.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600">
                {enabled ? 'AI Enabled' : 'AI Paused'}
              </span>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                aria-label="Toggle AI Assistant"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="font-semibold text-emerald-950">
              Active Model: {modelName}
            </AlertTitle>
            <AlertDescription className="text-xs text-emerald-800">
              The AI auto-replies to incoming customer messages on WhatsApp using your custom prompt & knowledge base below.
            </AlertDescription>
          </Alert>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Sliders className="h-4 w-4 text-slate-600" />
              AI Model Selection
            </Label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Recommended Default)</option>
              <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            </select>
            <p className="text-xs text-slate-500">
              Select the Gemini model variant to power your WhatsApp assistant responses.
            </p>
          </div>

          {/* System Prompt & Instructions */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Bot className="h-4 w-4 text-slate-600" />
              System Prompt & Guidelines
            </Label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter system instructions for how the AI should behave..."
              rows={5}
              className="font-mono text-xs leading-relaxed text-slate-800"
            />
            <p className="text-xs text-slate-500">
              Define the AI's role, tone, boundaries, and instructions.
            </p>
          </div>

          {/* Knowledge Base */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <BookOpen className="h-4 w-4 text-slate-600" />
              Knowledge Base / Business Context & FAQs
            </Label>
            <Textarea
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              placeholder="Paste your business details, pricing, FAQs, services, or contact details here..."
              rows={6}
              className="font-mono text-xs leading-relaxed text-slate-800"
            />
            <p className="text-xs text-slate-500">
              The AI will read this information when answering customer questions on WhatsApp.
            </p>
          </div>

          {/* Hot Lead / Human Handover Alert Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Mail className="h-4 w-4 text-slate-600" />
              Human Handover Alert Email (SMTP Notification)
            </Label>
            <Input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="e.g. sales@yourdomain.com"
              className="text-sm"
            />
            <p className="text-xs text-slate-500">
              When a lead requests human assistance or asks to buy, an instant email alert is sent to this address.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save AI Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
