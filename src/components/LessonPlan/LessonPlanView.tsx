import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database.types';
import { CheckCircle, FileText, Download, History, Save, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { lessonPlanTranslations, type Language } from '../../lib/translations';
import { useFieldLabels } from '../../hooks/useFieldLabels';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];
type Approval = Database['public']['Tables']['approvals']['Row'];
type PrincipalApproval = Database['public']['Tables']['principal_approvals']['Row'];

interface RevisionHistory {
  id: string;
  action_type: 'revision_requested' | 'revision_completed' | 'resubmitted';
  comments: string | null;
  created_at: string;
  teacher_id: string;
  leading_teacher_id: string | null;
  teacher_name?: string;
  leading_teacher_name?: string;
}

interface LessonPlanViewProps {
  lessonPlan: LessonPlan;
  onUpdate?: () => void;
}

export function LessonPlanView({ lessonPlan, onUpdate }: LessonPlanViewProps) {
  const { profile } = useAuth();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [principalApproval, setPrincipalApproval] = useState<PrincipalApproval | null>(null);
  const [revisionHistory, setRevisionHistory] = useState<RevisionHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const language = (lessonPlan.language as Language) || 'english';
  const t = (key: keyof typeof lessonPlanTranslations.english) => lessonPlanTranslations[language][key];
  const isRTL = language === 'dhivehi';
  const { getLabel, getFieldOptionsWithValues, fieldData } = useFieldLabels(language);

  const getLocalizedValue = (fieldKey: string, value: string) => {
    const options = getFieldOptionsWithValues(fieldKey, language);
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  useEffect(() => {
    if (lessonPlan.status === 'approved') {
      loadApproval();
    }
    if (lessonPlan.principal_status === 'approved') {
      loadPrincipalApproval();
    }
    loadRevisionHistory();
  }, [lessonPlan.id, lessonPlan.status, lessonPlan.principal_status, lessonPlan.revision_requested_by]);

  const loadApproval = async () => {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('lesson_plan_id', lessonPlan.id)
        .order('approved_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setApproval(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error loading approval:', error);
    }
  };

  const loadPrincipalApproval = async () => {
    try {
      const { data, error } = await supabase
        .from('principal_approvals')
        .select('*')
        .eq('lesson_plan_id', lessonPlan.id)
        .order('approved_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      setPrincipalApproval(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error loading principal approval:', error);
    }
  };

  const loadRevisionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('revision_history')
        .select(`
          *,
          teacher:profiles!revision_history_teacher_id_fkey(full_name),
          leading_teacher:profiles!revision_history_leading_teacher_id_fkey(full_name)
        `)
        .eq('lesson_plan_id', lessonPlan.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedHistory = (data || []).map((item: any) => ({
        ...item,
        teacher_name: item.teacher?.full_name,
        leading_teacher_name: item.leading_teacher?.full_name
      }));

      setRevisionHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading revision history:', error);
    }
  };

  const handleSaveReflection = async () => {
    setSavingReflection(true);
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({ reflection })
        .eq('id', lessonPlan.id);

      if (error) throw error;

      setIsEditingReflection(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Failed to save reflection');
    } finally {
      setSavingReflection(false);
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'revision_requested':
        return getLabel('revision_requested', t('revisionRequested'));
      case 'revision_completed':
        return getLabel('revision_completed', t('revisionCompleted'));
      case 'resubmitted':
        return getLabel('resubmitted_label', t('resubmitted'));
      default:
        return actionType;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'revision_requested':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'revision_completed':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'resubmitted':
        return 'text-green-700 bg-green-50 border-green-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const revisionRequestCount = revisionHistory.filter(h => h.action_type === 'revision_requested').length;
  const revisionCompletedCount = revisionHistory.filter(h => h.action_type === 'revision_completed' || h.action_type === 'resubmitted').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-sky-500 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-center gap-4 mb-3">
          <img
            src={`${import.meta.env.BASE_URL}png.png`}
            alt="Faafu Atoll School Logo"
            className="w-20 h-20 object-contain"
          />
          <h2 className={`text-2xl font-bold text-center ${isRTL ? 'text-right dhivehi-text' : ''}`}>
            {language === 'dhivehi' ? 'ލެސަން ޕްލޭން 2026' : 'Lesson Plan 2026'}
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('week', 'Week')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.week}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('date', 'Date')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{new Date(lessonPlan.date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('duration', 'Duration')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.duration}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('lesson_no', 'Lesson No')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.lesson_no}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('class', 'Class(es)')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{getLocalizedValue('class', lessonPlan.class)}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('subject', 'Subject')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{getLocalizedValue('subject', lessonPlan.subject)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('no_of_students', 'No. of Students')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.no_of_students}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('topic', 'Topic')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.topic}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('strand', 'Strand')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.strand}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('sub_strand', 'Sub-strand')}</p>
            <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.sub_strand}</p>
          </div>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('outcome', 'Outcome')}</p>
          <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.outcome}</p>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('indicators', 'Indicator(s)')}</p>
          <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.indicators}</p>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('learning_intention', 'Learning Intention')}</p>
          <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.learning_intention}</p>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('success_criteria', 'Success Criteria')}</p>
          <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.success_criteria}</p>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('prior_knowledge', 'Prior Knowledge')}</p>
          <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.prior_knowledge}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
          <div>
            <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('key_competencies', 'Key Competencies')}</p>
            <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.key_competencies}</p>
          </div>
          <div>
            <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('shared_values', 'Shared Values')}</p>
            <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.shared_values}</p>
          </div>
        </div>

        <div className="border-b pb-4">
          <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('materials_needed', 'Materials Needed')}</p>
          <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.materials_needed}</p>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg">
          <h3 className={`font-bold text-slate-700 mb-4 ${isRTL ? 'text-right' : ''}`}>{getLabel('instructional_procedures', 'INSTRUCTIONAL PROCEDURES').toUpperCase()}</h3>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction', 'INTRODUCTION').toUpperCase()}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_time', 'Time/min')}</p>
              <p className={`font-medium ${isRTL ? 'text-right' : ''}`}>{lessonPlan.introduction_time}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_teacher_activity', 'Teachers Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.introduction_teacher_activity}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_student_activity', 'Students Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.introduction_student_activity}</p>
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('body', 'BODY').toUpperCase()}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_time', 'Time/min')}</p>
              <p className={`font-medium ${isRTL ? 'text-right' : ''}`}>{lessonPlan.body_time}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_teacher_activity', 'Teachers Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.body_teacher_activity}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_student_activity', 'Students Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.body_student_activity}</p>
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation', 'EVALUATION').toUpperCase()}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_time', 'Time/min')}</p>
              <p className={`font-medium ${isRTL ? 'text-right' : ''}`}>{lessonPlan.evaluation_time}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_teacher_activity', 'Teachers Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.evaluation_teacher_activity}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_student_activity', 'Students Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.evaluation_student_activity}</p>
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion', 'CONCLUSION').toUpperCase()}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_time', 'Time/min')}</p>
              <p className={`font-medium ${isRTL ? 'text-right' : ''}`}>{lessonPlan.conclusion_time}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_teacher_activity', 'Teachers Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.conclusion_teacher_activity}</p>
            </div>
            <div className="md:col-span-5">
              <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_student_activity', 'Students Activity')}</p>
              <p className={`text-slate-800 whitespace-pre-wrap ${isRTL ? 'text-right' : ''}`}>{lessonPlan.conclusion_student_activity}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg">
          <h3 className={`font-bold text-slate-700 mb-3 ${isRTL ? 'text-right' : ''}`}>{getLabel('pedagogy_and_assessment', 'PEDAGOGY AND ASSESSMENT').toUpperCase()}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {lessonPlan.pedagogy_positive_environment && <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className="text-sm text-slate-700">{getLabel('pedagogy_positive_environment', 'Creating a positive learning environment')}</span>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {lessonPlan.pedagogy_connecting_learning && <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className="text-sm text-slate-700">{getLabel('pedagogy_connecting_learning', 'Connecting prior learning to new learning')}</span>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {lessonPlan.pedagogy_reflective_practice && <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className="text-sm text-slate-700">{getLabel('pedagogy_reflective_practice', 'Fostering reflective practice')}</span>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {lessonPlan.pedagogy_meaningful_learning && <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className="text-sm text-slate-700">{getLabel('pedagogy_meaningful_learning', 'Making learning meaningful')}</span>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              {lessonPlan.pedagogy_individual_differences && <CheckCircle className="w-5 h-5 text-green-600" />}
              <span className="text-sm text-slate-700">{getLabel('pedagogy_individual_differences', 'Recognizing individual differences')}</span>
            </div>
          </div>

          {lessonPlan.rubrics_file_url && lessonPlan.rubrics_file_name && (
            <div className="border-t border-slate-300 pt-4 mt-4">
              <h4 className={`font-bold text-slate-700 mb-3 ${isRTL ? 'text-right' : ''}`}>{getLabel('rubrics', 'Rubrics')}</h4>
              <div className="p-3 bg-white border border-slate-300 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-5 h-5 text-sky-600" />
                  <span className="flex-1 text-slate-700">{lessonPlan.rubrics_file_name}</span>
                </div>
                <div className="flex gap-2">
                  <a
                    href={lessonPlan.rubrics_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'dhivehi' ? 'ޕްރިވިއު' : 'Preview'}</span>
                  </a>
                  <a
                    href={lessonPlan.rubrics_file_url}
                    download={lessonPlan.rubrics_file_name}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>{language === 'dhivehi' ? 'ޑައުންލޯޑް' : 'Download'}</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {lessonPlan.status === 'approved' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className={`font-bold text-blue-800 mb-3 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>{t('reflectionPostApproval')}</span>
              {(lessonPlan.reflection_objectives_achieved !== null || lessonPlan.reflection_notes) && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  ✓ {t('reflectionCompleted')}
                </span>
              )}
            </h3>

            <div>
              {(lessonPlan.reflection_objectives_achieved !== null || lessonPlan.reflection_notes) ? (
                <div className="space-y-3">
                  <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${isRTL ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={lessonPlan.reflection_objectives_achieved || false}
                        disabled
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-slate-700">{getLabel('reflection_objectives_achieved', 'Objectives achieved')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={lessonPlan.reflection_activities_effective || false}
                        disabled
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-slate-700">{getLabel('reflection_activities_effective', 'Learning activities effective')}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <input
                        type="checkbox"
                        checked={lessonPlan.reflection_implemented_as_planned || false}
                        disabled
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm text-slate-700">{getLabel('reflection_implemented_as_planned', 'Implemented as per the lesson plan')}</span>
                    </div>
                  </div>
                  {lessonPlan.reflection_notes && (
                    <div>
                      <p className={`text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('reflection_notes', 'Strengths and areas for improvement')}</p>
                      <p className={`text-sm text-slate-700 whitespace-pre-wrap bg-white p-3 rounded border border-slate-200 ${isRTL ? 'text-right' : ''}`}>{lessonPlan.reflection_notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className={`text-slate-500 italic ${isRTL ? 'text-right' : ''}`}>{t('noReflectionYet')}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`w-full flex items-center justify-between font-bold text-slate-700 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <History className="w-5 h-5" />
              {getLabel('revision_history_title', t('revisionHistory'))}
              <span className="text-sm font-normal text-slate-600">
                ({revisionRequestCount} {revisionRequestCount !== 1 ? getLabel('requests', t('requests')) : getLabel('request', t('request'))}, {revisionCompletedCount} {revisionCompletedCount !== 1 ? getLabel('corrections', t('corrections')) : getLabel('correction', t('correction'))})
              </span>
            </span>
            <span className="text-sm text-sky-600">{showHistory ? getLabel('hide_history', t('hide')) : getLabel('show_history', t('show'))}</span>
          </button>

          {showHistory && (
            <div className="space-y-3">
              {revisionHistory.length === 0 ? (
                <div className={`text-center py-4 text-slate-500 text-sm ${isRTL ? 'text-right' : ''}`}>
                  {getLabel('no_revision_history', t('noRevisionHistoryYet'))}
                </div>
              ) : (
                revisionHistory.map((history) => (
                  <div key={history.id} className={`p-3 border rounded-lg ${getActionColor(history.action_type)}`}>
                    <div className={`flex items-start justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : ''}>
                        <span className="font-bold">{getActionLabel(history.action_type)}</span>
                        <p className="text-xs text-slate-600 mt-1">
                          {new Date(history.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {history.action_type === 'revision_requested' && history.leading_teacher_name && (
                      <p className={`text-sm mb-1 ${isRTL ? 'text-right' : ''}`}>
                        <span className="font-semibold">{getLabel('requested_by', t('requestedBy'))}</span> {history.leading_teacher_name}
                      </p>
                    )}

                    {(history.action_type === 'revision_completed' || history.action_type === 'resubmitted') && history.teacher_name && (
                      <p className={`text-sm mb-1 ${isRTL ? 'text-right' : ''}`}>
                        <span className="font-semibold">{getLabel('completed_by', t('by'))}</span> {history.teacher_name}
                      </p>
                    )}

                    {history.comments && (
                      <div className={`mt-2 text-sm ${isRTL ? 'text-right' : ''}`}>
                        <span className="font-semibold">{getLabel('comments', t('comments'))}:</span>
                        <p className="mt-1">{history.comments}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {approval && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h3 className={`font-bold text-green-800 mb-3 ${isRTL ? 'text-right' : ''}`}>{t('approvedBy')}</h3>
            <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{t('leadingTeacher')}</p>
                <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{approval.leading_teacher_name}</p>
                <p className={`text-sm font-bold text-slate-700 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('approvedOn')}</p>
                <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{new Date(approval.approved_at).toLocaleString()}</p>
                {approval.comments && (
                  <>
                    <p className={`text-sm font-bold text-slate-700 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('comments')}</p>
                    <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{approval.comments}</p>
                  </>
                )}
              </div>
              {approval.signature_url && (
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className={`text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-left' : 'text-right'}`}>{t('signature')}</p>
                  <img src={approval.signature_url} alt="Signature" className="max-h-20" />
                </div>
              )}
            </div>
          </div>
        )}

        {principalApproval && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h3 className={`font-bold text-blue-800 mb-3 ${isRTL ? 'text-right' : ''}`}>
              {language === 'dhivehi' ? 'ޕްރިންސިޕަލް ފާސްކުރުން' : 'Approved by Principal'}
            </h3>
            <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div>
                <p className={`text-sm font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>
                  {language === 'dhivehi' ? 'ޕްރިންސިޕަލް' : 'Principal'}
                </p>
                <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{principalApproval.principal_name}</p>
                <p className={`text-sm font-bold text-slate-700 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('approvedOn')}</p>
                <p className={`font-medium text-slate-800 ${isRTL ? 'text-right' : ''}`}>{new Date(principalApproval.approved_at).toLocaleString()}</p>
                {principalApproval.comments && (
                  <>
                    <p className={`text-sm font-bold text-slate-700 mt-2 ${isRTL ? 'text-right' : ''}`}>{t('comments')}</p>
                    <p className={`text-slate-800 ${isRTL ? 'text-right' : ''}`}>{principalApproval.comments}</p>
                  </>
                )}
              </div>
              {principalApproval.signature_url && (
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className={`text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-left' : 'text-right'}`}>{t('signature')}</p>
                  <img src={principalApproval.signature_url} alt="Principal Signature" className="max-h-20" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
