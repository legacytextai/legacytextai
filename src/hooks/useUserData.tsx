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

      // 1) Try to find an existing row by auth_user_id
      const { data: existing } = await supabase
        .from("users_app")
        .select("*")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        setUserData(existing);
        return;
      }

      // 2) Check if there's an orphaned profile with the user's phone number
      if (user.phone) {
        const { data: orphanedProfile } = await supabase
          .from("users_app")
          .select("*")
          .eq("phone_e164", `+${user.phone}`)
          .is("auth_user_id", null)
          .limit(1)
          .maybeSingle();

        if (orphanedProfile) {
          // Link the orphaned profile to this user
          const { data: linkedProfile, error: linkError } = await supabase
            .from("users_app")
            .update({
              auth_user_id: user.id,
              email: user.email ?? null,
              status: "active" // User already verified phone
            })
            .eq("id", orphanedProfile.id)
            .select("*")
            .single();

          if (linkError) {
            console.error('Error linking orphaned profile:', linkError);
            toast.error('Failed to link user profile');
            return;
          }

          setUserData(linkedProfile);
          return;
        }
      }

      // 3) Create new profile - only if user has a verified phone
      if (user.phone) {
        const { data: newRow, error: insertError } = await supabase
          .from("users_app")
          .insert({
            auth_user_id: user.id,
            email: user.email ?? null,
            phone_e164: `+${user.phone}`,
            status: "active" // Phone already verified in auth.users
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
        // User doesn't have verified phone yet - create pending profile
        const { data: newRow, error: insertError } = await supabase
          .from("users_app")
          .insert({
            auth_user_id: user.id,
            email: user.email ?? null,
            phone_e164: "pending", // Placeholder until phone verified
            status: "pending"
          })
          .select("*")
          .single();

        if (insertError) {
          console.error('Error creating pending user app row:', insertError);
          toast.error('Failed to create user profile');
          return;
        }

        setUserData(newRow);
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