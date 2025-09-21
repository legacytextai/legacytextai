export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      daily_prompts: {
        Row: {
          id: number
          is_ai: boolean | null
          is_forced: boolean | null
          model: string | null
          name: string | null
          prompt_hash: string | null
          prompt_id: number | null
          prompt_language: string | null
          prompt_text: string | null
          sent_at: string | null
          sent_date: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          id?: number
          is_ai?: boolean | null
          is_forced?: boolean | null
          model?: string | null
          name?: string | null
          prompt_hash?: string | null
          prompt_id?: number | null
          prompt_language?: string | null
          prompt_text?: string | null
          sent_at?: string | null
          sent_date?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          id?: number
          is_ai?: boolean | null
          is_forced?: boolean | null
          model?: string | null
          name?: string | null
          prompt_hash?: string | null
          prompt_id?: number | null
          prompt_language?: string | null
          prompt_text?: string | null
          sent_at?: string | null
          sent_date?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_prompts_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_app"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          content_signature: string | null
          created_at: string
          id: string
          kind: string
          page_count: number | null
          render_uid: number | null
          status: string
          storage_key_manuscript: string | null
          storage_key_pdf: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          content_signature?: string | null
          created_at?: string
          id?: string
          kind: string
          page_count?: number | null
          render_uid?: number | null
          status: string
          storage_key_manuscript?: string | null
          storage_key_pdf?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          content_signature?: string | null
          created_at?: string
          id?: string
          kind?: string
          page_count?: number | null
          render_uid?: number | null
          status?: string
          storage_key_manuscript?: string | null
          storage_key_pdf?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          category: string | null
          content: string
          id: number
          message_sid: string | null
          name: string | null
          received_at: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          content: string
          id?: number
          message_sid?: string | null
          name?: string | null
          received_at?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          content?: string
          id?: number
          message_sid?: string | null
          name?: string | null
          received_at?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal_entries_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_app"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_app"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          direction: string
          id: number
          phone_e164: string
          sent_at: string | null
          twilio_sid: string | null
        }
        Insert: {
          body: string
          direction: string
          id?: number
          phone_e164: string
          sent_at?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          direction?: string
          id?: number
          phone_e164?: string
          sent_at?: string | null
          twilio_sid?: string | null
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: number
          last_sent_at: string | null
          new_phone_e164: string
          user_auth_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: number
          last_sent_at?: string | null
          new_phone_e164: string
          user_auth_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: number
          last_sent_at?: string | null
          new_phone_e164?: string
          user_auth_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          active: boolean | null
          id: number
          text: string
        }
        Insert: {
          active?: boolean | null
          id?: number
          text: string
        }
        Update: {
          active?: boolean | null
          id?: number
          text?: string
        }
        Relationships: []
      }
      service_access_log: {
        Row: {
          accessed_at: string | null
          function_name: string | null
          id: string
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          function_name?: string | null
          id?: string
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          function_name?: string | null
          id?: string
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tones: {
        Row: {
          active: boolean
          created_at: string
          id: number
          key: string
          label: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: number
          key: string
          label: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: number
          key?: string
          label?: string
          weight?: number
        }
        Relationships: []
      }
      users_app: {
        Row: {
          auth_user_id: string | null
          banned_topics: string[] | null
          children: Json | null
          created_at: string | null
          dedication: string | null
          email: string | null
          id: string
          interests: string[] | null
          last_login_at: string | null
          name: string | null
          phone_e164: string | null
          preferred_language: string | null
          status: string | null
          timezone: string | null
          tone: string | null
        }
        Insert: {
          auth_user_id?: string | null
          banned_topics?: string[] | null
          children?: Json | null
          created_at?: string | null
          dedication?: string | null
          email?: string | null
          id?: string
          interests?: string[] | null
          last_login_at?: string | null
          name?: string | null
          phone_e164?: string | null
          preferred_language?: string | null
          status?: string | null
          timezone?: string | null
          tone?: string | null
        }
        Update: {
          auth_user_id?: string | null
          banned_topics?: string[] | null
          children?: Json | null
          created_at?: string | null
          dedication?: string | null
          email?: string | null
          id?: string
          interests?: string[] | null
          last_login_at?: string | null
          name?: string | null
          phone_e164?: string | null
          preferred_language?: string | null
          status?: string | null
          timezone?: string | null
          tone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_profile_secure: {
        Args: {
          p_auth_user_id: string
          p_email: string
          p_phone_e164?: string
          p_status?: string
        }
        Returns: string
      }
      ensure_user_self: {
        Args: { p_email?: string }
        Returns: {
          auth_user_id: string | null
          banned_topics: string[] | null
          children: Json | null
          created_at: string | null
          dedication: string | null
          email: string | null
          id: string
          interests: string[] | null
          last_login_at: string | null
          name: string | null
          phone_e164: string | null
          preferred_language: string | null
          status: string | null
          timezone: string | null
          tone: string | null
        }
      }
      get_user_basic_info: {
        Args: { p_auth_user_id: string }
        Returns: {
          name: string
          status: string
          user_id: string
        }[]
      }
      get_user_email_secure: {
        Args: { p_auth_user_id: string }
        Returns: string
      }
      get_user_id_by_phone_secure: {
        Args: { p_phone_e164: string }
        Returns: string
      }
      get_user_id_from_phone: {
        Args: { phone: string }
        Returns: string
      }
      get_user_name_from_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      is_otp_active: {
        Args: { expires_at: string }
        Returns: boolean
      }
      link_self_to_phone: {
        Args: { p_phone: string }
        Returns: undefined
      }
      log_service_access: {
        Args: {
          p_function_name?: string
          p_operation: string
          p_table_name: string
          p_user_id?: string
        }
        Returns: undefined
      }
      lookup_user_id_by_phone_minimal: {
        Args: { p_phone_e164: string }
        Returns: string
      }
      normalize_phone_e164: {
        Args: { phone_input: string }
        Returns: string
      }
      recover_stuck_user_account: {
        Args: { p_auth_user_id: string }
        Returns: Json
      }
      update_sms_compliance_status: {
        Args: { p_phone_e164: string; p_status: string }
        Returns: undefined
      }
      update_user_phone_secure: {
        Args: {
          p_auth_user_id: string
          p_new_phone_e164: string
          p_new_status?: string
        }
        Returns: boolean
      }
      verify_phone_ownership: {
        Args: { p_auth_user_id: string; p_phone_e164: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
