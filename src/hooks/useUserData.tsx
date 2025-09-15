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
      console.log('Creating user profile for:', user.email, 'Auth method:', user.app_metadata?.provider);

      // 1) Try to find an existing row by auth_user_id
      const { data: existing } = await supabase
        .from("users_app")
        .select("*")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log('Found existing user profile:', existing.id);
        setUserData(existing);
        return;
      }

      // 2) Check for orphaned profiles using normalized phone matching
      if (user.phone) {
        // Normalize both the auth phone and search for potential matches
        const normalizedAuthPhone = `+${user.phone}`;
        
        // Try different phone number formats for matching
        const phoneVariations = [
          normalizedAuthPhone,
          user.phone.startsWith('+') ? user.phone : `+${user.phone}`,
          user.phone.startsWith('+1') ? user.phone : `+1${user.phone.replace(/^\+/, '')}`,
        ];

        let orphanedProfile = null;
        
        for (const phoneVariation of phoneVariations) {
          const { data: foundProfile } = await supabase
            .from("users_app")
            .select("*")
            .eq("phone_e164", phoneVariation)
            .is("auth_user_id", null)
            .limit(1)
            .maybeSingle();

          if (foundProfile) {
            orphanedProfile = foundProfile;
            break;
          }
        }

        if (orphanedProfile) {
          console.log('Found orphaned profile, linking to user:', orphanedProfile.id);
          
          // Link the orphaned profile to this user
          const { data: linkedProfile, error: linkError } = await supabase
            .from("users_app")
            .update({
              auth_user_id: user.id,
              email: user.email ?? null,
              phone_e164: normalizedAuthPhone,
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

          console.log('Successfully linked profile:', linkedProfile);
          setUserData(linkedProfile);
          return;
        }
      }

      // 3) Create new profile - handle both phone and non-phone users
      console.log('Creating new user profile. Has phone:', !!user.phone, 'Provider:', user.app_metadata?.provider);
      
      if (user.phone) {
        const normalizedPhone = `+${user.phone}`;
        console.log('Creating new profile for phone:', normalizedPhone);
        
        const { data: newRow, error: insertError } = await supabase
          .from("users_app")
          .insert({
            auth_user_id: user.id,
            email: user.email ?? null,
            phone_e164: normalizedPhone,
            status: "active" // Phone already verified in auth.users
          })
          .select("*")
          .single();

        if (insertError) {
          console.error('Error creating user app row:', insertError);
          console.error('Insert error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          toast.error(`Failed to create user profile: ${insertError.message}`);
          return;
        }

        console.log('Successfully created new profile:', newRow);
        setUserData(newRow);
      } else {
        // Google OAuth or other users without phone - create with placeholder phone
        console.log('Creating profile for user without phone (likely Google OAuth)');
        const tempPhone = `temp_${user.id.replace(/-/g, '').substring(0, 15)}`;
        
        const { data: newRow, error: insertError } = await supabase
          .from("users_app")
          .insert({
            auth_user_id: user.id,
            email: user.email ?? null,
            phone_e164: tempPhone,
            status: "pending" // Phone not verified yet
          })
          .select("*")
          .single();

        if (insertError) {
          console.error('Error creating pending user app row:', insertError);
          console.error('Insert error details:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          });
          toast.error(`Failed to create user profile: ${insertError.message}`);
          return;
        }

        console.log('Successfully created pending profile for Google OAuth user:', newRow);
        setUserData(newRow);
      }
    } catch (error) {
      console.error('Error ensuring user app row:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        user: { id: user?.id, email: user?.email, phone: user?.phone }
      });
      toast.error(`Failed to create user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
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