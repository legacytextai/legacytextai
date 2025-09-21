-- Create table to track weekly journal blasts
CREATE TABLE public.weekly_blasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  email_sent boolean NOT NULL DEFAULT false,
  pdf_size integer,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Prevent duplicate sends for same user/week
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_blasts ENABLE ROW LEVEL SECURITY;

-- Users can view their own blast records
CREATE POLICY "Users can view their own weekly blasts" 
ON public.weekly_blasts 
FOR SELECT 
USING (user_id IN ( SELECT users_app.id FROM users_app WHERE users_app.auth_user_id = auth.uid()));

-- Service can manage all blast records
CREATE POLICY "Service can manage all weekly blasts" 
ON public.weekly_blasts 
FOR ALL 
USING (true)
WITH CHECK (true);