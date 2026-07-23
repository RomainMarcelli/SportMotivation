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
      activity_proposals: {
        Row: {
          id: string
          group_id: string
          activity: string
          requested_by: string | null
          started_by: string
          status: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          activity: string
          requested_by?: string | null
          started_by: string
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          activity?: string
          requested_by?: string | null
          started_by?: string
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      activity_proposal_votes: {
        Row: {
          proposal_id: string
          voter_id: string
          value: boolean
          created_at: string
        }
        Insert: {
          proposal_id: string
          voter_id: string
          value: boolean
          created_at?: string
        }
        Update: {
          proposal_id?: string
          voter_id?: string
          value?: boolean
          created_at?: string
        }
        Relationships: []
      }
      session_day_grants: {
        Row: {
          group_id: string
          user_id: string
          day: string
          extra: number
          granted_by: string | null
          updated_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          day: string
          extra?: number
          granted_by?: string | null
          updated_at?: string
        }
        Update: {
          group_id?: string
          user_id?: string
          day?: string
          extra?: number
          granted_by?: string | null
          updated_at?: string
        }
        Relationships: []
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
      jokers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          month_start: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          month_start: string
          user_id: string
        }
        Update: {
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
      group_invitations: {
        Row: {
          id: string
          group_id: string
          invited_user_id: string
          invited_by: string
          status: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          invited_user_id: string
          invited_by: string
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          invited_user_id?: string
          invited_by?: string
          status?: string
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      member_penalty_changes: {
        Row: {
          id: string
          group_id: string
          group_member_id: string
          old_amount: number | null
          new_amount: number
          status: string
          requested_by: string
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          group_member_id: string
          old_amount?: number | null
          new_amount: number
          status?: string
          requested_by: string
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          group_member_id?: string
          old_amount?: number | null
          new_amount?: number
          status?: string
          requested_by?: string
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          accepted_activities: Json
          blame_threshold: number
          challenge_end: string
          challenge_start: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
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
          blame_threshold?: number
          challenge_end: string
          challenge_start: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code: string
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
          blame_threshold?: number
          challenge_end?: string
          challenge_start?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
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
      session_proofs: {
        Row: {
          captured_at: string | null
          created_at: string
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
          last_name: string | null
          notification_prefs: Json
          /** FALSE = profil privé : invisible dans la recherche par pseudo (cf. 039). */
          is_searchable: boolean
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
          last_name?: string | null
          notification_prefs?: Json
          is_searchable?: boolean
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
          last_name?: string | null
          notification_prefs?: Json
          is_searchable?: boolean
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
      cast_vote: {
        Args: { p_session_id: string; p_value: boolean; p_comment?: string | null }
        Returns: string
      }
      cast_excuse_vote: {
        Args: { p_excuse_id: string; p_value: boolean; p_comment?: string | null }
        Returns: string
      }
      submit_excuse: {
        Args: {
          p_group_id: string
          p_excuse_type: Database["public"]["Enums"]["excuse_type"]
          p_reason: string
          p_justification_url?: string | null
        }
        Returns: string
      }
      use_joker: { Args: { p_group_id: string }; Returns: string }
      leave_group: { Args: { p_group_id: string }; Returns: string | null }
      transfer_admin: {
        Args: { p_group_id: string; p_new_admin_id: string }
        Returns: string
      }
      upsert_my_profile: {
        Args: {
          p_first_name?: string | null
          p_last_name?: string | null
          p_username?: string | null
          p_avatar_url?: string | null
          p_avatar_color?: string | null
          p_avatar_icon?: string | null
          p_clear_avatar_url?: boolean
          p_clear_avatar_icon?: boolean
          p_is_searchable?: boolean | null
        }
        /** v3 (039) : renvoie la ligne écrite, pour la poser directement dans le cache. */
        Returns: Database["public"]["Tables"]["users"]["Row"]
      }
      /** Demande à l'admin d'ajouter un sport. `false` = rien envoyé (doublon). */
      request_group_activity: {
        Args: { p_group_id: string; p_activity: string }
        Returns: boolean
      }
      /** L'admin ajoute le sport ; renvoie la liste complète mise à jour. */
      add_group_activity: {
        Args: { p_group_id: string; p_activity: string; p_requester_id?: string | null }
        Returns: Json
      }
      /** Demande à l'admin de revoir une règle du défi. */
      request_rule_change: {
        Args: { p_group_id: string; p_rule: string }
        Returns: boolean
      }
      /** L'admin refuse l'ajout d'un sport (commentaire facultatif). */
      reject_group_activity: {
        Args: { p_group_id: string; p_activity: string; p_requester_id: string; p_comment?: string | null }
        Returns: undefined
      }
      /** L'admin ouvre un vote de groupe pour ajouter un sport. */
      start_activity_vote: {
        Args: { p_group_id: string; p_activity: string; p_requester_id?: string | null }
        Returns: string
      }
      /** Vote oui/non sur l'ajout d'un sport ; renvoie le statut de la proposition. */
      cast_activity_vote: {
        Args: { p_proposal_id: string; p_value: boolean }
        Returns: string
      }
      /** Le joueur demande à dépasser sa limite de séances pour un jour. */
      request_session_limit: {
        Args: { p_group_id: string; p_day: string }
        Returns: boolean
      }
      /** L'admin accorde une séance de plus ce jour-là. */
      grant_session_limit: {
        Args: { p_group_id: string; p_user_id: string; p_day: string }
        Returns: undefined
      }
      /** Séances déjà déclarées par un membre un jour donné (hors refusées). */
      sessions_used_on: {
        Args: { p_group_id: string; p_user_id: string; p_day: string }
        Returns: number
      }
      /** Quota effectif du jour (règle + dérogations). NULL = illimité. */
      daily_session_allowance: {
        Args: { p_group_id: string; p_user_id: string; p_day: string }
        Returns: number | null
      }
      /** 'deleted' (effacement réel) | 'anonymized' (argent engagé) — cf. 031. */
      delete_my_account: { Args: Record<string, never>; Returns: string }
      is_username_available: { Args: { p_username: string }; Returns: boolean }
      set_notification_prefs: { Args: { p_prefs: Json }; Returns: Json }
      publish_session_to_my_groups: {
        Args: { p_session_id: string }
        Returns: { group_id: string; group_name: string; session_id: string }[]
      }
      notify_session_declared: { Args: { p_session_id: string }; Returns: number }
      set_my_penalty: { Args: { p_group_id: string; p_amount: number }; Returns: number }
      notify_join_from_invitation: { Args: { p_group_id: string }; Returns: undefined }
      get_my_profile_stats: {
        Args: Record<string, never>
        Returns: {
          sessions_done: number
          streak_weeks: number
          target_rate: number
          penalties_paid: number
          groups_count: number
        }[]
      }
      get_my_profile_groups: {
        Args: Record<string, never>
        Returns: {
          group_id: string
          name: string
          role: Database["public"]["Enums"]["member_role"]
          weekly_target: number
          penalty_amount: number
          pot_total: number
          members_count: number
        }[]
      }
      /** Outil de test — à supprimer avant la prod (voir 027_dev_reset_excuse_joker.sql). */
      dev_reset_excuse_joker: { Args: { p_group_id: string }; Returns: string }
      is_group_admin: { Args: { p_group_id: string }; Returns: boolean }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      join_group_by_code: {
        Args: { p_code: string; p_weekly_target: number; p_penalty_amount?: number | null }
        Returns: string
      }
      search_users_by_username: {
        Args: { p_query: string }
        Returns: {
          id: string
          username: string | null
          first_name: string | null
          last_name: string | null
          avatar_url: string | null
          avatar_color: string | null
          avatar_icon: string | null
        }[]
      }
      invite_user_to_group: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: string
      }
      get_group_preview_by_id: {
        Args: { p_group_id: string }
        Returns: {
          id: string
          name: string
          description: string | null
          photo_url: string | null
          challenge_start: string
          challenge_end: string
          penalty_amount: number
          accepted_activities: Json
          min_duration_min: number
          publication_deadline: Database["public"]["Enums"]["deadline_type"]
          vote_deadline: Database["public"]["Enums"]["deadline_type"]
          blame_threshold: number
          max_excuses: number | null
          max_members: number
          status: Database["public"]["Enums"]["group_status"]
          member_count: number
        }[]
      }
      accept_invitation: {
        Args: {
          p_invitation_id: string
          p_weekly_target: number
          p_penalty_amount?: number | null
        }
        Returns: string
      }
      propose_penalty_change: {
        Args: { p_group_member_id: string; p_new_amount: number }
        Returns: string
      }
      respond_penalty_change: {
        Args: { p_change_id: string; p_accept: boolean }
        Returns: undefined
      }
      declare_session: {
        Args: {
          p_group_id: string
          p_activity_type: string
          p_duration_min: number
          p_performed_at: string
          p_comment?: string | null
        }
        Returns: string
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
        | "excuse_accepted"
        | "excuse_rejected"
        | "blame_received"
        | "penalty_applied"
        | "member_joined"
        | "challenge_ending_soon"
        | "challenge_completed"
        | "session_validated"
        | "session_rejected"
        | "group_invitation"
        | "penalty_change_request"
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
      penalty_type: "missed_session" | "blame_threshold"
      proof_type: "photo" | "strava" | "external_link"
      session_status: "pending_vote" | "validated" | "rejected" | "expired"
      transaction_type:
        | "penalty_added"
        | "payment_received"
        | "refund"
        | "unlock"
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
        "excuse_accepted",
        "excuse_rejected",
        "blame_received",
        "penalty_applied",
        "member_joined",
        "challenge_ending_soon",
        "challenge_completed",
        "session_validated",
        "session_rejected",
        "group_invitation",
        "penalty_change_request",
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
      ],
      penalty_type: ["missed_session", "blame_threshold"],
      proof_type: ["photo", "strava", "external_link"],
      session_status: ["pending_vote", "validated", "rejected", "expired"],
      transaction_type: [
        "penalty_added",
        "payment_received",
        "refund",
        "unlock",
      ],
    },
  },
} as const
