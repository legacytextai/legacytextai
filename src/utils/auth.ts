import { SupabaseClient } from '@supabase/supabase-js';

export function isE164(s: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(s);
}

export async function handleSignUp(
  supabase: SupabaseClient,
  params: { email: string; password: string; phoneE164: string }
) {
  const { email, password, phoneE164 } = params;

  if (!isE164(phoneE164)) {
    throw new Error('Enter phone in E.164 format, e.g. +13235551234');
  }

  const origin =
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    import.meta.env?.VITE_SITE_URL ||
    '';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ Force email to land on the callback handler
      emailRedirectTo: `${origin}/auth/callback`,
      // ✅ Stash the phone so we OTP-verify it after the email click
      data: { pending_phone_e164: phoneE164 },
    },
  });

  if (error) throw error;
  return data;
}

export async function resendConfirmationEmail(supabase: SupabaseClient, email: string) {
  const origin =
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    import.meta.env?.VITE_SITE_URL ||
    '';

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) throw error;
}