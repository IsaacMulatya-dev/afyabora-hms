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
      billing: {
        Row: {
          consultation_id: string | null
          created_at: string
          created_by: string | null
          id: string
          insurance_claim_number: string | null
          invoice_number: string
          items: Json
          paid_amount: number
          patient_id: string
          payment_method: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_claim_number?: string | null
          invoice_number: string
          items?: Json
          paid_amount?: number
          patient_id: string
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          insurance_claim_number?: string | null
          invoice_number?: string
          items?: Json
          paid_amount?: number
          patient_id?: string
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          clinical_notes: string | null
          consultation_date: string
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          patient_id: string
          status: string
          triage_notes: string | null
          updated_at: string
          vitals: Json | null
        }
        Insert: {
          clinical_notes?: string | null
          consultation_date?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          status?: string
          triage_notes?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Update: {
          clinical_notes?: string | null
          consultation_date?: string
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          status?: string
          triage_notes?: string | null
          updated_at?: string
          vitals?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      inpatient_records: {
        Row: {
          admitted_at: string
          bed_number: string
          consultation_id: string | null
          created_at: string
          discharge_notes: string | null
          discharged_at: string | null
          id: string
          patient_id: string
          status: string
          updated_at: string
          ward: string
        }
        Insert: {
          admitted_at?: string
          bed_number: string
          consultation_id?: string | null
          created_at?: string
          discharge_notes?: string | null
          discharged_at?: string | null
          id?: string
          patient_id: string
          status?: string
          updated_at?: string
          ward: string
        }
        Update: {
          admitted_at?: string
          bed_number?: string
          consultation_id?: string | null
          created_at?: string
          discharge_notes?: string | null
          discharged_at?: string | null
          id?: string
          patient_id?: string
          status?: string
          updated_at?: string
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "inpatient_records_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inpatient_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          completed_at: string | null
          consultation_id: string | null
          created_at: string
          id: string
          patient_id: string
          reference_range: string | null
          requested_at: string
          requested_by: string
          result: string | null
          sample_type: string | null
          status: string
          test_category: string | null
          test_name: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          reference_range?: string | null
          requested_at?: string
          requested_by: string
          result?: string | null
          sample_type?: string | null
          status?: string
          test_category?: string | null
          test_name: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          consultation_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          reference_range?: string | null
          requested_at?: string
          requested_by?: string
          result?: string | null
          sample_type?: string | null
          status?: string
          test_category?: string | null
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_queue: {
        Row: {
          consultation_id: string | null
          created_at: string
          department: string
          id: string
          notes: string | null
          patient_id: string
          priority: string
          sent_by: string | null
          sent_from: string | null
          status: string
          updated_at: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          department: string
          id?: string
          notes?: string | null
          patient_id: string
          priority?: string
          sent_by?: string | null
          sent_from?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          department?: string
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: string
          sent_by?: string | null
          sent_from?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_queue_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_group: string | null
          city: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string
          id: string
          id_number: string | null
          insurance_provider: string | null
          last_name: string
          patient_id: string
          phone: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender: string
          id?: string
          id_number?: string | null
          insurance_provider?: string | null
          last_name: string
          patient_id: string
          phone: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          blood_group?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string
          id?: string
          id_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          patient_id?: string
          phone?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          consultation_id: string | null
          created_at: string
          dispensed: boolean
          dispensed_at: string | null
          dispensed_by: string | null
          dosage: string
          duration: string | null
          frequency: string
          id: string
          medication_name: string
          notes: string | null
          patient_id: string
          prescribed_by: string
          quantity: number | null
          updated_at: string
        }
        Insert: {
          consultation_id?: string | null
          created_at?: string
          dispensed?: boolean
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage: string
          duration?: string | null
          frequency: string
          id?: string
          medication_name: string
          notes?: string | null
          patient_id: string
          prescribed_by: string
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          consultation_id?: string | null
          created_at?: string
          dispensed?: boolean
          dispensed_at?: string | null
          dispensed_by?: string | null
          dosage?: string
          duration?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string | null
          patient_id?: string
          prescribed_by?: string
          quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "doctor"
        | "nurse"
        | "lab_technician"
        | "pharmacist"
        | "receptionist"
        | "billing_clerk"
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
      app_role: [
        "admin",
        "doctor",
        "nurse",
        "lab_technician",
        "pharmacist",
        "receptionist",
        "billing_clerk",
      ],
    },
  },
} as const
