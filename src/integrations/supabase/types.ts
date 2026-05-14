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
      appointments: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          pet_id: string
          scheduled_at: string
          service_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          veterinarian_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pet_id: string
          scheduled_at: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          veterinarian_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          pet_id?: string
          scheduled_at?: string
          service_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          veterinarian_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_preferences: {
        Row: {
          client_id: string
          created_at: string
          email_notifications: boolean
          id: string
          instagram_notifications: boolean
          instagram_username: string | null
          preferred_channel: string
          telegram_chat_id: string | null
          telegram_notifications: boolean
          updated_at: string
          whatsapp_notifications: boolean
          whatsapp_number: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email_notifications?: boolean
          id?: string
          instagram_notifications?: boolean
          instagram_username?: string | null
          preferred_channel?: string
          telegram_chat_id?: string | null
          telegram_notifications?: boolean
          updated_at?: string
          whatsapp_notifications?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email_notifications?: boolean
          id?: string
          instagram_notifications?: boolean
          instagram_username?: string | null
          preferred_channel?: string
          telegram_chat_id?: string | null
          telegram_notifications?: boolean
          updated_at?: string
          whatsapp_notifications?: boolean
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_number: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          lifetime_spend: number
          loyalty_balance: number
          loyalty_tier: string
          notes: string | null
          phone: string
          referral_code: string | null
          referred_by_client_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_number?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          lifetime_spend?: number
          loyalty_balance?: number
          loyalty_tier?: string
          notes?: string | null
          phone: string
          referral_code?: string | null
          referred_by_client_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_number?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          lifetime_spend?: number
          loyalty_balance?: number
          loyalty_tier?: string
          notes?: string | null
          phone?: string
          referral_code?: string | null
          referred_by_client_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_referred_by_client_id_fkey"
            columns: ["referred_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_working_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_working: boolean
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_working?: boolean
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_working?: boolean
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      diseases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          symptoms: string | null
          treatment_guidelines: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          symptoms?: string | null
          treatment_guidelines?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          symptoms?: string | null
          treatment_guidelines?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          appointment_id: string | null
          client_id: string
          comment: string | null
          created_at: string
          id: string
          medical_record_id: string | null
          rating: number | null
          responded_at: string | null
          responded_by: string | null
          response: string | null
          status: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          medical_record_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          medical_record_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          response?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_certificates: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          notes: string | null
          recipient_name: string | null
          recipient_phone: string | null
          redeemed_at: string | null
          redeemed_by_client_id: string | null
          status: string
        }
        Insert: {
          amount: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          redeemed_at?: string | null
          redeemed_by_client_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          redeemed_at?: string | null
          redeemed_by_client_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_certificates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_certificates_redeemed_by_client_id_fkey"
            columns: ["redeemed_by_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalization_logs: {
        Row: {
          appetite: string | null
          created_at: string
          created_by: string | null
          description: string | null
          hospitalization_id: string
          id: string
          is_visible_to_client: boolean
          log_type: string
          mood: string | null
          photo_url: string | null
          temperature: number | null
          title: string | null
          weight: number | null
        }
        Insert: {
          appetite?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hospitalization_id: string
          id?: string
          is_visible_to_client?: boolean
          log_type?: string
          mood?: string | null
          photo_url?: string | null
          temperature?: number | null
          title?: string | null
          weight?: number | null
        }
        Update: {
          appetite?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          hospitalization_id?: string
          id?: string
          is_visible_to_client?: boolean
          log_type?: string
          mood?: string | null
          photo_url?: string | null
          temperature?: number | null
          title?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalization_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalization_logs_hospitalization_id_fkey"
            columns: ["hospitalization_id"]
            isOneToOne: false
            referencedRelation: "hospitalizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitalizations: {
        Row: {
          admission_at: string
          cage_number: string | null
          client_id: string
          created_at: string
          daily_rate: number
          diagnosis: string | null
          discharge_at: string | null
          id: string
          notes: string | null
          pet_id: string
          reason: string | null
          status: string
          updated_at: string
          veterinarian_id: string | null
          visit_id: string | null
        }
        Insert: {
          admission_at?: string
          cage_number?: string | null
          client_id: string
          created_at?: string
          daily_rate?: number
          diagnosis?: string | null
          discharge_at?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          reason?: string | null
          status?: string
          updated_at?: string
          veterinarian_id?: string | null
          visit_id?: string | null
        }
        Update: {
          admission_at?: string
          cage_number?: string | null
          client_id?: string
          created_at?: string
          daily_rate?: number
          diagnosis?: string | null
          discharge_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          veterinarian_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitalizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hospitalizations_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string
          purchase_price: number | null
          quantity: number
          sale_price: number | null
          sku: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name: string
          purchase_price?: number | null
          quantity?: number
          sale_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string
          purchase_price?: number | null
          quantity?: number
          sale_price?: number | null
          sku?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          inventory_item_id: string | null
          invoice_id: string
          quantity: number
          service_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inventory_item_id?: string | null
          invoice_id: string
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inventory_item_id?: string | null
          invoice_id?: string
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          discount: number | null
          due_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          medical_record_id: string | null
          notes: string | null
          pet_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subtotal: number
          tax: number | null
          total: number
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          discount?: number | null
          due_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          medical_record_id?: string | null
          notes?: string | null
          pet_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          discount?: number | null
          due_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          medical_record_id?: string | null
          notes?: string | null
          pet_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_settings: {
        Row: {
          accrual_percent: number
          created_at: string
          gold_percent: number
          gold_threshold: number
          id: string
          is_enabled: boolean
          max_redeem_percent: number
          points_expire_days: number | null
          referee_bonus: number
          referrer_bonus: number
          silver_percent: number
          updated_at: string
          vip_percent: number
          vip_threshold: number
        }
        Insert: {
          accrual_percent?: number
          created_at?: string
          gold_percent?: number
          gold_threshold?: number
          id?: string
          is_enabled?: boolean
          max_redeem_percent?: number
          points_expire_days?: number | null
          referee_bonus?: number
          referrer_bonus?: number
          silver_percent?: number
          updated_at?: string
          vip_percent?: number
          vip_threshold?: number
        }
        Update: {
          accrual_percent?: number
          created_at?: string
          gold_percent?: number
          gold_threshold?: number
          id?: string
          is_enabled?: boolean
          max_redeem_percent?: number
          points_expire_days?: number | null
          referee_bonus?: number
          referrer_bonus?: number
          silver_percent?: number
          updated_at?: string
          vip_percent?: number
          vip_threshold?: number
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_id: string | null
          payment_id: string | null
          type: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_diagnoses: {
        Row: {
          created_at: string
          custom_diagnosis: string | null
          disease_id: string | null
          id: string
          medical_record_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          custom_diagnosis?: string | null
          disease_id?: string | null
          id?: string
          medical_record_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          custom_diagnosis?: string | null
          disease_id?: string | null
          id?: string
          medical_record_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_diagnoses_disease_id_fkey"
            columns: ["disease_id"]
            isOneToOne: false
            referencedRelation: "diseases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_diagnoses_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          laboratory_name: string | null
          medical_record_id: string
          notes: string | null
          pet_id: string
          study_date: string
          study_type: string
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          laboratory_name?: string | null
          medical_record_id: string
          notes?: string | null
          pet_id: string
          study_date?: string
          study_type?: string
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          laboratory_name?: string | null
          medical_record_id?: string
          notes?: string | null
          pet_id?: string
          study_date?: string
          study_type?: string
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_files_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_files_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_record_services: {
        Row: {
          created_at: string
          id: string
          medical_record_id: string
          notes: string | null
          price: number | null
          quantity: number | null
          service_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medical_record_id: string
          notes?: string | null
          price?: number | null
          quantity?: number | null
          service_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medical_record_id?: string
          notes?: string | null
          price?: number | null
          quantity?: number | null
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_services_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_record_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          allergy_notes: string | null
          anamnesis: string | null
          appointment_id: string | null
          chief_complaint: string | null
          clinical_findings: string | null
          created_at: string
          diagnosis: string | null
          doctor_notes: string | null
          examination_notes: string | null
          follow_up_plan: string | null
          id: string
          lab_results: string | null
          materials_used: string | null
          next_visit_date: string | null
          owner_recommendations: string | null
          pet_id: string
          prescriptions: string | null
          temperature: number | null
          treatment: string | null
          updated_at: string
          vaccination_status: string | null
          veterinarian_id: string | null
          visit_date: string
          weight_at_visit: number | null
        }
        Insert: {
          allergy_notes?: string | null
          anamnesis?: string | null
          appointment_id?: string | null
          chief_complaint?: string | null
          clinical_findings?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_notes?: string | null
          examination_notes?: string | null
          follow_up_plan?: string | null
          id?: string
          lab_results?: string | null
          materials_used?: string | null
          next_visit_date?: string | null
          owner_recommendations?: string | null
          pet_id: string
          prescriptions?: string | null
          temperature?: number | null
          treatment?: string | null
          updated_at?: string
          vaccination_status?: string | null
          veterinarian_id?: string | null
          visit_date?: string
          weight_at_visit?: number | null
        }
        Update: {
          allergy_notes?: string | null
          anamnesis?: string | null
          appointment_id?: string | null
          chief_complaint?: string | null
          clinical_findings?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_notes?: string | null
          examination_notes?: string | null
          follow_up_plan?: string | null
          id?: string
          lab_results?: string | null
          materials_used?: string | null
          next_visit_date?: string | null
          owner_recommendations?: string | null
          pet_id?: string
          prescriptions?: string | null
          temperature?: number | null
          treatment?: string | null
          updated_at?: string
          vaccination_status?: string | null
          veterinarian_id?: string | null
          visit_date?: string
          weight_at_visit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_channel_config: {
        Row: {
          channel: string
          config: Json | null
          created_at: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          channel: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          channel?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          channel: string | null
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          message: string | null
          scheduled_for: string | null
          sent_at: string | null
          severity: string | null
          target_role: string | null
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string | null
          target_role?: string | null
          title: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          channel?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          message?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          severity?: string | null
          target_role?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          breed: string | null
          client_id: string
          color: string | null
          created_at: string
          gender: Database["public"]["Enums"]["pet_gender"]
          id: string
          name: string
          notes: string | null
          photo_url: string | null
          species: Database["public"]["Enums"]["pet_species"]
          updated_at: string
          weight: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          client_id: string
          color?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["pet_gender"]
          id?: string
          name: string
          notes?: string | null
          photo_url?: string | null
          species?: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
          weight?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          client_id?: string
          color?: string | null
          created_at?: string
          gender?: Database["public"]["Enums"]["pet_gender"]
          id?: string
          name?: string
          notes?: string | null
          photo_url?: string | null
          species?: Database["public"]["Enums"]["pet_species"]
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_doses: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          prescription_id: string
          scheduled_at: string
          status: string
          taken_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          prescription_id: string
          scheduled_at: string
          status?: string
          taken_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          prescription_id?: string
          scheduled_at?: string
          status?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_doses_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          client_id: string
          created_at: string
          dosage: string
          duration_days: number
          frequency_per_day: number
          id: string
          instructions: string | null
          medical_record_id: string
          medication_name: string
          pet_id: string
          route: string | null
          start_date: string
          status: string
          times_of_day: string[]
          updated_at: string
          veterinarian_id: string | null
          visit_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          dosage: string
          duration_days?: number
          frequency_per_day?: number
          id?: string
          instructions?: string | null
          medical_record_id: string
          medication_name: string
          pet_id: string
          route?: string | null
          start_date?: string
          status?: string
          times_of_day?: string[]
          updated_at?: string
          veterinarian_id?: string | null
          visit_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          dosage?: string
          duration_days?: number
          frequency_per_day?: number
          id?: string
          instructions?: string | null
          medical_record_id?: string
          medication_name?: string
          pet_id?: string
          route?: string | null
          start_date?: string
          status?: string
          times_of_day?: string[]
          updated_at?: string
          veterinarian_id?: string | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_veterinarian_id_fkey"
            columns: ["veterinarian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      shop_sale_items: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          quantity: number
          sale_id: string
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          quantity?: number
          sale_id: string
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "shop_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_sales: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pet_id: string | null
          sold_by: string | null
          total: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pet_id?: string | null
          sold_by?: string | null
          total?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pet_id?: string | null
          sold_by?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_sales_sold_by_fkey"
            columns: ["sold_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_materials: {
        Row: {
          charged_to_client: boolean
          created_at: string
          deducted: boolean
          description: string
          id: string
          inventory_item_id: string
          quantity: number
          total: number
          unit_price: number
          visit_id: string
        }
        Insert: {
          charged_to_client?: boolean
          created_at?: string
          deducted?: boolean
          description: string
          id?: string
          inventory_item_id: string
          quantity?: number
          total?: number
          unit_price?: number
          visit_id: string
        }
        Update: {
          charged_to_client?: boolean
          created_at?: string
          deducted?: boolean
          description?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          total?: number
          unit_price?: number
          visit_id?: string
        }
        Relationships: []
      }
      visit_services: {
        Row: {
          created_at: string
          description: string
          id: string
          notes: string | null
          quantity: number
          service_id: string | null
          total: number
          unit_price: number
          visit_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          notes?: string | null
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
          visit_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          notes?: string | null
          quantity?: number
          service_id?: string | null
          total?: number
          unit_price?: number
          visit_id?: string
        }
        Relationships: []
      }
      visit_templates: {
        Row: {
          assessment: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          objective: string | null
          plan: string | null
          service_ids: string[] | null
          subjective: string | null
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          objective?: string | null
          plan?: string | null
          service_ids?: string[] | null
          subjective?: string | null
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          objective?: string | null
          plan?: string | null
          service_ids?: string[] | null
          subjective?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          appointment_id: string | null
          assessment: string | null
          chief_complaint: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          medical_record_id: string
          next_visit_date: string | null
          notes: string | null
          objective: string | null
          pet_id: string
          plan: string | null
          pulse: number | null
          respiratory_rate: number | null
          status: string
          subjective: string | null
          temperature: number | null
          updated_at: string
          veterinarian_id: string | null
          visit_date: string
          weight: number | null
        }
        Insert: {
          appointment_id?: string | null
          assessment?: string | null
          chief_complaint?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id: string
          next_visit_date?: string | null
          notes?: string | null
          objective?: string | null
          pet_id: string
          plan?: string | null
          pulse?: number | null
          respiratory_rate?: number | null
          status?: string
          subjective?: string | null
          temperature?: number | null
          updated_at?: string
          veterinarian_id?: string | null
          visit_date?: string
          weight?: number | null
        }
        Update: {
          appointment_id?: string | null
          assessment?: string | null
          chief_complaint?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          medical_record_id?: string
          next_visit_date?: string | null
          notes?: string | null
          objective?: string | null
          pet_id?: string
          plan?: string | null
          pulse?: number | null
          respiratory_rate?: number | null
          status?: string
          subjective?: string | null
          temperature?: number | null
          updated_at?: string
          veterinarian_id?: string | null
          visit_date?: string
          weight?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_pet_medical_record: { Args: { _pet_id: string }; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_veterinarians: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      recalc_client_tier: { Args: { _client_id: string }; Returns: undefined }
    }
    Enums: {
      app_role:
        | "admin"
        | "veterinarian"
        | "registrar"
        | "accountant"
        | "manager"
        | "viewer"
        | "client"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      movement_type: "in" | "out" | "adjustment" | "sale" | "treatment"
      payment_status: "pending" | "partial" | "paid" | "refunded" | "cancelled"
      pet_gender: "male" | "female" | "unknown"
      pet_species:
        | "dog"
        | "cat"
        | "bird"
        | "rodent"
        | "reptile"
        | "fish"
        | "other"
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
        "veterinarian",
        "registrar",
        "accountant",
        "manager",
        "viewer",
        "client",
      ],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      movement_type: ["in", "out", "adjustment", "sale", "treatment"],
      payment_status: ["pending", "partial", "paid", "refunded", "cancelled"],
      pet_gender: ["male", "female", "unknown"],
      pet_species: ["dog", "cat", "bird", "rodent", "reptile", "fish", "other"],
    },
  },
} as const
