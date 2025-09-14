import { useState, useEffect } from 'react';
import { useForm, useFieldArray, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Plus, X, Phone, Settings as SettingsIcon, User, MessageSquare, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Types
type Child = { name: string; dob: string };

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

// Validation schema
const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  preferred_language: z.string().min(1, "Language is required"),
  timezone: z.string().min(1, "Timezone is required"),
  interests: z.array(z.string()).default([]),
  banned_topics: z.array(z.string()).default([]),
  children: z.array(z.object({
    name: z.string().trim().min(1, "Child name is required"),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
      .refine((date) => {
        const parsedDate = new Date(date);
        const today = new Date();
        const minDate = new Date(1900, 0, 1);
        return parsedDate <= today && parsedDate >= minDate;
      }, "Date must be between 1900 and today")
  })).default([])
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ar', label: 'العربية' }
];

const commonTimezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [userData, setUserData] = useState<UserAppData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newBannedTopic, setNewBannedTopic] = useState('');
  
  // Phone change states
  const [newPhone, setNewPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: '',
      preferred_language: 'en',
      timezone: 'America/Los_Angeles',
      interests: [],
      banned_topics: [],
      children: []
    }
  });

  const { fields: childrenFields, append: addChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: 'children'
  });

  // Load user data on mount
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      setUserData(null);
    }
  }, [user]);

  // Check if authenticated user is linked to this phone number
  useEffect(() => {
    const linkUserToPhone = async () => {
      if (user && userData?.phone_e164) {
        try {
          await supabase.rpc('link_self_to_phone', { p_phone: userData.phone_e164 });
        } catch (error) {
          console.error('Error linking user to phone:', error);
        }
      }
    };

    linkUserToPhone();
  }, [user, userData?.phone_e164]);

  // Handle phone verification flow
  useEffect(() => {
    const shouldShowVerification = searchParams.get('verifyPhone') === '1';
    const pendingPhone = user?.user_metadata?.pending_phone_e164;
    
    if (shouldShowVerification || (!userData?.phone_e164 || userData.phone_e164 === '' || userData.status !== 'active')) {
      setShowPhoneVerification(true);
      
      // Prefill phone input with pending phone if available
      if (pendingPhone && !newPhone) {
        setNewPhone(pendingPhone);
      }
    } else {
      setShowPhoneVerification(false);
    }
  }, [searchParams, user, userData, newPhone]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Try to find an existing row
      const { data: existing } = await supabase
        .from("users_app")
        .select("*")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      // If none, use RPC to ensure a row exists
      if (!existing) {
        await supabase.rpc('ensure_user_self', { p_email: user.email ?? null });
        
        // Fetch again after ensuring row exists
        const { data: newRow } = await supabase
          .from("users_app")
          .select("*")
          .eq("auth_user_id", user.id)
          .single();
        
        if (newRow) {
          setUserData(newRow);
        }
      } else {
        setUserData(existing);
      }

      // Populate form with user data
      if (existing || userData) {
        const data = existing || userData;
        
        // Parse children data from JSON
        const parsedChildren: Child[] = Array.isArray(data.children) 
          ? data.children.filter((child: any) => 
              child && typeof child === 'object' && child.name && child.dob
            ).map((child: any) => ({
              name: String(child.name || ''),
              dob: String(child.dob || '')
            }))
          : [];
        
        form.reset({
          name: data.name || "",
          preferred_language: data.preferred_language || "en",
          timezone: data.timezone || "America/Los_Angeles",
          interests: data.interests || [],
          banned_topics: data.banned_topics || [],
          children: parsedChildren
        });
      }
    } catch (error) {
      console.error('Error ensuring user app row:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!userData) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users_app')
        .update({
          name: data.name,
          preferred_language: data.preferred_language,
          timezone: data.timezone,
          interests: data.interests,
          banned_topics: data.banned_topics,
          children: data.children
        })
        .eq('id', userData.id);

      if (error) {
        console.error('Error saving settings:', error);
        toast.error('Failed to save settings');
        return;
      }

      toast.success('Settings saved successfully!');
      await loadUserData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sendTestPrompt = async () => {
    if (!userData?.phone_e164) {
      toast.error('Phone number required to send test prompt');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/send-daily-prompts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ force: true, phone: userData.phone_e164 })
      });

      if (response.ok) {
        toast.success('Test prompt sent!');
      } else {
        toast.error('Failed to send test prompt');
      }
    } catch (error) {
      console.error('Error sending test prompt:', error);
      toast.error('Failed to send test prompt');
    }
  };

  const addInterest = () => {
    if (newInterest.trim()) {
      const currentInterests = form.getValues('interests');
      const trimmed = newInterest.trim();
      if (!currentInterests.includes(trimmed)) {
        form.setValue('interests', [...currentInterests, trimmed]);
      }
      setNewInterest("");
    }
  };

  const removeInterest = (index: number) => {
    const currentInterests = form.getValues('interests');
    form.setValue('interests', currentInterests.filter((_, i) => i !== index));
  };

  const addBannedTopic = () => {
    if (newBannedTopic.trim()) {
      const currentTopics = form.getValues('banned_topics');
      const trimmed = newBannedTopic.trim();
      if (!currentTopics.includes(trimmed)) {
        form.setValue('banned_topics', [...currentTopics, trimmed]);
      }
      setNewBannedTopic("");
    }
  };

  const removeBannedTopic = (index: number) => {
    const currentTopics = form.getValues('banned_topics');
    form.setValue('banned_topics', currentTopics.filter((_, i) => i !== index));
  };

  const validateE164Phone = (phone: string): boolean => {
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    return e164Regex.test(phone);
  };

  const sendPhoneChangeCode = async () => {
    if (!newPhone || !validateE164Phone(newPhone)) {
      toast.error('Please enter a valid phone number in E.164 format (e.g., +1234567890)');
      return;
    }

    setIsChangingPhone(true);
    try {
      const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/phone-change-initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_phone_e164: newPhone, resend: true })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.sms) {
          toast.success('Verification code sent!');
          setResendCooldown(60);
        } else {
          toast.success('Code already sent - check your messages');
        }
      } else if (response.status === 429) {
        toast.error('Please wait before requesting another code');
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error sending code:', error);
      toast.error('Failed to send verification code');
    } finally {
      setIsChangingPhone(false);
    }
  };

  const confirmPhoneChange = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }

    setIsChangingPhone(true);
    try {
      const response = await fetch(`https://toxadhuqzdydliplhrws.supabase.co/functions/v1/phone-change-confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_phone_e164: newPhone, code: verificationCode })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Phone verified—welcome SMS sent!');
      setVerificationCode('');
      setNewPhone('');
      setIsChangingPhone(false);
      setShowPhoneVerification(false);
      
      // Refresh user data
      await loadUserData();
    } catch (error) {
      console.error('Error confirming phone:', error);
      toast.error('Failed to verify phone number');
    } finally {
      setIsChangingPhone(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-legacy-primary mb-4">Authentication Required</h1>
          <p className="text-legacy-ink/70 mb-6">Please sign in to access your settings.</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-legacy-primary mx-auto mb-4"></div>
            <p className="text-legacy-ink/70">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-legacy-primary" />
          <h1 className="text-3xl font-bold text-legacy-primary">Settings</h1>
        </div>

        {/* Phone Verification Banner */}
        {showPhoneVerification && (
          <Alert className="border-amber-200 bg-amber-50">
            <Phone className="h-4 w-4" />
            <AlertDescription>
              <strong>Phone Verification Required</strong>
              <br />
              Please verify your phone number to activate your account and start receiving journal prompts.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter your name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Preferred Language</Label>
                <Select
                  value={form.watch('preferred_language')}
                  onValueChange={(value) => form.setValue('preferred_language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone')}
                  onValueChange={(value) => form.setValue('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commonTimezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={userData?.phone_e164 || 'Not verified'} 
                  disabled 
                  className="bg-muted" 
                />
                <p className="text-xs text-legacy-ink/60">
                  Status: {userData?.status || 'pending'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Phone Number Verification */}
          {showPhoneVerification && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Phone className="w-5 h-5" />
                  Verify Phone Number
                </CardTitle>
                <CardDescription>
                  Enter your phone number and verification code to activate your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-phone">Phone Number (E.164 format)</Label>
                  <Input
                    id="verify-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    disabled={isChangingPhone}
                    className={!validateE164Phone(newPhone) && newPhone ? "border-destructive" : ""}
                  />
                  {newPhone && !validateE164Phone(newPhone) && (
                    <p className="text-sm text-destructive">
                      Please enter a valid phone number in E.164 format (e.g., +1234567890)
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={sendPhoneChangeCode}
                    disabled={!newPhone || !validateE164Phone(newPhone) || isChangingPhone || resendCooldown > 0}
                    variant="outline"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Send Code'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verify-code">Verification Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verify-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={isChangingPhone}
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      onClick={confirmPhoneChange}
                      disabled={!verificationCode || verificationCode.length !== 6 || isChangingPhone}
                    >
                      {isChangingPhone ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change Phone Number (for users with verified phones) */}
          {!showPhoneVerification && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Change Phone Number
                </CardTitle>
                <CardDescription>
                  Update your phone number for SMS notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Phone</Label>
                  <Input value={userData?.phone_e164 || ''} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>New Phone Number (E.164 format)</Label>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    disabled={isChangingPhone}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={sendPhoneChangeCode}
                    disabled={!newPhone || !validateE164Phone(newPhone) || isChangingPhone || resendCooldown > 0}
                    variant="outline"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Send Code'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      disabled={isChangingPhone}
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      onClick={confirmPhoneChange}
                      disabled={!verificationCode || verificationCode.length !== 6 || isChangingPhone}
                    >
                      {isChangingPhone ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Journaling Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Journaling Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch('interests').map((interest, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeInterest(index)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Add an interest..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                  />
                  <Button type="button" onClick={addInterest} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Topics to Avoid</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.watch('banned_topics').map((topic, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {topic}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeBannedTopic(index)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newBannedTopic}
                    onChange={(e) => setNewBannedTopic(e.target.value)}
                    placeholder="Add a topic to avoid..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBannedTopic())}
                  />
                  <Button type="button" onClick={addBannedTopic} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Children */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Children
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {childrenFields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end p-4 border border-legacy-border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Name</Label>
                    <Input
                      {...form.register(`children.${index}.name` as const)}
                      placeholder="Child's name"
                    />
                    {form.formState.errors.children?.[index]?.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.children[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      {...form.register(`children.${index}.dob` as const)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      min="1900-01-01"
                    />
                    {form.formState.errors.children?.[index]?.dob && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.children[index]?.dob?.message}
                      </p>
                    )}
                  </div>

                  <Button type="button" variant="destructive" size="sm" onClick={() => removeChild(index)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => addChild({ name: "", dob: "" })}
                className="w-full border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Child
              </Button>
            </CardContent>
          </Card>

          {/* Test Prompt System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Test Prompt System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-legacy-ink/70">
                Send yourself a test prompt to see how the system works with your current settings.
              </p>
              <Button type="button" onClick={sendTestPrompt} variant="outline" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Test Prompt
              </Button>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Settings;