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
      admin_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          metadata: Json
          recipient_email: string
          sent_by: string | null
          sent_by_email: string | null
          sent_by_name: string | null
          status: string
          subject: string
          target_id: string
          target_type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_email: string
          sent_by?: string | null
          sent_by_email?: string | null
          sent_by_name?: string | null
          status?: string
          subject: string
          target_id: string
          target_type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          metadata?: Json
          recipient_email?: string
          sent_by?: string | null
          sent_by_email?: string | null
          sent_by_name?: string | null
          status?: string
          subject?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          author_id: string | null
          body: string
          body_html: string | null
          created_at: string
          department: string | null
          expires_at: string | null
          id: string
          is_published: boolean
          pinned: boolean
          publish_at: string
          target_role: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id?: string | null
          body: string
          body_html?: string | null
          created_at?: string
          department?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          pinned?: boolean
          publish_at?: string
          target_role?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string | null
          body?: string
          body_html?: string | null
          created_at?: string
          department?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean
          pinned?: boolean
          publish_at?: string
          target_role?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          break_minutes: number
          clock_in: string | null
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          source: string
          status: string
          total_minutes: number | null
          updated_at: string
          work_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
          work_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          source?: string
          status?: string
          total_minutes?: number | null
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author: string
          category: string
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          published_at: string
          read_minutes: number
          slug: string
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author?: string
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string
          read_minutes?: number
          slug: string
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author?: string
          category?: string
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string
          read_minutes?: number
          slug?: string
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      careers: {
        Row: {
          apply_url: string
          content_html: string | null
          created_at: string
          department: string
          description: string | null
          employment_type: string
          experience_level: string | null
          hero_image_url: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          location: string
          office_location_id: string | null
          posted_at: string
          posting_channels: Json
          requirements: Json
          responsibilities: Json
          salary_range: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
          vacancies: number
          view_count: number
        }
        Insert: {
          apply_url: string
          content_html?: string | null
          created_at?: string
          department?: string
          description?: string | null
          employment_type?: string
          experience_level?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          location?: string
          office_location_id?: string | null
          posted_at?: string
          posting_channels?: Json
          requirements?: Json
          responsibilities?: Json
          salary_range?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          vacancies?: number
          view_count?: number
        }
        Update: {
          apply_url?: string
          content_html?: string | null
          created_at?: string
          department?: string
          description?: string | null
          employment_type?: string
          experience_level?: string | null
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          location?: string
          office_location_id?: string | null
          posted_at?: string
          posting_channels?: Json
          requirements?: Json
          responsibilities?: Json
          salary_range?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          vacancies?: number
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "careers_office_location_id_fkey"
            columns: ["office_location_id"]
            isOneToOne: false
            referencedRelation: "office_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_name: string | null
          sender_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_name?: string | null
          sender_type: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_name?: string | null
          sender_type?: string
          session_id?: string
        }
        Relationships: []
      }
      contact_info: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          type?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      country_eligibility: {
        Row: {
          aliases: string[]
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          reason: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          reason?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          reason?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          advance_percent: number | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          is_milestone: boolean
          max_discount_amount: number | null
          milestone_mode: string | null
          milestone_stages: Json
          min_order_amount: number
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          advance_percent?: number | null
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_milestone?: boolean
          max_discount_amount?: number | null
          milestone_mode?: string | null
          milestone_stages?: Json
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          advance_percent?: number | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_milestone?: boolean
          max_discount_amount?: number | null
          milestone_mode?: string | null
          milestone_stages?: Json
          min_order_amount?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      credit_applications: {
        Row: {
          admin_notes: string | null
          business_age: string | null
          business_revenue: number | null
          country: string | null
          created_at: string
          id: string
          industry: string | null
          notes: string | null
          requested_limit: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_age?: string | null
          business_revenue?: number | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          requested_limit: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_age?: string | null
          business_revenue?: number | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          notes?: string | null
          requested_limit?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_user_id: string | null
          deal_id: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          metadata: Json
          priority: string
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_user_id?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          priority?: string
          status?: string
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_user_id?: string | null
          deal_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          priority?: string
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          email: string
          error_message: string | null
          full_name: string | null
          id: string
          lead_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          email: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          email?: string
          error_message?: string | null
          full_name?: string | null
          id?: string
          lead_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          failed_count: number
          finished_at: string | null
          id: string
          name: string
          scheduled_at: string | null
          segment_id: string | null
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          template_name: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject: string
          template_name?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          finished_at?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          segment_id?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string
          template_name?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "crm_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_user_id: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          lead_id: string | null
          lost_reason: string | null
          metadata: Json
          outcome: string | null
          owner_id: string | null
          pipeline_id: string
          position: number
          probability: number
          stage_id: string
          tags: string[]
          title: string
          updated_at: string
          value: number
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_user_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          metadata?: Json
          outcome?: string | null
          owner_id?: string | null
          pipeline_id: string
          position?: number
          probability?: number
          stage_id: string
          tags?: string[]
          title: string
          updated_at?: string
          value?: number
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_user_id?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          lead_id?: string | null
          lost_reason?: string | null
          metadata?: Json
          outcome?: string | null
          owner_id?: string | null
          pipeline_id?: string
          position?: number
          probability?: number
          stage_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          subject: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          subject: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      crm_hubspot_sync: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          hubspot_contact_id: string | null
          id: string
          lead_id: string | null
          payload: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          direction: string
          error?: string | null
          hubspot_contact_id?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          hubspot_contact_id?: string | null
          id?: string
          lead_id?: string | null
          payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_hubspot_sync_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          company: string | null
          converted_at: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          hubspot_contact_id: string | null
          id: string
          job_title: string | null
          last_contacted_at: string | null
          message: string | null
          metadata: Json
          owner_id: string | null
          phone: string | null
          priority: string
          score: number
          score_breakdown: Json
          source: string
          source_ref_id: string | null
          source_ref_table: string | null
          status: string
          tags: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          hubspot_contact_id?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          message?: string | null
          metadata?: Json
          owner_id?: string | null
          phone?: string | null
          priority?: string
          score?: number
          score_breakdown?: Json
          source?: string
          source_ref_id?: string | null
          source_ref_table?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          converted_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          hubspot_contact_id?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          message?: string | null
          metadata?: Json
          owner_id?: string | null
          phone?: string | null
          priority?: string
          score?: number
          score_breakdown?: Json
          source?: string
          source_ref_id?: string | null
          source_ref_table?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      crm_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          customer_user_id: string | null
          deal_id: string | null
          id: string
          lead_id: string | null
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          customer_user_id?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          customer_user_id?: string | null
          deal_id?: string | null
          id?: string
          lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      crm_score_weights: {
        Row: {
          id: number
          updated_at: string
          updated_by: string | null
          weights: Json
        }
        Insert: {
          id?: number
          updated_at?: string
          updated_by?: string | null
          weights: Json
        }
        Update: {
          id?: number
          updated_at?: string
          updated_by?: string | null
          weights?: Json
        }
        Relationships: []
      }
      crm_segments: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          id: string
          name: string
          recipient_count: number
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name: string
          recipient_count?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          id?: string
          name?: string
          recipient_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      crm_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          position: number
          probability: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          position?: number
          probability?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_runs: {
        Row: {
          completed_at: string | null
          context: Json
          created_at: string
          current_step: number
          id: string
          last_error: string | null
          lead_id: string | null
          next_run_at: string
          retries: number
          status: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          id?: string
          last_error?: string | null
          lead_id?: string | null
          next_run_at?: string
          retries?: number
          status?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          context?: Json
          created_at?: string
          current_step?: number
          id?: string
          last_error?: string | null
          lead_id?: string | null
          next_run_at?: string
          retries?: number
          status?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_runs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_steps: {
        Row: {
          config: Json
          created_at: string
          id: string
          position: number
          step_type: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          position: number
          step_type: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          position?: number
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_services: {
        Row: {
          auto_renew: boolean
          billing_cycle: string | null
          category: string
          created_at: string
          currency: string
          current_period_end: string | null
          customer_email: string
          delivered_at: string | null
          id: string
          invoice_number: string | null
          metadata: Json
          order_id: string | null
          payment_method: Json | null
          price: number
          quantity: number
          service_name: string
          service_slug: string | null
          started_at: string
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle?: string | null
          category?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          customer_email: string
          delivered_at?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json
          order_id?: string | null
          payment_method?: Json | null
          price?: number
          quantity?: number
          service_name: string
          service_slug?: string | null
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string | null
          category?: string
          created_at?: string
          currency?: string
          current_period_end?: string | null
          customer_email?: string
          delivered_at?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json
          order_id?: string | null
          payment_method?: Json | null
          price?: number
          quantity?: number
          service_name?: string
          service_slug?: string | null
          started_at?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      didit_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          processed: boolean | null
          session_id: string | null
          signature_valid: boolean | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
          session_id?: string | null
          signature_valid?: boolean | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
          session_id?: string | null
          signature_valid?: boolean | null
        }
        Relationships: []
      }
      dynime_annual_growth_analytics: {
        Row: {
          active_subscriptions_eoy: number | null
          churned_clients: number | null
          headcount_eoy: number | null
          milestone: string | null
          net_income_usd: number | null
          new_clients: number | null
          revenue_usd: number | null
          year: number | null
          yoy_growth_pct: string | null
        }
        Insert: {
          active_subscriptions_eoy?: number | null
          churned_clients?: number | null
          headcount_eoy?: number | null
          milestone?: string | null
          net_income_usd?: number | null
          new_clients?: number | null
          revenue_usd?: number | null
          year?: number | null
          yoy_growth_pct?: string | null
        }
        Update: {
          active_subscriptions_eoy?: number | null
          churned_clients?: number | null
          headcount_eoy?: number | null
          milestone?: string | null
          net_income_usd?: number | null
          new_clients?: number | null
          revenue_usd?: number | null
          year?: number | null
          yoy_growth_pct?: string | null
        }
        Relationships: []
      }
      dynime_attendance: {
        Row: {
          attendance_id: string | null
          clock_in: string | null
          clock_out: string | null
          employee_id: string | null
          source: string | null
          status: string | null
          total_minutes: number | null
          work_date: string | null
        }
        Insert: {
          attendance_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          employee_id?: string | null
          source?: string | null
          status?: string | null
          total_minutes?: number | null
          work_date?: string | null
        }
        Update: {
          attendance_id?: string | null
          clock_in?: string | null
          clock_out?: string | null
          employee_id?: string | null
          source?: string | null
          status?: string | null
          total_minutes?: number | null
          work_date?: string | null
        }
        Relationships: []
      }
      dynime_cashflow_monthly: {
        Row: {
          cash_balance_usd: number | null
          cash_in_usd: number | null
          cash_out_usd: number | null
          net_cashflow_usd: number | null
          period: string | null
        }
        Insert: {
          cash_balance_usd?: number | null
          cash_in_usd?: number | null
          cash_out_usd?: number | null
          net_cashflow_usd?: number | null
          period?: string | null
        }
        Update: {
          cash_balance_usd?: number | null
          cash_in_usd?: number | null
          cash_out_usd?: number | null
          net_cashflow_usd?: number | null
          period?: string | null
        }
        Relationships: []
      }
      dynime_clients: {
        Row: {
          account_manager_id: string | null
          churned_date: string | null
          client_id: string | null
          company_name: string | null
          contact_role: string | null
          country: string | null
          country_iso: string | null
          currency: string | null
          email: string | null
          industry: string | null
          lead_source: string | null
          lifecycle_stage: string | null
          lifetime_value_usd: number | null
          phone: string | null
          primary_contact: string | null
          segment: string | null
          signup_date: string | null
          status: string | null
          website: string | null
        }
        Insert: {
          account_manager_id?: string | null
          churned_date?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_role?: string | null
          country?: string | null
          country_iso?: string | null
          currency?: string | null
          email?: string | null
          industry?: string | null
          lead_source?: string | null
          lifecycle_stage?: string | null
          lifetime_value_usd?: number | null
          phone?: string | null
          primary_contact?: string | null
          segment?: string | null
          signup_date?: string | null
          status?: string | null
          website?: string | null
        }
        Update: {
          account_manager_id?: string | null
          churned_date?: string | null
          client_id?: string | null
          company_name?: string | null
          contact_role?: string | null
          country?: string | null
          country_iso?: string | null
          currency?: string | null
          email?: string | null
          industry?: string | null
          lead_source?: string | null
          lifecycle_stage?: string | null
          lifetime_value_usd?: number | null
          phone?: string | null
          primary_contact?: string | null
          segment?: string | null
          signup_date?: string | null
          status?: string | null
          website?: string | null
        }
        Relationships: []
      }
      dynime_company_master: {
        Row: {
          auditor: string | null
          bankers: string | null
          billing_email: string | null
          ceo: string | null
          cfo: string | null
          company_id: string | null
          cto: string | null
          ein_us: string | null
          fiscal_year_start: string | null
          founded: string | null
          hq_address: string | null
          hq_country: string | null
          industry: string | null
          legal_name: string | null
          registered_offices: string | null
          reporting_currency: string | null
          support_email: string | null
          tax_id_bd: string | null
          trade_name: string | null
          vat_uk: string | null
          website: string | null
        }
        Insert: {
          auditor?: string | null
          bankers?: string | null
          billing_email?: string | null
          ceo?: string | null
          cfo?: string | null
          company_id?: string | null
          cto?: string | null
          ein_us?: string | null
          fiscal_year_start?: string | null
          founded?: string | null
          hq_address?: string | null
          hq_country?: string | null
          industry?: string | null
          legal_name?: string | null
          registered_offices?: string | null
          reporting_currency?: string | null
          support_email?: string | null
          tax_id_bd?: string | null
          trade_name?: string | null
          vat_uk?: string | null
          website?: string | null
        }
        Update: {
          auditor?: string | null
          bankers?: string | null
          billing_email?: string | null
          ceo?: string | null
          cfo?: string | null
          company_id?: string | null
          cto?: string | null
          ein_us?: string | null
          fiscal_year_start?: string | null
          founded?: string | null
          hq_address?: string | null
          hq_country?: string | null
          industry?: string | null
          legal_name?: string | null
          registered_offices?: string | null
          reporting_currency?: string | null
          support_email?: string | null
          tax_id_bd?: string | null
          trade_name?: string | null
          vat_uk?: string | null
          website?: string | null
        }
        Relationships: []
      }
      dynime_country_distribution: {
        Row: {
          active_clients: number | null
          country: string | null
          share_pct: number | null
          total_revenue_usd: number | null
        }
        Insert: {
          active_clients?: number | null
          country?: string | null
          share_pct?: number | null
          total_revenue_usd?: number | null
        }
        Update: {
          active_clients?: number | null
          country?: string | null
          share_pct?: number | null
          total_revenue_usd?: number | null
        }
        Relationships: []
      }
      dynime_departments: {
        Row: {
          department: string | null
          dept_id: string | null
          head_count_2026q2: number | null
          junior_share: number | null
          lead_share: number | null
          mid_share: number | null
          salary_junior_usd: number | null
          salary_lead_usd: number | null
          salary_mid_usd: number | null
          salary_senior_usd: number | null
          senior_share: number | null
        }
        Insert: {
          department?: string | null
          dept_id?: string | null
          head_count_2026q2?: number | null
          junior_share?: number | null
          lead_share?: number | null
          mid_share?: number | null
          salary_junior_usd?: number | null
          salary_lead_usd?: number | null
          salary_mid_usd?: number | null
          salary_senior_usd?: number | null
          senior_share?: number | null
        }
        Update: {
          department?: string | null
          dept_id?: string | null
          head_count_2026q2?: number | null
          junior_share?: number | null
          lead_share?: number | null
          mid_share?: number | null
          salary_junior_usd?: number | null
          salary_lead_usd?: number | null
          salary_mid_usd?: number | null
          salary_senior_usd?: number | null
          senior_share?: number | null
        }
        Relationships: []
      }
      dynime_employees: {
        Row: {
          annual_salary_usd: number | null
          country: string | null
          country_iso: string | null
          currency: string | null
          department: string | null
          designation: string | null
          dob: string | null
          email: string | null
          employee_id: string | null
          employment_type: string | null
          exit_date: string | null
          exit_reason: string | null
          full_name: string | null
          gender: string | null
          hire_date: string | null
          manager_id: string | null
          monthly_gross_usd: number | null
          phone: string | null
          seniority: string | null
          status: string | null
          work_location: string | null
        }
        Insert: {
          annual_salary_usd?: number | null
          country?: string | null
          country_iso?: string | null
          currency?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          email?: string | null
          employee_id?: string | null
          employment_type?: string | null
          exit_date?: string | null
          exit_reason?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          manager_id?: string | null
          monthly_gross_usd?: number | null
          phone?: string | null
          seniority?: string | null
          status?: string | null
          work_location?: string | null
        }
        Update: {
          annual_salary_usd?: number | null
          country?: string | null
          country_iso?: string | null
          currency?: string | null
          department?: string | null
          designation?: string | null
          dob?: string | null
          email?: string | null
          employee_id?: string | null
          employment_type?: string | null
          exit_date?: string | null
          exit_reason?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          manager_id?: string | null
          monthly_gross_usd?: number | null
          phone?: string | null
          seniority?: string | null
          status?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      dynime_expansion_timeline: {
        Row: {
          category: string | null
          event_date: string | null
          milestone: string | null
        }
        Insert: {
          category?: string | null
          event_date?: string | null
          milestone?: string | null
        }
        Update: {
          category?: string | null
          event_date?: string | null
          milestone?: string | null
        }
        Relationships: []
      }
      dynime_expenses: {
        Row: {
          amount_usd: number | null
          category: string | null
          currency: string | null
          description: string | null
          expense_id: string | null
          period: string | null
          status: string | null
          vendor_id: string | null
        }
        Insert: {
          amount_usd?: number | null
          category?: string | null
          currency?: string | null
          description?: string | null
          expense_id?: string | null
          period?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount_usd?: number | null
          category?: string | null
          currency?: string | null
          description?: string | null
          expense_id?: string | null
          period?: string | null
          status?: string | null
          vendor_id?: string | null
        }
        Relationships: []
      }
      dynime_invoices: {
        Row: {
          client_id: string | null
          client_name: string | null
          currency: string | null
          due_date: string | null
          invoice_id: string | null
          invoice_number: string | null
          issue_date: string | null
          milestone: string | null
          order_id: string | null
          payment_terms: string | null
          status: string | null
          subtotal_usd: number | null
          tax_amount_usd: number | null
          tax_rate: number | null
          total_usd: number | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          currency?: string | null
          due_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          milestone?: string | null
          order_id?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal_usd?: number | null
          tax_amount_usd?: number | null
          tax_rate?: number | null
          total_usd?: number | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          currency?: string | null
          due_date?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          issue_date?: string | null
          milestone?: string | null
          order_id?: string | null
          payment_terms?: string | null
          status?: string | null
          subtotal_usd?: number | null
          tax_amount_usd?: number | null
          tax_rate?: number | null
          total_usd?: number | null
        }
        Relationships: []
      }
      dynime_kpi_monthly: {
        Row: {
          active_clients: number | null
          active_subscriptions: number | null
          arr_usd: number | null
          churn_rate_pct: number | null
          gross_margin_pct: number | null
          headcount: number | null
          mrr_usd: number | null
          net_income_usd: number | null
          nps_score: number | null
          period: string | null
          revenue_usd: number | null
        }
        Insert: {
          active_clients?: number | null
          active_subscriptions?: number | null
          arr_usd?: number | null
          churn_rate_pct?: number | null
          gross_margin_pct?: number | null
          headcount?: number | null
          mrr_usd?: number | null
          net_income_usd?: number | null
          nps_score?: number | null
          period?: string | null
          revenue_usd?: number | null
        }
        Update: {
          active_clients?: number | null
          active_subscriptions?: number | null
          arr_usd?: number | null
          churn_rate_pct?: number | null
          gross_margin_pct?: number | null
          headcount?: number | null
          mrr_usd?: number | null
          net_income_usd?: number | null
          nps_score?: number | null
          period?: string | null
          revenue_usd?: number | null
        }
        Relationships: []
      }
      dynime_leave_records: {
        Row: {
          days_count: number | null
          employee_id: string | null
          end_date: string | null
          leave_id: string | null
          leave_type: string | null
          reason: string | null
          start_date: string | null
          status: string | null
        }
        Insert: {
          days_count?: number | null
          employee_id?: string | null
          end_date?: string | null
          leave_id?: string | null
          leave_type?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Update: {
          days_count?: number | null
          employee_id?: string | null
          end_date?: string | null
          leave_id?: string | null
          leave_type?: string | null
          reason?: string | null
          start_date?: string | null
          status?: string | null
        }
        Relationships: []
      }
      dynime_marketing_campaigns: {
        Row: {
          budget_usd: number | null
          campaign_id: string | null
          channel: string | null
          clicks: number | null
          deals_won: number | null
          end_date: string | null
          impressions: number | null
          leads: number | null
          name: string | null
          revenue_attributed_usd: number | null
          roi_pct: number | null
          spend_usd: number | null
          start_date: string | null
        }
        Insert: {
          budget_usd?: number | null
          campaign_id?: string | null
          channel?: string | null
          clicks?: number | null
          deals_won?: number | null
          end_date?: string | null
          impressions?: number | null
          leads?: number | null
          name?: string | null
          revenue_attributed_usd?: number | null
          roi_pct?: number | null
          spend_usd?: number | null
          start_date?: string | null
        }
        Update: {
          budget_usd?: number | null
          campaign_id?: string | null
          channel?: string | null
          clicks?: number | null
          deals_won?: number | null
          end_date?: string | null
          impressions?: number | null
          leads?: number | null
          name?: string | null
          revenue_attributed_usd?: number | null
          roi_pct?: number | null
          spend_usd?: number | null
          start_date?: string | null
        }
        Relationships: []
      }
      dynime_orders: {
        Row: {
          client_id: string | null
          client_name: string | null
          contract_value_usd: number | null
          country: string | null
          currency: string | null
          duration_days: number | null
          estimated_delivery: string | null
          order_date: string | null
          order_id: string | null
          owner_employee_id: string | null
          project_name: string | null
          service_code: string | null
          service_name: string | null
          status: string | null
        }
        Insert: {
          client_id?: string | null
          client_name?: string | null
          contract_value_usd?: number | null
          country?: string | null
          currency?: string | null
          duration_days?: number | null
          estimated_delivery?: string | null
          order_date?: string | null
          order_id?: string | null
          owner_employee_id?: string | null
          project_name?: string | null
          service_code?: string | null
          service_name?: string | null
          status?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string | null
          contract_value_usd?: number | null
          country?: string | null
          currency?: string | null
          duration_days?: number | null
          estimated_delivery?: string | null
          order_date?: string | null
          order_id?: string | null
          owner_employee_id?: string | null
          project_name?: string | null
          service_code?: string | null
          service_name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      dynime_payment_transactions: {
        Row: {
          amount_usd: number | null
          client_id: string | null
          gateway_fee_usd: number | null
          invoice_id: string | null
          method: string | null
          paid_on: string | null
          payment_id: string | null
          status: string | null
          txn_reference: string | null
        }
        Insert: {
          amount_usd?: number | null
          client_id?: string | null
          gateway_fee_usd?: number | null
          invoice_id?: string | null
          method?: string | null
          paid_on?: string | null
          payment_id?: string | null
          status?: string | null
          txn_reference?: string | null
        }
        Update: {
          amount_usd?: number | null
          client_id?: string | null
          gateway_fee_usd?: number | null
          invoice_id?: string | null
          method?: string | null
          paid_on?: string | null
          payment_id?: string | null
          status?: string | null
          txn_reference?: string | null
        }
        Relationships: []
      }
      dynime_pnl_monthly: {
        Row: {
          cogs_usd: number | null
          depreciation_usd: number | null
          ebit_usd: number | null
          ebitda_usd: number | null
          gross_profit_usd: number | null
          net_income_usd: number | null
          net_margin_pct: number | null
          operating_expenses_usd: number | null
          period: string | null
          revenue_usd: number | null
          tax_usd: number | null
        }
        Insert: {
          cogs_usd?: number | null
          depreciation_usd?: number | null
          ebit_usd?: number | null
          ebitda_usd?: number | null
          gross_profit_usd?: number | null
          net_income_usd?: number | null
          net_margin_pct?: number | null
          operating_expenses_usd?: number | null
          period?: string | null
          revenue_usd?: number | null
          tax_usd?: number | null
        }
        Update: {
          cogs_usd?: number | null
          depreciation_usd?: number | null
          ebit_usd?: number | null
          ebitda_usd?: number | null
          gross_profit_usd?: number | null
          net_income_usd?: number | null
          net_margin_pct?: number | null
          operating_expenses_usd?: number | null
          period?: string | null
          revenue_usd?: number | null
          tax_usd?: number | null
        }
        Relationships: []
      }
      dynime_recruitment_history: {
        Row: {
          applicants: number | null
          closed_on: string | null
          department: string | null
          hired_employee_id: string | null
          interviewed: number | null
          offers_made: number | null
          posted_on: string | null
          requisition_id: string | null
          role: string | null
          shortlisted: number | null
          source: string | null
          time_to_fill_days: number | null
        }
        Insert: {
          applicants?: number | null
          closed_on?: string | null
          department?: string | null
          hired_employee_id?: string | null
          interviewed?: number | null
          offers_made?: number | null
          posted_on?: string | null
          requisition_id?: string | null
          role?: string | null
          shortlisted?: number | null
          source?: string | null
          time_to_fill_days?: number | null
        }
        Update: {
          applicants?: number | null
          closed_on?: string | null
          department?: string | null
          hired_employee_id?: string | null
          interviewed?: number | null
          offers_made?: number | null
          posted_on?: string | null
          requisition_id?: string | null
          role?: string | null
          shortlisted?: number | null
          source?: string | null
          time_to_fill_days?: number | null
        }
        Relationships: []
      }
      dynime_recurring_clients: {
        Row: {
          active_subscriptions: number | null
          client_id: string | null
          client_name: string | null
          country: string | null
          first_order_date: string | null
          last_order_date: string | null
          lifetime_value_usd: number | null
          relationship_months: number | null
          segment: string | null
          total_orders: number | null
        }
        Insert: {
          active_subscriptions?: number | null
          client_id?: string | null
          client_name?: string | null
          country?: string | null
          first_order_date?: string | null
          last_order_date?: string | null
          lifetime_value_usd?: number | null
          relationship_months?: number | null
          segment?: string | null
          total_orders?: number | null
        }
        Update: {
          active_subscriptions?: number | null
          client_id?: string | null
          client_name?: string | null
          country?: string | null
          first_order_date?: string | null
          last_order_date?: string | null
          lifetime_value_usd?: number | null
          relationship_months?: number | null
          segment?: string | null
          total_orders?: number | null
        }
        Relationships: []
      }
      dynime_revenue_by_service: {
        Row: {
          revenue_usd: number | null
          service: string | null
          share_pct: number | null
          year: number | null
        }
        Insert: {
          revenue_usd?: number | null
          service?: string | null
          share_pct?: number | null
          year?: number | null
        }
        Update: {
          revenue_usd?: number | null
          service?: string | null
          share_pct?: number | null
          year?: number | null
        }
        Relationships: []
      }
      dynime_saas_subscriptions: {
        Row: {
          arr_usd: number | null
          auto_renew: boolean | null
          billing_cycle: string | null
          client_id: string | null
          currency: string | null
          end_date: string | null
          mrr_usd: number | null
          plan_name: string | null
          product_code: string | null
          product_name: string | null
          seats: number | null
          start_date: string | null
          status: string | null
          subscription_id: string | null
          unit_price_usd: number | null
        }
        Insert: {
          arr_usd?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string | null
          client_id?: string | null
          currency?: string | null
          end_date?: string | null
          mrr_usd?: number | null
          plan_name?: string | null
          product_code?: string | null
          product_name?: string | null
          seats?: number | null
          start_date?: string | null
          status?: string | null
          subscription_id?: string | null
          unit_price_usd?: number | null
        }
        Update: {
          arr_usd?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string | null
          client_id?: string | null
          currency?: string | null
          end_date?: string | null
          mrr_usd?: number | null
          plan_name?: string | null
          product_code?: string | null
          product_name?: string | null
          seats?: number | null
          start_date?: string | null
          status?: string | null
          subscription_id?: string | null
          unit_price_usd?: number | null
        }
        Relationships: []
      }
      dynime_sales_team_performance: {
        Row: {
          deals_won: number | null
          employee_id: string | null
          leads_assigned: number | null
          leads_qualified: number | null
          period: string | null
          quota_attainment_pct: number | null
          revenue_generated_usd: number | null
        }
        Insert: {
          deals_won?: number | null
          employee_id?: string | null
          leads_assigned?: number | null
          leads_qualified?: number | null
          period?: string | null
          quota_attainment_pct?: number | null
          revenue_generated_usd?: number | null
        }
        Update: {
          deals_won?: number | null
          employee_id?: string | null
          leads_assigned?: number | null
          leads_qualified?: number | null
          period?: string | null
          quota_attainment_pct?: number | null
          revenue_generated_usd?: number | null
        }
        Relationships: []
      }
      dynime_subscription_billing: {
        Row: {
          amount_usd: number | null
          billing_id: string | null
          client_id: string | null
          currency: string | null
          invoice_no: string | null
          period_end: string | null
          period_start: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          amount_usd?: number | null
          billing_id?: string | null
          client_id?: string | null
          currency?: string | null
          invoice_no?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          amount_usd?: number | null
          billing_id?: string | null
          client_id?: string | null
          currency?: string | null
          invoice_no?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: []
      }
      dynime_support_tickets: {
        Row: {
          agent_id: string | null
          channel: string | null
          client_id: string | null
          first_response_minutes: number | null
          opened_at: string | null
          priority: string | null
          resolution_hours: number | null
          resolved_at: string | null
          satisfaction_score: number | null
          status: string | null
          subject: string | null
          ticket_id: string | null
        }
        Insert: {
          agent_id?: string | null
          channel?: string | null
          client_id?: string | null
          first_response_minutes?: number | null
          opened_at?: string | null
          priority?: string | null
          resolution_hours?: number | null
          resolved_at?: string | null
          satisfaction_score?: number | null
          status?: string | null
          subject?: string | null
          ticket_id?: string | null
        }
        Update: {
          agent_id?: string | null
          channel?: string | null
          client_id?: string | null
          first_response_minutes?: number | null
          opened_at?: string | null
          priority?: string | null
          resolution_hours?: number | null
          resolved_at?: string | null
          satisfaction_score?: number | null
          status?: string | null
          subject?: string | null
          ticket_id?: string | null
        }
        Relationships: []
      }
      dynime_tax_compliance: {
        Row: {
          filed_on: string | null
          filing_id: string | null
          fiscal_year: number | null
          jurisdiction: string | null
          rate_pct: number | null
          registration_no: string | null
          status: string | null
          tax_liability_usd: number | null
          tax_type: string | null
          taxable_revenue_usd: number | null
        }
        Insert: {
          filed_on?: string | null
          filing_id?: string | null
          fiscal_year?: number | null
          jurisdiction?: string | null
          rate_pct?: number | null
          registration_no?: string | null
          status?: string | null
          tax_liability_usd?: number | null
          tax_type?: string | null
          taxable_revenue_usd?: number | null
        }
        Update: {
          filed_on?: string | null
          filing_id?: string | null
          fiscal_year?: number | null
          jurisdiction?: string | null
          rate_pct?: number | null
          registration_no?: string | null
          status?: string | null
          tax_liability_usd?: number | null
          tax_type?: string | null
          taxable_revenue_usd?: number | null
        }
        Relationships: []
      }
      dynime_vendors: {
        Row: {
          active_since: string | null
          category: string | null
          country: string | null
          currency: string | null
          payment_terms: string | null
          status: string | null
          vendor_code: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          active_since?: string | null
          category?: string | null
          country?: string | null
          currency?: string | null
          payment_terms?: string | null
          status?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          active_since?: string | null
          category?: string | null
          country?: string | null
          currency?: string | null
          payment_terms?: string | null
          status?: string | null
          vendor_code?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      dynime_website_leads: {
        Row: {
          assigned_to: string | null
          company: string | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          lead_id: string | null
          score: number | null
          service_interest: string | null
          source: string | null
          stage: string | null
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          lead_id?: string | null
          score?: number | null
          service_interest?: string | null
          source?: string | null
          stage?: string | null
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          lead_id?: string | null
          score?: number | null
          service_interest?: string | null
          source?: string | null
          stage?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string
          metadata: Json
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id: string
          metadata?: Json
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string
          metadata?: Json
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          address: string | null
          allowances: Json
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          bank_routing: string | null
          created_at: string
          created_by: string | null
          currency: string
          deductions: Json
          department: string | null
          designation: string | null
          dob: string | null
          email: string | null
          employee_code: string | null
          employment_type: string
          full_name: string
          gross_salary: number
          id: string
          job_type: string | null
          joining_date: string | null
          last_working_day: string | null
          metadata: Json
          nid_passport: string | null
          pay_cycle: string
          phone: string | null
          photo_url: string | null
          probation_end_date: string | null
          reporting_to: string | null
          status: string
          team_member_key: string | null
          updated_at: string
          user_id: string | null
          work_location: string | null
        }
        Insert: {
          address?: string | null
          allowances?: Json
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: Json
          department?: string | null
          designation?: string | null
          dob?: string | null
          email?: string | null
          employee_code?: string | null
          employment_type?: string
          full_name: string
          gross_salary?: number
          id?: string
          job_type?: string | null
          joining_date?: string | null
          last_working_day?: string | null
          metadata?: Json
          nid_passport?: string | null
          pay_cycle?: string
          phone?: string | null
          photo_url?: string | null
          probation_end_date?: string | null
          reporting_to?: string | null
          status?: string
          team_member_key?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
        }
        Update: {
          address?: string | null
          allowances?: Json
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          bank_routing?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deductions?: Json
          department?: string | null
          designation?: string | null
          dob?: string | null
          email?: string | null
          employee_code?: string | null
          employment_type?: string
          full_name?: string
          gross_salary?: number
          id?: string
          job_type?: string | null
          joining_date?: string | null
          last_working_day?: string | null
          metadata?: Json
          nid_passport?: string | null
          pay_cycle?: string
          phone?: string | null
          photo_url?: string | null
          probation_end_date?: string | null
          reporting_to?: string | null
          status?: string
          team_member_key?: string | null
          updated_at?: string
          user_id?: string | null
          work_location?: string | null
        }
        Relationships: []
      }
      flexpay_application_documents: {
        Row: {
          application_id: string
          created_at: string
          description: string | null
          document_type: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          label: string
          mime_type: string | null
          requested_at: string
          requested_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          description?: string | null
          document_type: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          label: string
          mime_type?: string | null
          requested_at?: string
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          label?: string
          mime_type?: string | null
          requested_at?: string
          requested_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "flexpay_credit_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_card_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          card_id: string | null
          created_at: string
          id: string
          ip: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          card_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_card_audit_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "flexpay_virtual_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_credit_accounts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          currency: string
          email: string
          id: string
          max_tenure_months: number
          risk_rating: string
          status: string
          total_limit: number
          updated_at: string
          used_limit: number
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          email: string
          id?: string
          max_tenure_months?: number
          risk_rating?: string
          status?: string
          total_limit?: number
          updated_at?: string
          used_limit?: number
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          currency?: string
          email?: string
          id?: string
          max_tenure_months?: number
          risk_rating?: string
          status?: string
          total_limit?: number
          updated_at?: string
          used_limit?: number
          user_id?: string
        }
        Relationships: []
      }
      flexpay_credit_applications: {
        Row: {
          country: string | null
          created_at: string
          email: string
          employer: string | null
          full_name: string
          id: string
          monthly_income: number | null
          notes: string | null
          occupation: string | null
          phone: string | null
          purpose: string | null
          reference_no: string | null
          rejection_reason: string | null
          requested_limit: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          employer?: string | null
          full_name: string
          id?: string
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          purpose?: string | null
          reference_no?: string | null
          rejection_reason?: string | null
          requested_limit: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          employer?: string | null
          full_name?: string
          id?: string
          monthly_income?: number | null
          notes?: string | null
          occupation?: string | null
          phone?: string | null
          purpose?: string | null
          reference_no?: string | null
          rejection_reason?: string | null
          requested_limit?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      flexpay_emi_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          last_attempt_order_id: string | null
          late_fee: number
          paid_at: string | null
          paid_order_id: string | null
          plan_id: string
          processing_at: string | null
          sequence: number
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_order_id?: string | null
          late_fee?: number
          paid_at?: string | null
          paid_order_id?: string | null
          plan_id: string
          processing_at?: string | null
          sequence: number
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_order_id?: string | null
          late_fee?: number
          paid_at?: string | null
          paid_order_id?: string | null
          plan_id?: string
          processing_at?: string | null
          sequence?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_emi_installments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "flexpay_emi_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_emi_plans: {
        Row: {
          completed_at: string | null
          created_at: string
          currency: string
          down_payment: number
          financed_amount: number
          id: string
          monthly_amount: number
          order_id: string | null
          principal: number
          processing_fee: number
          started_at: string
          status: string
          tenure_months: number
          total_payable: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          currency?: string
          down_payment?: number
          financed_amount: number
          id?: string
          monthly_amount: number
          order_id?: string | null
          principal: number
          processing_fee?: number
          started_at?: string
          status?: string
          tenure_months: number
          total_payable: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          currency?: string
          down_payment?: number
          financed_amount?: number
          id?: string
          monthly_amount?: number
          order_id?: string | null
          principal?: number
          processing_fee?: number
          started_at?: string
          status?: string
          tenure_months?: number
          total_payable?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_emi_plans_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_kyc_verifications: {
        Row: {
          address_doc_url: string | null
          address_status: string
          application_id: string | null
          completed_at: string | null
          created_at: string
          expires_at: string | null
          face_status: string
          fraud_signals: Json | null
          id: string
          identity_doc_back_url: string | null
          identity_doc_front_url: string | null
          identity_doc_type: string | null
          identity_status: string
          match_score: number | null
          provider: string
          provider_payload: Json | null
          risk_status: string
          selfie_url: string | null
          token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address_doc_url?: string | null
          address_status?: string
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          face_status?: string
          fraud_signals?: Json | null
          id?: string
          identity_doc_back_url?: string | null
          identity_doc_front_url?: string | null
          identity_doc_type?: string | null
          identity_status?: string
          match_score?: number | null
          provider?: string
          provider_payload?: Json | null
          risk_status?: string
          selfie_url?: string | null
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address_doc_url?: string | null
          address_status?: string
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          face_status?: string
          fraud_signals?: Json | null
          id?: string
          identity_doc_back_url?: string | null
          identity_doc_front_url?: string | null
          identity_doc_type?: string | null
          identity_status?: string
          match_score?: number | null
          provider?: string
          provider_payload?: Json | null
          risk_status?: string
          selfie_url?: string | null
          token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_kyc_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "flexpay_credit_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_paylater_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          id: string
          net_terms_days: number
          order_id: string | null
          paid_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          net_terms_days: number
          order_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          net_terms_days?: number
          order_id?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_paylater_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      flexpay_settings: {
        Row: {
          allowed_tenures: number[]
          auto_approval_enabled: boolean
          auto_approval_max_limit: number
          card_auto_issue: boolean
          card_bin_prefix: string
          card_cvv_length: number
          card_default_daily_limit: number
          card_default_monthly_limit: number
          card_default_per_txn_limit: number
          card_default_weekly_limit: number
          card_expiry_months: number
          card_length: number
          card_max_cvv_regens: number
          credit_system_enabled: boolean
          default_currency: string
          down_payment_percent: number
          emi_enabled: boolean
          enabled: boolean
          id: number
          kyc_provider: string
          late_fee_amount: number
          max_credit_limit: number
          min_order_amount: number
          paylater_enabled: boolean
          paylater_terms: number[]
          processing_fee_percent: number
          tenure_fee_tiers: Json
          updated_at: string
        }
        Insert: {
          allowed_tenures?: number[]
          auto_approval_enabled?: boolean
          auto_approval_max_limit?: number
          card_auto_issue?: boolean
          card_bin_prefix?: string
          card_cvv_length?: number
          card_default_daily_limit?: number
          card_default_monthly_limit?: number
          card_default_per_txn_limit?: number
          card_default_weekly_limit?: number
          card_expiry_months?: number
          card_length?: number
          card_max_cvv_regens?: number
          credit_system_enabled?: boolean
          default_currency?: string
          down_payment_percent?: number
          emi_enabled?: boolean
          enabled?: boolean
          id?: number
          kyc_provider?: string
          late_fee_amount?: number
          max_credit_limit?: number
          min_order_amount?: number
          paylater_enabled?: boolean
          paylater_terms?: number[]
          processing_fee_percent?: number
          tenure_fee_tiers?: Json
          updated_at?: string
        }
        Update: {
          allowed_tenures?: number[]
          auto_approval_enabled?: boolean
          auto_approval_max_limit?: number
          card_auto_issue?: boolean
          card_bin_prefix?: string
          card_cvv_length?: number
          card_default_daily_limit?: number
          card_default_monthly_limit?: number
          card_default_per_txn_limit?: number
          card_default_weekly_limit?: number
          card_expiry_months?: number
          card_length?: number
          card_max_cvv_regens?: number
          credit_system_enabled?: boolean
          default_currency?: string
          down_payment_percent?: number
          emi_enabled?: boolean
          enabled?: boolean
          id?: number
          kyc_provider?: string
          late_fee_amount?: number
          max_credit_limit?: number
          min_order_amount?: number
          paylater_enabled?: boolean
          paylater_terms?: number[]
          processing_fee_percent?: number
          tenure_fee_tiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      flexpay_virtual_cards: {
        Row: {
          account_id: string
          bin: string
          card_number: string
          cardholder_name: string
          closed_at: string | null
          created_at: string
          cvv: string
          cvv_regen_count: number
          daily_limit: number
          exp_month: number
          exp_year: number
          failed_attempts: number
          frozen_at: string | null
          id: string
          issued_at: string
          last_seen_ip: string | null
          last4: string
          monthly_limit: number
          notes: string | null
          per_txn_limit: number
          replaced_card_id: string | null
          status: string
          theme: string
          tier: string
          updated_at: string
          user_id: string
          weekly_limit: number
        }
        Insert: {
          account_id: string
          bin: string
          card_number: string
          cardholder_name: string
          closed_at?: string | null
          created_at?: string
          cvv: string
          cvv_regen_count?: number
          daily_limit?: number
          exp_month: number
          exp_year: number
          failed_attempts?: number
          frozen_at?: string | null
          id?: string
          issued_at?: string
          last_seen_ip?: string | null
          last4: string
          monthly_limit?: number
          notes?: string | null
          per_txn_limit?: number
          replaced_card_id?: string | null
          status?: string
          theme?: string
          tier?: string
          updated_at?: string
          user_id: string
          weekly_limit?: number
        }
        Update: {
          account_id?: string
          bin?: string
          card_number?: string
          cardholder_name?: string
          closed_at?: string | null
          created_at?: string
          cvv?: string
          cvv_regen_count?: number
          daily_limit?: number
          exp_month?: number
          exp_year?: number
          failed_attempts?: number
          frozen_at?: string | null
          id?: string
          issued_at?: string
          last_seen_ip?: string | null
          last4?: string
          monthly_limit?: number
          notes?: string | null
          per_txn_limit?: number
          replaced_card_id?: string | null
          status?: string
          theme?: string
          tier?: string
          updated_at?: string
          user_id?: string
          weekly_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "flexpay_virtual_cards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "flexpay_credit_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          ip_address: string | null
          status: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          ip_address?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          ip_address?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      fx_orders: {
        Row: {
          base_amount: number
          base_currency: string
          cost_rate_usd: number
          cost_usd: number
          counterparty_contact: string | null
          counterparty_name: string | null
          created_at: string
          created_by: string | null
          fee_usd: number
          id: string
          notes: string | null
          order_date: string
          order_no: string | null
          payment_method_in: string | null
          payment_method_out: string | null
          profit_usd: number
          quote_amount: number
          quote_currency: string
          reference: string | null
          revenue_usd: number
          sell_rate_usd: number
          status: string
          updated_at: string
        }
        Insert: {
          base_amount: number
          base_currency: string
          cost_rate_usd?: number
          cost_usd?: number
          counterparty_contact?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          fee_usd?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_no?: string | null
          payment_method_in?: string | null
          payment_method_out?: string | null
          profit_usd?: number
          quote_amount: number
          quote_currency: string
          reference?: string | null
          revenue_usd?: number
          sell_rate_usd?: number
          status?: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          base_currency?: string
          cost_rate_usd?: number
          cost_usd?: number
          counterparty_contact?: string | null
          counterparty_name?: string | null
          created_at?: string
          created_by?: string | null
          fee_usd?: number
          id?: string
          notes?: string | null
          order_date?: string
          order_no?: string | null
          payment_method_in?: string | null
          payment_method_out?: string | null
          profit_usd?: number
          quote_amount?: number
          quote_currency?: string
          reference?: string | null
          revenue_usd?: number
          sell_rate_usd?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gsc_cache: {
        Row: {
          cache_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      hr_documents: {
        Row: {
          computed: Json
          created_at: string
          created_by: string | null
          doc_number: string | null
          effective_date: string | null
          employee_id: string
          id: string
          issue_date: string
          kind: string
          pdf_storage_path: string | null
          period_month: string | null
          sent_at: string | null
          sent_to_email: string | null
          snapshot: Json
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          computed?: Json
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          effective_date?: string | null
          employee_id: string
          id?: string
          issue_date?: string
          kind: string
          pdf_storage_path?: string | null
          period_month?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          snapshot?: Json
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          computed?: Json
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          effective_date?: string | null
          employee_id?: string
          id?: string
          issue_date?: string
          kind?: string
          pdf_storage_path?: string | null
          period_month?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          snapshot?: Json
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_request_events: {
        Row: {
          author_id: string | null
          author_role: string
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          request_id: string
        }
        Insert: {
          author_id?: string | null
          author_role: string
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          request_id: string
        }
        Update: {
          author_id?: string | null
          author_role?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_request_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "hr_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_requests: {
        Row: {
          attachments: Json
          category: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          details: string | null
          employee_id: string
          id: string
          metadata: Json
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          category: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: string | null
          employee_id: string
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          details?: string | null
          employee_id?: string
          id?: string
          metadata?: Json
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      id_card_assignments: {
        Row: {
          card_id: string
          company_short: string
          created_at: string
          id: string
          kind: string
          locked_at: string | null
          qr_payload: Json | null
          subject_email: string | null
          subject_key: string
          subject_name: string | null
        }
        Insert: {
          card_id: string
          company_short?: string
          created_at?: string
          id?: string
          kind: string
          locked_at?: string | null
          qr_payload?: Json | null
          subject_email?: string | null
          subject_key: string
          subject_name?: string | null
        }
        Update: {
          card_id?: string
          company_short?: string
          created_at?: string
          id?: string
          kind?: string
          locked_at?: string | null
          qr_payload?: Json | null
          subject_email?: string | null
          subject_key?: string
          subject_name?: string | null
        }
        Relationships: []
      }
      imap_poll_state: {
        Row: {
          folder: string
          id: number
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          last_uid: number
          updated_at: string
        }
        Insert: {
          folder?: string
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          last_uid?: number
          updated_at?: string
        }
        Update: {
          folder?: string
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          last_uid?: number
          updated_at?: string
        }
        Relationships: []
      }
      inbound_emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          cc_email: string | null
          created_at: string
          folder: string
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_archived: boolean
          is_read: boolean
          message_id: string | null
          metadata: Json
          order_id: string | null
          raw_size: number | null
          received_at: string
          reference_ids: string[] | null
          snippet: string | null
          subject: string | null
          ticket_id: string | null
          to_email: string | null
          uid: number | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          folder?: string
          from_email: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_read?: boolean
          message_id?: string | null
          metadata?: Json
          order_id?: string | null
          raw_size?: number | null
          received_at?: string
          reference_ids?: string[] | null
          snippet?: string | null
          subject?: string | null
          ticket_id?: string | null
          to_email?: string | null
          uid?: number | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          cc_email?: string | null
          created_at?: string
          folder?: string
          from_email?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_archived?: boolean
          is_read?: boolean
          message_id?: string | null
          metadata?: Json
          order_id?: string | null
          raw_size?: number | null
          received_at?: string
          reference_ids?: string[] | null
          snippet?: string | null
          subject?: string | null
          ticket_id?: string | null
          to_email?: string | null
          uid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      invest_leads: {
        Row: {
          admin_notes: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string
          full_name: string
          id: string
          investment_amount: number | null
          message: string | null
          metadata: Json
          phone: string | null
          plan_slug: string | null
          preferred_contact: string | null
          shares_requested: number | null
          status: string
          target_slug: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email: string
          full_name: string
          id?: string
          investment_amount?: number | null
          message?: string | null
          metadata?: Json
          phone?: string | null
          plan_slug?: string | null
          preferred_contact?: string | null
          shares_requested?: number | null
          status?: string
          target_slug?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          full_name?: string
          id?: string
          investment_amount?: number | null
          message?: string | null
          metadata?: Json
          phone?: string | null
          plan_slug?: string | null
          preferred_contact?: string | null
          shares_requested?: number | null
          status?: string
          target_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invest_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      investment_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          investment_id: string
          investor_id: string
          notes: string | null
          paid_at: string | null
          payout_type: string
          period_end: string | null
          period_start: string | null
          statement_pdf_path: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          investment_id: string
          investor_id: string
          notes?: string | null
          paid_at?: string | null
          payout_type?: string
          period_end?: string | null
          period_start?: string | null
          statement_pdf_path?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          investment_id?: string
          investor_id?: string
          notes?: string | null
          paid_at?: string | null
          payout_type?: string
          period_end?: string | null
          period_start?: string | null
          statement_pdf_path?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_payouts_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_plans: {
        Row: {
          allocated: number
          capacity: number | null
          created_at: string
          currency: string
          description: string | null
          highlights: Json
          id: string
          is_active: boolean
          is_featured: boolean
          lock_period_days: number
          max_amount: number | null
          min_amount: number
          name: string
          payout_frequency: string
          policy_text: string | null
          profit_share_percent: number
          risk_level: string
          roi_percent: number
          slug: string
          sort_order: number
          tagline: string | null
          tier: string
          updated_at: string
          withdrawal_policy: string | null
        }
        Insert: {
          allocated?: number
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          highlights?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          lock_period_days?: number
          max_amount?: number | null
          min_amount?: number
          name: string
          payout_frequency?: string
          policy_text?: string | null
          profit_share_percent?: number
          risk_level?: string
          roi_percent?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          tier?: string
          updated_at?: string
          withdrawal_policy?: string | null
        }
        Update: {
          allocated?: number
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          highlights?: Json
          id?: string
          is_active?: boolean
          is_featured?: boolean
          lock_period_days?: number
          max_amount?: number | null
          min_amount?: number
          name?: string
          payout_frequency?: string
          policy_text?: string | null
          profit_share_percent?: number
          risk_level?: string
          roi_percent?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          tier?: string
          updated_at?: string
          withdrawal_policy?: string | null
        }
        Relationships: []
      }
      investments: {
        Row: {
          agreement_pdf_path: string | null
          agreement_signed_at: string | null
          agreement_signed_by_name: string | null
          agreement_signed_ip: string | null
          agreement_status: string
          amount: number
          bank_details: Json | null
          bonus_percent_biannual: number | null
          created_at: string
          currency: string
          id: string
          investor_id: string
          lock_period_months: number | null
          metadata: Json
          monthly_return_percent: number | null
          notes: string | null
          payout_frequency: string | null
          plan_id: string | null
          plan_name: string
          plan_slug: string | null
          principal_return_at: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          agreement_pdf_path?: string | null
          agreement_signed_at?: string | null
          agreement_signed_by_name?: string | null
          agreement_signed_ip?: string | null
          agreement_status?: string
          amount: number
          bank_details?: Json | null
          bonus_percent_biannual?: number | null
          created_at?: string
          currency?: string
          id?: string
          investor_id: string
          lock_period_months?: number | null
          metadata?: Json
          monthly_return_percent?: number | null
          notes?: string | null
          payout_frequency?: string | null
          plan_id?: string | null
          plan_name: string
          plan_slug?: string | null
          principal_return_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_pdf_path?: string | null
          agreement_signed_at?: string | null
          agreement_signed_by_name?: string | null
          agreement_signed_ip?: string | null
          agreement_status?: string
          amount?: number
          bank_details?: Json | null
          bonus_percent_biannual?: number | null
          created_at?: string
          currency?: string
          id?: string
          investor_id?: string
          lock_period_months?: number | null
          metadata?: Json
          monthly_return_percent?: number | null
          notes?: string | null
          payout_frequency?: string | null
          plan_id?: string | null
          plan_name?: string
          plan_slug?: string | null
          principal_return_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_notifications: {
        Row: {
          body: string | null
          created_at: string
          email_sent: boolean
          id: string
          investment_id: string | null
          investor_id: string
          kind: string
          link: string | null
          metadata: Json
          payout_id: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          investment_id?: string | null
          investor_id: string
          kind: string
          link?: string | null
          metadata?: Json
          payout_id?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          investment_id?: string | null
          investor_id?: string
          kind?: string
          link?: string | null
          metadata?: Json
          payout_id?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          included_services: Json
          items: Json
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          included_services?: Json
          items?: Json
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          included_services?: Json
          items?: Json
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          admin_notes: string | null
          ats_contact_links: Json | null
          ats_detected_experience_years: number | null
          ats_detected_skills: string[] | null
          ats_detected_titles: string[] | null
          ats_education: string | null
          ats_highlights: string[] | null
          ats_match_level: string | null
          ats_matched_keywords: string[] | null
          ats_missing_keywords: string[] | null
          ats_recommendation: string | null
          ats_red_flags: string[] | null
          ats_resume_chars: number | null
          ats_scanned_at: string | null
          ats_score: number | null
          ats_summary: string | null
          career_id: string | null
          career_slug: string | null
          career_title: string | null
          country: string | null
          cover_letter: string | null
          created_at: string
          current_position: string | null
          email: string
          expected_salary: string | null
          experience_years: number | null
          full_name: string
          id: string
          ip_address: string | null
          linkedin_url: string | null
          metadata: Json
          phone: string | null
          portfolio_url: string | null
          resume_url: string | null
          source: string
          status: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          admin_notes?: string | null
          ats_contact_links?: Json | null
          ats_detected_experience_years?: number | null
          ats_detected_skills?: string[] | null
          ats_detected_titles?: string[] | null
          ats_education?: string | null
          ats_highlights?: string[] | null
          ats_match_level?: string | null
          ats_matched_keywords?: string[] | null
          ats_missing_keywords?: string[] | null
          ats_recommendation?: string | null
          ats_red_flags?: string[] | null
          ats_resume_chars?: number | null
          ats_scanned_at?: string | null
          ats_score?: number | null
          ats_summary?: string | null
          career_id?: string | null
          career_slug?: string | null
          career_title?: string | null
          country?: string | null
          cover_letter?: string | null
          created_at?: string
          current_position?: string | null
          email: string
          expected_salary?: string | null
          experience_years?: number | null
          full_name: string
          id?: string
          ip_address?: string | null
          linkedin_url?: string | null
          metadata?: Json
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          admin_notes?: string | null
          ats_contact_links?: Json | null
          ats_detected_experience_years?: number | null
          ats_detected_skills?: string[] | null
          ats_detected_titles?: string[] | null
          ats_education?: string | null
          ats_highlights?: string[] | null
          ats_match_level?: string | null
          ats_matched_keywords?: string[] | null
          ats_missing_keywords?: string[] | null
          ats_recommendation?: string | null
          ats_red_flags?: string[] | null
          ats_resume_chars?: number | null
          ats_scanned_at?: string | null
          ats_score?: number | null
          ats_summary?: string | null
          career_id?: string | null
          career_slug?: string | null
          career_title?: string | null
          country?: string | null
          cover_letter?: string | null
          created_at?: string
          current_position?: string | null
          email?: string
          expected_salary?: string | null
          experience_years?: number | null
          full_name?: string
          id?: string
          ip_address?: string | null
          linkedin_url?: string | null
          metadata?: Json
          phone?: string | null
          portfolio_url?: string | null
          resume_url?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_rank_history: {
        Row: {
          captured_at: string
          captured_for: string
          clicks: number
          ctr: number
          id: string
          impressions: number
          keyword_id: string
          position: number | null
          top_page: string | null
        }
        Insert: {
          captured_at?: string
          captured_for: string
          clicks?: number
          ctr?: number
          id?: string
          impressions?: number
          keyword_id: string
          position?: number | null
          top_page?: string | null
        }
        Update: {
          captured_at?: string
          captured_for?: string
          clicks?: number
          ctr?: number
          id?: string
          impressions?: number
          keyword_id?: string
          position?: number | null
          top_page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_rank_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "tracked_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_checkins: {
        Row: {
          goal_id: string
          id: string
          note: string | null
          recorded_at: string
          recorded_by: string | null
          value: number
        }
        Insert: {
          goal_id: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          value?: number
        }
        Update: {
          goal_id?: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_checkins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "kpi_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          id: string
          metric: string | null
          period_end: string | null
          period_start: string | null
          progress: number
          status: string
          target: number | null
          title: string
          unit: string | null
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          id?: string
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          progress?: number
          status?: string
          target?: number | null
          title: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          metric?: string | null
          period_end?: string | null
          period_start?: string | null
          progress?: number
          status?: string
          target?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      kyb_verifications: {
        Row: {
          business_type: string | null
          company_name: string
          country: string | null
          created_at: string
          didit_session_id: string | null
          id: string
          raw_data: Json | null
          registration_number: string | null
          status: string
          tax_id: string | null
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_url: string | null
          website: string | null
          workflow_id: string | null
        }
        Insert: {
          business_type?: string | null
          company_name: string
          country?: string | null
          created_at?: string
          didit_session_id?: string | null
          id?: string
          raw_data?: Json | null
          registration_number?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_url?: string | null
          website?: string | null
          workflow_id?: string | null
        }
        Update: {
          business_type?: string | null
          company_name?: string
          country?: string | null
          created_at?: string
          didit_session_id?: string | null
          id?: string
          raw_data?: Json | null
          registration_number?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_url?: string | null
          website?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          created_at: string
          didit_session_id: string | null
          id: string
          raw_data: Json | null
          status: string
          updated_at: string
          user_id: string
          verification_date: string | null
          verification_url: string | null
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          didit_session_id?: string | null
          id?: string
          raw_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          verification_date?: string | null
          verification_url?: string | null
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          didit_session_id?: string | null
          id?: string
          raw_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_date?: string | null
          verification_url?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          allotted: number
          carried_over: number
          employee_id: string
          id: string
          leave_type_id: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allotted?: number
          carried_over?: number
          employee_id: string
          id?: string
          leave_type_id: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allotted?: number
          carried_over?: number
          employee_id?: string
          id?: string
          leave_type_id?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string
          created_by: string | null
          days: number
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          employee_id: string
          from_date: string
          half_day: boolean
          id: string
          leave_type_id: string
          reason: string | null
          status: string
          to_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          days: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          employee_id: string
          from_date: string
          half_day?: boolean
          id?: string
          leave_type_id: string
          reason?: string | null
          status?: string
          to_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          days?: number
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          employee_id?: string
          from_date?: string
          half_day?: boolean
          id?: string
          leave_type_id?: string
          reason?: string | null
          status?: string
          to_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          code: string
          color: string | null
          created_at: string
          default_days_per_year: number
          description: string | null
          id: string
          is_active: boolean
          is_paid: boolean
          name: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          default_days_per_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          default_days_per_year?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_paid?: boolean
          name?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          source: string | null
          status: string
          subscribed_at: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          source?: string | null
          status?: string
          subscribed_at?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      office_locations: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_milestones: {
        Row: {
          amount: number
          child_order_id: string | null
          created_at: string
          currency: string
          id: string
          invoiced_at: string | null
          label: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          parent_order_id: string
          percent: number
          sequence: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          child_order_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoiced_at?: string | null
          label: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          parent_order_id: string
          percent: number
          sequence: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          child_order_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoiced_at?: string | null
          label?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          parent_order_id?: string
          percent?: number
          sequence?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: Json | null
          billing_cycle: string | null
          coupon_code: string | null
          created_at: string
          currency: string | null
          customer_email: string
          customer_name: string | null
          discount_amount: number
          id: string
          invoice_number: string | null
          is_recurring: boolean
          items: Json
          notes: string | null
          payment_gateway: string | null
          payment_verification: Json | null
          refund_reason: string | null
          refunded_amount: number
          refunded_at: string | null
          refunded_tax_amount: number
          service_brief: Json | null
          service_category: string | null
          status: string
          stripe_session_id: string | null
          subtotal: number | null
          tax_amount: number
          tax_label: string | null
          tax_mode: string | null
          tax_percent: number | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          billing_cycle?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          customer_email: string
          customer_name?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          items?: Json
          notes?: string | null
          payment_gateway?: string | null
          payment_verification?: Json | null
          refund_reason?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          refunded_tax_amount?: number
          service_brief?: Json | null
          service_category?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number | null
          tax_amount?: number
          tax_label?: string | null
          tax_mode?: string | null
          tax_percent?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          billing_cycle?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string
          customer_name?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean
          items?: Json
          notes?: string | null
          payment_gateway?: string | null
          payment_verification?: Json | null
          refund_reason?: string | null
          refunded_amount?: number
          refunded_at?: string | null
          refunded_tax_amount?: number
          service_brief?: Json | null
          service_category?: string | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number | null
          tax_amount?: number
          tax_label?: string | null
          tax_mode?: string | null
          tax_percent?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_adjustments: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          kind: string
          label: string
          note: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          kind: string
          label: string
          note?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          kind?: string
          label?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          item_id: string | null
          payload: Json
          run_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          payload?: Json
          run_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          payload?: Json
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_audit_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_audit_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          allowances_total: number
          attendance_absent: number
          attendance_late: number
          attendance_present: number
          base_salary: number
          breakdown: Json
          created_at: string
          currency: string
          deductions_total: number
          department: string | null
          designation: string | null
          employee_id: string
          employee_name: string
          id: string
          leave_paid_days: number
          leave_unpaid_days: number
          net_pay: number
          notes: string | null
          overtime_hours: number
          paid_amount: number
          paid_at: string | null
          payment_method: string | null
          prorate_deduction: number
          prorate_factor: number
          run_id: string
          status: string
          tax: number
          taxable_income: number
          updated_at: string
        }
        Insert: {
          allowances_total?: number
          attendance_absent?: number
          attendance_late?: number
          attendance_present?: number
          base_salary?: number
          breakdown?: Json
          created_at?: string
          currency?: string
          deductions_total?: number
          department?: string | null
          designation?: string | null
          employee_id: string
          employee_name: string
          id?: string
          leave_paid_days?: number
          leave_unpaid_days?: number
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          prorate_deduction?: number
          prorate_factor?: number
          run_id: string
          status?: string
          tax?: number
          taxable_income?: number
          updated_at?: string
        }
        Update: {
          allowances_total?: number
          attendance_absent?: number
          attendance_late?: number
          attendance_present?: number
          base_salary?: number
          breakdown?: Json
          created_at?: string
          currency?: string
          deductions_total?: number
          department?: string | null
          designation?: string | null
          employee_id?: string
          employee_name?: string
          id?: string
          leave_paid_days?: number
          leave_unpaid_days?: number
          net_pay?: number
          notes?: string | null
          overtime_hours?: number
          paid_amount?: number
          paid_at?: string | null
          payment_method?: string | null
          prorate_deduction?: number
          prorate_factor?: number
          run_id?: string
          status?: string
          tax?: number
          taxable_income?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_payslips: {
        Row: {
          id: string
          issued_at: string
          item_id: string
          meta: Json
          payslip_number: string | null
          pdf_url: string | null
        }
        Insert: {
          id?: string
          issued_at?: string
          item_id: string
          meta?: Json
          payslip_number?: string | null
          pdf_url?: string | null
        }
        Update: {
          id?: string
          issued_at?: string
          item_id?: string
          meta?: Json
          payslip_number?: string | null
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_payslips_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          locked: boolean
          notes: string | null
          paid_at: string | null
          period_month: number
          period_start: string | null
          period_year: number
          status: string
          totals: Json
          updated_at: string
          working_days: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          locked?: boolean
          notes?: string | null
          paid_at?: string | null
          period_month: number
          period_start?: string | null
          period_year: number
          status?: string
          totals?: Json
          updated_at?: string
          working_days?: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          locked?: boolean
          notes?: string | null
          paid_at?: string | null
          period_month?: number
          period_start?: string | null
          period_year?: number
          status?: string
          totals?: Json
          updated_at?: string
          working_days?: number
        }
        Relationships: []
      }
      payroll_salary_history: {
        Row: {
          base_salary: number
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          increment_pct: number | null
          reason: string | null
        }
        Insert: {
          base_salary: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          increment_pct?: number | null
          reason?: string | null
        }
        Update: {
          base_salary?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          increment_pct?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_salary_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          cycle: string
          employee_id: string
          goals: string | null
          id: string
          improvements: string | null
          manager_id: string | null
          overall_rating: number | null
          ratings: Json
          status: string
          strengths: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          cycle: string
          employee_id: string
          goals?: string | null
          id?: string
          improvements?: string | null
          manager_id?: string | null
          overall_rating?: number | null
          ratings?: Json
          status?: string
          strengths?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          cycle?: string
          employee_id?: string
          goals?: string | null
          id?: string
          improvements?: string | null
          manager_id?: string | null
          overall_rating?: number | null
          ratings?: Json
          status?: string
          strengths?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          alt_text: string | null
          category: string
          client_name: string | null
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          project_url: string | null
          slug: string
          sort_order: number
          technologies: string[] | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          category?: string
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          project_url?: string | null
          slug: string
          sort_order?: number
          technologies?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          category?: string
          client_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          project_url?: string | null
          slug?: string
          sort_order?: number
          technologies?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_urls: {
        Row: {
          created_at: string
          description: string | null
          external_url: string
          id: string
          internal_path: string | null
          is_active: boolean
          key: string
          label: string
          open_in_new_tab: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url: string
          id?: string
          internal_path?: string | null
          is_active?: boolean
          key: string
          label: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string
          id?: string
          internal_path?: string | null
          is_active?: boolean
          key?: string
          label?: string
          open_in_new_tab?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_addons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          period: string
          price_usd: number
          service_slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          period?: string
          price_usd?: number
          service_slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          period?: string
          price_usd?: number
          service_slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_pricing: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          quote_settings: Json
          service_slug: string
          service_title: string
          tiers: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          quote_settings?: Json
          service_slug: string
          service_title?: string
          tiers?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          quote_settings?: Json
          service_slug?: string
          service_title?: string
          tiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      service_renewals: {
        Row: {
          amount: number | null
          attempted_at: string
          customer_service_id: string
          id: string
          metadata: Json
          notes: string | null
          outcome: string
        }
        Insert: {
          amount?: number | null
          attempted_at?: string
          customer_service_id: string
          id?: string
          metadata?: Json
          notes?: string | null
          outcome: string
        }
        Update: {
          amount?: number | null
          attempted_at?: string
          customer_service_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
          outcome?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_renewals_customer_service_id_fkey"
            columns: ["customer_service_id"]
            isOneToOne: false
            referencedRelation: "customer_services"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          employee_id: string
          ends_at: string
          id: string
          label: string | null
          notes: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          ends_at: string
          id?: string
          label?: string | null
          notes?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          ends_at?: string
          id?: string
          label?: string | null
          notes?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          last_reply_at: string
          last_reply_by: string
          metadata: Json
          order_id: string | null
          priority: string
          status: string
          subject: string
          ticket_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          last_reply_at?: string
          last_reply_by?: string
          metadata?: Json
          order_id?: string | null
          priority?: string
          status?: string
          subject: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          last_reply_at?: string
          last_reply_by?: string
          metadata?: Json
          order_id?: string | null
          priority?: string
          status?: string
          subject?: string
          ticket_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json
          reason: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json
          reason?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json
          reason?: string
          source?: string | null
        }
        Relationships: []
      }
      tax_brackets: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          label: string
          lower_bound: number
          percent: number
          updated_at: string
          upper_bound: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          label: string
          lower_bound?: number
          percent?: number
          updated_at?: string
          upper_bound?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          label?: string
          lower_bound?: number
          percent?: number
          updated_at?: string
          upper_bound?: number | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_email: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_email?: string | null
          sender_name?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_email?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tracked_keywords: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          device: string | null
          id: string
          is_active: boolean
          keyword: string
          notes: string | null
          site_url: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          device?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          notes?: string | null
          site_url?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          device?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
          notes?: string | null
          site_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      usa_state_pricing: {
        Row: {
          abbr: string
          corp_annual: number
          corp_annual_label: string
          corp_formation: number
          corp_renewal: number
          created_at: string
          franchise_tax: string | null
          id: string
          is_active: boolean
          llc_annual: number
          llc_annual_label: string
          llc_formation: number
          llc_renewal: number
          notes: string | null
          sort_order: number
          state: string
          state_tax_note: string | null
          updated_at: string
        }
        Insert: {
          abbr: string
          corp_annual?: number
          corp_annual_label?: string
          corp_formation?: number
          corp_renewal?: number
          created_at?: string
          franchise_tax?: string | null
          id?: string
          is_active?: boolean
          llc_annual?: number
          llc_annual_label?: string
          llc_formation?: number
          llc_renewal?: number
          notes?: string | null
          sort_order?: number
          state: string
          state_tax_note?: string | null
          updated_at?: string
        }
        Update: {
          abbr?: string
          corp_annual?: number
          corp_annual_label?: string
          corp_formation?: number
          corp_renewal?: number
          created_at?: string
          franchise_tax?: string | null
          id?: string
          is_active?: boolean
          llc_annual?: number
          llc_annual_label?: string
          llc_formation?: number
          llc_renewal?: number
          notes?: string | null
          sort_order?: number
          state?: string
          state_tax_note?: string | null
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_details: Json
          created_at: string
          currency: string
          id: string
          investment_id: string | null
          investor_id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_details?: Json
          created_at?: string
          currency?: string
          id?: string
          investment_id?: string | null
          investor_id: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_details?: Json
          created_at?: string
          currency?: string
          id?: string
          investment_id?: string | null
          investor_id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _fmt_money: {
        Args: { _amount: number; _currency: string }
        Returns: string
      }
      _payroll_log: {
        Args: { _action: string; _item: string; _payload: Json; _run: string }
        Returns: undefined
      }
      admin_lookup_account_by_phone: {
        Args: { _phone: string }
        Returns: {
          email: string
          full_name: string
          source: string
          user_id: string
        }[]
      }
      cancel_own_order: { Args: { _order_id: string }; Returns: Json }
      claim_order_to_account: {
        Args: { _email: string; _invoice: string; _phone: string }
        Returns: Json
      }
      compute_period_end: {
        Args: { _cycle: string; _from: string }
        Returns: string
      }
      current_employee_id: { Args: never; Returns: string }
      dynime_reset_tables: { Args: never; Returns: Json }
      flexpay_admin_set_used_limit: {
        Args: { _account_id: string; _new_used_limit: number }
        Returns: undefined
      }
      flexpay_admin_update_installment: {
        Args: {
          _amount?: number
          _due_date?: string
          _installment_id: string
          _status?: string
        }
        Returns: undefined
      }
      flexpay_approve_application: {
        Args: {
          _app_id: string
          _limit: number
          _max_tenure: number
          _risk_rating?: string
        }
        Returns: string
      }
      flexpay_checkout: {
        Args: {
          _billing_address?: Json
          _coupon_code?: string
          _currency?: string
          _customer_email: string
          _customer_name: string
          _discount_amount?: number
          _down_payment?: number
          _items: Json
          _notes?: string
          _service_brief?: Json
          _service_category?: string
          _subtotal: number
          _tax_amount?: number
          _tax_label?: string
          _tax_mode?: string
          _tax_percent?: number
          _tenure_months: number
          _total: number
        }
        Returns: Json
      }
      flexpay_create_emi_plan: {
        Args: {
          _currency?: string
          _down_payment?: number
          _order_id?: string
          _principal: number
          _tenure_months: number
        }
        Returns: Json
      }
      flexpay_generate_app_reference: { Args: never; Returns: string }
      flexpay_generate_card_number: {
        Args: { _bin?: string; _length?: number }
        Returns: string
      }
      flexpay_generate_cvv: { Args: { _length?: number }; Returns: string }
      flexpay_issue_virtual_card: {
        Args: { _account_id: string }
        Returns: string
      }
      flexpay_log_cvv_view: { Args: { _card_id: string }; Returns: undefined }
      flexpay_luhn_checksum: { Args: { _digits: string }; Returns: number }
      flexpay_mark_installment_failed: {
        Args: { _installment_id: string; _order_id?: string; _reason?: string }
        Returns: undefined
      }
      flexpay_mark_installment_processing: {
        Args: { _installment_id: string; _order_id?: string }
        Returns: undefined
      }
      flexpay_pay_installment: {
        Args: { _installment_id: string; _order_id: string }
        Returns: Json
      }
      flexpay_reissue_card: { Args: { _card_id: string }; Returns: string }
      flexpay_set_card_freeze: {
        Args: { _card_id: string; _freeze: boolean }
        Returns: undefined
      }
      generate_next_milestone_invoice: {
        Args: { _milestone_id: string }
        Returns: string
      }
      get_career_stats: {
        Args: { _slug: string }
        Returns: {
          applicant_count: number
          view_count: number
        }[]
      }
      get_chat_messages: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_name: string
          sender_type: string
          session_id: string
        }[]
      }
      get_invoice_by_number: {
        Args: { _invoice: string }
        Returns: {
          billing_address: Json
          coupon_code: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          discount_amount: number
          id: string
          invoice_number: string
          items: Json
          notes: string
          payment_gateway: string
          service_brief: Json
          status: string
          stripe_session_id: string
          subtotal: number
          tax_amount: number
          tax_label: string
          tax_mode: string
          tax_percent: number
          total: number
          updated_at: string
        }[]
      }
      get_order_status_by_session: {
        Args: { _session_id: string }
        Returns: {
          created_at: string
          customer_email: string
          customer_name: string
          id: string
          items: Json
          payment_verification: Json
          status: string
          total: number
          updated_at: string
        }[]
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
      increment_blog_view: { Args: { _slug: string }; Returns: number }
      increment_career_view: { Args: { _slug: string }; Returns: number }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      list_team_card_ids: {
        Args: never
        Returns: {
          card_id: string
          subject_key: string
        }[]
      }
      lookup_order_for_tracking: {
        Args: { _term: string }
        Returns: {
          created_at: string
          currency: string
          id: string
          invoice_number: string
          items: Json
          status: string
          total: number
          updated_at: string
        }[]
      }
      mark_payroll_run_paid: { Args: { _run_id: string }; Returns: undefined }
      payroll_add_adjustment: {
        Args: {
          _amount: number
          _category: string
          _item: string
          _kind: string
          _label: string
          _note?: string
        }
        Returns: string
      }
      payroll_approve_run: { Args: { _run: string }; Returns: undefined }
      payroll_cancel_item: {
        Args: { _item: string; _reason?: string }
        Returns: undefined
      }
      payroll_compute_tax: {
        Args: { _amount: number; _currency: string; _on: string }
        Returns: number
      }
      payroll_ensure_current_month: {
        Args: { _currency?: string; _working_days?: number }
        Returns: string
      }
      payroll_generate_run: {
        Args: {
          _currency?: string
          _employee_ids?: string[]
          _month: number
          _replace?: boolean
          _working_days?: number
          _year: number
        }
        Returns: string
      }
      payroll_lock_run: {
        Args: { _lock?: boolean; _run: string }
        Returns: undefined
      }
      payroll_mark_paid: {
        Args: { _item_ids?: string[]; _method?: string; _run: string }
        Returns: undefined
      }
      payroll_mark_partial_paid: {
        Args: { _amount: number; _item: string; _method?: string }
        Returns: undefined
      }
      payroll_recompute_totals: { Args: { _run: string }; Returns: undefined }
      payroll_resolve_salary: {
        Args: { _emp: string; _on: string }
        Returns: number
      }
      payroll_sync_run: { Args: { _run: string }; Returns: number }
      payroll_update_item: {
        Args: { _item: string; _note?: string; _patch: Json }
        Returns: undefined
      }
      payroll_v2_resolve_salary: {
        Args: { _employee_id: string; _month: number; _year: number }
        Returns: Json
      }
      recompute_crm_lead_scores: { Args: never; Returns: number }
      redeem_coupon: { Args: { _code: string }; Returns: boolean }
      sanitize_html_basic: { Args: { _html: string }; Returns: string }
      sync_my_profile_email: { Args: never; Returns: Json }
      update_payroll_item: {
        Args: {
          _allowances_total: number
          _deductions_total: number
          _gross_salary: number
          _item_id: string
          _net_pay: number
          _note?: string
          _tax: number
        }
        Returns: undefined
      }
      validate_coupon: {
        Args: { _code: string; _order_total: number }
        Returns: Json
      }
      verify_id_card: {
        Args: { _card_id: string }
        Returns: {
          card_id: string
          kind: string
          qr_payload: Json
          subject_key: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "manager"
        | "editor"
        | "support"
        | "hr"
        | "sales"
        | "investor"
        | "employee"
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
        "super_admin",
        "manager",
        "editor",
        "support",
        "hr",
        "sales",
        "investor",
        "employee",
      ],
    },
  },
} as const
