-- Migration 024: Add bot_active column safety and ai_settings table

-- 1. Ensure bot_active exists on conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS bot_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Create ai_settings table
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  model_name TEXT NOT NULL DEFAULT 'gemini-2.0-flash-lite',
  api_key TEXT DEFAULT '',
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful and professional customer support AI assistant for our business on WhatsApp. Answer customer inquiries clearly and concisely. If a customer asks to buy, requests custom pricing, or wants to talk to a human agent, include the exact phrase "HUMAN_HANDOVER_REQUIRED" in your response.',
  knowledge_base TEXT DEFAULT '',
  notification_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on ai_settings
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS ai_settings_select ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_insert ON public.ai_settings;
DROP POLICY IF EXISTS ai_settings_update ON public.ai_settings;

CREATE POLICY ai_settings_select ON public.ai_settings FOR SELECT USING (is_account_member(account_id));
CREATE POLICY ai_settings_insert ON public.ai_settings FOR INSERT WITH CHECK (is_account_member(account_id, 'agent'));
CREATE POLICY ai_settings_update ON public.ai_settings FOR UPDATE USING (is_account_member(account_id, 'agent'));
