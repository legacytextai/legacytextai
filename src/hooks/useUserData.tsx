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
          
          // Link the orphaned profile to this user (only update allowed fields)
          const { data: linkedProfile, error: linkError } = await supabase
            .from("users_app")
            .update({
              auth_user_id: user.id,
              email: user.email ?? null
              // Don't update phone_e164 or status from client - let edge functions handle that
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
      console.log('User phone value:', user.phone, 'User factors:', user.factors);
      
      // Check if user has phone from phone auth or MFA factors
      const hasPhoneAuth = user.phone || user.factors?.some(f => f.factor_type === 'phone');
      
      if (user.phone || hasPhoneAuth) {
        // For phone users, we still shouldn't insert phone_e164 from client
        // Let the ensure_user_self function handle it properly
        console.log('User with phone detected, using ensure_user_self');
        
        // Call ensure_user_self which will create the user properly
        const { data: ensureResult, error: ensureError } = await supabase
          .rpc('ensure_user_self', { p_email: user.email ?? null });
          
        if (ensureError) {
          console.error('Error calling ensure_user_self:', ensureError);
          toast.error(`Failed to create user profile: ${ensureError.message}`);
          return;
        }
        
        // Fetch the created user data
        const { data: freshUserData, error: fetchError } = await supabase
          .from("users_app")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching created user data:', fetchError);
          toast.error('Failed to fetch user profile');
          return;
        }
        
        console.log('Successfully created/fetched profile for phone user:', freshUserData);
        setUserData(freshUserData);
      } else {
        // Google OAuth or other users without phone - can't create with temp phone directly
        // The ensure_user_self function should handle this case properly
        console.log('User without phone detected, letting ensure_user_self handle it');
        
        // Call ensure_user_self which will create the user properly
        const { data: ensureResult, error: ensureError } = await supabase
          .rpc('ensure_user_self', { p_email: user.email ?? null });
          
        if (ensureError) {
          console.error('Error calling ensure_user_self:', ensureError);
          toast.error(`Failed to create user profile: ${ensureError.message}`);
          return;
        }
        
        // Fetch the created user data
        const { data: freshUserData, error: fetchError } = await supabase
          .from("users_app")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
          
        if (fetchError) {
          console.error('Error fetching created user data:', fetchError);
          toast.error('Failed to fetch user profile');
          return;
        }
        
        console.log('Successfully created/fetched profile for OAuth user:', freshUserData);
        setUserData(freshUserData);
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