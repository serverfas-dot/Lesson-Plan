export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'teacher' | 'leading_teacher' | 'principal' | 'super_admin';
export type LessonPlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          leading_teacher_id: string | null;
          signature_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          leading_teacher_id?: string | null;
          signature_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          leading_teacher_id?: string | null;
          signature_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lesson_plans: {
        Row: {
          id: string;
          teacher_id: string;
          leading_teacher_id: string;
          title: string;
          week: number;
          date: string;
          duration: string;
          lesson_no: string;
          class: string;
          subject: string;
          no_of_students: number;
          topic: string;
          strand: string;
          sub_strand: string;
          outcome: string;
          indicators: string;
          learning_intention: string;
          success_criteria: string;
          prior_knowledge: string;
          key_competencies: string;
          shared_values: string;
          materials_needed: string;
          introduction_time: number;
          introduction_teacher_activity: string;
          introduction_student_activity: string;
          body_time: number;
          body_teacher_activity: string;
          body_student_activity: string;
          evaluation_time: number;
          evaluation_teacher_activity: string;
          evaluation_student_activity: string;
          conclusion_time: number;
          conclusion_teacher_activity: string;
          conclusion_student_activity: string;
          reflection_objectives_achieved: boolean;
          reflection_activities_effective: boolean;
          reflection_implemented_as_planned: boolean;
          reflection_notes: string;
          pedagogy_positive_environment: boolean;
          pedagogy_connecting_learning: boolean;
          pedagogy_reflective_practice: boolean;
          pedagogy_meaningful_learning: boolean;
          pedagogy_individual_differences: boolean;
          language: string;
          status: LessonPlanStatus;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          leading_teacher_id: string;
          title?: string;
          week: number;
          date: string;
          duration?: string;
          lesson_no: string;
          class: string;
          subject: string;
          no_of_students?: number;
          topic: string;
          strand: string;
          sub_strand: string;
          outcome: string;
          indicators: string;
          learning_intention: string;
          success_criteria: string;
          prior_knowledge: string;
          key_competencies: string;
          shared_values: string;
          materials_needed: string;
          introduction_time?: number;
          introduction_teacher_activity: string;
          introduction_student_activity: string;
          body_time?: number;
          body_teacher_activity: string;
          body_student_activity: string;
          evaluation_time?: number;
          evaluation_teacher_activity: string;
          evaluation_student_activity: string;
          conclusion_time?: number;
          conclusion_teacher_activity: string;
          conclusion_student_activity: string;
          reflection_objectives_achieved?: boolean;
          reflection_activities_effective?: boolean;
          reflection_implemented_as_planned?: boolean;
          reflection_notes?: string;
          pedagogy_positive_environment?: boolean;
          pedagogy_connecting_learning?: boolean;
          pedagogy_reflective_practice?: boolean;
          pedagogy_meaningful_learning?: boolean;
          pedagogy_individual_differences?: boolean;
          language?: string;
          status?: LessonPlanStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          leading_teacher_id?: string;
          title?: string;
          week?: number;
          date?: string;
          duration?: string;
          lesson_no?: string;
          class?: string;
          subject?: string;
          no_of_students?: number;
          topic?: string;
          strand?: string;
          sub_strand?: string;
          outcome?: string;
          indicators?: string;
          learning_intention?: string;
          success_criteria?: string;
          prior_knowledge?: string;
          key_competencies?: string;
          shared_values?: string;
          materials_needed?: string;
          introduction_time?: number;
          introduction_teacher_activity?: string;
          introduction_student_activity?: string;
          body_time?: number;
          body_teacher_activity?: string;
          body_student_activity?: string;
          evaluation_time?: number;
          evaluation_teacher_activity?: string;
          evaluation_student_activity?: string;
          conclusion_time?: number;
          conclusion_teacher_activity?: string;
          conclusion_student_activity?: string;
          reflection_objectives_achieved?: boolean;
          reflection_activities_effective?: boolean;
          reflection_implemented_as_planned?: boolean;
          reflection_notes?: string;
          pedagogy_positive_environment?: boolean;
          pedagogy_connecting_learning?: boolean;
          pedagogy_reflective_practice?: boolean;
          pedagogy_meaningful_learning?: boolean;
          pedagogy_individual_differences?: boolean;
          language?: string;
          status?: LessonPlanStatus;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      approvals: {
        Row: {
          id: string;
          lesson_plan_id: string;
          leading_teacher_id: string;
          leading_teacher_name: string;
          signature_url: string;
          approved_at: string;
          comments: string;
        };
        Insert: {
          id?: string;
          lesson_plan_id: string;
          leading_teacher_id: string;
          leading_teacher_name: string;
          signature_url: string;
          approved_at?: string;
          comments?: string;
        };
        Update: {
          id?: string;
          lesson_plan_id?: string;
          leading_teacher_id?: string;
          leading_teacher_name?: string;
          signature_url?: string;
          approved_at?: string;
          comments?: string;
        };
      };
    };
  };
}
