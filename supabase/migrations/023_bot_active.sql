-- Add bot_active to conversations
ALTER TABLE public.conversations
ADD COLUMN bot_active BOOLEAN NOT NULL DEFAULT true;

-- Update RLS policies or indexes if necessary (none strictly required for a simple flag)
