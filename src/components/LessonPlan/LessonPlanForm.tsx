import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database.types';
import { Save, Send, FileText, Upload, X } from 'lucide-react';
import { useFieldLabels } from '../../hooks/useFieldLabels';
import { lessonPlanTranslations, type Language } from '../../lib/translations';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Insert'];

interface LessonPlanFormProps {
  lessonPlanId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  isLeadingTeacher?: boolean;
  isSuperAdmin?: boolean;
  language?: 'english' | 'dhivehi';
}

export function LessonPlanForm({ lessonPlanId, onSuccess, onCancel, isLeadingTeacher = false, isSuperAdmin = false, language = 'english' }: LessonPlanFormProps) {
  const { profile } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState<'english' | 'dhivehi'>(language);
  const { getLabel, getFieldOptions, getFieldOptionsWithValues, loading: labelsLoading } = useFieldLabels(currentLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const t = (key: keyof typeof lessonPlanTranslations.english) => lessonPlanTranslations[currentLanguage][key];
  const isRTL = currentLanguage === 'dhivehi';
  const [selectedKeyCompetencies, setSelectedKeyCompetencies] = useState<string[]>([]);
  const [selectedSharedValues, setSelectedSharedValues] = useState<string[]>([]);
  const [materialsInputType, setMaterialsInputType] = useState<'text' | 'link' | 'file'>('text');
  const [materialLink, setMaterialLink] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, url: string}>>([]);
  const [originalTeacherId, setOriginalTeacherId] = useState<string | null>(null);
  const [originalLeadingTeacherId, setOriginalLeadingTeacherId] = useState<string | null>(null);
  const [originalCreatedByRole, setOriginalCreatedByRole] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<LessonPlan>>({
    title: 'Lesson Plan 2026',
    week: 1,
    date: new Date().toISOString().split('T')[0],
    duration: '70 minutes',
    lesson_no: '',
    class: '',
    subject: '',
    no_of_students: 0,
    topic: '',
    strand: '',
    sub_strand: '',
    outcome: '',
    indicators: '',
    learning_intention: '',
    success_criteria: '',
    prior_knowledge: '',
    key_competencies: '',
    shared_values: '',
    materials_needed: '',
    introduction_time: 5,
    introduction_teacher_activity: '',
    introduction_student_activity: '',
    body_time: 35,
    body_teacher_activity: '',
    body_student_activity: '',
    evaluation_time: 25,
    evaluation_teacher_activity: '',
    evaluation_student_activity: '',
    conclusion_time: 5,
    conclusion_teacher_activity: '',
    conclusion_student_activity: '',
    reflection_objectives_achieved: false,
    reflection_activities_effective: false,
    reflection_implemented_as_planned: false,
    reflection_notes: '',
    pedagogy_positive_environment: false,
    pedagogy_connecting_learning: false,
    pedagogy_reflective_practice: false,
    pedagogy_meaningful_learning: false,
    pedagogy_individual_differences: false,
    language: currentLanguage,
  });

  useEffect(() => {
    if (lessonPlanId) {
      loadLessonPlan();
    }
  }, [lessonPlanId]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      language: currentLanguage,
      title: currentLanguage === 'dhivehi' ? 'ލެސަން ޕްލޭން 2026' : 'Lesson Plan 2026'
    }));
  }, [currentLanguage]);

  const loadLessonPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('id', lessonPlanId!)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData(data);
        if (data.language) {
          setCurrentLanguage(data.language as 'english' | 'dhivehi');
        }
        setOriginalTeacherId(data.teacher_id);
        setOriginalLeadingTeacherId(data.leading_teacher_id);
        setOriginalCreatedByRole(data.created_by_role);
        if (data.key_competencies) {
          const competencies = data.key_competencies.includes(',')
            ? data.key_competencies.split(/,\s*/)
            : [data.key_competencies];
          setSelectedKeyCompetencies(competencies.filter((c: string) => c.trim()));
        }
        if (data.shared_values) {
          const values = data.shared_values.includes(',')
            ? data.shared_values.split(/,\s*/)
            : [data.shared_values];
          setSelectedSharedValues(values.filter((v: string) => v.trim()));
        }
        if (data.materials_needed) {
          const fileMatches = data.materials_needed.match(/File: (.*?) \((.*?)\)/g);
          if (fileMatches) {
            const files = fileMatches.map((match: string) => {
              const nameMatch = match.match(/File: (.*?) \(/);
              const urlMatch = match.match(/\((.*?)\)/);
              return {
                name: nameMatch ? nameMatch[1] : '',
                url: urlMatch ? urlMatch[1] : ''
              };
            });
            setUploadedFiles(files);
          }
        }
      }
    } catch (err) {
      setError('Failed to load lesson plan');
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleKeyCompetencyToggle = (competency: string) => {
    setSelectedKeyCompetencies(prev => {
      const newSelection = prev.includes(competency)
        ? prev.filter(c => c !== competency)
        : [...prev, competency];
      handleChange('key_competencies', newSelection.join(', '));
      return newSelection;
    });
  };

  const handleSharedValueToggle = (value: string) => {
    setSelectedSharedValues(prev => {
      const newSelection = prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value];
      handleChange('shared_values', newSelection.join(', '));
      return newSelection;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile!.id}-${Date.now()}.${fileExt}`;
      const filePath = `rubrics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson-plan-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('lesson-plan-files')
        .getPublicUrl(filePath);

      handleChange('rubrics_file_url', urlData.publicUrl);
      handleChange('rubrics_file_name', file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    handleChange('rubrics_file_url', null);
    handleChange('rubrics_file_name', null);
  };

  const handleMaterialFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError('');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile!.id}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lesson-plan-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('lesson-plan-files')
        .getPublicUrl(filePath);

      setUploadedFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl }]);
      updateMaterialsField([...uploadedFiles, { name: file.name, url: urlData.publicUrl }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAddLink = () => {
    if (!materialLink.trim()) return;

    const currentMaterials = formData.materials_needed || '';
    const newMaterials = currentMaterials
      ? `${currentMaterials}\nLink: ${materialLink}`
      : `Link: ${materialLink}`;

    handleChange('materials_needed', newMaterials);
    setMaterialLink('');
  };

  const handleRemoveMaterialFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    updateMaterialsField(newFiles);
  };

  const updateMaterialsField = (files: Array<{name: string, url: string}>) => {
    const filesText = files.map(f => `File: ${f.name} (${f.url})`).join('\n');
    const currentText = formData.materials_needed || '';
    const textParts = currentText.split('\n').filter(line => !line.startsWith('File:'));
    const newMaterials = textParts.length > 0
      ? `${textParts.join('\n')}\n${filesText}`
      : filesText;
    handleChange('materials_needed', newMaterials);
  };

  const handleSubmit = async (status: 'draft' | 'submitted') => {
    if (!isSuperAdmin && !profile?.leading_teacher_id && profile?.role === 'teacher') {
      setError('You must be assigned to a leading teacher');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let hadRevisionRequest = false;

      if (lessonPlanId) {
        const { data: existingPlan } = await supabase
          .from('lesson_plans')
          .select('revision_requested_by, leading_teacher_id')
          .eq('id', lessonPlanId)
          .maybeSingle();

        hadRevisionRequest = !!existingPlan?.revision_requested_by;
      }

      const lessonPlanData = isSuperAdmin && lessonPlanId ? {
        ...formData,
        teacher_id: originalTeacherId,
        leading_teacher_id: originalLeadingTeacherId,
        created_by_role: originalCreatedByRole,
        language: currentLanguage,
        status,
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        revision_requested_by: null,
        revision_feedback: null,
        revision_requested_at: null,
      } : {
        ...formData,
        teacher_id: profile!.id,
        leading_teacher_id: isLeadingTeacher ? null : profile!.leading_teacher_id!,
        created_by_role: isLeadingTeacher ? 'leading_teacher' : 'teacher',
        language: currentLanguage,
        status,
        principal_status: (isLeadingTeacher && status === 'submitted') ? 'pending' : (formData.principal_status || null),
        submitted_at: status === 'submitted' ? new Date().toISOString() : null,
        revision_requested_by: null,
        revision_feedback: null,
        revision_requested_at: null,
      };

      if (lessonPlanId) {
        const { error } = await supabase
          .from('lesson_plans')
          .update(lessonPlanData as any)
          .eq('id', lessonPlanId);

        if (error) throw error;

        if (hadRevisionRequest && status === 'submitted') {
          const { error: historyError } = await supabase
            .from('revision_history')
            .insert({
              lesson_plan_id: lessonPlanId,
              teacher_id: profile!.id,
              leading_teacher_id: profile!.leading_teacher_id,
              action_type: 'resubmitted',
              comments: 'Lesson plan corrected and resubmitted',
            });

          if (historyError) console.error('Error logging revision history:', historyError);
        }
      } else {
        const { error } = await supabase
          .from('lesson_plans')
          .insert(lessonPlanData as any);

        if (error) throw error;
      }

      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-sky-500 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-center gap-4 mb-3">
          <img
            src={`${import.meta.env.BASE_URL}school-logo.png`}
            alt="Faafu Atoll School Logo"
            className="w-20 h-20 object-contain"
          />
          <h2 className={`text-2xl font-bold text-center ${isRTL ? 'dhivehi-text' : ''}`}>
            {currentLanguage === 'dhivehi' ? 'ލެސަން ޕްލޭން 2026' : 'Lesson Plan 2026'}
          </h2>
        </div>
      </div>

      {error && (
        <div className={`m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
          {error}
        </div>
      )}

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('week', 'Week')}</label>
            <input
              type="number"
              value={formData.week}
              onChange={(e) => handleChange('week', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('date', 'Date')}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('duration', 'Duration')}</label>
            <select
              value={formData.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            >
              <option value="70 minutes">70 minutes</option>
              <option value="35 minutes">35 minutes</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('lesson_no', 'Lesson No')}</label>
            <input
              type="text"
              value={formData.lesson_no}
              onChange={(e) => handleChange('lesson_no', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              placeholder="e.g., 1-2"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('class', 'Class(es)')}</label>
            <select
              value={formData.class}
              onChange={(e) => handleChange('class', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <option value="">{currentLanguage === 'dhivehi' ? 'ކްލާސް ޚިޔާރުކުރައްވާ' : 'Select Class'}</option>
              {getFieldOptionsWithValues('class', currentLanguage).map((option, index) => (
                <option key={index} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('subject', 'Subject')}</label>
            <select
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <option value="">{currentLanguage === 'dhivehi' ? 'މާއްދާ ޚިޔާރުކުރައްވާ' : 'Select Subject'}</option>
              {getFieldOptionsWithValues('subject', currentLanguage).map((option, index) => (
                <option key={index} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('no_of_students', 'No. of Students')}</label>
            <input
              type="number"
              value={formData.no_of_students}
              onChange={(e) => handleChange('no_of_students', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('topic', 'Topic')}</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleChange('topic', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              placeholder="e.g., People in business"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('strand', 'Strand')}</label>
            <input
              type="text"
              value={formData.strand}
              onChange={(e) => handleChange('strand', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('sub_strand', 'Sub-strand')}</label>
            <input
              type="text"
              value={formData.sub_strand}
              onChange={(e) => handleChange('sub_strand', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('outcome', 'Outcome')}</label>
          <textarea
            value={formData.outcome}
            onChange={(e) => handleChange('outcome', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('indicators', 'Indicator(s)')}</label>
          <textarea
            value={formData.indicators}
            onChange={(e) => handleChange('indicators', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            placeholder="Learners should be able to..."
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('learning_intention', 'Learning Intention')}</label>
          <textarea
            value={formData.learning_intention}
            onChange={(e) => handleChange('learning_intention', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            placeholder="Students are learning to..."
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('success_criteria', 'Success Criteria')}</label>
          <textarea
            value={formData.success_criteria}
            onChange={(e) => handleChange('success_criteria', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            placeholder="Students will be successful if they are able to..."
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('prior_knowledge', 'Prior Knowledge')}</label>
          <textarea
            value={formData.prior_knowledge}
            onChange={(e) => handleChange('prior_knowledge', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{getLabel('key_competencies', 'Key Competencies')} (Select multiple)</label>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 space-y-2">
            {getFieldOptions('key_competencies', currentLanguage).map((competency, index) => (
              <label key={`competency-${index}`} className={`flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedKeyCompetencies.includes(competency)}
                  onChange={() => handleKeyCompetencyToggle(competency)}
                  className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">{competency}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{getLabel('shared_values', 'Shared Values')} (Select multiple)</label>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 space-y-2">
            {getFieldOptions('shared_values', currentLanguage).map((value, index) => (
              <label key={`value-${index}`} className={`flex items-center gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedSharedValues.includes(value)}
                  onChange={() => handleSharedValueToggle(value)}
                  className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
                />
                <span className="text-sm text-slate-700">{value}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-bold text-slate-700 mb-2 ${isRTL ? 'text-right' : ''}`}>{getLabel('materials_needed', 'Materials Needed')}</label>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMaterialsInputType('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                materialsInputType === 'text'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setMaterialsInputType('link')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                materialsInputType === 'link'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Add Link
            </button>
            <button
              type="button"
              onClick={() => setMaterialsInputType('file')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                materialsInputType === 'file'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Upload File
            </button>
          </div>

          {materialsInputType === 'text' && (
            <textarea
              value={formData.materials_needed}
              onChange={(e) => handleChange('materials_needed', e.target.value)}
              rows={3}
              placeholder="Enter materials needed..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          )}

          {materialsInputType === 'link' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={materialLink}
                  onChange={(e) => setMaterialLink(e.target.value)}
                  placeholder="Enter URL (e.g., https://example.com)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                >
                  Add
                </button>
              </div>
              {formData.materials_needed && (
                <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.materials_needed}</p>
                </div>
              )}
            </div>
          )}

          {materialsInputType === 'file' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    onChange={handleMaterialFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    disabled={uploadingFile}
                  />
                  <div className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition text-center flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    {uploadingFile ? 'Uploading...' : 'Choose File'}
                  </div>
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-300 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600" />
                        <span className="text-sm text-slate-700">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMaterialFile(index)}
                        className="p-1 hover:bg-slate-200 rounded transition"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-100 p-4 rounded-lg">
          <h3 className={`font-bold text-slate-700 mb-4 ${isRTL ? 'text-right' : ''}`}>{getLabel('instructional_procedures', 'INSTRUCTIONAL PROCEDURES')}</h3>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction', 'INTRODUCTION')}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_time', 'Time/min')}</label>
              <input
                type="number"
                value={formData.introduction_time}
                onChange={(e) => handleChange('introduction_time', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_teacher_activity', 'Teachers Activity')}</label>
              <textarea
                value={formData.introduction_teacher_activity}
                onChange={(e) => handleChange('introduction_teacher_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('introduction_student_activity', 'Students Activity')}</label>
              <textarea
                value={formData.introduction_student_activity}
                onChange={(e) => handleChange('introduction_student_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('body', 'BODY')}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_time', 'Time/min')}</label>
              <input
                type="number"
                value={formData.body_time}
                onChange={(e) => handleChange('body_time', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_teacher_activity', 'Teachers Activity')}</label>
              <textarea
                value={formData.body_teacher_activity}
                onChange={(e) => handleChange('body_teacher_activity', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('body_student_activity', 'Students Activity')}</label>
              <textarea
                value={formData.body_student_activity}
                onChange={(e) => handleChange('body_student_activity', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation', 'EVALUATION')}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_time', 'Time/min')}</label>
              <input
                type="number"
                value={formData.evaluation_time}
                onChange={(e) => handleChange('evaluation_time', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_teacher_activity', 'Teachers Activity')}</label>
              <textarea
                value={formData.evaluation_teacher_activity}
                onChange={(e) => handleChange('evaluation_teacher_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('evaluation_student_activity', 'Students Activity')}</label>
              <textarea
                value={formData.evaluation_student_activity}
                onChange={(e) => handleChange('evaluation_student_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>

          <div className={`bg-slate-200 px-3 py-2 mb-3 font-bold text-slate-700 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion', 'CONCLUSION')}</div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_time', 'Time/min')}</label>
              <input
                type="number"
                value={formData.conclusion_time}
                onChange={(e) => handleChange('conclusion_time', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_teacher_activity', 'Teachers Activity')}</label>
              <textarea
                value={formData.conclusion_teacher_activity}
                onChange={(e) => handleChange('conclusion_teacher_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
            <div className="md:col-span-5">
              <label className={`block text-sm font-bold text-slate-700 mb-1 ${isRTL ? 'text-right' : ''}`}>{getLabel('conclusion_student_activity', 'Students Activity')}</label>
              <textarea
                value={formData.conclusion_student_activity}
                onChange={(e) => handleChange('conclusion_student_activity', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                dir={isRTL ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-100 p-4 rounded-lg">
          <h3 className={`font-bold text-slate-700 mb-3 ${isRTL ? 'text-right' : ''}`}>{getLabel('pedagogy_and_assessment', 'PEDAGOGY AND ASSESSMENT')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={formData.pedagogy_positive_environment}
                onChange={(e) => handleChange('pedagogy_positive_environment', e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{getLabel('pedagogy_positive_environment', 'Creating a positive learning environment')}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={formData.pedagogy_connecting_learning}
                onChange={(e) => handleChange('pedagogy_connecting_learning', e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{getLabel('pedagogy_connecting_learning', 'Connecting prior learning to new learning')}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={formData.pedagogy_reflective_practice}
                onChange={(e) => handleChange('pedagogy_reflective_practice', e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{getLabel('pedagogy_reflective_practice', 'Fostering reflective practice')}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={formData.pedagogy_meaningful_learning}
                onChange={(e) => handleChange('pedagogy_meaningful_learning', e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{getLabel('pedagogy_meaningful_learning', 'Making learning meaningful')}</span>
            </label>
            <label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={formData.pedagogy_individual_differences}
                onChange={(e) => handleChange('pedagogy_individual_differences', e.target.checked)}
                className="w-4 h-4 text-sky-500 border-slate-300 rounded focus:ring-sky-500"
              />
              <span className="text-sm text-slate-700">{getLabel('pedagogy_individual_differences', 'Recognizing individual differences')}</span>
            </label>
          </div>

          <div className="border-t border-slate-300 pt-4 mt-4">
            <h4 className={`font-bold text-slate-700 mb-3 ${isRTL ? 'text-right' : ''}`}>{getLabel('rubrics', 'Rubrics')}</h4>
            {formData.rubrics_file_name ? (
              <div className="flex items-center gap-3 p-3 bg-white border border-slate-300 rounded-lg">
                <FileText className="w-5 h-5 text-sky-600" />
                <span className="flex-1 text-sm text-slate-700">{formData.rubrics_file_name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  id="rubrics-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
                <label
                  htmlFor="rubrics-upload"
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition ${uploadingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                  <span className="text-sm text-slate-600">
                    {uploadingFile ? 'Uploading...' : 'Click to upload rubrics file'}
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={loading}
            className="flex-1 bg-slate-500 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {t('saveDraftButton')}
          </button>
          <button
            onClick={() => handleSubmit('submitted')}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {t('submitButton')}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-6 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('cancelButton')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
