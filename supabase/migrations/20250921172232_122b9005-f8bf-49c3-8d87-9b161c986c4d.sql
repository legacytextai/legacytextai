-- Create exports table for premium PDF tracking
CREATE TABLE public.exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('premium_pdf')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'formatting', 'rendering', 'ready', 'error')),
  storage_key_manuscript TEXT,
  storage_key_pdf TEXT,
  url TEXT,
  content_signature TEXT,
  page_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exports ENABLE ROW LEVEL SECURITY;

-- Create policies for exports
CREATE POLICY "Users can view their own exports" 
ON public.exports 
FOR SELECT 
USING (user_id IN (SELECT id FROM users_app WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can create their own exports" 
ON public.exports 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users_app WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own exports" 
ON public.exports 
FOR UPDATE 
USING (user_id IN (SELECT id FROM users_app WHERE auth_user_id = auth.uid()));

CREATE POLICY "Service can manage all exports" 
ON public.exports 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_exports_user_id ON public.exports(user_id);
CREATE INDEX idx_exports_content_signature ON public.exports(content_signature);
CREATE INDEX idx_exports_status ON public.exports(status);

-- Create storage buckets for manuscripts and exports
INSERT INTO storage.buckets (id, name, public) VALUES ('manuscripts', 'manuscripts', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Create storage policies for manuscripts bucket
CREATE POLICY "Users can view their own manuscripts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manuscripts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service can manage manuscripts" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'manuscripts');

-- Create storage policies for exports bucket
CREATE POLICY "Users can view their own exports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service can manage exports" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'exports');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_exports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exports_updated_at
BEFORE UPDATE ON public.exports
FOR EACH ROW
EXECUTE FUNCTION public.update_exports_updated_at();