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
      activity_proposal_votes: {
        Row: {
          created_at: string
          proposal_id: string
          value: boolean
          voter_id: string
        }
        Insert: {
          created_at?: string
          proposal_id: string
          value: boolean
          voter_id: string
        }
        Update: {
          created_at?: string
          proposal_id?: string
          value?: boolean
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_proposal_votes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "activity_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_proposal_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_proposals: {
        Row: {
          activity: string
          created_at: string
          group_id: string
          id: string
          requested_by: string | null
          resolved_at: string | null
          started_by: string
          status: string
        }
        Insert: {
          activity: string
          created_at?: string
          group_id: string
          id?: string
          requested_by?: string | null
          resolved_at?: string | null
          started_by: string
          status?: string
        }
        Update: {
          activity?: string
          created_at?: string
          group_id?: string
          id?: string
          requested_by?: string | null
          resolved_at?: string | null
          started_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_proposals_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_proposals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_proposals_started_by_fkey"
            columns: ["started_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blames: {
        Row: {
          created_at: string
          group_id: string
          id: string
          session_id: string
          settled: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          session_id: string
          settled?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          session_id?: string
          settled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blames_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blames_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_champions: {
        Row: {
          created_at: string
          group_id: string
          rate: number | null
          user_id: string
          validated: number | null
        }
        Insert: {
          created_at?: string
          group_id: string
          rate?: number | null
          user_id: string
          validated?: number | null
        }
        Update: {
          created_at?: string
          group_id?: string
          rate?: number | null
          user_id?: string
          validated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_champions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_champions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      excuses: {
        Row: {
          created_at: string
          excuse_type: Database["public"]["Enums"]["excuse_type"]
          group_id: string
          id: string
          justification_url: string | null
          reason: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["excuse_status"]
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          excuse_type: Database["public"]["Enums"]["excuse_type"]
          group_id: string
          id?: string
          justification_url?: string | null
          reason: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["excuse_status"]
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          excuse_type?: Database["public"]["Enums"]["excuse_type"]
          group_id?: string
          id?: string
          justification_url?: string | null
          reason?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["excuse_status"]
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "excuses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          left_at: string | null
          penalty_amount: number | null
          role: Database["public"]["Enums"]["member_role"]
          target_locked: boolean
          user_id: string
          weekly_target: number
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          penalty_amount?: number | null
          role?: Database["public"]["Enums"]["member_role"]
          target_locked?: boolean
          user_id: string
          weekly_target: number
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          penalty_amount?: number | null
          role?: Database["public"]["Enums"]["member_role"]
          target_locked?: boolean
          user_id?: string
          weekly_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          accepted_activities: Json
          badges_finalized_at: string | null
          blame_threshold: number
          challenge_end: string
          challenge_start: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          interests: Json
          invite_code: string
          location_label: string | null
          location_lat: number | null
          location_lng: number | null
          max_excuses: number | null
          max_members: number
          max_sessions_per_day: number | null
          min_duration_min: number
          name: string
          penalty_amount: number
          photo_url: string | null
          publication_deadline: Database["public"]["Enums"]["deadline_type"]
          status: Database["public"]["Enums"]["group_status"]
          updated_at: string
          vote_deadline: Database["public"]["Enums"]["deadline_type"]
        }
        Insert: {
          accepted_activities?: Json
          badges_finalized_at?: string | null
          blame_threshold?: number
          challenge_end: string
          challenge_start: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          interests?: Json
          invite_code: string
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_excuses?: number | null
          max_members?: number
          max_sessions_per_day?: number | null
          min_duration_min?: number
          name: string
          penalty_amount: number
          photo_url?: string | null
          publication_deadline?: Database["public"]["Enums"]["deadline_type"]
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          vote_deadline?: Database["public"]["Enums"]["deadline_type"]
        }
        Update: {
          accepted_activities?: Json
          badges_finalized_at?: string | null
          blame_threshold?: number
          challenge_end?: string
          challenge_start?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          interests?: Json
          invite_code?: string
          location_label?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_excuses?: number | null
          max_members?: number
          max_sessions_per_day?: number | null
          min_duration_min?: number
          name?: string
          penalty_amount?: number
          photo_url?: string | null
          publication_deadline?: Database["public"]["Enums"]["deadline_type"]
          status?: Database["public"]["Enums"]["group_status"]
          updated_at?: string
          vote_deadline?: Database["public"]["Enums"]["deadline_type"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jokers: {
        Row: {
          consumed_at: string | null
          created_at: string
          group_id: string
          id: string
          month_start: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          group_id: string
          id?: string
          month_start: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          group_id?: string
          id?: string
          month_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jokers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jokers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_group_progress: {
        Row: {
          best_streak: number
          current_streak: number
          group_id: string
          last_processed_week: string | null
          last_success_week: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          group_id: string
          last_processed_week?: string | null
          last_success_week?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          group_id?: string
          last_processed_week?: string | null
          last_success_week?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_group_progress_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_group_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_penalty_changes: {
        Row: {
          created_at: string
          group_id: string
          group_member_id: string
          id: string
          new_amount: number
          old_amount: number | null
          requested_by: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          group_member_id: string
          id?: string
          new_amount: number
          old_amount?: number | null
          requested_by: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          group_member_id?: string
          id?: string
          new_amount?: number
          old_amount?: number | null
          requested_by?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_penalty_changes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_penalty_changes_group_member_id_fkey"
            columns: ["group_member_id"]
            isOneToOne: false
            referencedRelation: "group_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_penalty_changes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_weekly_outcomes: {
        Row: {
          effective_target: number
          finalized_at: string
          group_id: string
          initial_target: number
          joker_used: boolean
          major_excuse: boolean
          neutral_reason: string | null
          standard_excuses: number
          status: string
          user_id: string
          validated_sessions: number
          week_start: string
        }
        Insert: {
          effective_target: number
          finalized_at?: string
          group_id: string
          initial_target: number
          joker_used?: boolean
          major_excuse?: boolean
          neutral_reason?: string | null
          standard_excuses?: number
          status: string
          user_id: string
          validated_sessions: number
          week_start: string
        }
        Update: {
          effective_target?: number
          finalized_at?: string
          group_id?: string
          initial_target?: number
          joker_used?: boolean
          major_excuse?: boolean
          neutral_reason?: string | null
          standard_excuses?: number
          status?: string
          user_id?: string
          validated_sessions?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_weekly_outcomes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_weekly_outcomes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      penalties: {
        Row: {
          amount: number
          created_at: string
          group_id: string
          id: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          related_session_id: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          created_at?: string
          group_id: string
          id?: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          related_session_id?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          created_at?: string
          group_id?: string
          id?: string
          penalty_type?: Database["public"]["Enums"]["penalty_type"]
          related_session_id?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalties_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pot_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_paid: boolean
          marked_by: string | null
          notes: string | null
          paid_at: string | null
          pot_id: string
          related_penalty_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          notes?: string | null
          paid_at?: string | null
          pot_id: string
          related_penalty_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_paid?: boolean
          marked_by?: string | null
          notes?: string | null
          paid_at?: string | null
          pot_id?: string
          related_penalty_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pot_transactions_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_transactions_pot_id_fkey"
            columns: ["pot_id"]
            isOneToOne: false
            referencedRelation: "pots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_transactions_related_penalty_id_fkey"
            columns: ["related_penalty_id"]
            isOneToOne: false
            referencedRelation: "penalties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pot_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pots: {
        Row: {
          created_at: string
          group_id: string
          id: string
          status: string
          total_amount: number
          unlocked_at: string | null
          updated_at: string
          usage_date: string | null
          usage_description: string | null
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          status?: string
          total_amount?: number
          unlocked_at?: string | null
          updated_at?: string
          usage_date?: string | null
          usage_description?: string | null
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          status?: string
          total_amount?: number
          unlocked_at?: string | null
          updated_at?: string
          usage_date?: string | null
          usage_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_acceptances: {
        Row: {
          accepted_at: string
          group_id: string
          id: string
          ip_address: unknown
          rules_snapshot: Json
          user_id: string
        }
        Insert: {
          accepted_at?: string
          group_id: string
          id?: string
          ip_address?: unknown
          rules_snapshot: Json
          user_id: string
        }
        Update: {
          accepted_at?: string
          group_id?: string
          id?: string
          ip_address?: unknown
          rules_snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rule_acceptances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rule_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_day_grants: {
        Row: {
          day: string
          extra: number
          granted_by: string | null
          group_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          day: string
          extra?: number
          granted_by?: string | null
          group_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          day?: string
          extra?: number
          granted_by?: string | null
          group_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_day_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_day_grants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_day_grants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      session_proofs: {
        Row: {
          captured_at: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          latitude: number | null
          longitude: number | null
          media_url: string | null
          proof_type: Database["public"]["Enums"]["proof_type"]
          session_id: string
          strava_data: Json | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_url?: string | null
          proof_type: Database["public"]["Enums"]["proof_type"]
          session_id: string
          strava_data?: Json | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          media_url?: string | null
          proof_type?: Database["public"]["Enums"]["proof_type"]
          session_id?: string
          strava_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "session_proofs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          activity_type: string
          comment: string | null
          distance_km: number | null
          duration_min: number
          group_id: string
          id: string
          performed_at: string
          published_at: string
          shared_id: string
          status: Database["public"]["Enums"]["session_status"]
          user_id: string
          validated_at: string | null
          week_start: string
        }
        Insert: {
          activity_type: string
          comment?: string | null
          distance_km?: number | null
          duration_min: number
          group_id: string
          id?: string
          performed_at: string
          published_at?: string
          shared_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id: string
          validated_at?: string | null
          week_start: string
        }
        Update: {
          activity_type?: string
          comment?: string | null
          distance_km?: number | null
          duration_min?: number
          group_id?: string
          id?: string
          performed_at?: string
          published_at?: string
          shared_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string
          validated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suspensions: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          end_date: string
          group_id: string
          id: string
          origin: string
          reason: string | null
          requested_by: string | null
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          end_date: string
          group_id: string
          id?: string
          origin: string
          reason?: string | null
          requested_by?: string | null
          start_date: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_comment?: string | null
          end_date?: string
          group_id?: string
          id?: string
          origin?: string
          reason?: string | null
          requested_by?: string | null
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspensions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suspensions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          group_id: string | null
          id: string
          metadata: Json
          seen_at: string | null
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          group_id?: string | null
          id?: string
          metadata?: Json
          seen_at?: string | null
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          group_id?: string | null
          id?: string
          metadata?: Json
          seen_at?: string | null
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          created_at: string
          email: string
          expo_push_token: string | null
          first_name: string | null
          id: string
          is_searchable: boolean
          last_name: string | null
          notification_prefs: Json
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          expo_push_token?: string | null
          first_name?: string | null
          id: string
          is_searchable?: boolean
          last_name?: string | null
          notification_prefs?: Json
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_icon?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          expo_push_token?: string | null
          first_name?: string | null
          id?: string
          is_searchable?: boolean
          last_name?: string | null
          notification_prefs?: Json
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          comment: string | null
          created_at: string
          excuse_id: string | null
          id: string
          session_id: string | null
          vote_value: boolean
          voter_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          excuse_id?: string | null
          id?: string
          session_id?: string | null
          vote_value: boolean
          voter_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          excuse_id?: string | null
          id?: string
          session_id?: string | null
          vote_value?: boolean
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_excuse_id_fkey"
            columns: ["excuse_id"]
            isOneToOne: false
            referencedRelation: "excuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_closures: {
        Row: {
          closed_at: string
          group_id: string
          week_start: string
        }
        Insert: {
          closed_at?: string
          group_id: string
          week_start: string
        }
        Update: {
          closed_at?: string
          group_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_closures_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          created_at: string
          group_id: string
          id: string
          planned_days: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          planned_days?: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          planned_days?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_member_unsettled_blames: {
        Row: {
          group_id: string | null
          unsettled_blame_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blames_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blames_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      v_member_weekly_status: {
        Row: {
          group_id: string | null
          pending_sessions: number | null
          rejected_sessions: number | null
          remaining_sessions: number | null
          user_id: string | null
          validated_sessions: number | null
          week_start: string | null
          weekly_target: number | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: {
        Args: {
          p_invitation_id: string
          p_penalty_amount?: number
          p_weekly_target: number
        }
        Returns: string
      }
      add_group_activity: {
        Args: {
          p_activity: string
          p_group_id: string
          p_requester_id?: string
        }
        Returns: Json
      }
      admin_suspend_member: {
        Args: {
          p_end: string
          p_group_id: string
          p_reason?: string
          p_start: string
          p_user_id: string
        }
        Returns: string
      }
      apply_session_blames: { Args: { p_session_id: string }; Returns: number }
      award_progress_badges: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      award_session_badges: { Args: { p_user_id: string }; Returns: undefined }
      award_streak_badges: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      backfill_weekly_outcomes: {
        Args: { p_group_id?: string }
        Returns: number
      }
      cancel_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      cancel_suspension: {
        Args: { p_suspension_id: string }
        Returns: undefined
      }
      cast_activity_vote: {
        Args: { p_proposal_id: string; p_value: boolean }
        Returns: string
      }
      cast_excuse_vote: {
        Args: { p_comment?: string; p_excuse_id: string; p_value: boolean }
        Returns: string
      }
      cast_vote: {
        Args: { p_comment?: string; p_session_id: string; p_value: boolean }
        Returns: string
      }
      celebrate_weekly_objective: {
        Args: { p_group_id: string; p_user_id: string; p_week_start: string }
        Returns: undefined
      }
      close_group_week: {
        Args: { p_group_id: string; p_week_start: string }
        Returns: number
      }
      complete_expired_challenges: { Args: never; Returns: number }
      daily_session_allowance: {
        Args: { p_day: string; p_group_id: string; p_user_id: string }
        Returns: number
      }
      decide_suspension: {
        Args: { p_accept: boolean; p_comment?: string; p_suspension_id: string }
        Returns: string
      }
      declare_session: {
        Args: {
          p_activity_type: string
          p_comment?: string
          p_distance_km?: number
          p_duration_min: number
          p_group_id: string
          p_performed_at: string
        }
        Returns: string
      }
      delete_account_internal: {
        Args: { p_delete_auth?: boolean; p_user_id: string }
        Returns: string
      }
      delete_group: { Args: { p_group_id: string }; Returns: undefined }
      delete_my_account: { Args: never; Returns: string }
      dev_reset_excuse_joker: { Args: { p_group_id: string }; Returns: string }
      finalize_challenge_badges: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      get_group_cagnotte: {
        Args: { p_group_id: string }
        Returns: {
          avatar_color: string
          avatar_icon: string
          avatar_url: string
          first_name: string
          is_paid: boolean
          last_name: string
          paid_amount: number
          penalty_count: number
          role: Database["public"]["Enums"]["member_role"]
          total_amount: number
          user_id: string
          username: string
        }[]
      }
      get_group_dashboard: {
        Args: { p_group_id: string }
        Returns: {
          accepted_activities: Json
          badges_finalized_at: string | null
          blame_threshold: number
          challenge_end: string
          challenge_start: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          interests: Json
          invite_code: string
          location_label: string | null
          location_lat: number | null
          location_lng: number | null
          max_excuses: number | null
          max_members: number
          max_sessions_per_day: number | null
          min_duration_min: number
          name: string
          penalty_amount: number
          photo_url: string | null
          publication_deadline: Database["public"]["Enums"]["deadline_type"]
          status: Database["public"]["Enums"]["group_status"]
          updated_at: string
          vote_deadline: Database["public"]["Enums"]["deadline_type"]
        }[]
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_group_invitations: {
        Args: { p_group_id: string }
        Returns: {
          avatar_color: string
          avatar_icon: string
          avatar_url: string
          created_at: string
          first_name: string
          id: string
          invited_user_id: string
          last_name: string
          resolved_at: string
          status: string
          username: string
        }[]
      }
      get_group_members: {
        Args: { p_group_id: string }
        Returns: {
          avatar_color: string
          avatar_icon: string
          avatar_url: string
          first_name: string
          id: string
          joined_at: string
          last_name: string
          penalty_amount: number
          role: Database["public"]["Enums"]["member_role"]
          target_locked: boolean
          user_id: string
          username: string
          weekly_target: number
        }[]
      }
      get_group_preview_by_code: {
        Args: { p_code: string }
        Returns: {
          accepted_activities: Json
          blame_threshold: number
          challenge_end: string
          challenge_start: string
          description: string
          id: string
          max_excuses: number
          max_members: number
          member_count: number
          min_duration_min: number
          name: string
          penalty_amount: number
          photo_url: string
          publication_deadline: Database["public"]["Enums"]["deadline_type"]
          status: Database["public"]["Enums"]["group_status"]
          vote_deadline: Database["public"]["Enums"]["deadline_type"]
        }[]
      }
      get_group_preview_by_id: {
        Args: { p_group_id: string }
        Returns: {
          accepted_activities: Json
          blame_threshold: number
          challenge_end: string
          challenge_start: string
          description: string
          id: string
          max_excuses: number
          max_members: number
          member_count: number
          min_duration_min: number
          name: string
          penalty_amount: number
          photo_url: string
          publication_deadline: Database["public"]["Enums"]["deadline_type"]
          status: Database["public"]["Enums"]["group_status"]
          vote_deadline: Database["public"]["Enums"]["deadline_type"]
        }[]
      }
      get_group_streak: {
        Args: { p_group_id: string }
        Returns: {
          best_streak: number
          current_streak: number
          current_week_completed: boolean
          remaining_sessions: number
        }[]
      }
      get_group_suspensions: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_comment: string | null
          end_date: string
          group_id: string
          id: string
          origin: string
          reason: string | null
          requested_by: string | null
          start_date: string
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "suspensions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_groups: {
        Args: never
        Returns: {
          challenge_end: string
          challenge_start: string
          description: string
          group_id: string
          max_members: number
          member_count: number
          membership_id: string
          name: string
          penalty_amount: number
          photo_url: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["group_status"]
          weekly_target: number
        }[]
      }
      get_my_profile_groups: {
        Args: never
        Returns: {
          group_id: string
          members_count: number
          name: string
          penalty_amount: number
          pot_total: number
          role: Database["public"]["Enums"]["member_role"]
          weekly_target: number
        }[]
      }
      get_my_profile_stats: {
        Args: never
        Returns: {
          best_current_streak: number
          challenges_finished: number
          challenges_played: number
          challenges_won: number
          groups_count: number
          penalties_avoided: number
          penalties_due: number
          penalties_paid: number
          record_streak: number
          sessions_done: number
          target_rate: number
        }[]
      }
      get_my_trophies: { Args: never; Returns: Json }
      get_pot_history: {
        Args: { p_group_id: string }
        Returns: {
          amount: number
          created_at: string
          first_name: string
          id: string
          penalty_type: Database["public"]["Enums"]["penalty_type"]
          user_id: string
          username: string
          week_start: string
        }[]
      }
      grant_badge: {
        Args: {
          p_badge_key: string
          p_desc: string
          p_group_id?: string
          p_metadata?: Json
          p_title: string
          p_user_id: string
        }
        Returns: boolean
      }
      grant_session_limit: {
        Args: { p_day: string; p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      invite_user_to_group: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: string
      }
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean }
      is_group_creator: { Args: { p_group_id: string }; Returns: boolean }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_suspended: {
        Args: { p_group_id: string; p_on: string; p_user_id: string }
        Returns: boolean
      }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      join_group_by_code: {
        Args: {
          p_code: string
          p_penalty_amount?: number
          p_weekly_target: number
        }
        Returns: string
      }
      leave_group: { Args: { p_group_id: string }; Returns: string }
      live_streak_for: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: number
      }
      mark_badges_seen: { Args: { p_keys?: string[] }; Returns: undefined }
      notification_category: {
        Args: { p_type: Database["public"]["Enums"]["notification_type"] }
        Returns: string
      }
      notify_join_from_invitation: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      notify_member_joined: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      notify_member_left: {
        Args: { p_deleted?: boolean; p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      notify_session_declared: {
        Args: { p_session_id: string }
        Returns: number
      }
      propose_penalty_change: {
        Args: { p_group_member_id: string; p_new_amount: number }
        Returns: string
      }
      publish_session_to_my_groups: {
        Args: { p_group_ids?: string[]; p_session_id: string }
        Returns: {
          group_id: string
          group_name: string
          session_id: string
        }[]
      }
      rebuild_member_group_progress: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      reject_group_activity: {
        Args: {
          p_activity: string
          p_comment?: string
          p_group_id: string
          p_requester_id: string
        }
        Returns: undefined
      }
      remind_unpaid_members: { Args: { p_group_id: string }; Returns: number }
      request_group_activity: {
        Args: { p_activity: string; p_group_id: string }
        Returns: boolean
      }
      request_rule_change: {
        Args: { p_group_id: string; p_rule: string }
        Returns: boolean
      }
      request_session_limit: {
        Args: { p_day: string; p_group_id: string }
        Returns: boolean
      }
      request_suspension: {
        Args: {
          p_end: string
          p_group_id: string
          p_reason: string
          p_start: string
        }
        Returns: string
      }
      resolve_group_pending_votes: {
        Args: { p_group_id: string }
        Returns: number
      }
      resolve_pending_votes: {
        Args: { p_lookback_days?: number }
        Returns: number
      }
      resolve_session: {
        Args: { p_session_id: string }
        Returns: Database["public"]["Enums"]["session_status"]
      }
      respond_penalty_change: {
        Args: { p_accept: boolean; p_change_id: string }
        Returns: undefined
      }
      run_weekly_closure: {
        Args: { p_force?: boolean; p_week_start?: string }
        Returns: number
      }
      search_users_by_username: {
        Args: { p_query: string }
        Returns: {
          avatar_color: string
          avatar_icon: string
          avatar_url: string
          first_name: string
          id: string
          last_name: string
          username: string
        }[]
      }
      send_weekly_reminders: { Args: { p_force?: boolean }; Returns: number }
      session_effective_deadline: {
        Args: { p_session_id: string }
        Returns: string
      }
      sessions_used_on: {
        Args: { p_day: string; p_group_id: string; p_user_id: string }
        Returns: number
      }
      set_my_penalty: {
        Args: { p_amount: number; p_group_id: string }
        Returns: number
      }
      set_notification_prefs: { Args: { p_prefs: Json }; Returns: Json }
      settle_member_pot: {
        Args: { p_group_id: string; p_paid: boolean; p_user_id: string }
        Returns: number
      }
      start_activity_vote: {
        Args: {
          p_activity: string
          p_group_id: string
          p_requester_id?: string
        }
        Returns: string
      }
      submit_excuse: {
        Args: {
          p_excuse_type: Database["public"]["Enums"]["excuse_type"]
          p_group_id: string
          p_justification_url?: string
          p_reason: string
        }
        Returns: string
      }
      transfer_admin: {
        Args: { p_group_id: string; p_new_admin_id: string }
        Returns: string
      }
      unlock_pot: { Args: { p_group_id: string }; Returns: string }
      upsert_my_profile: {
        Args: {
          p_avatar_color?: string
          p_avatar_icon?: string
          p_avatar_url?: string
          p_clear_avatar_icon?: boolean
          p_clear_avatar_url?: boolean
          p_first_name?: string
          p_is_searchable?: boolean
          p_last_name?: string
          p_username?: string
        }
        Returns: {
          avatar_color: string | null
          avatar_icon: string | null
          avatar_url: string | null
          created_at: string
          email: string
          expo_push_token: string | null
          first_name: string | null
          id: string
          is_searchable: boolean
          last_name: string | null
          notification_prefs: Json
          updated_at: string
          username: string | null
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      use_joker: { Args: { p_group_id: string }; Returns: string }
      wants_notification: {
        Args: {
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      deadline_type: "same_day" | "end_of_week"
      excuse_status: "pending_vote" | "accepted" | "rejected"
      excuse_type: "standard" | "major"
      group_status: "setup" | "active" | "completed" | "cancelled"
      member_role: "admin" | "member" | "treasurer"
      notification_type:
        | "session_reminder"
        | "weekly_recap"
        | "vote_pending_session"
        | "vote_pending_excuse"
        | "blame_received"
        | "penalty_applied"
        | "member_joined"
        | "challenge_ending_soon"
        | "challenge_completed"
        | "session_validated"
        | "session_rejected"
        | "group_invitation"
        | "penalty_change_request"
        | "excuse_accepted"
        | "excuse_rejected"
        | "admin_transferred"
        | "member_left"
        | "activity_request"
        | "rule_change_request"
        | "activity_added"
        | "activity_rejected"
        | "activity_vote"
        | "session_refused_by_member"
        | "session_limit_request"
        | "session_limit_granted"
        | "payment_reminder"
        | "suspension_requested"
        | "suspension_set"
        | "suspension_accepted"
        | "suspension_rejected"
        | "blame_threshold_reached"
        | "badge_unlocked"
        | "objective_reached"
      penalty_type: "missed_session" | "blame_threshold"
      proof_type: "photo" | "strava" | "external_link"
      session_status: "pending_vote" | "validated" | "rejected" | "expired"
      transaction_type: "penalty_added" | "payment_received" | "refund" | "unlock"
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
      deadline_type: ["same_day", "end_of_week"],
      excuse_status: ["pending_vote", "accepted", "rejected"],
      excuse_type: ["standard", "major"],
      group_status: ["setup", "active", "completed", "cancelled"],
      member_role: ["admin", "member", "treasurer"],
      notification_type: [
        "session_reminder",
        "weekly_recap",
        "vote_pending_session",
        "vote_pending_excuse",
        "blame_received",
        "penalty_applied",
        "member_joined",
        "challenge_ending_soon",
        "challenge_completed",
        "session_validated",
        "session_rejected",
        "group_invitation",
        "penalty_change_request",
        "excuse_accepted",
        "excuse_rejected",
        "admin_transferred",
        "member_left",
        "activity_request",
        "rule_change_request",
        "activity_added",
        "activity_rejected",
        "activity_vote",
        "session_refused_by_member",
        "session_limit_request",
        "session_limit_granted",
        "payment_reminder",
        "suspension_requested",
        "suspension_set",
        "suspension_accepted",
        "suspension_rejected",
        "blame_threshold_reached",
        "badge_unlocked",
        "objective_reached",
      ],
      penalty_type: ["missed_session", "blame_threshold"],
      proof_type: ["photo", "strava", "external_link"],
      session_status: ["pending_vote", "validated", "rejected", "expired"],
      transaction_type: ["penalty_added", "payment_received", "refund", "unlock"],
    },
  },
} as const
