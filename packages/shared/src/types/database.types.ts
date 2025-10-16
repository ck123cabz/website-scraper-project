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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: string
          job_id: string
          message: string
          severity: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: string
          job_id: string
          message: string
          severity: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_settings: {
        Row: {
          classification_indicators: Json
          confidence_threshold: number
          content_truncation_limit: number
          id: string
          llm_temperature: number
          prefilter_rules: Json
          updated_at: string | null
        }
        Insert: {
          classification_indicators?: Json
          confidence_threshold?: number
          content_truncation_limit?: number
          id?: string
          llm_temperature?: number
          prefilter_rules?: Json
          updated_at?: string | null
        }
        Update: {
          classification_indicators?: Json
          confidence_threshold?: number
          content_truncation_limit?: number
          id?: string
          llm_temperature?: number
          prefilter_rules?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["processing_stage"] | null
          current_url: string | null
          current_url_started_at: string | null
          estimated_time_remaining: number | null
          failed_urls: number
          gemini_cost: number
          gpt_cost: number
          id: string
          layer1_eliminated_count: number | null
          name: string | null
          prefilter_passed_count: number | null
          prefilter_rejected_count: number | null
          processed_urls: number
          processing_rate: number | null
          progress_percentage: number
          rejected_urls: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          successful_urls: number
          total_cost: number
          total_urls: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["processing_stage"] | null
          current_url?: string | null
          current_url_started_at?: string | null
          estimated_time_remaining?: number | null
          failed_urls?: number
          gemini_cost?: number
          gpt_cost?: number
          id?: string
          layer1_eliminated_count?: number | null
          name?: string | null
          prefilter_passed_count?: number | null
          prefilter_rejected_count?: number | null
          processed_urls?: number
          processing_rate?: number | null
          progress_percentage?: number
          rejected_urls?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          successful_urls?: number
          total_cost?: number
          total_urls?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["processing_stage"] | null
          current_url?: string | null
          current_url_started_at?: string | null
          estimated_time_remaining?: number | null
          failed_urls?: number
          gemini_cost?: number
          gpt_cost?: number
          id?: string
          layer1_eliminated_count?: number | null
          name?: string | null
          prefilter_passed_count?: number | null
          prefilter_rejected_count?: number | null
          processed_urls?: number
          processing_rate?: number | null
          progress_percentage?: number
          rejected_urls?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          successful_urls?: number
          total_cost?: number
          total_urls?: number
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          classification_reasoning: string | null
          classification_result:
            | Database["public"]["Enums"]["classification_result"]
            | null
          classification_score: number | null
          confidence_band: string | null
          created_at: string
          elimination_layer: string | null
          error_message: string | null
          id: string
          job_id: string
          layer1_reasoning: string | null
          llm_cost: number | null
          llm_provider: Database["public"]["Enums"]["llm_provider"] | null
          manual_review_required: boolean | null
          prefilter_passed: boolean | null
          prefilter_reasoning: string | null
          processed_at: string
          processing_time_ms: number | null
          retry_count: number | null
          status: Database["public"]["Enums"]["result_status"]
          url: string
        }
        Insert: {
          classification_reasoning?: string | null
          classification_result?:
            | Database["public"]["Enums"]["classification_result"]
            | null
          classification_score?: number | null
          confidence_band?: string | null
          created_at?: string
          elimination_layer?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          layer1_reasoning?: string | null
          llm_cost?: number | null
          llm_provider?: Database["public"]["Enums"]["llm_provider"] | null
          manual_review_required?: boolean | null
          prefilter_passed?: boolean | null
          prefilter_reasoning?: string | null
          processed_at?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          status: Database["public"]["Enums"]["result_status"]
          url: string
        }
        Update: {
          classification_reasoning?: string | null
          classification_result?:
            | Database["public"]["Enums"]["classification_result"]
            | null
          classification_score?: number | null
          confidence_band?: string | null
          created_at?: string
          elimination_layer?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          layer1_reasoning?: string | null
          llm_cost?: number | null
          llm_provider?: Database["public"]["Enums"]["llm_provider"] | null
          manual_review_required?: boolean | null
          prefilter_passed?: boolean | null
          prefilter_reasoning?: string | null
          processed_at?: string
          processing_time_ms?: number | null
          retry_count?: number | null
          status?: Database["public"]["Enums"]["result_status"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_job_with_urls: {
        Args: { p_name: string; p_urls: string[] }
        Returns: {
          created_at: string
          job_id: string
          job_name: string
          status: string
          total_urls: number
        }[]
      }
      increment_job_counters: {
        Args: {
          p_failed_urls_delta?: number
          p_gemini_cost_delta?: number
          p_gpt_cost_delta?: number
          p_job_id: string
          p_layer1_eliminated_delta?: number
          p_prefilter_passed_delta?: number
          p_prefilter_rejected_delta?: number
          p_processed_urls_delta?: number
          p_successful_urls_delta?: number
          p_total_cost_delta?: number
        }
        Returns: {
          completed_at: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["processing_stage"] | null
          current_url: string | null
          current_url_started_at: string | null
          estimated_time_remaining: number | null
          failed_urls: number
          gemini_cost: number
          gpt_cost: number
          id: string
          layer1_eliminated_count: number | null
          name: string | null
          prefilter_passed_count: number | null
          prefilter_rejected_count: number | null
          processed_urls: number
          processing_rate: number | null
          progress_percentage: number
          rejected_urls: number
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          successful_urls: number
          total_cost: number
          total_urls: number
          updated_at: string
        }
      }
    }
    Enums: {
      classification_result: "suitable" | "not_suitable" | "rejected_prefilter"
      job_status:
        | "pending"
        | "processing"
        | "paused"
        | "completed"
        | "failed"
        | "cancelled"
      llm_provider: "gemini" | "gpt" | "none"
      processing_stage: "fetching" | "filtering" | "classifying"
      result_status: "success" | "rejected" | "failed"
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
      classification_result: ["suitable", "not_suitable", "rejected_prefilter"],
      job_status: [
        "pending",
        "processing",
        "paused",
        "completed",
        "failed",
        "cancelled",
      ],
      llm_provider: ["gemini", "gpt", "none"],
      processing_stage: ["fetching", "filtering", "classifying"],
      result_status: ["success", "rejected", "failed"],
    },
  },
} as const
