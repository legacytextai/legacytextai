import { SupabaseClient } from '@supabase/supabase-js';

function isE164(s: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(s);
}

function getOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || import.meta.env?.VITE_SITE_URL || 'https://legacytextai.lovable.app';
}

// Format phone number for user-friendly display
export function formatPhoneDisplay(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Handle different lengths
  if (digits.length === 0) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  
  // For 11+ digits, assume first digit is country code
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  
  // For other cases, just format the last 10 digits
  const lastTen = digits.slice(-10);
  return `+${digits.slice(0, -10)} (${lastTen.slice(0, 3)}) ${lastTen.slice(3, 6)}-${lastTen.slice(6)}`;
}

// Normalize phone number to E.164 format
export function normalizePhoneToE164(value: string): string {
  // Remove all non-digit characters except +
  let normalized = value.replace(/[^\d+]/g, '');
  
  // Remove any + that's not at the beginning
  normalized = normalized.replace(/(?!^)\+/g, '');
  
  // If it's just digits, assume US number and add +1
  if (/^\d{10}$/.test(normalized)) {
    normalized = '+1' + normalized;
  } else if (/^\d{11}$/.test(normalized) && normalized[0] === '1') {
    normalized = '+' + normalized;
  } else if (normalized.startsWith('1') && normalized.length === 11) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+') && normalized.length >= 10) {
    // For other numbers, add + if not present
    normalized = '+' + normalized;
  }
  
  return normalized;
}

// Check if a normalized phone number is valid E.164
export function isValidPhone(displayValue: string): boolean {
  const normalized = normalizePhoneToE164(displayValue);
  return isE164(normalized);
}

export { isE164 };

export async function handleSignUp(
  supabase: SupabaseClient,
  params: { email: string; password: string; phoneE164: string }
) {
  const { email, password, phoneE164 } = params;

  if (!isE164(phoneE164)) {
    throw new Error('Enter phone in E.164 format, e.g. +13235551234');
  }

  const origin = getOrigin();

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
  const origin = getOrigin();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) throw error;
}