export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      apify_connectors: {
        Row: {
          google_maps_actor_id: string | null;
          linkedin_actor_id: string | null;
          token: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          google_maps_actor_id?: string | null;
          linkedin_actor_id?: string | null;
          token?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          google_maps_actor_id?: string | null;
          linkedin_actor_id?: string | null;
          token?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          activity_type: string;
          created_at: string;
          description: string | null;
          id: string;
          lead_id: string | null;
          metadata: Json | null;
          title: string;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          metadata?: Json | null;
          title: string;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          lead_id?: string | null;
          metadata?: Json | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_ups: {
        Row: {
          channel: string | null;
          completed_at: string | null;
          created_at: string;
          id: string;
          lead_id: string;
          message: string | null;
          scheduled_for: string;
          sequence_step: number;
          status: Database["public"]["Enums"]["followup_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          channel?: string | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lead_id: string;
          message?: string | null;
          scheduled_for: string;
          sequence_step?: number;
          status?: Database["public"]["Enums"]["followup_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          channel?: string | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          lead_id?: string;
          message?: string | null;
          scheduled_for?: string;
          sequence_step?: number;
          status?: Database["public"]["Enums"]["followup_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_notes: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          lead_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          lead_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          lead_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          ai_analysis: Json | null;
          company_name: string | null;
          company_size: string | null;
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          industry: string | null;
          job_title: string | null;
          last_contact_date: string | null;
          lead_score: number;
          lead_source: string | null;
          linkedin_url: string | null;
          location: string | null;
          meeting_date: string | null;
          next_followup_date: string | null;
          notes: string | null;
          opportunities: Json | null;
          opportunity_score: number;
          phone: string | null;
          proposal_sent: boolean;
          recommended_service: string | null;
          revenue_potential: number | null;
          status: Database["public"]["Enums"]["lead_status"];
          tags: string[] | null;
          temperature: Database["public"]["Enums"]["lead_temp"];
          updated_at: string;
          user_id: string;
          website_url: string | null;
        };
        Insert: {
          ai_analysis?: Json | null;
          company_name?: string | null;
          company_size?: string | null;
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          industry?: string | null;
          job_title?: string | null;
          last_contact_date?: string | null;
          lead_score?: number;
          lead_source?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          meeting_date?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          opportunities?: Json | null;
          opportunity_score?: number;
          phone?: string | null;
          proposal_sent?: boolean;
          recommended_service?: string | null;
          revenue_potential?: number | null;
          status?: Database["public"]["Enums"]["lead_status"];
          tags?: string[] | null;
          temperature?: Database["public"]["Enums"]["lead_temp"];
          updated_at?: string;
          user_id: string;
          website_url?: string | null;
        };
        Update: {
          ai_analysis?: Json | null;
          company_name?: string | null;
          company_size?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          industry?: string | null;
          job_title?: string | null;
          last_contact_date?: string | null;
          lead_score?: number;
          lead_source?: string | null;
          linkedin_url?: string | null;
          location?: string | null;
          meeting_date?: string | null;
          next_followup_date?: string | null;
          notes?: string | null;
          opportunities?: Json | null;
          opportunity_score?: number;
          phone?: string | null;
          proposal_sent?: boolean;
          recommended_service?: string | null;
          revenue_potential?: number | null;
          status?: Database["public"]["Enums"]["lead_status"];
          tags?: string[] | null;
          temperature?: Database["public"]["Enums"]["lead_temp"];
          updated_at?: string;
          user_id?: string;
          website_url?: string | null;
        };
        Relationships: [];
      };
      meetings: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          id: string;
          lead_id: string;
          next_action: string | null;
          notes: string | null;
          outcome: string | null;
          scheduled_at: string;
          status: Database["public"]["Enums"]["meeting_status"];
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          lead_id: string;
          next_action?: string | null;
          notes?: string | null;
          outcome?: string | null;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["meeting_status"];
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_minutes?: number | null;
          id?: string;
          lead_id?: string;
          next_action?: string | null;
          notes?: string | null;
          outcome?: string | null;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["meeting_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meetings_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          lead_id: string;
          message_type: string;
          tone: string | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          lead_id: string;
          message_type: string;
          tone?: string | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          lead_id?: string;
          message_type?: string;
          tone?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          company: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          company?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      proposals: {
        Row: {
          created_at: string;
          id: string;
          lead_id: string;
          notes: string | null;
          proposal_date: string;
          services: string[] | null;
          status: Database["public"]["Enums"]["proposal_status"];
          title: string;
          updated_at: string;
          user_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lead_id: string;
          notes?: string | null;
          proposal_date?: string;
          services?: string[] | null;
          status?: Database["public"]["Enums"]["proposal_status"];
          title: string;
          updated_at?: string;
          user_id: string;
          value?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          lead_id?: string;
          notes?: string | null;
          proposal_date?: string;
          services?: string[] | null;
          status?: Database["public"]["Enums"]["proposal_status"];
          title?: string;
          updated_at?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "proposals_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          ai_provider: string | null;
          brand_tagline: string | null;
          company_email: string | null;
          company_name: string | null;
          company_phone: string | null;
          company_website: string | null;
          created_at: string;
          daily_reminder_time: string | null;
          default_tone: string | null;
          email_notifications: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          ai_provider?: string | null;
          brand_tagline?: string | null;
          company_email?: string | null;
          company_name?: string | null;
          company_phone?: string | null;
          company_website?: string | null;
          created_at?: string;
          daily_reminder_time?: string | null;
          default_tone?: string | null;
          email_notifications?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          ai_provider?: string | null;
          brand_tagline?: string | null;
          company_email?: string | null;
          company_name?: string | null;
          company_phone?: string | null;
          company_website?: string | null;
          created_at?: string;
          daily_reminder_time?: string | null;
          default_tone?: string | null;
          email_notifications?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      followup_status: "pending" | "sent" | "replied" | "completed" | "skipped";
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "follow_up"
        | "meeting_scheduled"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost";
      lead_temp: "hot" | "warm" | "low" | "disqualified";
      meeting_status: "scheduled" | "completed" | "rescheduled" | "cancelled";
      proposal_status: "draft" | "sent" | "viewed" | "negotiation" | "won" | "lost";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      followup_status: ["pending", "sent", "replied", "completed", "skipped"],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "follow_up",
        "meeting_scheduled",
        "proposal_sent",
        "negotiation",
        "won",
        "lost",
      ],
      lead_temp: ["hot", "warm", "low", "disqualified"],
      meeting_status: ["scheduled", "completed", "rescheduled", "cancelled"],
      proposal_status: ["draft", "sent", "viewed", "negotiation", "won", "lost"],
    },
  },
} as const;
