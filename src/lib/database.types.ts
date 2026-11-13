export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  public: {
    Tables: {
      answers: {
        Row: {
          id: number
          is_correct: boolean
          participant_id: number
          points_awarded: number
          question_id: number
          response_ms: number
          selected_choice: string
          session_id: number
          submitted_at: string
        }
        Insert: {
          id?: never
          is_correct: boolean
          participant_id: number
          points_awarded?: number
          question_id: number
          response_ms: number
          selected_choice: string
          session_id: number
          submitted_at?: string
        }
        Update: {
          id?: never
          is_correct?: boolean
          participant_id?: number
          points_awarded?: number
          question_id?: number
          response_ms?: number
          selected_choice?: string
          session_id?: number
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'answers_participant_id_fkey'
            columns: ['participant_id']
            isOneToOne: false
            referencedRelation: 'participants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'answers_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      hosts: {
        Row: {
          created_at: string
          host_name: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          host_name: string
          id?: never
          user_id: string
        }
        Update: {
          created_at?: string
          host_name?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          current_question_id: number | null
          display_name: string
          finished_at: string | null
          id: number
          is_kicked: boolean
          joined_at: string
          question_ends_at: string | null
          question_started_at: string | null
          questions_served: number
          quizzer_id: number
          session_id: number
        }
        Insert: {
          current_question_id?: number | null
          display_name: string
          finished_at?: string | null
          id?: never
          is_kicked?: boolean
          joined_at?: string
          question_ends_at?: string | null
          question_started_at?: string | null
          questions_served?: number
          quizzer_id: number
          session_id: number
        }
        Update: {
          current_question_id?: number | null
          display_name?: string
          finished_at?: string | null
          id?: never
          is_kicked?: boolean
          joined_at?: string
          question_ends_at?: string | null
          question_started_at?: string | null
          questions_served?: number
          quizzer_id?: number
          session_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'participants_current_question_id_fkey'
            columns: ['current_question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_quizzer_id_fkey'
            columns: ['quizzer_id']
            isOneToOne: false
            referencedRelation: 'quizzers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participants_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      question_keys: {
        Row: {
          correct_choice: string
          question_id: number
        }
        Insert: {
          correct_choice: string
          question_id: number
        }
        Update: {
          correct_choice?: string
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: 'question_keys_question_id_fkey'
            columns: ['question_id']
            isOneToOne: true
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
        ]
      }
      questionnaires: {
        Row: {
          created_at: string
          host_id: number
          id: number
          kind: Database['public']['Enums']['questionnaire_kind']
          name: string
          seconds_per_question: number
        }
        Insert: {
          created_at?: string
          host_id: number
          id?: never
          kind?: Database['public']['Enums']['questionnaire_kind']
          name: string
          seconds_per_question?: number
        }
        Update: {
          created_at?: string
          host_id?: number
          id?: never
          kind?: Database['public']['Enums']['questionnaire_kind']
          name?: string
          seconds_per_question?: number
        }
        Relationships: [
          {
            foreignKeyName: 'questionnaires_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'hosts'
            referencedColumns: ['id']
          },
        ]
      }
      questions: {
        Row: {
          choice_a: string
          choice_b: string
          choice_c: string | null
          choice_d: string | null
          created_at: string
          id: number
          image_path: string | null
          points: number
          position: number
          prompt: string
          questionnaire_id: number
          seconds_override: number | null
        }
        Insert: {
          choice_a: string
          choice_b: string
          choice_c?: string | null
          choice_d?: string | null
          created_at?: string
          id?: never
          image_path?: string | null
          points?: number
          position: number
          prompt: string
          questionnaire_id: number
          seconds_override?: number | null
        }
        Update: {
          choice_a?: string
          choice_b?: string
          choice_c?: string | null
          choice_d?: string | null
          created_at?: string
          id?: never
          image_path?: string | null
          points?: number
          position?: number
          prompt?: string
          questionnaire_id?: number
          seconds_override?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'questions_questionnaire_id_fkey'
            columns: ['questionnaire_id']
            isOneToOne: false
            referencedRelation: 'questionnaires'
            referencedColumns: ['id']
          },
        ]
      }
      quizzers: {
        Row: {
          alias: string | null
          created_at: string
          full_name: string
          id: number
          user_id: string
        }
        Insert: {
          alias?: string | null
          created_at?: string
          full_name: string
          id?: never
          user_id: string
        }
        Update: {
          alias?: string | null
          created_at?: string
          full_name?: string
          id?: never
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          current_question_id: number | null
          ended_at: string | null
          host_id: number
          id: number
          join_code: string
          question_ends_at: string | null
          question_started_at: string | null
          questionnaire_id: number
          started_at: string | null
          status: Database['public']['Enums']['session_status']
        }
        Insert: {
          created_at?: string
          current_question_id?: number | null
          ended_at?: string | null
          host_id: number
          id?: never
          join_code: string
          question_ends_at?: string | null
          question_started_at?: string | null
          questionnaire_id: number
          started_at?: string | null
          status?: Database['public']['Enums']['session_status']
        }
        Update: {
          created_at?: string
          current_question_id?: number | null
          ended_at?: string | null
          host_id?: number
          id?: never
          join_code?: string
          question_ends_at?: string | null
          question_started_at?: string | null
          questionnaire_id?: number
          started_at?: string | null
          status?: Database['public']['Enums']['session_status']
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_current_question_id_fkey'
            columns: ['current_question_id']
            isOneToOne: false
            referencedRelation: 'questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'hosts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_questionnaire_id_fkey'
            columns: ['questionnaire_id']
            isOneToOne: false
            referencedRelation: 'questionnaires'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_question_image: { Args: { p_name: string }; Returns: boolean }
      check_question_input: {
        Args: {
          p_a: string
          p_b: string
          p_c: string
          p_correct: string
          p_d: string
          p_prompt: string
        }
        Returns: undefined
      }
      create_session: { Args: { p_questionnaire_id: number }; Returns: number }
      finish_session: { Args: { p_session_id: number }; Returns: undefined }
      get_history: {
        Args: never
        Returns: {
          average_accuracy: number
          average_score: number
          ended_at: string
          kind: Database['public']['Enums']['questionnaire_kind']
          participant_count: number
          questionnaire_name: string
          session_id: number
          started_at: string
        }[]
      }
      get_leaderboard: {
        Args: { p_session_id: number }
        Returns: {
          correct_count: number
          display_name: string
          participant_id: number
          rank: number
          score: number
          total_correct_ms: number
        }[]
      }
      get_my_answer: {
        Args: { p_question_id: number; p_session_id: number }
        Returns: string
      }
      get_my_progress: { Args: { p_session_id: number }; Returns: Json }
      get_my_result: { Args: { p_question_id: number; p_session_id: number }; Returns: Json }
      get_participants_overview: {
        Args: never
        Returns: {
          display_name: string
          full_name: string
          is_kicked: boolean
          join_code: string
          joined_at: string
          kind: Database['public']['Enums']['questionnaire_kind']
          participant_id: number
          questionnaire_name: string
          score: number
          session_id: number
        }[]
      }
      get_reveal: {
        Args: { p_question_id: number; p_session_id: number }
        Returns: Json
      }
      get_session_report: { Args: { p_session_id: number }; Returns: Json }
      import_questions: {
        Args: { p_questionnaire_id: number; p_rows: Json }
        Returns: number
      }
      is_host: { Args: never; Returns: boolean }
      join_session: {
        Args: { p_code: string; p_display_name: string }
        Returns: number
      }
      my_current_question_ids: { Args: never; Returns: number[] }
      my_host_id: { Args: never; Returns: number }
      my_hosted_session_ids: { Args: never; Returns: number[] }
      my_quizzer_id: { Args: never; Returns: number }
      my_session_ids: { Args: never; Returns: number[] }
      next_question: { Args: { p_session_id: number }; Returns: undefined }
      open_pretest: { Args: { p_session_id: number }; Returns: undefined }
      reorder_questions: {
        Args: { p_ids: number[]; p_questionnaire_id: number }
        Returns: undefined
      }
      return_to_lobby: { Args: { p_session_id: number }; Returns: undefined }
      reveal_question: { Args: { p_session_id: number }; Returns: undefined }
      save_question: {
        Args: {
          p_choice_a: string
          p_choice_b: string
          p_choice_c: string
          p_choice_d: string
          p_correct: string
          p_image_path: string
          p_points: number
          p_prompt: string
          p_question_id: number
          p_questionnaire_id: number
          p_seconds_override: number
        }
        Returns: number
      }
      server_now: { Args: never; Returns: string }
      start_question: {
        Args: { p_question_id: number; p_session_id: number }
        Returns: string
      }
      submit_answer: {
        Args: { p_choice: string; p_question_id: number; p_session_id: number }
        Returns: boolean
      }
    }
    Enums: {
      questionnaire_kind: 'standard' | 'pretest' | 'posttest'
      session_status: 'lobby' | 'question' | 'reveal' | 'finished'
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
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      questionnaire_kind: ['standard', 'pretest', 'posttest'],
      session_status: ['lobby', 'question', 'reveal', 'finished'],
    },
  },
} as const
