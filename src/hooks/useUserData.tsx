import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserAppData {
  id: string;
  auth_user_id: string;
  email: string | null;
  name: string | null;
  phone_e164: string | null;
  status: string;
  preferred_language: string;
  timezone: string;
  interests: string[] | null;
  banned_topics: string[] | null;
  children: any;
  created_at: string;
  last_login_at: string | null;
}

export function useUserData() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserAppData | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureUserAppRow = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1) Try to find an existing row
      const { data: existing } = await supabase
        .from("users_app")
        .select("*")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      // 2) If none, INSERT (RLS insert policy allows this when auth_user_id = auth.uid())
      if (!existing) {
        const { data: newRow, error: insertError } = await supabase
          .from("users_app")
          .insert({
            auth_user_id: user.id,
            email: user.email ?? null,
            phone_e164: "", // Required field, will be set later during verification
            status: "pending"   // not 'active' until phone verified
          })
          .select("*")
          .single();

        if (insertError) {
          console.error('Error creating user app row:', insertError);
          toast.error('Failed to create user profile');
          return;
        }

        setUserData(newRow);
      } else {
        setUserData(existing);
      }
    } catch (error) {
      console.error('Error ensuring user app row:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      ensureUserAppRow();
    } else {
      setUserData(null);
    }
  }, [user]);

  return { userData, loading, refetch: ensureUserAppRow };
}