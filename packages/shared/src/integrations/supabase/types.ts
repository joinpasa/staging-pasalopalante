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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      act_reactions: {
        Row: {
          act_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          act_id: string
          created_at?: string
          id?: string
          reaction?: string
          user_id: string
        }
        Update: {
          act_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "act_reactions_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "acts_of_kindness"
            referencedColumns: ["id"]
          },
        ]
      }
      acts_of_kindness: {
        Row: {
          category: string | null
          classified_at: string | null
          community_guidelines_version: string | null
          created_at: string
          description: string | null
          email: string | null
          first_name: string | null
          id: string
          ip_address: string | null
          language: string | null
          mode: string
          moderation_reason: string | null
          photo_paths: string[]
          privacy_version: string | null
          status: string
          tag_confidence: Json | null
          tags: string[] | null
          terms_version: string | null
          to_user_id: string | null
          type_tag: string | null
          user_agent: string | null
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          category?: string | null
          classified_at?: string | null
          community_guidelines_version?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          mode: string
          moderation_reason?: string | null
          photo_paths?: string[]
          privacy_version?: string | null
          status?: string
          tag_confidence?: Json | null
          tags?: string[] | null
          terms_version?: string | null
          to_user_id?: string | null
          type_tag?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string | null
          classified_at?: string | null
          community_guidelines_version?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          ip_address?: string | null
          language?: string | null
          mode?: string
          moderation_reason?: string | null
          photo_paths?: string[]
          privacy_version?: string | null
          status?: string
          tag_confidence?: Json | null
          tags?: string[] | null
          terms_version?: string | null
          to_user_id?: string | null
          type_tag?: string | null
          user_agent?: string | null
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          criteria: Json | null
          description: string | null
          description_de: string | null
          description_es: string | null
          description_fr: string | null
          icon: string | null
          id: string
          kind: string
          name: string
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          description_de?: string | null
          description_es?: string | null
          description_fr?: string | null
          icon?: string | null
          id: string
          kind?: string
          name: string
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          criteria?: Json | null
          description?: string | null
          description_de?: string | null
          description_es?: string | null
          description_fr?: string | null
          icon?: string | null
          id?: string
          kind?: string
          name?: string
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      commitments: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          help_role: string | null
          id: string
          language: string | null
          last_name: string | null
          message: string | null
          moderation_reason: string | null
          org_name: string | null
          org_type: string | null
          org_website: string | null
          pledge_count: number
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          help_role?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          message?: string | null
          moderation_reason?: string | null
          org_name?: string | null
          org_type?: string | null
          org_website?: string | null
          pledge_count?: number
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          help_role?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          message?: string | null
          moderation_reason?: string | null
          org_name?: string | null
          org_type?: string | null
          org_website?: string | null
          pledge_count?: number
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      daily_suggestions: {
        Row: {
          acts: Json
          created_at: string
          date: string
          id: string
          lang: string
        }
        Insert: {
          acts: Json
          created_at?: string
          date: string
          id?: string
          lang: string
        }
        Update: {
          acts?: Json
          created_at?: string
          date?: string
          id?: string
          lang?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feature_interest: {
        Row: {
          created_at: string
          email: string | null
          feature_key: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          feature_key: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          feature_key?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_document_versions: {
        Row: {
          doc_key: string
          effective_date: string
          major: number
          updated_at: string
          version: string
        }
        Insert: {
          doc_key: string
          effective_date?: string
          major: number
          updated_at?: string
          version: string
        }
        Update: {
          doc_key?: string
          effective_date?: string
          major?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          act_id: string | null
          confidence: number | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          mode: string | null
          model: string | null
          original_text: string | null
          reason_codes: string[]
          short_reason: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          act_id?: string | null
          confidence?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          mode?: string | null
          model?: string | null
          original_text?: string | null
          reason_codes?: string[]
          short_reason?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          act_id?: string | null
          confidence?: number | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          mode?: string | null
          model?: string | null
          original_text?: string | null
          reason_codes?: string[]
          short_reason?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          is_leader: boolean
          org_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_leader?: boolean
          org_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_leader?: boolean
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          chapter: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          website: string | null
        }
        Insert: {
          chapter?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          website?: string | null
        }
        Update: {
          chapter?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          custom_display_name: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          has_password: boolean
          help_role: string | null
          id: string
          language: string | null
          last_name: string | null
          onboarding_seen: boolean
          org_name: string | null
          org_type: string | null
          phone: string | null
          phone_verified: boolean
          privacy_major_accepted: number | null
          privacy_version_accepted: string | null
          public_name_mode: string
          referral_code: string
          referred_by: string | null
          terms_major_accepted: number | null
          terms_version_accepted: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          custom_display_name?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          has_password?: boolean
          help_role?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          onboarding_seen?: boolean
          org_name?: string | null
          org_type?: string | null
          phone?: string | null
          phone_verified?: boolean
          privacy_major_accepted?: number | null
          privacy_version_accepted?: string | null
          public_name_mode?: string
          referral_code?: string
          referred_by?: string | null
          terms_major_accepted?: number | null
          terms_version_accepted?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          custom_display_name?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          has_password?: boolean
          help_role?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          onboarding_seen?: boolean
          org_name?: string | null
          org_type?: string | null
          phone?: string | null
          phone_verified?: boolean
          privacy_major_accepted?: number | null
          privacy_version_accepted?: string | null
          public_name_mode?: string
          referral_code?: string
          referred_by?: string | null
          terms_major_accepted?: number | null
          terms_version_accepted?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pass_handoffs: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["reminder_channel"]
          created_at: string
          enabled: boolean
          frequency: Database["public"]["Enums"]["reminder_frequency"]
          id: string
          paused_until: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          send_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          enabled?: boolean
          frequency?: Database["public"]["Enums"]["reminder_frequency"]
          id?: string
          paused_until?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["reminder_channel"]
          created_at?: string
          enabled?: boolean
          frequency?: Database["public"]["Enums"]["reminder_frequency"]
          id?: string
          paused_until?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          send_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      thanks: {
        Row: {
          act_id: string
          created_at: string
          from_user_id: string
          id: string
        }
        Insert: {
          act_id: string
          created_at?: string
          from_user_id: string
          id?: string
        }
        Update: {
          act_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thanks_act_id_fkey"
            columns: ["act_id"]
            isOneToOne: false
            referencedRelation: "acts_of_kindness"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          act_id: string | null
          community_guidelines_version: string | null
          context: string
          created_at: string
          email: string | null
          email_reminders_opt_in: boolean
          id: string
          ip_address: string | null
          privacy_version: string | null
          terms_version: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          act_id?: string | null
          community_guidelines_version?: string | null
          context: string
          created_at?: string
          email?: string | null
          email_reminders_opt_in?: boolean
          id?: string
          ip_address?: string | null
          privacy_version?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          act_id?: string | null
          community_guidelines_version?: string | null
          context?: string
          created_at?: string
          email?: string | null
          email_reminders_opt_in?: boolean
          id?: string
          ip_address?: string | null
          privacy_version?: string | null
          terms_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pledge_totals: {
        Row: {
          total_commitments: number | null
          total_pledged_acts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      act_badge_progress: {
        Args: { _user_id: string }
        Returns: {
          badge_id: string
          current_count: number
          target: number
        }[]
      }
      award_badges_for_user: {
        Args: { _user_id: string }
        Returns: {
          earned_badge_id: string
        }[]
      }
      claim_my_acts: { Args: never; Returns: number }
      claim_referral: { Args: { _code: string }; Returns: boolean }
      compute_public_name: {
        Args: {
          _custom: string
          _fallback: string
          _first: string
          _last: string
          _mode: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_exists: { Args: { _email: string }; Returns: boolean }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_display_name_available: {
        Args: { candidate: string }
        Returns: boolean
      }
      is_org_leader: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      kindness_map_counts: {
        Args: never
        Returns: {
          acts: number
          commitments: number
          country: string
        }[]
      }
      log_pass_handoff: {
        Args: { _code: string }
        Returns: {
          from_name: string
          from_user_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_reactions: {
        Args: { _act_ids: string[] }
        Returns: {
          act_id: string
        }[]
      }
      my_referral_stats: {
        Args: never
        Returns: {
          acts_count: number
          joined_count: number
          pledge_total: number
        }[]
      }
      org_stats: {
        Args: { _org_id: string }
        Returns: {
          member_count: number
          total_acts: number
          total_pledged: number
        }[]
      }
      reaction_counts: {
        Args: { _act_ids: string[] }
        Returns: {
          act_id: string
          count: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      referrer_display_name: { Args: { code: string }; Returns: string }
      user_streak: {
        Args: { _user_id: string }
        Returns: {
          current_streak: number
          longest_streak: number
          total_acts: number
        }[]
      }
    }
    Enums: {
      app_role: "member" | "leader" | "admin"
      reminder_channel: "email" | "sms"
      reminder_frequency: "daily" | "weekdays" | "weekly"
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
    Enums: {
      app_role: ["member", "leader", "admin"],
      reminder_channel: ["email", "sms"],
      reminder_frequency: ["daily", "weekdays", "weekly"],
    },
  },
} as const
