import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Phone, MessageSquare, Download, User, Calendar as CalendarIcon, Plus, X, TestTube } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
type Child = { name: string; dob: string };
type UserRow = {
  id: string;
  name: string | null;
  phone_e164: string;
  status: string;
  preferred_language: string | null;
  timezone: string | null;
  interests: string[] | null;
  banned_topics: string[] | null;
  children: any; // JSON type from Supabase
};

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

export default function Settings() {
  const { toast } = useToast();
  const [userRow, setUserRow] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState("");
  const [newBannedTopic, setNewBannedTopic] = useState("");
  
  // Phone change states
  const [newPhone, setNewPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      preferred_language: "en",
      timezone: "America/Los_Angeles",
      interests: [],
      banned_topics: [],
      children: []
    }
  });

  const { fields: childrenFields, append: addChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: "children"
  });

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  // Link auth user to phone on mount
  useEffect(() => {
    const linkAuthUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const phone = user?.phone ?? user?.user_metadata?.phone ?? null;
          if (phone) {
            try {
              await supabase.rpc('link_self_to_phone', { p_phone: phone });
            } catch (error) {
              // Ignore linking errors
            }
          }
        }
      } catch (error) {
        console.error('Error linking auth user:', error);
      }
    };
    linkAuthUser();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access your settings.",
          variant: "destructive"
        });
        return;
      }

      const phone = user?.phone ?? user?.user_metadata?.phone ?? null;
      if (!phone) {
        toast({
          title: "Phone Number Required",
          description: "No phone number found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      const { data: userData, error } = await supabase
        .from('users_app')
        .select('id, name, phone_e164, status, preferred_language, timezone, interests, banned_topics, children')
        .eq('phone_e164', phone)
        .limit(1)
        .maybeSingle();

      if (error) {
        toast({
          title: "Error Loading Settings",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (!userData) {
        toast({
          title: "User Not Found",
          description: "No user profile found. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      setUserRow(userData);
      
      // Parse children data from JSON
      const parsedChildren: Child[] = Array.isArray(userData.children) 
        ? userData.children.filter((child: any) => 
            child && typeof child === 'object' && child.name && child.dob
          ).map((child: any) => ({
            name: String(child.name || ''),
            dob: String(child.dob || '')
          }))
        : [];
      
      // Populate form with user data
      form.reset({
        name: userData.name || "",
        preferred_language: userData.preferred_language || "en",
        timezone: userData.timezone || "America/Los_Angeles",
        interests: userData.interests || [],
        banned_topics: userData.banned_topics || [],
        children: parsedChildren
      });

    } catch (error) {
      console.error('Error loading user data:', error);
      toast({
        title: "Error",
        description: "Failed to load user settings.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!userRow) return;

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
        .eq('id', userRow.id);

      if (error) {
        toast({
          title: "Error Saving Settings",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully."
      });

      // Reload user data
      await loadUserData();

    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestPrompt = async () => {
    if (!userRow) return;

    try {
      const response = await fetch(`https://toxadhuqzdydliplhrws.functions.supabase.co/send-daily-prompts?to=${userRow.phone_e164}&force=true`);
      const result = await response.json();
      
      toast({
        title: "Test Prompt Result",
        description: `${result.ok ? 'Success' : 'Failed'}: ${result.prompt || result.errors || 'Unknown result'}`,
        variant: result.ok ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Could not send test prompt.",
        variant: "destructive"
      });
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

  const sendPhoneChangeCode = async () => {
    if (!newPhone.trim()) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number in E.164 format (e.g., +1234567890)",
        variant: "destructive"
      });
      return;
    }

    // Basic E.164 validation
    const e164Regex = /^\+[1-9]\d{7,14}$/;
    if (!e164Regex.test(newPhone.trim())) {
      toast({
        title: "Invalid Format",
        description: "Phone number must be in E.164 format (e.g., +1234567890)",
        variant: "destructive"
      });
      return;
    }

    setSendingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in again to change your phone number.",
          variant: "destructive"
        });
        return;
      }

      const response = await supabase.functions.invoke('phone-change-initiate', {
        body: { new_phone_e164: newPhone.trim() },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.ok) {
        throw new Error(response.data?.error || 'Failed to send verification code');
      }

      setShowVerificationInput(true);
      setResendCooldown(60);
      toast({
        title: "Code Sent",
        description: `Verification code sent to ${newPhone.trim()}. Check your messages.`
      });

    } catch (error: any) {
      console.error('Error sending phone change code:', error);
      toast({
        title: "Failed to Send Code",
        description: error.message || "Could not send verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingCode(false);
    }
  };

  const confirmPhoneChange = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Code Required",
        description: "Please enter the verification code.",
        variant: "destructive"
      });
      return;
    }

    setVerifyingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in again to verify your phone number.",
          variant: "destructive"
        });
        return;
      }

      const response = await supabase.functions.invoke('phone-change-confirm', {
        body: { 
          new_phone_e164: newPhone.trim(),
          code: verificationCode.trim()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.ok) {
        throw new Error(response.data?.error || 'Failed to verify code');
      }

      // Success
      toast({
        title: "Phone Number Updated",
        description: "Your phone number has been successfully changed."
      });

      // Reset form
      setNewPhone("");
      setVerificationCode("");
      setShowVerificationInput(false);
      setResendCooldown(0);

      // Reload user data
      await loadUserData();

    } catch (error: any) {
      console.error('Error confirming phone change:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifyingCode(false);
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

  if (!userRow) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-legacy-primary mb-4">Settings Unavailable</h1>
          <p className="text-legacy-ink/70 mb-6">Please sign in or contact support to access your settings.</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-legacy-primary flex items-center gap-3">
            <SettingsIcon className="w-8 h-8" />
            Settings & Personalization
          </h1>
          <p className="text-legacy-ink/70 mt-2">
            Configure your profile and journaling preferences
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Profile Section */}
            <Card className="shadow-paper">
              <CardHeader>
                <CardTitle className="text-legacy-primary flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="border-legacy-border focus:border-legacy-primary" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferred_language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-legacy-border focus:border-legacy-primary">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card">
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-legacy-border focus:border-legacy-primary">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card">
                          {commonTimezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label className="text-sm text-legacy-ink/70">Phone</Label>
                  <Input value={userRow.phone_e164} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-legacy-ink/70">Status</Label>
                  <Input value={userRow.status} disabled className="bg-muted" />
                </div>
              </CardContent>
            </Card>

            {/* Phone Change Section */}
            <Card className="shadow-paper">
              <CardHeader>
                <CardTitle className="text-legacy-primary flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Change Phone Number
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Current Phone</Label>
                  <Input value={userRow.phone_e164} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>New Phone Number</Label>
                  <Input 
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g., +1234567890"
                    className="border-legacy-border focus:border-legacy-primary"
                    disabled={showVerificationInput}
                  />
                  <p className="text-xs text-legacy-ink/60">
                    Enter phone number in E.164 format (country code + number)
                  </p>
                </div>

                {!showVerificationInput ? (
                  <Button 
                    type="button"
                    onClick={sendPhoneChangeCode}
                    disabled={sendingCode || !newPhone.trim() || resendCooldown > 0}
                    className="w-full"
                  >
                    {sendingCode ? "Sending..." : resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Send Verification Code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Verification Code</Label>
                      <Input 
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="border-legacy-border focus:border-legacy-primary"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        onClick={confirmPhoneChange}
                        disabled={verifyingCode || !verificationCode.trim()}
                        className="flex-1"
                      >
                        {verifyingCode ? "Verifying..." : "Confirm"}
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={sendPhoneChangeCode}
                        disabled={sendingCode || resendCooldown > 0}
                      >
                        {resendCooldown > 0 ? `${resendCooldown}s` : "Resend"}
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowVerificationInput(false);
                          setVerificationCode("");
                          setResendCooldown(0);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journaling Preferences */}
            <Card className="shadow-paper">
              <CardHeader>
                <CardTitle className="text-legacy-primary flex items-center gap-2">
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
                      className="border-legacy-border focus:border-legacy-primary"
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
                      className="border-legacy-border focus:border-legacy-primary"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBannedTopic())}
                    />
                    <Button type="button" onClick={addBannedTopic} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Children Section */}
            <Card className="shadow-paper">
              <CardHeader>
                <CardTitle className="text-legacy-primary flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Children
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {childrenFields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-end p-4 border border-legacy-border rounded-lg">
                    <FormField
                      control={form.control}
                      name={`children.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="border-legacy-border focus:border-legacy-primary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`children.${index}.dob`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-legacy-border focus:border-legacy-primary",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    field.onChange(format(date, "yyyy-MM-dd"));
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

            <Separator className="bg-legacy-border" />

            {/* Test Prompt Section */}
            <Card className="shadow-paper bg-gradient-warm border-legacy-border">
              <CardHeader>
                <CardTitle className="text-legacy-primary flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Test Prompt System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-legacy-ink/70">
                  Send yourself a test prompt to see how personalized prompts work with your current settings.
                </p>
                <Button type="button" onClick={sendTestPrompt} variant="outline" className="w-full">
                  <TestTube className="w-4 h-4 mr-2" />
                  Send Test Prompt
                </Button>
              </CardContent>
            </Card>

            {/* Save Settings */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}