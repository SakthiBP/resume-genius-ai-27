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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      candidate_recommendations: {
        Row: {
          created_at: string
          filters: Json
          id: string
          job_role: string
          results: Json
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          job_role: string
          results?: Json
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          job_role?: string
          results?: Json
        }
        Relationships: []
      }
      candidates: {
        Row: {
          analysis_json: Json
          candidate_name: string
          created_at: string
          cv_text: string
          email: string | null
          external_candidate_id: string | null
          id: string
          job_description: string | null
          overall_score: number
          recommendation: string
          source: string | null
          status: string
        }
        Insert: {
          analysis_json: Json
          candidate_name: string
          created_at?: string
          cv_text: string
          email?: string | null
          external_candidate_id?: string | null
          id?: string
          job_description?: string | null
          overall_score?: number
          recommendation?: string
          source?: string | null
          status?: string
        }
        Update: {
          analysis_json?: Json
          candidate_name?: string
          created_at?: string
          cv_text?: string
          email?: string | null
          external_candidate_id?: string | null
          id?: string
          job_description?: string | null
          overall_score?: number
          recommendation?: string
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_external_candidate_id_fkey"
            columns: ["external_candidate_id"]
            isOneToOne: false
            referencedRelation: "external_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      external_candidates: {
        Row: {
          created_at: string
          experience: Json
          headline: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          profile_image_url: string | null
          raw_data: Json | null
          skills: Json
          source: string
        }
        Insert: {
          created_at?: string
          experience?: Json
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          profile_image_url?: string | null
          raw_data?: Json | null
          skills?: Json
          source?: string
        }
        Update: {
          created_at?: string
          experience?: Json
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          profile_image_url?: string | null
          raw_data?: Json | null
          skills?: Json
          source?: string
        }
        Relationships: []
      }
      external_profiles: {
        Row: {
          created_at: string | null
          education: Json | null
          email: string | null
          error_message: string | null
          experience: Json | null
          full_name: string | null
          headline: string | null
          id: string
          links: Json | null
          location: string | null
          phone: string | null
          profile_summary: string | null
          projects: Json | null
          raw_json: Json | null
          raw_text: string | null
          skills: Json | null
          source: string
          source_url: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          education?: Json | null
          email?: string | null
          error_message?: string | null
          experience?: Json | null
          full_name?: string | null
          headline?: string | null
          id?: string
          links?: Json | null
          location?: string | null
          phone?: string | null
          profile_summary?: string | null
          projects?: Json | null
          raw_json?: Json | null
          raw_text?: string | null
          skills?: Json | null
          source: string
          source_url?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          education?: Json | null
          email?: string | null
          error_message?: string | null
          experience?: Json | null
          full_name?: string | null
          headline?: string | null
          id?: string
          links?: Json | null
          location?: string | null
          phone?: string | null
          profile_summary?: string | null
          projects?: Json | null
          raw_json?: Json | null
          raw_text?: string | null
          skills?: Json | null
          source?: string
          source_url?: string | null
          status?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string | null
          error_message: string | null
          external_profile_id: string | null
          id: string
          input: Json | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          external_profile_id?: string | null
          id?: string
          input?: Json | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          external_profile_id?: string | null
          id?: string
          input?: Json | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_external_profile_id_fkey"
            columns: ["external_profile_id"]
            isOneToOne: false
            referencedRelation: "external_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_email_log: {
        Row: {
          body: string
          candidate_email: string
          candidate_id: string
          created_at: string
          edit_summary: string | null
          edited_before_send: boolean
          email_sent: boolean
          error: string | null
          id: string
          preview_shown: boolean
          previous_status: string | null
          recruiter_email: string
          recruiter_name: string
          status_attempted: string
          subject: string
        }
        Insert: {
          body: string
          candidate_email: string
          candidate_id: string
          created_at?: string
          edit_summary?: string | null
          edited_before_send?: boolean
          email_sent?: boolean
          error?: string | null
          id?: string
          preview_shown?: boolean
          previous_status?: string | null
          recruiter_email: string
          recruiter_name: string
          status_attempted: string
          subject: string
        }
        Update: {
          body?: string
          candidate_email?: string
          candidate_id?: string
          created_at?: string
          edit_summary?: string | null
          edited_before_send?: boolean
          email_sent?: boolean
          error?: string | null
          id?: string
          preview_shown?: boolean
          previous_status?: string | null
          recruiter_email?: string
          recruiter_name?: string
          status_attempted?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_email_log_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string
          id: string
          job_title: string
          required_skills: Json
          target_universities: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          job_title: string
          required_skills?: Json
          target_universities?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          job_title?: string
          required_skills?: Json
          target_universities?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
