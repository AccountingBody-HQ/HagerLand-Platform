// Generated from supabase/migrations by `supabase gen types typescript`. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      admin_notes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          note: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          note: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string
        }
        Relationships: []
      }
      agency_activity: {
        Row: {
          actor: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          text: string
        }
        ComputedFields: never
        Insert: {
          actor?: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          text: string
        }
        Update: {
          actor?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          text?: string
        }
        Relationships: []
      }
      agency_contacts: {
        Row: {
          assigned_agent: string | null
          consent_at: string | null
          consent_source: string | null
          country_code: string
          created_at: string
          email: string | null
          id: string
          marketing_consent: boolean
          name: string
          notes: string | null
          phone: string | null
          reference: string
          roles: string[]
          time_zone: string | null
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          assigned_agent?: string | null
          consent_at?: string | null
          consent_source?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          reference?: string
          roles?: string[]
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_agent?: string | null
          consent_at?: string | null
          consent_source?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          marketing_consent?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          reference?: string
          roles?: string[]
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agency_documents: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string
          storage_path: string
          uploaded_by: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      agency_instructions: {
        Row: {
          address_line: string | null
          agency_type: string | null
          agreement_path: string | null
          asking_price_etb: number | null
          assigned_agent: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          fee_amount_etb: number | null
          fee_percent: number | null
          fee_type: string | null
          final_price_etb: number | null
          id: string
          live_at: string | null
          location_id: string | null
          notes: string | null
          property_id: string | null
          property_type: Database['public']['Enums']['property_type'] | null
          purpose: Database['public']['Enums']['listing_purpose']
          reference: string
          source: string
          stage: string
          term_end: string | null
          term_start: string | null
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          agency_type?: string | null
          agreement_path?: string | null
          asking_price_etb?: number | null
          assigned_agent?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          fee_amount_etb?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          final_price_etb?: number | null
          id?: string
          live_at?: string | null
          location_id?: string | null
          notes?: string | null
          property_id?: string | null
          property_type?: Database['public']['Enums']['property_type'] | null
          purpose: Database['public']['Enums']['listing_purpose']
          reference?: string
          source?: string
          stage?: string
          term_end?: string | null
          term_start?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          agency_type?: string | null
          agreement_path?: string | null
          asking_price_etb?: number | null
          assigned_agent?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          fee_amount_etb?: number | null
          fee_percent?: number | null
          fee_type?: string | null
          final_price_etb?: number | null
          id?: string
          live_at?: string | null
          location_id?: string | null
          notes?: string | null
          property_id?: string | null
          property_type?: Database['public']['Enums']['property_type'] | null
          purpose?: Database['public']['Enums']['listing_purpose']
          reference?: string
          source?: string
          stage?: string
          term_end?: string | null
          term_start?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agency_instructions_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_instructions_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_instructions_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_instructions_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_instructions_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties_public'
            referencedColumns: ['id']
          },
        ]
      }
      agency_offers: {
        Row: {
          amount_etb: number
          conditions: string | null
          contact_id: string | null
          counter_amount_etb: number | null
          created_at: string
          decided_at: string | null
          email: string | null
          funding_note: string | null
          id: string
          instruction_id: string | null
          ip_hash: string | null
          name: string
          phone: string
          property_id: string
          reference: string
          status: string
          updated_at: string
          user_id: string | null
          vendor_decision: string | null
        }
        ComputedFields: never
        Insert: {
          amount_etb: number
          conditions?: string | null
          contact_id?: string | null
          counter_amount_etb?: number | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          funding_note?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          name: string
          phone: string
          property_id: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_decision?: string | null
        }
        Update: {
          amount_etb?: number
          conditions?: string | null
          contact_id?: string | null
          counter_amount_etb?: number | null
          created_at?: string
          decided_at?: string | null
          email?: string | null
          funding_note?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          name?: string
          phone?: string
          property_id?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vendor_decision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'agency_offers_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_offers_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_offers_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_offers_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties_public'
            referencedColumns: ['id']
          },
        ]
      }
      agency_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          done: boolean
          done_at: string | null
          due_on: string | null
          entity_id: string
          entity_type: string
          id: string
          title: string
        }
        ComputedFields: never
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          done?: boolean
          done_at?: string | null
          due_on?: string | null
          entity_id: string
          entity_type: string
          id?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          done?: boolean
          done_at?: string | null
          due_on?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      agency_valuations: {
        Row: {
          address_line: string | null
          appointment_at: string | null
          assigned_agent: string | null
          contact_id: string | null
          created_at: string
          details: string | null
          id: string
          instruction_id: string | null
          ip_hash: string | null
          location_id: string | null
          notes: string | null
          outcome: string
          preferred_times: string | null
          property_type: Database['public']['Enums']['property_type'] | null
          purpose: Database['public']['Enums']['listing_purpose']
          reference: string
          report_path: string | null
          status: string
          time_zone: string | null
          updated_at: string
          user_id: string | null
          value_high_etb: number | null
          value_low_etb: number | null
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          appointment_at?: string | null
          assigned_agent?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          location_id?: string | null
          notes?: string | null
          outcome?: string
          preferred_times?: string | null
          property_type?: Database['public']['Enums']['property_type'] | null
          purpose: Database['public']['Enums']['listing_purpose']
          reference?: string
          report_path?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          value_high_etb?: number | null
          value_low_etb?: number | null
        }
        Update: {
          address_line?: string | null
          appointment_at?: string | null
          assigned_agent?: string | null
          contact_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          location_id?: string | null
          notes?: string | null
          outcome?: string
          preferred_times?: string | null
          property_type?: Database['public']['Enums']['property_type'] | null
          purpose?: Database['public']['Enums']['listing_purpose']
          reference?: string
          report_path?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          value_high_etb?: number | null
          value_low_etb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'agency_valuations_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_valuations_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_valuations_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      agency_viewings: {
        Row: {
          assigned_agent: string | null
          confirmed_at: string | null
          contact_id: string | null
          created_at: string
          email: string | null
          feedback: string | null
          id: string
          instruction_id: string | null
          ip_hash: string | null
          message: string | null
          mode: string
          name: string
          phone: string
          preferred_times: string | null
          property_id: string
          reference: string
          reminder_sent_at: string | null
          scheduled_at: string | null
          status: string
          time_zone: string | null
          updated_at: string
          user_id: string | null
          video_link: string | null
        }
        ComputedFields: never
        Insert: {
          assigned_agent?: string | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          message?: string | null
          mode: string
          name: string
          phone: string
          preferred_times?: string | null
          property_id: string
          reference?: string
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          video_link?: string | null
        }
        Update: {
          assigned_agent?: string | null
          confirmed_at?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          feedback?: string | null
          id?: string
          instruction_id?: string | null
          ip_hash?: string | null
          message?: string | null
          mode?: string
          name?: string
          phone?: string
          preferred_times?: string | null
          property_id?: string
          reference?: string
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'agency_viewings_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_viewings_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_viewings_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_viewings_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties_public'
            referencedColumns: ['id']
          },
        ]
      }
      applicant_requirements: {
        Row: {
          beds_min: number | null
          budget_max_etb: number | null
          budget_min_etb: number | null
          contact_id: string
          created_at: string
          id: string
          is_active: boolean
          last_emailed_at: string | null
          location_ids: string[]
          notes: string | null
          property_types: Database['public']['Enums']['property_type'][]
          purpose: Database['public']['Enums']['listing_purpose']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          beds_min?: number | null
          budget_max_etb?: number | null
          budget_min_etb?: number | null
          contact_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_emailed_at?: string | null
          location_ids?: string[]
          notes?: string | null
          property_types?: Database['public']['Enums']['property_type'][]
          purpose: Database['public']['Enums']['listing_purpose']
          updated_at?: string
        }
        Update: {
          beds_min?: number | null
          budget_max_etb?: number | null
          budget_min_etb?: number | null
          contact_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_emailed_at?: string | null
          location_ids?: string[]
          notes?: string | null
          property_types?: Database['public']['Enums']['property_type'][]
          purpose?: Database['public']['Enums']['listing_purpose']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applicant_requirements_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
        ]
      }
      area_guides: {
        Row: {
          faqs: NonNullable<Json>
          is_published: boolean
          location_id: string
          notes: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          faqs?: NonNullable<Json>
          is_published?: boolean
          location_id: string
          notes?: string
          updated_at?: string
        }
        Update: {
          faqs?: NonNullable<Json>
          is_published?: boolean
          location_id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'area_guides_location_id_fkey'
            columns: ['location_id']
            isOneToOne: true
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
        }
        ComputedFields: never
        Insert: {
          action: string
          actor: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          country_of_origin: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_path: string | null
          name: string
          slug: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          country_of_origin?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          country_of_origin?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      build_cost_rates: {
        Row: {
          created_at: string
          finish: string
          id: string
          location_id: string | null
          notes: string | null
          rate_etb_per_m2: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          finish: string
          id?: string
          location_id?: string | null
          notes?: string | null
          rate_etb_per_m2: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          finish?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          rate_etb_per_m2?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'build_cost_rates_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      build_projects: {
        Row: {
          admin_notes: string | null
          budget_band: string
          country_code: string
          created_at: string
          details: string | null
          email: string
          floors: number | null
          id: string
          ip_hash: string | null
          location_id: string | null
          location_text: string | null
          name: string
          phone: string
          plot_size_m2: number | null
          preferred_times: string | null
          reference: string
          services: string[]
          status: string
          time_zone: string | null
          timeline: string
          title: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          budget_band: string
          country_code?: string
          created_at?: string
          details?: string | null
          email: string
          floors?: number | null
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          location_text?: string | null
          name: string
          phone: string
          plot_size_m2?: number | null
          preferred_times?: string | null
          reference?: string
          services: string[]
          status?: string
          time_zone?: string | null
          timeline: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          budget_band?: string
          country_code?: string
          created_at?: string
          details?: string | null
          email?: string
          floors?: number | null
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          location_text?: string | null
          name?: string
          phone?: string
          plot_size_m2?: number | null
          preferred_times?: string | null
          reference?: string
          services?: string[]
          status?: string
          time_zone?: string | null
          timeline?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'build_projects_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      candidate_profiles: {
        Row: {
          availability: string
          country_code: string
          created_at: string
          cv_path: string | null
          experience: string | null
          experience_years: number | null
          full_name: string
          headline: string | null
          location_id: string | null
          placement_wanted: boolean
          qualifications: string | null
          skills: string[]
          updated_at: string
          user_id: string
          visibility: string
        }
        ComputedFields: never
        Insert: {
          availability?: string
          country_code?: string
          created_at?: string
          cv_path?: string | null
          experience?: string | null
          experience_years?: number | null
          full_name: string
          headline?: string | null
          location_id?: string | null
          placement_wanted?: boolean
          qualifications?: string | null
          skills?: string[]
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          availability?: string
          country_code?: string
          created_at?: string
          cv_path?: string | null
          experience?: string | null
          experience_years?: number | null
          full_name?: string
          headline?: string | null
          location_id?: string | null
          placement_wanted?: boolean
          qualifications?: string | null
          skills?: string[]
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: 'candidate_profiles_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      claims: {
        Row: {
          admin_notes: string | null
          claimant_email: string | null
          claimant_name: string
          claimant_phone: string
          created_at: string
          decided_at: string | null
          evidence_paths: string[]
          id: string
          message: string | null
          org_id: string
          relationship: string
          status: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          claimant_email?: string | null
          claimant_name: string
          claimant_phone: string
          created_at?: string
          decided_at?: string | null
          evidence_paths?: string[]
          id?: string
          message?: string | null
          org_id: string
          relationship: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          claimant_email?: string | null
          claimant_name?: string
          claimant_phone?: string
          created_at?: string
          decided_at?: string | null
          evidence_paths?: string[]
          id?: string
          message?: string | null
          org_id?: string
          relationship?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'claims_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'claims_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      contact_reveals: {
        Row: {
          channel: string
          created_at: string
          id: string
          ip_hash: string | null
          target_id: string
          target_type: string
          viewer_user_id: string | null
        }
        ComputedFields: never
        Insert: {
          channel: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          target_id: string
          target_type: string
          viewer_user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          target_id?: string
          target_type?: string
          viewer_user_id?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          closed_at: string | null
          commission_minor: number | null
          created_at: string
          currency: string
          id: string
          lead_fee_minor: number | null
          match_id: string | null
          notes: string | null
          org_id: string | null
          pillar_key: string | null
          reference: string
          source_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          value_minor: number | null
        }
        ComputedFields: never
        Insert: {
          closed_at?: string | null
          commission_minor?: number | null
          created_at?: string
          currency?: string
          id?: string
          lead_fee_minor?: number | null
          match_id?: string | null
          notes?: string | null
          org_id?: string | null
          pillar_key?: string | null
          reference?: string
          source_id?: string | null
          source_type: string
          status?: string
          title: string
          updated_at?: string
          value_minor?: number | null
        }
        Update: {
          closed_at?: string | null
          commission_minor?: number | null
          created_at?: string
          currency?: string
          id?: string
          lead_fee_minor?: number | null
          match_id?: string | null
          notes?: string | null
          org_id?: string | null
          pillar_key?: string | null
          reference?: string
          source_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          value_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'deals_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'service_request_matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'service_requests_for_provider'
            referencedColumns: ['match_id']
          },
          {
            foreignKeyName: 'deals_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'deals_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
        ]
      }
      development_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          development_id: string
          happened_on: string
          id: string
          photo_paths: string[]
          rejection_reason: string | null
          status: Database['public']['Enums']['listing_status']
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          development_id: string
          happened_on: string
          id?: string
          photo_paths?: string[]
          rejection_reason?: string | null
          status?: Database['public']['Enums']['listing_status']
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          development_id?: string
          happened_on?: string
          id?: string
          photo_paths?: string[]
          rejection_reason?: string | null
          status?: Database['public']['Enums']['listing_status']
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'development_updates_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'development_updates_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
        ]
      }
      developments: {
        Row: {
          address_line: string | null
          amenities: string[]
          brochure_path: string | null
          completed_year: number | null
          completion_status: Database['public']['Enums']['completion_status'] | null
          created_at: string
          created_by: string | null
          description: string | null
          developer_org_id: string | null
          enquiries_count: number
          expected_completion: string | null
          featured_until: string | null
          finishing_status: Database['public']['Enums']['finishing_status'] | null
          floors_label: string | null
          id: string
          is_featured: boolean
          is_hagerland: boolean
          kind: Database['public']['Enums']['development_kind']
          lat: number | null
          lng: number | null
          location_id: string | null
          name: string
          payment_plan: string | null
          pending_changes: Json | null
          price_from_etb: number | null
          price_to_etb: number | null
          published_at: string | null
          register_interest_enabled: boolean
          rejection_reason: string | null
          search_tsv: unknown
          short_id: string
          slug: string
          status: Database['public']['Enums']['listing_status']
          summary: string | null
          tenure: Database['public']['Enums']['tenure'] | null
          total_units: number | null
          unit_types: NonNullable<Json>
          updated_at: string
          video_url: string | null
          views_count: number
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          amenities?: string[]
          brochure_path?: string | null
          completed_year?: number | null
          completion_status?: Database['public']['Enums']['completion_status'] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          developer_org_id?: string | null
          enquiries_count?: number
          expected_completion?: string | null
          featured_until?: string | null
          finishing_status?: Database['public']['Enums']['finishing_status'] | null
          floors_label?: string | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          kind?: Database['public']['Enums']['development_kind']
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name: string
          payment_plan?: string | null
          pending_changes?: Json | null
          price_from_etb?: number | null
          price_to_etb?: number | null
          published_at?: string | null
          register_interest_enabled?: boolean
          rejection_reason?: string | null
          search_tsv?: never
          short_id?: string
          slug: string
          status?: Database['public']['Enums']['listing_status']
          summary?: string | null
          tenure?: Database['public']['Enums']['tenure'] | null
          total_units?: number | null
          unit_types?: NonNullable<Json>
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          address_line?: string | null
          amenities?: string[]
          brochure_path?: string | null
          completed_year?: number | null
          completion_status?: Database['public']['Enums']['completion_status'] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          developer_org_id?: string | null
          enquiries_count?: number
          expected_completion?: string | null
          featured_until?: string | null
          finishing_status?: Database['public']['Enums']['finishing_status'] | null
          floors_label?: string | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          kind?: Database['public']['Enums']['development_kind']
          lat?: number | null
          lng?: number | null
          location_id?: string | null
          name?: string
          payment_plan?: string | null
          pending_changes?: Json | null
          price_from_etb?: number | null
          price_to_etb?: number | null
          published_at?: string | null
          register_interest_enabled?: boolean
          rejection_reason?: string | null
          search_tsv?: never
          short_id?: string
          slug?: string
          status?: Database['public']['Enums']['listing_status']
          summary?: string | null
          tenure?: Database['public']['Enums']['tenure'] | null
          total_units?: number | null
          unit_types?: NonNullable<Json>
          updated_at?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'developments_developer_org_id_fkey'
            columns: ['developer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'developments_developer_org_id_fkey'
            columns: ['developer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'developments_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      email_outbox: {
        Row: {
          attempts: number
          created_at: string
          headers: NonNullable<Json>
          html: string
          id: string
          last_error: string | null
          next_attempt_at: string
          reply_to: string | null
          sender: string
          sent_at: string | null
          status: string
          subject: string
          text_body: string
          to_addresses: string[]
        }
        ComputedFields: never
        Insert: {
          attempts?: number
          created_at?: string
          headers?: NonNullable<Json>
          html: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          reply_to?: string | null
          sender?: string
          sent_at?: string | null
          status?: string
          subject: string
          text_body: string
          to_addresses: string[]
        }
        Update: {
          attempts?: number
          created_at?: string
          headers?: NonNullable<Json>
          html?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          reply_to?: string | null
          sender?: string
          sent_at?: string | null
          status?: string
          subject?: string
          text_body?: string
          to_addresses?: string[]
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          created_at: string
          details: Json | null
          email: string | null
          first_viewed_at: string | null
          id: string
          intent: string
          ip_hash: string | null
          message: string
          name: string
          phone: string
          preferred_contact: string | null
          recipient_notes: string | null
          recipient_org_id: string | null
          recipient_user_id: string | null
          reference: string
          sender_user_id: string | null
          source_url: string | null
          status: Database['public']['Enums']['enquiry_status']
          target_id: string | null
          target_type: string
          updated_at: string
          user_agent: string | null
          utm: Json | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          details?: Json | null
          email?: string | null
          first_viewed_at?: string | null
          id?: string
          intent?: string
          ip_hash?: string | null
          message: string
          name: string
          phone: string
          preferred_contact?: string | null
          recipient_notes?: string | null
          recipient_org_id?: string | null
          recipient_user_id?: string | null
          reference?: string
          sender_user_id?: string | null
          source_url?: string | null
          status?: Database['public']['Enums']['enquiry_status']
          target_id?: string | null
          target_type: string
          updated_at?: string
          user_agent?: string | null
          utm?: Json | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          email?: string | null
          first_viewed_at?: string | null
          id?: string
          intent?: string
          ip_hash?: string | null
          message?: string
          name?: string
          phone?: string
          preferred_contact?: string | null
          recipient_notes?: string | null
          recipient_org_id?: string | null
          recipient_user_id?: string | null
          reference?: string
          sender_user_id?: string | null
          source_url?: string | null
          status?: Database['public']['Enums']['enquiry_status']
          target_id?: string | null
          target_type?: string
          updated_at?: string
          user_agent?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'enquiries_recipient_org_id_fkey'
            columns: ['recipient_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'enquiries_recipient_org_id_fkey'
            columns: ['recipient_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      errors: {
        Row: {
          count: number
          first_seen_at: string
          id: string
          last_seen_at: string
          message: string
          route: string
        }
        ComputedFields: never
        Insert: {
          count?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message: string
          route: string
        }
        Update: {
          count?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          message?: string
          route?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          currency: string
          etb_per_unit: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          currency: string
          etb_per_unit: number
          updated_at?: string
        }
        Update: {
          currency?: string
          etb_per_unit?: number
          updated_at?: string
        }
        Relationships: []
      }
      guides: {
        Row: {
          body: string
          created_at: string
          faq: NonNullable<Json>
          id: string
          needs_review: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          summary: string
          title: string
          topic: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          body?: string
          created_at?: string
          faq?: NonNullable<Json>
          id?: string
          needs_review?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          summary?: string
          title: string
          topic?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          faq?: NonNullable<Json>
          id?: string
          needs_review?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          summary?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_log: {
        Row: {
          entity_type: string | null
          error: string | null
          google_place_id: string
          imported_at: string
          listing_id: string | null
          listing_name: string | null
          section: string
          status: string
        }
        ComputedFields: never
        Insert: {
          entity_type?: string | null
          error?: string | null
          google_place_id: string
          imported_at?: string
          listing_id?: string | null
          listing_name?: string | null
          section: string
          status?: string
        }
        Update: {
          entity_type?: string | null
          error?: string | null
          google_place_id?: string
          imported_at?: string
          listing_id?: string | null
          listing_name?: string | null
          section?: string
          status?: string
        }
        Relationships: []
      }
      interest_registrations: {
        Row: {
          admin_notes: string | null
          audience: string | null
          category: string | null
          city: string | null
          consent_at: string | null
          country_code: string
          created_at: string
          currency: string
          email: string
          id: string
          ip_hash: string | null
          marketing_consent: boolean
          message: string | null
          name: string
          phone: string | null
          pillar_key: string | null
          reference: string
          source_url: string | null
          status: string
          updated_at: string
          user_id: string | null
          utm: Json | null
          vertical_key: string
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          audience?: string | null
          category?: string | null
          city?: string | null
          consent_at?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          email: string
          id?: string
          ip_hash?: string | null
          marketing_consent?: boolean
          message?: string | null
          name: string
          phone?: string | null
          pillar_key?: string | null
          reference?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          utm?: Json | null
          vertical_key: string
        }
        Update: {
          admin_notes?: string | null
          audience?: string | null
          category?: string | null
          city?: string | null
          consent_at?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          email?: string
          id?: string
          ip_hash?: string | null
          marketing_consent?: boolean
          message?: string | null
          name?: string
          phone?: string | null
          pillar_key?: string | null
          reference?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          utm?: Json | null
          vertical_key?: string
        }
        Relationships: [
          {
            foreignKeyName: 'interest_registrations_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'interest_registrations_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'interest_registrations_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'interest_registrations_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals_public'
            referencedColumns: ['key']
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_user_id: string
          cover_note: string | null
          created_at: string
          cv_path: string | null
          cv_purged_at: string | null
          email: string
          employer_notes: string | null
          id: string
          job_id: string
          name: string
          phone: string | null
          reference: string
          status: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          applicant_user_id: string
          cover_note?: string | null
          created_at?: string
          cv_path?: string | null
          cv_purged_at?: string | null
          email: string
          employer_notes?: string | null
          id?: string
          job_id: string
          name: string
          phone?: string | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_user_id?: string
          cover_note?: string | null
          created_at?: string
          cv_path?: string | null
          cv_purged_at?: string | null
          email?: string
          employer_notes?: string | null
          id?: string
          job_id?: string
          name?: string
          phone?: string | null
          reference?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'job_applications_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'job_posts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_applications_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs_public'
            referencedColumns: ['id']
          },
        ]
      }
      job_posts: {
        Row: {
          applications_count: number
          category: string
          closing_date: string | null
          country_code: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          employer_org_id: string
          employment_type: string
          expires_at: string | null
          id: string
          location_id: string | null
          published_at: string | null
          rejection_reason: string | null
          requirements: string | null
          salary_max_minor: number | null
          salary_min_minor: number | null
          salary_period: string | null
          search_tsv: unknown
          short_id: string
          slug: string
          status: Database['public']['Enums']['listing_status']
          title: string
          updated_at: string
          views_count: number
        }
        ComputedFields: never
        Insert: {
          applications_count?: number
          category: string
          closing_date?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description: string
          employer_org_id: string
          employment_type: string
          expires_at?: string | null
          id?: string
          location_id?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          requirements?: string | null
          salary_max_minor?: number | null
          salary_min_minor?: number | null
          salary_period?: string | null
          search_tsv?: never
          short_id?: string
          slug: string
          status?: Database['public']['Enums']['listing_status']
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          applications_count?: number
          category?: string
          closing_date?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          employer_org_id?: string
          employment_type?: string
          expires_at?: string | null
          id?: string
          location_id?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          requirements?: string | null
          salary_max_minor?: number | null
          salary_min_minor?: number | null
          salary_period?: string | null
          search_tsv?: never
          short_id?: string
          slug?: string
          status?: Database['public']['Enums']['listing_status']
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'job_posts_employer_org_id_fkey'
            columns: ['employer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_posts_employer_org_id_fkey'
            columns: ['employer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_posts_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      locations: {
        Row: {
          country_code: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          lat: number | null
          level: Database['public']['Enums']['location_level']
          lng: number | null
          name: string
          name_am: string | null
          parent_id: string | null
          path: string
          search_tsv: unknown
          seo_intro_professionals: string | null
          seo_intro_rent: string | null
          seo_intro_sale: string | null
          slug: string
          sort: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          country_code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          level: Database['public']['Enums']['location_level']
          lng?: number | null
          name: string
          name_am?: string | null
          parent_id?: string | null
          path: string
          search_tsv?: never
          seo_intro_professionals?: string | null
          seo_intro_rent?: string | null
          seo_intro_sale?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          level?: Database['public']['Enums']['location_level']
          lng?: number | null
          name?: string
          name_am?: string | null
          parent_id?: string | null
          path?: string
          search_tsv?: never
          seo_intro_professionals?: string | null
          seo_intro_rent?: string | null
          seo_intro_sale?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'locations_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      maintenance_log: {
        Row: {
          cost_minor: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          logged_on: string
          managed_property_id: string
          service_request_id: string | null
          status: string
          title: string
        }
        ComputedFields: never
        Insert: {
          cost_minor?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          logged_on: string
          managed_property_id: string
          service_request_id?: string | null
          status?: string
          title: string
        }
        Update: {
          cost_minor?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          logged_on?: string
          managed_property_id?: string
          service_request_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_log_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_log_service_request_id_fkey'
            columns: ['service_request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_log_service_request_id_fkey'
            columns: ['service_request_id']
            isOneToOne: false
            referencedRelation: 'service_requests_for_provider'
            referencedColumns: ['request_id']
          },
        ]
      }
      managed_properties: {
        Row: {
          address_line: string | null
          care_request_id: string | null
          created_at: string
          currency: string
          id: string
          location_id: string | null
          monthly_fee_minor: number | null
          notes: string | null
          owner_country_code: string | null
          owner_email: string | null
          owner_name: string
          owner_phone: string | null
          owner_user_id: string | null
          property_type: string | null
          reference: string
          services: string[]
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          care_request_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          location_id?: string | null
          monthly_fee_minor?: number | null
          notes?: string | null
          owner_country_code?: string | null
          owner_email?: string | null
          owner_name: string
          owner_phone?: string | null
          owner_user_id?: string | null
          property_type?: string | null
          reference?: string
          services?: string[]
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          care_request_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          location_id?: string | null
          monthly_fee_minor?: number | null
          notes?: string | null
          owner_country_code?: string | null
          owner_email?: string | null
          owner_name?: string
          owner_phone?: string | null
          owner_user_id?: string | null
          property_type?: string | null
          reference?: string
          services?: string[]
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'managed_properties_care_request_id_fkey'
            columns: ['care_request_id']
            isOneToOne: false
            referencedRelation: 'property_care_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'managed_properties_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      managed_property_documents: {
        Row: {
          created_at: string
          id: string
          label: string
          managed_property_id: string
          storage_path: string
          uploaded_by: string
          visible_to_owner: boolean
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          id?: string
          label: string
          managed_property_id: string
          storage_path: string
          uploaded_by?: string
          visible_to_owner?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          managed_property_id?: string
          storage_path?: string
          uploaded_by?: string
          visible_to_owner?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'managed_property_documents_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
        ]
      }
      market_insight: {
        Row: {
          id: string
          location_id: string | null
          max_etb: number
          median_etb: number
          min_etb: number
          p25_etb: number
          p75_etb: number
          property_type: string
          purpose: Database['public']['Enums']['listing_purpose']
          refreshed_at: string
          sample_count: number
        }
        ComputedFields: never
        Insert: {
          id?: string
          location_id?: string | null
          max_etb: number
          median_etb: number
          min_etb: number
          p25_etb: number
          p75_etb: number
          property_type: string
          purpose: Database['public']['Enums']['listing_purpose']
          refreshed_at?: string
          sample_count: number
        }
        Update: {
          id?: string
          location_id?: string | null
          max_etb?: number
          median_etb?: number
          min_etb?: number
          p25_etb?: number
          p75_etb?: number
          property_type?: string
          purpose?: Database['public']['Enums']['listing_purpose']
          refreshed_at?: string
          sample_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'market_insight_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      media: {
        Row: {
          alt: string | null
          bytes: number | null
          created_at: string
          entity_id: string
          entity_type: string
          height: number | null
          id: string
          is_cover: boolean
          kind: string
          sort: number
          status: string
          storage_path: string
          thumb_path: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        ComputedFields: never
        Insert: {
          alt?: string | null
          bytes?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          height?: number | null
          id?: string
          is_cover?: boolean
          kind?: string
          sort?: number
          status?: string
          storage_path: string
          thumb_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          bytes?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          height?: number | null
          id?: string
          is_cover?: boolean
          kind?: string
          sort?: number
          status?: string
          storage_path?: string
          thumb_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          consent_at: string
          consent_text: string
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          name: string | null
          source: string | null
          status: string
          unsubscribe_token_hash: string
          unsubscribed_at: string | null
        }
        ComputedFields: never
        Insert: {
          consent_at?: string
          consent_text: string
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          name?: string | null
          source?: string | null
          status?: string
          unsubscribe_token_hash: string
          unsubscribed_at?: string | null
        }
        Update: {
          consent_at?: string
          consent_text?: string
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          name?: string | null
          source?: string | null
          status?: string
          unsubscribe_token_hash?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      org_branches: {
        Row: {
          address_line: string | null
          created_at: string
          email: string | null
          id: string
          location_id: string | null
          name: string
          opening_note: string | null
          org_id: string
          phone: string | null
          sort: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location_id?: string | null
          name: string
          opening_note?: string | null
          org_id: string
          phone?: string | null
          sort?: number
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location_id?: string | null
          name?: string
          opening_note?: string | null
          org_id?: string
          phone?: string | null
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_branches_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_branches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_branches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      org_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          revoked_at: string | null
          role: Database['public']['Enums']['org_role']
          token_hash: string
        }
        ComputedFields: never
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['org_role']
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          revoked_at?: string | null
          role?: Database['public']['Enums']['org_role']
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_invitations_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_invitations_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      org_product_categories: {
        Row: {
          org_id: string
          product_category_id: string
        }
        ComputedFields: never
        Insert: {
          org_id: string
          product_category_id: string
        }
        Update: {
          org_id?: string
          product_category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_product_categories_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_product_categories_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_product_categories_product_category_id_fkey'
            columns: ['product_category_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'org_product_categories_product_category_id_fkey'
            columns: ['product_category_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database['public']['Enums']['org_role']
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          org_id: string
          role?: Database['public']['Enums']['org_role']
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database['public']['Enums']['org_role']
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organisation_members_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_members_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      organisation_pillars: {
        Row: {
          created_at: string
          org_id: string
          pillar_key: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          org_id: string
          pillar_key: string
        }
        Update: {
          created_at?: string
          org_id?: string
          pillar_key?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organisation_pillars_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_pillars_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_pillars_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'organisation_pillars_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
        ]
      }
      organisation_services: {
        Row: {
          org_id: string
          service_id: string
        }
        ComputedFields: never
        Insert: {
          org_id: string
          service_id: string
        }
        Update: {
          org_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organisation_services_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_services_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_services_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'organisation_services_public'
            referencedColumns: ['service_id']
          },
          {
            foreignKeyName: 'organisation_services_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
        ]
      }
      organisations: {
        Row: {
          address_line: string | null
          areas_served: string[]
          claimed_at: string | null
          country_code: string
          cover_path: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          email: string | null
          enquiries_count: number
          featured_until: string | null
          google_place_id: string | null
          id: string
          is_featured: boolean
          is_hagerland: boolean
          kind: Database['public']['Enums']['org_kind']
          lat: number | null
          licence_category: string | null
          licence_grade: string | null
          lng: number | null
          location_id: string | null
          logo_path: string | null
          name: string
          opening_hours: Json | null
          pending_changes: Json | null
          phone: string | null
          plan: string
          published_at: string | null
          qualifications: string | null
          rejection_reason: string | null
          search_tsv: unknown
          serves_diaspora: boolean
          short_id: string
          slug: string
          social: NonNullable<Json>
          source: string
          status: Database['public']['Enums']['listing_status']
          tagline: string | null
          team_size: string | null
          telegram: string | null
          tin: string | null
          trade_licence_number: string | null
          updated_at: string
          verification_level: Database['public']['Enums']['verification_level']
          verified_at: string | null
          views_count: number
          website: string | null
          whatsapp: string | null
          year_established: number | null
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          areas_served?: string[]
          claimed_at?: string | null
          country_code?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          enquiries_count?: number
          featured_until?: string | null
          google_place_id?: string | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          kind: Database['public']['Enums']['org_kind']
          lat?: number | null
          licence_category?: string | null
          licence_grade?: string | null
          lng?: number | null
          location_id?: string | null
          logo_path?: string | null
          name: string
          opening_hours?: Json | null
          pending_changes?: Json | null
          phone?: string | null
          plan?: string
          published_at?: string | null
          qualifications?: string | null
          rejection_reason?: string | null
          search_tsv?: never
          serves_diaspora?: boolean
          short_id?: string
          slug: string
          social?: NonNullable<Json>
          source?: string
          status?: Database['public']['Enums']['listing_status']
          tagline?: string | null
          team_size?: string | null
          telegram?: string | null
          tin?: string | null
          trade_licence_number?: string | null
          updated_at?: string
          verification_level?: Database['public']['Enums']['verification_level']
          verified_at?: string | null
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          year_established?: number | null
        }
        Update: {
          address_line?: string | null
          areas_served?: string[]
          claimed_at?: string | null
          country_code?: string
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          email?: string | null
          enquiries_count?: number
          featured_until?: string | null
          google_place_id?: string | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          kind?: Database['public']['Enums']['org_kind']
          lat?: number | null
          licence_category?: string | null
          licence_grade?: string | null
          lng?: number | null
          location_id?: string | null
          logo_path?: string | null
          name?: string
          opening_hours?: Json | null
          pending_changes?: Json | null
          phone?: string | null
          plan?: string
          published_at?: string | null
          qualifications?: string | null
          rejection_reason?: string | null
          search_tsv?: never
          serves_diaspora?: boolean
          short_id?: string
          slug?: string
          social?: NonNullable<Json>
          source?: string
          status?: Database['public']['Enums']['listing_status']
          tagline?: string | null
          team_size?: string | null
          telegram?: string | null
          tin?: string | null
          trade_licence_number?: string | null
          updated_at?: string
          verification_level?: Database['public']['Enums']['verification_level']
          verified_at?: string | null
          views_count?: number
          website?: string | null
          whatsapp?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'organisations_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      owner_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          managed_property_id: string
          read_by_owner_at: string | null
          read_by_staff_at: string | null
          sender: string
          sender_name: string
        }
        ComputedFields: never
        Insert: {
          body: string
          created_at?: string
          id?: string
          managed_property_id: string
          read_by_owner_at?: string | null
          read_by_staff_at?: string | null
          sender: string
          sender_name: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          managed_property_id?: string
          read_by_owner_at?: string | null
          read_by_staff_at?: string | null
          sender?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: 'owner_messages_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
        ]
      }
      partner_applications: {
        Row: {
          admin_notes: string | null
          contact_name: string
          country_code: string
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          licence_details: string | null
          message: string | null
          organisation_name: string
          partner_type: string
          phone: string | null
          reference: string
          source_url: string | null
          status: string
          updated_at: string
          vertical_key: string
          website: string | null
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          contact_name: string
          country_code?: string
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          licence_details?: string | null
          message?: string | null
          organisation_name: string
          partner_type: string
          phone?: string | null
          reference?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          vertical_key: string
          website?: string | null
        }
        Update: {
          admin_notes?: string | null
          contact_name?: string
          country_code?: string
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          licence_details?: string | null
          message?: string | null
          organisation_name?: string
          partner_type?: string
          phone?: string | null
          reference?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          vertical_key?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'partner_applications_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'partner_applications_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals_public'
            referencedColumns: ['key']
          },
        ]
      }
      pillar_gate_checks: {
        Row: {
          actor: string
          capability_confirmed: boolean
          created_at: string
          id: string
          mode: string
          owner_name: string
          pillar_key: string
          providers_active: number
          providers_required: number
          regulatory_confirmed: boolean
          regulatory_date: string
          regulatory_note: string
          service_key: string | null
          terms_note: string | null
          terms_pricing_set: boolean
        }
        ComputedFields: never
        Insert: {
          actor: string
          capability_confirmed: boolean
          created_at?: string
          id?: string
          mode: string
          owner_name: string
          pillar_key: string
          providers_active?: number
          providers_required?: number
          regulatory_confirmed: boolean
          regulatory_date: string
          regulatory_note: string
          service_key?: string | null
          terms_note?: string | null
          terms_pricing_set: boolean
        }
        Update: {
          actor?: string
          capability_confirmed?: boolean
          created_at?: string
          id?: string
          mode?: string
          owner_name?: string
          pillar_key?: string
          providers_active?: number
          providers_required?: number
          regulatory_confirmed?: boolean
          regulatory_date?: string
          regulatory_note?: string
          service_key?: string | null
          terms_note?: string | null
          terms_pricing_set?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'pillar_gate_checks_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'pillar_gate_checks_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'pillar_gate_checks_service_key_fkey'
            columns: ['service_key']
            isOneToOne: false
            referencedRelation: 'pillar_services'
            referencedColumns: ['key']
          },
        ]
      }
      pillar_services: {
        Row: {
          aggregate_enabled: boolean
          description: string
          direct_enabled: boolean
          interest_enabled: boolean
          key: string
          name: string
          pillar_key: string
          sort: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          aggregate_enabled?: boolean
          description?: string
          direct_enabled?: boolean
          interest_enabled?: boolean
          key: string
          name: string
          pillar_key: string
          sort?: number
          updated_at?: string
        }
        Update: {
          aggregate_enabled?: boolean
          description?: string
          direct_enabled?: boolean
          interest_enabled?: boolean
          key?: string
          name?: string
          pillar_key?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pillar_services_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'pillar_services_pillar_key_fkey'
            columns: ['pillar_key']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
        ]
      }
      pillars: {
        Row: {
          aggregate_enabled: boolean
          description: string
          direct_enabled: boolean
          direct_owner: string | null
          icon: string
          interest_enabled: boolean
          key: string
          name: string
          nav_label: string
          number: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          tagline: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          aggregate_enabled?: boolean
          description?: string
          direct_enabled?: boolean
          direct_owner?: string | null
          icon?: string
          interest_enabled?: boolean
          key: string
          name: string
          nav_label: string
          number: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          aggregate_enabled?: boolean
          description?: string
          direct_enabled?: boolean
          direct_owner?: string | null
          icon?: string
          interest_enabled?: boolean
          key?: string
          name?: string
          nav_label?: string
          number?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_projects: {
        Row: {
          cover_path: string | null
          created_at: string
          description: string | null
          development_id: string | null
          id: string
          location_id: string | null
          org_id: string
          project_value_band: string | null
          rejection_reason: string | null
          sort: number
          status: Database['public']['Enums']['listing_status']
          title: string
          updated_at: string
          year: number | null
        }
        ComputedFields: never
        Insert: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          development_id?: string | null
          id?: string
          location_id?: string | null
          org_id: string
          project_value_band?: string | null
          rejection_reason?: string | null
          sort?: number
          status?: Database['public']['Enums']['listing_status']
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          cover_path?: string | null
          created_at?: string
          description?: string | null
          development_id?: string | null
          id?: string
          location_id?: string | null
          org_id?: string
          project_value_band?: string | null
          rejection_reason?: string | null
          sort?: number
          status?: Database['public']['Enums']['listing_status']
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'portfolio_projects_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          seo_intro: string | null
          seo_title: string | null
          slug: string
          sort: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo_intro?: string | null
          seo_title?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo_intro?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string
          country_of_origin: string | null
          created_at: string
          delivery_available: boolean
          description: string | null
          featured_until: string | null
          id: string
          is_featured: boolean
          is_special_buy: boolean
          lead_time_days: number | null
          min_order_qty: number
          model_number: string | null
          name: string
          pack_size: string | null
          pending_changes: Json | null
          price_etb_cents: number | null
          price_type: Database['public']['Enums']['price_type']
          price_updated_at: string | null
          published_at: string | null
          rejection_reason: string | null
          search_tsv: unknown
          seller_org_id: string
          short_id: string
          sku: string | null
          slug: string
          special_ends_at: string | null
          special_qty_available: number | null
          special_was_price_etb_cents: number | null
          specs: NonNullable<Json>
          status: Database['public']['Enums']['listing_status']
          stock_status: Database['public']['Enums']['stock_status']
          summary: string | null
          trade_price_etb_cents: number | null
          unit: string
          updated_at: string
          views_count: number
          warranty: string | null
        }
        ComputedFields: never
        Insert: {
          brand_id?: string | null
          category_id: string
          country_of_origin?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_special_buy?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          model_number?: string | null
          name: string
          pack_size?: string | null
          pending_changes?: Json | null
          price_etb_cents?: number | null
          price_type?: Database['public']['Enums']['price_type']
          price_updated_at?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          search_tsv?: never
          seller_org_id: string
          short_id?: string
          sku?: string | null
          slug: string
          special_ends_at?: string | null
          special_qty_available?: number | null
          special_was_price_etb_cents?: number | null
          specs?: NonNullable<Json>
          status?: Database['public']['Enums']['listing_status']
          stock_status?: Database['public']['Enums']['stock_status']
          summary?: string | null
          trade_price_etb_cents?: number | null
          unit?: string
          updated_at?: string
          views_count?: number
          warranty?: string | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string
          country_of_origin?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_special_buy?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          model_number?: string | null
          name?: string
          pack_size?: string | null
          pending_changes?: Json | null
          price_etb_cents?: number | null
          price_type?: Database['public']['Enums']['price_type']
          price_updated_at?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          search_tsv?: never
          seller_org_id?: string
          short_id?: string
          sku?: string | null
          slug?: string
          special_ends_at?: string | null
          special_qty_available?: number | null
          special_was_price_etb_cents?: number | null
          specs?: NonNullable<Json>
          status?: Database['public']['Enums']['listing_status']
          stock_status?: Database['public']['Enums']['stock_status']
          summary?: string | null
          trade_price_etb_cents?: number | null
          unit?: string
          updated_at?: string
          views_count?: number
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_seller_org_id_fkey'
            columns: ['seller_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_seller_org_id_fkey'
            columns: ['seller_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database['public']['Enums']['account_type']
          avatar_path: string | null
          created_at: string
          deletion_requested_at: string | null
          full_name: string | null
          id: string
          is_suspended: boolean
          last_seen_at: string | null
          marketing_opt_in: boolean
          phone: string | null
          phone_verified: boolean
          preferred_contact: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          account_type?: Database['public']['Enums']['account_type']
          avatar_path?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          full_name?: string | null
          id: string
          is_suspended?: boolean
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          phone_verified?: boolean
          preferred_contact?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database['public']['Enums']['account_type']
          avatar_path?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          last_seen_at?: string | null
          marketing_opt_in?: boolean
          phone?: string | null
          phone_verified?: boolean
          preferred_contact?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          ends_at: string
          entity_id: string
          entity_type: string
          id: string
          kind: string
          notes: string | null
          paid: boolean
          price_etb_cents: number | null
          starts_at: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          ends_at: string
          entity_id: string
          entity_type: string
          id?: string
          kind?: string
          notes?: string | null
          paid?: boolean
          price_etb_cents?: number | null
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          notes?: string | null
          paid?: boolean
          price_etb_cents?: number | null
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address_line: string | null
          advance_months: number | null
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          completion_status: Database['public']['Enums']['completion_status'] | null
          contact_email: string | null
          contact_phone: string | null
          contact_telegram: string | null
          contact_whatsapp: string | null
          created_at: string
          description: string
          development_id: string | null
          enquiries_count: number
          expires_at: string | null
          expiry_reminder_sent_at: string | null
          featured_until: string | null
          features: string[]
          finishing_status: Database['public']['Enums']['finishing_status'] | null
          floor_number: number | null
          floors_label: string | null
          furnishing: Database['public']['Enums']['furnishing'] | null
          has_title_deed: boolean | null
          id: string
          is_featured: boolean
          is_hagerland: boolean
          lat: number | null
          lister_org_id: string | null
          lister_type: string
          lister_user_id: string | null
          lng: number | null
          location_id: string
          parking_spaces: number | null
          pending_changes: Json | null
          plot_area_m2: number | null
          preferred_contact: string | null
          price_etb: number | null
          price_negotiable: boolean
          price_on_request: boolean
          price_period: string | null
          property_type: Database['public']['Enums']['property_type']
          published_at: string | null
          purpose: Database['public']['Enums']['listing_purpose']
          rejection_reason: string | null
          renewed_at: string | null
          search_tsv: unknown
          service_charge_etb: number | null
          short_id: string
          show_exact_location: boolean
          slug: string
          status: Database['public']['Enums']['listing_status']
          tenure: Database['public']['Enums']['tenure'] | null
          title: string
          updated_at: string
          video_url: string | null
          views_count: number
          virtual_tour_url: string | null
          year_built: number | null
        }
        ComputedFields: never
        Insert: {
          address_line?: string | null
          advance_months?: number | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          completion_status?: Database['public']['Enums']['completion_status'] | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string
          development_id?: string | null
          enquiries_count?: number
          expires_at?: string | null
          expiry_reminder_sent_at?: string | null
          featured_until?: string | null
          features?: string[]
          finishing_status?: Database['public']['Enums']['finishing_status'] | null
          floor_number?: number | null
          floors_label?: string | null
          furnishing?: Database['public']['Enums']['furnishing'] | null
          has_title_deed?: boolean | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          lat?: number | null
          lister_org_id?: string | null
          lister_type?: string
          lister_user_id?: string | null
          lng?: number | null
          location_id: string
          parking_spaces?: number | null
          pending_changes?: Json | null
          plot_area_m2?: number | null
          preferred_contact?: string | null
          price_etb?: number | null
          price_negotiable?: boolean
          price_on_request?: boolean
          price_period?: string | null
          property_type: Database['public']['Enums']['property_type']
          published_at?: string | null
          purpose: Database['public']['Enums']['listing_purpose']
          rejection_reason?: string | null
          renewed_at?: string | null
          search_tsv?: never
          service_charge_etb?: number | null
          short_id?: string
          show_exact_location?: boolean
          slug: string
          status?: Database['public']['Enums']['listing_status']
          tenure?: Database['public']['Enums']['tenure'] | null
          title: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Update: {
          address_line?: string | null
          advance_months?: number | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          completion_status?: Database['public']['Enums']['completion_status'] | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string
          development_id?: string | null
          enquiries_count?: number
          expires_at?: string | null
          expiry_reminder_sent_at?: string | null
          featured_until?: string | null
          features?: string[]
          finishing_status?: Database['public']['Enums']['finishing_status'] | null
          floor_number?: number | null
          floors_label?: string | null
          furnishing?: Database['public']['Enums']['furnishing'] | null
          has_title_deed?: boolean | null
          id?: string
          is_featured?: boolean
          is_hagerland?: boolean
          lat?: number | null
          lister_org_id?: string | null
          lister_type?: string
          lister_user_id?: string | null
          lng?: number | null
          location_id?: string
          parking_spaces?: number | null
          pending_changes?: Json | null
          plot_area_m2?: number | null
          preferred_contact?: string | null
          price_etb?: number | null
          price_negotiable?: boolean
          price_on_request?: boolean
          price_period?: string | null
          property_type?: Database['public']['Enums']['property_type']
          published_at?: string | null
          purpose?: Database['public']['Enums']['listing_purpose']
          rejection_reason?: string | null
          renewed_at?: string | null
          search_tsv?: never
          service_charge_etb?: number | null
          short_id?: string
          show_exact_location?: boolean
          slug?: string
          status?: Database['public']['Enums']['listing_status']
          tenure?: Database['public']['Enums']['tenure'] | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views_count?: number
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'properties_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_lister_org_id_fkey'
            columns: ['lister_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_lister_org_id_fkey'
            columns: ['lister_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_lister_user_id_fkey'
            columns: ['lister_user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      property_care_requests: {
        Row: {
          admin_notes: string | null
          city: string | null
          consent_at: string | null
          contact_time: string | null
          country_code: string
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          marketing_consent: boolean
          message: string | null
          name: string
          occupancy: string
          phone: string
          preferred_contact: string | null
          property_location_id: string | null
          property_location_text: string | null
          property_type: string
          reference: string
          services: string[]
          source_url: string | null
          status: string
          time_zone: string | null
          updated_at: string
          user_id: string | null
          utm: Json | null
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          city?: string | null
          consent_at?: string | null
          contact_time?: string | null
          country_code: string
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          marketing_consent?: boolean
          message?: string | null
          name: string
          occupancy: string
          phone: string
          preferred_contact?: string | null
          property_location_id?: string | null
          property_location_text?: string | null
          property_type: string
          reference?: string
          services?: string[]
          source_url?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          utm?: Json | null
        }
        Update: {
          admin_notes?: string | null
          city?: string | null
          consent_at?: string | null
          contact_time?: string | null
          country_code?: string
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          marketing_consent?: boolean
          message?: string | null
          name?: string
          occupancy?: string
          phone?: string
          preferred_contact?: string | null
          property_location_id?: string | null
          property_location_text?: string | null
          property_type?: string
          reference?: string
          services?: string[]
          source_url?: string | null
          status?: string
          time_zone?: string | null
          updated_at?: string
          user_id?: string | null
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'property_care_requests_property_location_id_fkey'
            columns: ['property_location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      property_inspections: {
        Row: {
          condition: string
          created_at: string
          id: string
          inspected_on: string
          inspector: string | null
          managed_property_id: string
          notes: string | null
          photo_paths: string[]
        }
        ComputedFields: never
        Insert: {
          condition: string
          created_at?: string
          id?: string
          inspected_on: string
          inspector?: string | null
          managed_property_id: string
          notes?: string | null
          photo_paths?: string[]
        }
        Update: {
          condition?: string
          created_at?: string
          id?: string
          inspected_on?: string
          inspector?: string | null
          managed_property_id?: string
          notes?: string | null
          photo_paths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'property_inspections_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
        ]
      }
      quote_lists: {
        Row: {
          items: NonNullable<Json>
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          items?: NonNullable<Json>
          updated_at?: string
          user_id: string
        }
        Update: {
          items?: NonNullable<Json>
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_request_items: {
        Row: {
          created_at: string
          free_text_item: string | null
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quote_request_id: string
          unit: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          free_text_item?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          quote_request_id: string
          unit: string
        }
        Update: {
          created_at?: string
          free_text_item?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_request_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quote_request_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_request_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_request_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'special_buys_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_request_items_quote_request_id_fkey'
            columns: ['quote_request_id']
            isOneToOne: false
            referencedRelation: 'quote_requests'
            referencedColumns: ['id']
          },
        ]
      }
      quote_requests: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          created_at: string
          delivery_address: string | null
          delivery_location_id: string | null
          email: string | null
          id: string
          internal_notes: string | null
          ip_hash: string | null
          materials_file_path: string | null
          materials_file_paths: string[]
          name: string
          needed_by: string | null
          notes: string | null
          phone: string
          project_id: string | null
          quote_document_path: string | null
          quoted_at: string | null
          quoted_total_etb_cents: number | null
          reference: string
          requester_user_id: string | null
          source: string
          status: Database['public']['Enums']['quote_status']
          updated_at: string
          utm: Json | null
        }
        ComputedFields: never
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_location_id?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          materials_file_path?: string | null
          materials_file_paths?: string[]
          name: string
          needed_by?: string | null
          notes?: string | null
          phone: string
          project_id?: string | null
          quote_document_path?: string | null
          quoted_at?: string | null
          quoted_total_etb_cents?: number | null
          reference?: string
          requester_user_id?: string | null
          source?: string
          status?: Database['public']['Enums']['quote_status']
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_location_id?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          ip_hash?: string | null
          materials_file_path?: string | null
          materials_file_paths?: string[]
          name?: string
          needed_by?: string | null
          notes?: string | null
          phone?: string
          project_id?: string | null
          quote_document_path?: string | null
          quoted_at?: string | null
          quoted_total_etb_cents?: number | null
          reference?: string
          requester_user_id?: string | null
          source?: string
          status?: Database['public']['Enums']['quote_status']
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'quote_requests_delivery_location_id_fkey'
            columns: ['delivery_location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'quote_requests_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'build_projects'
            referencedColumns: ['id']
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          reset_at: string
        }
        ComputedFields: never
        Insert: {
          count?: number
          key: string
          reset_at: string
        }
        Update: {
          count?: number
          key?: string
          reset_at?: string
        }
        Relationships: []
      }
      reference_counters: {
        Row: {
          prefix: string
          value: number
          year: number
        }
        ComputedFields: never
        Insert: {
          prefix: string
          value?: number
          year: number
        }
        Update: {
          prefix?: string
          value?: number
          year?: number
        }
        Relationships: []
      }
      rent_statements: {
        Row: {
          created_at: string
          currency: string
          expenses_minor: number
          fees_minor: number
          id: string
          managed_property_id: string
          notes: string | null
          period_end: string
          period_start: string
          rent_due_minor: number
          rent_received_minor: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          currency?: string
          expenses_minor?: number
          fees_minor?: number
          id?: string
          managed_property_id: string
          notes?: string | null
          period_end: string
          period_start: string
          rent_due_minor?: number
          rent_received_minor?: number
        }
        Update: {
          created_at?: string
          currency?: string
          expenses_minor?: number
          fees_minor?: number
          id?: string
          managed_property_id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          rent_due_minor?: number
          rent_received_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'rent_statements_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
        ]
      }
      rental_applications: {
        Row: {
          contact_id: string | null
          created_at: string
          decided_at: string | null
          document_paths: string[]
          email: string | null
          employment_note: string | null
          id: string
          income_note: string | null
          instruction_id: string | null
          ip_hash: string | null
          message: string | null
          move_in_date: string | null
          name: string
          occupants: number | null
          phone: string
          property_id: string
          reference: string
          referencing_notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          contact_id?: string | null
          created_at?: string
          decided_at?: string | null
          document_paths?: string[]
          email?: string | null
          employment_note?: string | null
          id?: string
          income_note?: string | null
          instruction_id?: string | null
          ip_hash?: string | null
          message?: string | null
          move_in_date?: string | null
          name: string
          occupants?: number | null
          phone: string
          property_id: string
          reference?: string
          referencing_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          decided_at?: string | null
          document_paths?: string[]
          email?: string | null
          employment_note?: string | null
          id?: string
          income_note?: string | null
          instruction_id?: string | null
          ip_hash?: string | null
          message?: string | null
          move_in_date?: string | null
          name?: string
          occupants?: number | null
          phone?: string
          property_id?: string
          reference?: string
          referencing_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'rental_applications_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rental_applications_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rental_applications_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rental_applications_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties_public'
            referencedColumns: ['id']
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_hash: string | null
          reason: string
          reporter_contact: string | null
          status: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_hash?: string | null
          reason: string
          reporter_contact?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_hash?: string | null
          reason?: string
          reporter_contact?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          match_id: string
          moderated_at: string | null
          org_id: string
          provider_reply: string | null
          published_at: string | null
          rating: number
          rejection_reason: string | null
          replied_at: string | null
          request_id: string
          status: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          author_name: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          match_id: string
          moderated_at?: string | null
          org_id: string
          provider_reply?: string | null
          published_at?: string | null
          rating: number
          rejection_reason?: string | null
          replied_at?: string | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          match_id?: string
          moderated_at?: string | null
          org_id?: string
          provider_reply?: string | null
          published_at?: string | null
          rating?: number
          rejection_reason?: string | null
          replied_at?: string | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_match_id_fkey'
            columns: ['match_id']
            isOneToOne: true
            referencedRelation: 'service_request_matches'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_match_id_fkey'
            columns: ['match_id']
            isOneToOne: true
            referencedRelation: 'service_requests_for_provider'
            referencedColumns: ['match_id']
          },
          {
            foreignKeyName: 'reviews_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests_for_provider'
            referencedColumns: ['request_id']
          },
        ]
      }
      sale_progress_items: {
        Row: {
          created_at: string
          done: boolean
          done_at: string | null
          id: string
          instruction_id: string
          label: string
          offer_id: string | null
          sort: number
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          instruction_id: string
          label: string
          offer_id?: string | null
          sort?: number
        }
        Update: {
          created_at?: string
          done?: boolean
          done_at?: string | null
          id?: string
          instruction_id?: string
          label?: string
          offer_id?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sale_progress_items_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sale_progress_items_offer_id_fkey'
            columns: ['offer_id']
            isOneToOne: false
            referencedRelation: 'agency_offers'
            referencedColumns: ['id']
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alert_frequency: string
          created_at: string
          id: string
          last_sent_at: string | null
          name: string
          params: NonNullable<Json>
          unsubscribe_token: string
          updated_at: string
          user_id: string
          vertical: string
        }
        ComputedFields: never
        Insert: {
          alert_frequency?: string
          created_at?: string
          id?: string
          last_sent_at?: string | null
          name: string
          params?: NonNullable<Json>
          unsubscribe_token?: string
          updated_at?: string
          user_id: string
          vertical?: string
        }
        Update: {
          alert_frequency?: string
          created_at?: string
          id?: string
          last_sent_at?: string | null
          name?: string
          params?: NonNullable<Json>
          unsubscribe_token?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string
          name: string
          version: string
        }
        ComputedFields: never
        Insert: {
          applied_at?: string
          name: string
          version: string
        }
        Update: {
          applied_at?: string
          name?: string
          version?: string
        }
        Relationships: []
      }
      search_misses: {
        Row: {
          count: number
          last_seen_at: string
          q_normalised: string
          vertical: string
        }
        ComputedFields: never
        Insert: {
          count?: number
          last_seen_at?: string
          q_normalised: string
          vertical: string
        }
        Update: {
          count?: number
          last_seen_at?: string
          q_normalised?: string
          vertical?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          allows_emergency: boolean
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          question_schema: NonNullable<Json>
          seo_intro: string | null
          seo_title: string | null
          slug: string
          sort: number
          updated_at: string
          vertical_key: string | null
        }
        ComputedFields: never
        Insert: {
          allows_emergency?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          question_schema?: NonNullable<Json>
          seo_intro?: string | null
          seo_title?: string | null
          slug: string
          sort?: number
          updated_at?: string
          vertical_key?: string | null
        }
        Update: {
          allows_emergency?: boolean
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          question_schema?: NonNullable<Json>
          seo_intro?: string | null
          seo_title?: string | null
          slug?: string
          sort?: number
          updated_at?: string
          vertical_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'service_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'organisation_services_public'
            referencedColumns: ['service_id']
          },
          {
            foreignKeyName: 'service_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_categories_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'service_categories_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals_public'
            referencedColumns: ['key']
          },
        ]
      }
      service_request_matches: {
        Row: {
          commission_minor: number | null
          commission_rate: number | null
          created_at: string
          declined_reason: string | null
          id: string
          invoiced: boolean
          invoiced_at: string | null
          lead_fee_minor: number | null
          offered_at: string
          org_id: string
          quote_amount_minor: number | null
          quote_currency: string | null
          quote_document_path: string | null
          quote_message: string | null
          quote_valid_until: string | null
          quoted_at: string | null
          reminder_sent_at: string | null
          request_id: string
          responded_at: string | null
          status: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          commission_minor?: number | null
          commission_rate?: number | null
          created_at?: string
          declined_reason?: string | null
          id?: string
          invoiced?: boolean
          invoiced_at?: string | null
          lead_fee_minor?: number | null
          offered_at?: string
          org_id: string
          quote_amount_minor?: number | null
          quote_currency?: string | null
          quote_document_path?: string | null
          quote_message?: string | null
          quote_valid_until?: string | null
          quoted_at?: string | null
          reminder_sent_at?: string | null
          request_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_minor?: number | null
          commission_rate?: number | null
          created_at?: string
          declined_reason?: string | null
          id?: string
          invoiced?: boolean
          invoiced_at?: string | null
          lead_fee_minor?: number | null
          offered_at?: string
          org_id?: string
          quote_amount_minor?: number | null
          quote_currency?: string | null
          quote_document_path?: string | null
          quote_message?: string | null
          quote_valid_until?: string | null
          quoted_at?: string | null
          reminder_sent_at?: string | null
          request_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_request_matches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_request_matches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_request_matches_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_request_matches_request_id_fkey'
            columns: ['request_id']
            isOneToOne: false
            referencedRelation: 'service_requests_for_provider'
            referencedColumns: ['request_id']
          },
        ]
      }
      service_requests: {
        Row: {
          access_token_expires_at: string | null
          access_token_hash: string | null
          admin_alerted_at: string | null
          admin_notes: string | null
          answers: NonNullable<Json>
          attachment_paths: string[]
          budget_band: string | null
          closed_at: string | null
          closed_reason: string | null
          country_code: string
          created_at: string
          currency: string
          details: string
          email: string | null
          id: string
          ip_hash: string | null
          location_id: string | null
          location_text: string | null
          matched_at: string | null
          name: string
          phone: string
          preferred_contact: string | null
          project_id: string | null
          reference: string
          requester_user_id: string | null
          service_category_id: string | null
          source: string
          source_url: string | null
          status: string
          title: string
          triaged_at: string | null
          updated_at: string
          urgency: string
          utm: Json | null
          vertical_key: string
        }
        ComputedFields: never
        Insert: {
          access_token_expires_at?: string | null
          access_token_hash?: string | null
          admin_alerted_at?: string | null
          admin_notes?: string | null
          answers?: NonNullable<Json>
          attachment_paths?: string[]
          budget_band?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          details?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          location_text?: string | null
          matched_at?: string | null
          name: string
          phone: string
          preferred_contact?: string | null
          project_id?: string | null
          reference?: string
          requester_user_id?: string | null
          service_category_id?: string | null
          source?: string
          source_url?: string | null
          status?: string
          title: string
          triaged_at?: string | null
          updated_at?: string
          urgency?: string
          utm?: Json | null
          vertical_key: string
        }
        Update: {
          access_token_expires_at?: string | null
          access_token_hash?: string | null
          admin_alerted_at?: string | null
          admin_notes?: string | null
          answers?: NonNullable<Json>
          attachment_paths?: string[]
          budget_band?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          details?: string
          email?: string | null
          id?: string
          ip_hash?: string | null
          location_id?: string | null
          location_text?: string | null
          matched_at?: string | null
          name?: string
          phone?: string
          preferred_contact?: string | null
          project_id?: string | null
          reference?: string
          requester_user_id?: string | null
          service_category_id?: string | null
          source?: string
          source_url?: string | null
          status?: string
          title?: string
          triaged_at?: string | null
          updated_at?: string
          urgency?: string
          utm?: Json | null
          vertical_key?: string
        }
        Relationships: [
          {
            foreignKeyName: 'service_requests_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'build_projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_service_category_id_fkey'
            columns: ['service_category_id']
            isOneToOne: false
            referencedRelation: 'organisation_services_public'
            referencedColumns: ['service_id']
          },
          {
            foreignKeyName: 'service_requests_service_category_id_fkey'
            columns: ['service_category_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'service_requests_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals_public'
            referencedColumns: ['key']
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          key: string
          updated_at?: string
          value: NonNullable<Json>
        }
        Update: {
          key?: string
          updated_at?: string
          value?: NonNullable<Json>
        }
        Relationships: []
      }
      tenancies: {
        Row: {
          advance_months: number | null
          application_id: string | null
          created_at: string
          currency: string
          deposit_minor: number | null
          end_date: string | null
          id: string
          instruction_id: string | null
          landlord_contact_id: string | null
          managed_property_id: string | null
          notes: string | null
          notice_date: string | null
          notice_reminded_at: string | null
          property_id: string | null
          reference: string
          renewal_date: string | null
          renewal_reminded_at: string | null
          rent_minor: number
          rent_period: string
          start_date: string
          status: string
          tenant_contact_id: string | null
          tenant_names: string
          tenant_user_id: string | null
          title: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          advance_months?: number | null
          application_id?: string | null
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          end_date?: string | null
          id?: string
          instruction_id?: string | null
          landlord_contact_id?: string | null
          managed_property_id?: string | null
          notes?: string | null
          notice_date?: string | null
          notice_reminded_at?: string | null
          property_id?: string | null
          reference?: string
          renewal_date?: string | null
          renewal_reminded_at?: string | null
          rent_minor: number
          rent_period?: string
          start_date: string
          status?: string
          tenant_contact_id?: string | null
          tenant_names: string
          tenant_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          advance_months?: number | null
          application_id?: string | null
          created_at?: string
          currency?: string
          deposit_minor?: number | null
          end_date?: string | null
          id?: string
          instruction_id?: string | null
          landlord_contact_id?: string | null
          managed_property_id?: string | null
          notes?: string | null
          notice_date?: string | null
          notice_reminded_at?: string | null
          property_id?: string | null
          reference?: string
          renewal_date?: string | null
          renewal_reminded_at?: string | null
          rent_minor?: number
          rent_period?: string
          start_date?: string
          status?: string
          tenant_contact_id?: string | null
          tenant_names?: string
          tenant_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tenancies_application_id_fkey'
            columns: ['application_id']
            isOneToOne: false
            referencedRelation: 'rental_applications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_instruction_id_fkey'
            columns: ['instruction_id']
            isOneToOne: false
            referencedRelation: 'agency_instructions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_landlord_contact_id_fkey'
            columns: ['landlord_contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_managed_property_id_fkey'
            columns: ['managed_property_id']
            isOneToOne: false
            referencedRelation: 'managed_properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tenancies_tenant_contact_id_fkey'
            columns: ['tenant_contact_id']
            isOneToOne: false
            referencedRelation: 'agency_contacts'
            referencedColumns: ['id']
          },
        ]
      }
      trade_accounts: {
        Row: {
          admin_note: string | null
          business_name: string
          created_at: string
          decided_at: string | null
          expected_monthly_spend: string | null
          id: string
          notes: string | null
          org_id: string | null
          phone: string
          reference: string
          status: string
          tin: string | null
          trade_type: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          admin_note?: string | null
          business_name: string
          created_at?: string
          decided_at?: string | null
          expected_monthly_spend?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          phone: string
          reference?: string
          status?: string
          tin?: string | null
          trade_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          business_name?: string
          created_at?: string
          decided_at?: string | null
          expected_monthly_spend?: string | null
          id?: string
          notes?: string | null
          org_id?: string | null
          phone?: string
          reference?: string
          status?: string
          tin?: string | null
          trade_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'trade_accounts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'trade_accounts_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      verification_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          decided_at: string | null
          documents: NonNullable<Json>
          documents_purged_at: string | null
          id: string
          org_id: string
          status: string
          submitted_by: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          documents?: NonNullable<Json>
          documents_purged_at?: string | null
          id?: string
          org_id: string
          status?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          documents?: NonNullable<Json>
          documents_purged_at?: string | null
          id?: string
          org_id?: string
          status?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verification_requests_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'verification_requests_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      verticals: {
        Row: {
          controlled_by_pillar: string | null
          controlled_by_service: string | null
          icon: string
          interest_enabled: boolean
          intro: string
          key: string
          name: string
          nav_label: string
          partner_signup_enabled: boolean
          seo_description: string | null
          seo_title: string | null
          short_description: string
          slug: string
          sort: number
          status: Database['public']['Enums']['vertical_status']
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          controlled_by_pillar?: string | null
          controlled_by_service?: string | null
          icon?: string
          interest_enabled?: boolean
          intro?: string
          key: string
          name: string
          nav_label: string
          partner_signup_enabled?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug: string
          sort?: number
          status?: Database['public']['Enums']['vertical_status']
          updated_at?: string
        }
        Update: {
          controlled_by_pillar?: string | null
          controlled_by_service?: string | null
          icon?: string
          interest_enabled?: boolean
          intro?: string
          key?: string
          name?: string
          nav_label?: string
          partner_signup_enabled?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string
          slug?: string
          sort?: number
          status?: Database['public']['Enums']['vertical_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verticals_controlled_by_pillar_fkey'
            columns: ['controlled_by_pillar']
            isOneToOne: false
            referencedRelation: 'pillars'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'verticals_controlled_by_pillar_fkey'
            columns: ['controlled_by_pillar']
            isOneToOne: false
            referencedRelation: 'pillars_public'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'verticals_controlled_by_service_fkey'
            columns: ['controlled_by_service']
            isOneToOne: false
            referencedRelation: 'pillar_services'
            referencedColumns: ['key']
          },
        ]
      }
    }
    Views: {
      area_guides_public: {
        Row: {
          faqs: Json | null
          location_id: string | null
          notes: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          faqs?: Json | null
          location_id?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          faqs?: Json | null
          location_id?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'area_guides_location_id_fkey'
            columns: ['location_id']
            isOneToOne: true
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      build_cost_rates_public: {
        Row: {
          finish: string | null
          id: string | null
          location_display: string | null
          location_id: string | null
          location_name: string | null
          location_path: string | null
          rate_etb_per_m2: number | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'build_cost_rates_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      candidates_for_employers: {
        Row: {
          availability: string | null
          candidate_id: string | null
          country_code: string | null
          experience: string | null
          experience_years: number | null
          first_name: string | null
          headline: string | null
          location_display: string | null
          placement_wanted: boolean | null
          qualifications: string | null
          skills: string[] | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      development_updates_public: {
        Row: {
          body: string | null
          development_id: string | null
          happened_on: string | null
          id: string | null
          photo_paths: string[] | null
          title: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'development_updates_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'development_updates_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
        ]
      }
      developments_public: {
        Row: {
          address_line: string | null
          amenities: string[] | null
          brochure_path: string | null
          completed_year: number | null
          completion_status: Database['public']['Enums']['completion_status'] | null
          cover_path: string | null
          description: string | null
          developer_name: string | null
          developer_org_id: string | null
          developer_slug: string | null
          developer_verification: Database['public']['Enums']['verification_level'] | null
          expected_completion: string | null
          featured_until: string | null
          finishing_status: Database['public']['Enums']['finishing_status'] | null
          floors_label: string | null
          id: string | null
          is_featured: boolean | null
          is_hagerland: boolean | null
          kind: Database['public']['Enums']['development_kind'] | null
          lat: number | null
          lng: number | null
          location_display: string | null
          location_id: string | null
          location_path: string | null
          name: string | null
          payment_plan: string | null
          price_from_etb: number | null
          price_to_etb: number | null
          published_at: string | null
          register_interest_enabled: boolean | null
          search_tsv: unknown
          short_id: string | null
          slug: string | null
          summary: string | null
          tenure: Database['public']['Enums']['tenure'] | null
          total_units: number | null
          unit_types: Json | null
          updated_at: string | null
          video_url: string | null
          views_count: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'developments_developer_org_id_fkey'
            columns: ['developer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'developments_developer_org_id_fkey'
            columns: ['developer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'developments_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      exchange_rates_public: {
        Row: {
          currency: string | null
          etb_per_unit: number | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          currency?: string | null
          etb_per_unit?: number | null
          updated_at?: string | null
        }
        Update: {
          currency?: string | null
          etb_per_unit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      guides_public: {
        Row: {
          body: string | null
          faq: Json | null
          id: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          summary: string | null
          title: string | null
          topic: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          body?: string | null
          faq?: Json | null
          id?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          summary?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          faq?: Json | null
          id?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          summary?: string | null
          title?: string | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs_public: {
        Row: {
          category: string | null
          closing_date: string | null
          country_code: string | null
          currency: string | null
          description: string | null
          employer_logo_path: string | null
          employer_name: string | null
          employer_org_id: string | null
          employer_slug: string | null
          employer_verification: Database['public']['Enums']['verification_level'] | null
          employment_type: string | null
          expires_at: string | null
          id: string | null
          location_display: string | null
          location_id: string | null
          published_at: string | null
          requirements: string | null
          salary_max_minor: number | null
          salary_min_minor: number | null
          salary_period: string | null
          search_tsv: unknown
          short_id: string | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'job_posts_employer_org_id_fkey'
            columns: ['employer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_posts_employer_org_id_fkey'
            columns: ['employer_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'job_posts_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      market_insight_public: {
        Row: {
          location_id: string | null
          location_level: Database['public']['Enums']['location_level'] | null
          location_name: string | null
          location_path: string | null
          max_etb: number | null
          median_etb: number | null
          min_etb: number | null
          p25_etb: number | null
          p75_etb: number | null
          property_type: string | null
          purpose: Database['public']['Enums']['listing_purpose'] | null
          refreshed_at: string | null
          sample_count: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'market_insight_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      media_public: {
        Row: {
          alt: string | null
          entity_id: string | null
          entity_type: string | null
          height: number | null
          id: string | null
          is_cover: boolean | null
          kind: string | null
          sort: number | null
          storage_path: string | null
          thumb_path: string | null
          width: number | null
        }
        ComputedFields: never
        Insert: {
          alt?: string | null
          entity_id?: string | null
          entity_type?: string | null
          height?: number | null
          id?: string | null
          is_cover?: boolean | null
          kind?: string | null
          sort?: number | null
          storage_path?: string | null
          thumb_path?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          entity_id?: string | null
          entity_type?: string | null
          height?: number | null
          id?: string | null
          is_cover?: boolean | null
          kind?: string | null
          sort?: number | null
          storage_path?: string | null
          thumb_path?: string | null
          width?: number | null
        }
        Relationships: []
      }
      org_branches_public: {
        Row: {
          address_line: string | null
          id: string | null
          location_display: string | null
          location_id: string | null
          name: string | null
          opening_note: string | null
          org_id: string | null
          sort: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'org_branches_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_branches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_branches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      org_product_categories_public: {
        Row: {
          name: string | null
          org_id: string | null
          parent_id: string | null
          product_category_id: string | null
          slug: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'org_product_categories_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_product_categories_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
        ]
      }
      organisation_services_public: {
        Row: {
          name: string | null
          org_id: string | null
          parent_id: string | null
          service_id: string | null
          slug: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'organisation_services_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'organisation_services_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'organisation_services_public'
            referencedColumns: ['service_id']
          },
          {
            foreignKeyName: 'service_categories_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
        ]
      }
      organisations_public: {
        Row: {
          areas_served: string[] | null
          country_code: string | null
          cover_path: string | null
          currency: string | null
          description: string | null
          featured_until: string | null
          has_email: boolean | null
          has_members: boolean | null
          has_phone: boolean | null
          has_telegram: boolean | null
          has_whatsapp: boolean | null
          id: string | null
          is_featured: boolean | null
          is_hagerland: boolean | null
          kind: Database['public']['Enums']['org_kind'] | null
          licence_category: string | null
          licence_grade: string | null
          location_display: string | null
          location_id: string | null
          location_path: string | null
          logo_path: string | null
          name: string | null
          opening_hours: Json | null
          published_at: string | null
          qualifications: string | null
          search_tsv: unknown
          serves_diaspora: boolean | null
          short_id: string | null
          slug: string | null
          social: Json | null
          tagline: string | null
          team_size: string | null
          updated_at: string | null
          verification_level: Database['public']['Enums']['verification_level'] | null
          verified_at: string | null
          website: string | null
          year_established: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'organisations_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      pillars_public: {
        Row: {
          aggregate_enabled: boolean | null
          description: string | null
          direct_enabled: boolean | null
          icon: string | null
          interest_enabled: boolean | null
          key: string | null
          name: string | null
          nav_label: string | null
          number: number | null
          seo_description: string | null
          seo_title: string | null
          services: Json | null
          slug: string | null
          status: Database['public']['Enums']['vertical_status'] | null
          tagline: string | null
        }
        ComputedFields: never
        Insert: {
          aggregate_enabled?: boolean | null
          description?: string | null
          direct_enabled?: boolean | null
          icon?: string | null
          interest_enabled?: boolean | null
          key?: string | null
          name?: string | null
          nav_label?: string | null
          number?: number | null
          seo_description?: string | null
          seo_title?: string | null
          services?: never
          slug?: string | null
          status?: never
          tagline?: string | null
        }
        Update: {
          aggregate_enabled?: boolean | null
          description?: string | null
          direct_enabled?: boolean | null
          icon?: string | null
          interest_enabled?: boolean | null
          key?: string | null
          name?: string | null
          nav_label?: string | null
          number?: number | null
          seo_description?: string | null
          seo_title?: string | null
          services?: never
          slug?: string | null
          status?: never
          tagline?: string | null
        }
        Relationships: []
      }
      portfolio_public: {
        Row: {
          cover_path: string | null
          description: string | null
          development_id: string | null
          id: string | null
          location_display: string | null
          location_id: string | null
          org_id: string | null
          project_value_band: string | null
          sort: number | null
          title: string | null
          updated_at: string | null
          year: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'portfolio_projects_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'portfolio_projects_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      products_public: {
        Row: {
          brand_id: string | null
          brand_name: string | null
          brand_slug: string | null
          category_id: string | null
          category_name: string | null
          category_parent_id: string | null
          category_slug: string | null
          country_of_origin: string | null
          delivery_available: boolean | null
          description: string | null
          id: string | null
          image_path: string | null
          is_featured: boolean | null
          lead_time_days: number | null
          min_order_qty: number | null
          model_number: string | null
          name: string | null
          pack_size: string | null
          price_etb_cents: number | null
          price_type: Database['public']['Enums']['price_type'] | null
          price_updated_at: string | null
          published_at: string | null
          search_tsv: unknown
          seller_is_hagerland: boolean | null
          seller_name: string | null
          seller_org_id: string | null
          seller_slug: string | null
          short_id: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          stock_status: Database['public']['Enums']['stock_status'] | null
          summary: string | null
          unit: string | null
          updated_at: string | null
          warranty: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['category_parent_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'product_categories_parent_id_fkey'
            columns: ['category_parent_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_brand_id_fkey'
            columns: ['brand_id']
            isOneToOne: false
            referencedRelation: 'brands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'org_product_categories_public'
            referencedColumns: ['product_category_id']
          },
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'product_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_seller_org_id_fkey'
            columns: ['seller_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_seller_org_id_fkey'
            columns: ['seller_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      properties_public: {
        Row: {
          address_line: string | null
          advance_months: number | null
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          completion_status: Database['public']['Enums']['completion_status'] | null
          cover_path: string | null
          description: string | null
          development_id: string | null
          development_name: string | null
          development_slug: string | null
          features: string[] | null
          finishing_status: Database['public']['Enums']['finishing_status'] | null
          floor_number: number | null
          floors_label: string | null
          furnishing: Database['public']['Enums']['furnishing'] | null
          has_email: boolean | null
          has_phone: boolean | null
          has_telegram: boolean | null
          has_title_deed: boolean | null
          has_whatsapp: boolean | null
          id: string | null
          is_featured: boolean | null
          is_hagerland: boolean | null
          lat: number | null
          lister_logo_path: string | null
          lister_name: string | null
          lister_org_id: string | null
          lister_org_slug: string | null
          lister_type: string | null
          lister_verification: Database['public']['Enums']['verification_level'] | null
          lng: number | null
          location_display: string | null
          location_id: string | null
          location_name: string | null
          location_path: string | null
          parking_spaces: number | null
          photo_count: number | null
          plot_area_m2: number | null
          price_etb: number | null
          price_negotiable: boolean | null
          price_on_request: boolean | null
          price_period: string | null
          property_type: Database['public']['Enums']['property_type'] | null
          published_at: string | null
          purpose: Database['public']['Enums']['listing_purpose'] | null
          renewed_at: string | null
          search_tsv: unknown
          service_charge_etb: number | null
          short_id: string | null
          show_exact_location: boolean | null
          slug: string | null
          tenure: Database['public']['Enums']['tenure'] | null
          title: string | null
          updated_at: string | null
          video_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
          year_built: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'properties_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_development_id_fkey'
            columns: ['development_id']
            isOneToOne: false
            referencedRelation: 'developments_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_lister_org_id_fkey'
            columns: ['lister_org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_lister_org_id_fkey'
            columns: ['lister_org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'properties_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
        ]
      }
      reviews_public: {
        Row: {
          author_first_name: string | null
          body: string | null
          id: string | null
          org_id: string | null
          provider_reply: string | null
          published_at: string | null
          rating: number | null
          replied_at: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'reviews_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
        ]
      }
      service_requests_for_provider: {
        Row: {
          answers: Json | null
          attachment_count: number | null
          budget_band: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          details: string | null
          location_display: string | null
          location_id: string | null
          location_text: string | null
          match_id: string | null
          match_status: string | null
          offered_at: string | null
          org_id: string | null
          preferred_contact: string | null
          quote_amount_minor: number | null
          quote_currency: string | null
          quote_message: string | null
          quote_valid_until: string | null
          quoted_at: string | null
          reference: string | null
          request_id: string | null
          request_status: string | null
          requester_email: string | null
          requester_name: string | null
          requester_phone: string | null
          responded_at: string | null
          service_category_id: string | null
          service_name: string | null
          title: string | null
          urgency: string | null
          vertical_key: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'service_request_matches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_request_matches_org_id_fkey'
            columns: ['org_id']
            isOneToOne: false
            referencedRelation: 'organisations_public'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_location_id_fkey'
            columns: ['location_id']
            isOneToOne: false
            referencedRelation: 'locations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_service_category_id_fkey'
            columns: ['service_category_id']
            isOneToOne: false
            referencedRelation: 'organisation_services_public'
            referencedColumns: ['service_id']
          },
          {
            foreignKeyName: 'service_requests_service_category_id_fkey'
            columns: ['service_category_id']
            isOneToOne: false
            referencedRelation: 'service_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'service_requests_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals'
            referencedColumns: ['key']
          },
          {
            foreignKeyName: 'service_requests_vertical_key_fkey'
            columns: ['vertical_key']
            isOneToOne: false
            referencedRelation: 'verticals_public'
            referencedColumns: ['key']
          },
        ]
      }
      site_settings_public: {
        Row: {
          key: string | null
          value: Json | null
        }
        ComputedFields: never
        Insert: {
          key?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      special_buys_public: {
        Row: {
          category_name: string | null
          category_slug: string | null
          id: string | null
          image_path: string | null
          name: string | null
          pack_size: string | null
          price_etb_cents: number | null
          price_type: Database['public']['Enums']['price_type'] | null
          seller_is_hagerland: boolean | null
          seller_name: string | null
          seller_slug: string | null
          slug: string | null
          special_ends_at: string | null
          special_qty_available: number | null
          special_was_price_etb_cents: number | null
          stock_status: Database['public']['Enums']['stock_status'] | null
          unit: string | null
          updated_at: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      verticals_public: {
        Row: {
          icon: string | null
          interest_enabled: boolean | null
          intro: string | null
          key: string | null
          name: string | null
          nav_label: string | null
          partner_signup_enabled: boolean | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string | null
          sort: number | null
          status: Database['public']['Enums']['vertical_status'] | null
          updated_at: string | null
        }
        ComputedFields: never
        Insert: {
          icon?: string | null
          interest_enabled?: boolean | null
          intro?: string | null
          key?: string | null
          name?: string | null
          nav_label?: string | null
          partner_signup_enabled?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          sort?: number | null
          status?: Database['public']['Enums']['vertical_status'] | null
          updated_at?: string | null
        }
        Update: {
          icon?: string | null
          interest_enabled?: boolean | null
          intro?: string | null
          key?: string | null
          name?: string | null
          nav_label?: string | null
          partner_signup_enabled?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string | null
          sort?: number | null
          status?: Database['public']['Enums']['vertical_status'] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      agency_requirement_matches: {
        Args: { p_limit?: number; p_requirement: string }
        Returns: {
          bedrooms: number
          id: string
          price_etb: number
          published_at: string
          slug: string
          title: string
        }[]
      }
      can_edit_entity: { Args: { p_entity_id: string; p_entity_type: string }; Returns: boolean }
      category_descendants: { Args: { root: string; tbl: string }; Returns: string[] }
      country_currency: { Args: { p_country: string }; Returns: string }
      f_unaccent: { Args: { '': string }; Returns: string }
      find_similar_organisations: { Args: { p_limit?: number; p_location_id?: string; p_name: string }; Returns: Json }
      gen_short_id: { Args: Record<PropertyKey, never>; Returns: string }
      increment_enquiries: { Args: { p_entity_type: string; p_id: string }; Returns: undefined }
      increment_view: { Args: { p_entity_type: string; p_id: string }; Returns: undefined }
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_end_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_org_member: { Args: { org: string; roles?: Database['public']['Enums']['org_role'][] }; Returns: boolean }
      is_trade_account: { Args: Record<PropertyKey, never>; Returns: boolean }
      location_summary: { Args: { p_location_id: string; p_purpose: Database['public']['Enums']['listing_purpose'] }; Returns: Json }
      locations_descendants: { Args: { root: string }; Returns: string[] }
      mode_status: {
        Args: { p_aggregate: boolean; p_direct: boolean; p_interest: boolean }
        Returns: Database['public']['Enums']['vertical_status']
      }
      next_reference: { Args: { p_prefix: string }; Returns: string }
      pillar_active_providers: { Args: { p_pillar: string }; Returns: number }
      popular_locations: { Args: { p_limit?: number; p_purpose?: Database['public']['Enums']['listing_purpose'] }; Returns: Json }
      product_trade_prices: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          trade_price_etb_cents: number
        }[]
      }
      property_type_words: { Args: { t: Database['public']['Enums']['property_type'] }; Returns: string }
      property_unavailable: {
        Args: { p_short_id: string }
        Returns: {
          bedrooms: number
          location_display: string
          location_id: string
          location_path: string
          property_type: Database['public']['Enums']['property_type']
          purpose: Database['public']['Enums']['listing_purpose']
          short_id: string
          title: string
        }[]
      }
      record_search_miss: { Args: { q: string; vertical: string }; Returns: undefined }
      refresh_all_featured: { Args: Record<PropertyKey, never>; Returns: number }
      refresh_featured: { Args: { p_entity_id: string; p_entity_type: string }; Returns: undefined }
      refresh_market_insight: { Args: Record<PropertyKey, never>; Returns: number }
      search_all: { Args: { p_limit?: number; p_q: string }; Returns: Json }
      search_developments: {
        Args: {
          p_completion?: Database['public']['Enums']['completion_status'][]
          p_developer_org_id?: string
          p_exclude_id?: string
          p_is_hagerland?: boolean
          p_kinds?: Database['public']['Enums']['development_kind'][]
          p_location_id?: string
          p_page?: number
          p_page_size?: number
          p_price_max?: number
          p_price_min?: number
          p_q?: string
          p_sort?: string
        }
        Returns: Json
      }
      search_locations: { Args: { p_limit?: number; p_q: string; p_scope?: string }; Returns: Json }
      search_organisations: {
        Args: {
          p_country_code?: string
          p_exclude_id?: string
          p_has_portfolio?: boolean
          p_kinds?: Database['public']['Enums']['org_kind'][]
          p_licence_grade?: string
          p_location_id?: string
          p_page?: number
          p_page_size?: number
          p_product_category_id?: string
          p_q?: string
          p_serves_diaspora?: boolean
          p_service_id?: string
          p_sort?: string
          p_verified_only?: boolean
        }
        Returns: Json
      }
      search_products: {
        Args: {
          p_brand_ids?: string[]
          p_category_id?: string
          p_exclude_id?: string
          p_page?: number
          p_page_size?: number
          p_price_max?: number
          p_price_min?: number
          p_q?: string
          p_seller_org_id?: string
          p_sort?: string
          p_stock_statuses?: Database['public']['Enums']['stock_status'][]
          p_units?: string[]
        }
        Returns: Json
      }
      search_properties: {
        Args: {
          p_added_within_days?: number
          p_area_max?: number
          p_area_min?: number
          p_baths_min?: number
          p_beds_min?: number
          p_completion?: Database['public']['Enums']['completion_status'][]
          p_development_id?: string
          p_exclude_id?: string
          p_featured_only?: boolean
          p_features?: string[]
          p_finishing?: Database['public']['Enums']['finishing_status'][]
          p_furnishing?: Database['public']['Enums']['furnishing'][]
          p_has_title_deed?: boolean
          p_include_negotiable?: boolean
          p_lister_org_id?: string
          p_lister_type?: string
          p_location_id?: string
          p_page?: number
          p_page_size?: number
          p_price_max?: number
          p_price_min?: number
          p_purpose?: Database['public']['Enums']['listing_purpose']
          p_q?: string
          p_sort?: string
          p_types?: Database['public']['Enums']['property_type'][]
        }
        Returns: Json
      }
      service_location_count: { Args: { p_location_id: string; p_service_id: string }; Returns: number }
      setting_int: { Args: { fallback: number; setting_key: string }; Returns: number }
      sync_verticals_from_pillars: { Args: Record<PropertyKey, never>; Returns: undefined }
      tsquery_or_null: { Args: { q: string }; Returns: unknown }
      vertical_pillar: { Args: { p_vertical: string }; Returns: string }
    }
    Enums: {
      account_type: 'personal' | 'business'
      completion_status: 'off_plan' | 'under_construction' | 'ready'
      development_kind: 'development' | 'condominium_site' | 'building' | 'compound' | 'mixed_use_project'
      enquiry_status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam'
      finishing_status: 'shell' | 'semi_finished' | 'fully_finished' | 'not_applicable'
      furnishing: 'unfurnished' | 'semi_furnished' | 'furnished'
      listing_purpose: 'sale' | 'rent'
      listing_status: 'draft' | 'pending_review' | 'published' | 'paused' | 'expired' | 'rejected' | 'archived' | 'removed'
      location_level: 'country' | 'region' | 'city' | 'sub_city' | 'area'
      org_kind:
        | 'agency'
        | 'developer'
        | 'supplier'
        | 'manufacturer'
        | 'contractor'
        | 'professional_firm'
        | 'sole_trader'
        | 'hagerland'
        | 'lender'
        | 'insurer'
        | 'broker'
      org_role: 'owner' | 'admin' | 'member'
      price_type: 'fixed' | 'from' | 'on_request'
      property_type:
        | 'apartment'
        | 'condominium'
        | 'house'
        | 'villa'
        | 'townhouse'
        | 'g_plus_building'
        | 'room'
        | 'studio'
        | 'land'
        | 'commercial_building'
        | 'office'
        | 'shop'
        | 'warehouse'
        | 'hotel'
        | 'mixed_use'
        | 'other'
      quote_status: 'submitted' | 'in_review' | 'quoted' | 'accepted' | 'declined' | 'expired' | 'cancelled'
      stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'made_to_order' | 'available_on_request'
      tenure: 'leasehold' | 'freehold_private' | 'condominium_title' | 'cooperative' | 'unknown'
      verification_level: 'listed' | 'claimed' | 'verified'
      vertical_status: 'live' | 'coming_soon' | 'hidden'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ['personal', 'business'],
      completion_status: ['off_plan', 'under_construction', 'ready'],
      development_kind: ['development', 'condominium_site', 'building', 'compound', 'mixed_use_project'],
      enquiry_status: ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'],
      finishing_status: ['shell', 'semi_finished', 'fully_finished', 'not_applicable'],
      furnishing: ['unfurnished', 'semi_furnished', 'furnished'],
      listing_purpose: ['sale', 'rent'],
      listing_status: ['draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived', 'removed'],
      location_level: ['country', 'region', 'city', 'sub_city', 'area'],
      org_kind: [
        'agency',
        'developer',
        'supplier',
        'manufacturer',
        'contractor',
        'professional_firm',
        'sole_trader',
        'hagerland',
        'lender',
        'insurer',
        'broker',
      ],
      org_role: ['owner', 'admin', 'member'],
      price_type: ['fixed', 'from', 'on_request'],
      property_type: [
        'apartment',
        'condominium',
        'house',
        'villa',
        'townhouse',
        'g_plus_building',
        'room',
        'studio',
        'land',
        'commercial_building',
        'office',
        'shop',
        'warehouse',
        'hotel',
        'mixed_use',
        'other',
      ],
      quote_status: ['submitted', 'in_review', 'quoted', 'accepted', 'declined', 'expired', 'cancelled'],
      stock_status: ['in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'available_on_request'],
      tenure: ['leasehold', 'freehold_private', 'condominium_title', 'cooperative', 'unknown'],
      verification_level: ['listed', 'claimed', 'verified'],
      vertical_status: ['live', 'coming_soon', 'hidden'],
    },
  },
} as const
