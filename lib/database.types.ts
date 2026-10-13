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
      import_log: {
        Row: {
          entity_type: string | null
          error: string | null
          google_place_id: string
          imported_at: string | null
          listing_id: string | null
          listing_name: string | null
          section: string
          status: string | null
        }
        ComputedFields: never
        Insert: {
          entity_type?: string | null
          error?: string | null
          google_place_id: string
          imported_at?: string | null
          listing_id?: string | null
          listing_name?: string | null
          section: string
          status?: string | null
        }
        Update: {
          entity_type?: string | null
          error?: string | null
          google_place_id?: string
          imported_at?: string | null
          listing_id?: string | null
          listing_name?: string | null
          section?: string
          status?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
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
          cover_path: string | null
          created_at: string
          created_by: string | null
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
          rejection_reason: string | null
          search_tsv: unknown
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
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
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
          rejection_reason?: string | null
          search_tsv?: never
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
          cover_path?: string | null
          created_at?: string
          created_by?: string | null
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
          rejection_reason?: string | null
          search_tsv?: never
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
        ]
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
          created_at: string
          description: string | null
          icon: string | null
          id: string
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
    }
    Views: {
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
          cover_path: string | null
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
          search_tsv: unknown
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
    }
    Functions: {
      can_edit_entity: { Args: { p_entity_id: string; p_entity_type: string }; Returns: boolean }
      category_descendants: { Args: { root: string; tbl: string }; Returns: string[] }
      f_unaccent: { Args: { '': string }; Returns: string }
      find_similar_organisations: { Args: { p_limit?: number; p_location_id?: string; p_name: string }; Returns: Json }
      gen_short_id: { Args: Record<PropertyKey, never>; Returns: string }
      increment_view: { Args: { p_entity_type: string; p_id: string }; Returns: undefined }
      is_active_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_end_user: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_org_member: { Args: { org: string; roles?: Database['public']['Enums']['org_role'][] }; Returns: boolean }
      location_summary: {
        Args: { p_location_id: string; p_purpose: Database['public']['Enums']['listing_purpose'] }
        Returns: Json
      }
      locations_descendants: { Args: { root: string }; Returns: string[] }
      next_reference: { Args: { prefix: string }; Returns: string }
      popular_locations: {
        Args: { p_limit?: number; p_purpose?: Database['public']['Enums']['listing_purpose'] }
        Returns: Json
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
      search_locations: { Args: { p_limit?: number; p_q: string }; Returns: Json }
      search_organisations: {
        Args: {
          p_exclude_id?: string
          p_has_portfolio?: boolean
          p_kinds?: Database['public']['Enums']['org_kind'][]
          p_licence_grade?: string
          p_location_id?: string
          p_page?: number
          p_page_size?: number
          p_product_category_id?: string
          p_q?: string
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
      tsquery_or_null: { Args: { q: string }; Returns: unknown }
    }
    Enums: {
      account_type: 'personal' | 'business'
      completion_status: 'off_plan' | 'under_construction' | 'ready'
      development_kind: 'development' | 'condominium_site' | 'building' | 'compound' | 'mixed_use_project'
      enquiry_status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost' | 'spam'
      finishing_status: 'shell' | 'semi_finished' | 'fully_finished' | 'not_applicable'
      furnishing: 'unfurnished' | 'semi_furnished' | 'furnished'
      listing_purpose: 'sale' | 'rent'
      listing_status:
        'draft' | 'pending_review' | 'published' | 'paused' | 'expired' | 'rejected' | 'archived' | 'removed'
      location_level: 'region' | 'city' | 'sub_city' | 'area'
      org_kind:
        | 'agency'
        | 'developer'
        | 'supplier'
        | 'manufacturer'
        | 'contractor'
        | 'professional_firm'
        | 'sole_trader'
        | 'hagerland'
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
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
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
      location_level: ['region', 'city', 'sub_city', 'area'],
      org_kind: [
        'agency',
        'developer',
        'supplier',
        'manufacturer',
        'contractor',
        'professional_firm',
        'sole_trader',
        'hagerland',
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
    },
  },
} as const
