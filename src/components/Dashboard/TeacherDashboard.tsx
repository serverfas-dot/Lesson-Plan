import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LessonPlanForm } from '../LessonPlan/LessonPlanForm';
import { LessonPlanView } from '../LessonPlan/LessonPlanView';
import { Plus, FileText, CheckCircle, Clock, XCircle, LogOut, Eye, Download, AlertCircle, Edit, MessageSquare, Save, History, Copy, Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Database } from '../../types/database.types';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];

interface LessonPlanWithCounts extends LessonPlan {
  revision_request_count?: number;
  revision_completed_count?: number;
}

export function TeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlanWithCounts[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<LessonPlanWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'dhivehi'>('english');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [addingReflectionFor, setAddingReflectionFor] = useState<string | null>(null);
  const [reflectionData, setReflectionData] = useState({
    objectives_achieved: false,
    activities_effective: false,
    implemented_as_planned: false,
    notes: ''
  });
  const [savingReflection, setSavingReflection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (profile?.id) loadLessonPlans();
  }, [profile?.id]);

  useEffect(() => {
    filterLessonPlans();
  }, [lessonPlans, searchTerm]);

  const toggleWeekFolder = (weekNumber: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  const groupPlansByWeek = (plans: LessonPlanWithCounts[]) => {
    const grouped = new Map<number, LessonPlanWithCounts[]>();
    plans.forEach(plan => {
      const weekNumber = plan.week || 0;
      if (!grouped.has(weekNumber)) {
        grouped.set(weekNumber, []);
      }
      grouped.get(weekNumber)!.push(plan);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
  };

  const filterLessonPlans = () => {
    let filtered = [...lessonPlans];

    if (searchTerm) {
      filtered = filtered.filter(plan =>
        plan.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPlans(filtered);
  };

  const loadLessonPlans = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const planIds = (data || []).map(plan => plan.id);
      if (planIds.length === 0) {
        setLessonPlans([]);
        return;
      }

      const { data: revisionHistory, error: revisionError } = await supabase
        .from('revision_history')
        .select('lesson_plan_id, action_type')
        .in('lesson_plan_id', planIds);

      if (revisionError) throw revisionError;

      const revisionCounts = new Map<string, { requested: number; completed: number }>();
      (revisionHistory || []).forEach(revision => {
        const counts = revisionCounts.get(revision.lesson_plan_id) || { requested: 0, completed: 0 };
        if (revision.action_type === 'revision_requested') counts.requested++;
        if (revision.action_type === 'revision_completed' || revision.action_type === 'resubmitted') counts.completed++;
        revisionCounts.set(revision.lesson_plan_id, counts);
      });

      setLessonPlans((data || []).map(plan => ({
        ...plan,
        revision_request_count: revisionCounts.get(plan.id)?.requested || 0,
        revision_completed_count: revisionCounts.get(plan.id)?.completed || 0
      })));
    } catch (error) {
      console.error('Error loading lesson plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPlanId(undefined);
    loadLessonPlans();
  };

  const handleEdit = (planId: string, status: string, revisionRequested: boolean = false) => {
    if (status === 'draft' || revisionRequested) {
      setSelectedPlanId(planId);
      setShowForm(true);
    }
  };

  const handleAddReflection = (planId: string) => {
    setAddingReflectionFor(planId);
    setReflectionData({
      objectives_achieved: false,
      activities_effective: false,
      implemented_as_planned: false,
      notes: ''
    });
  };

  const handleSaveReflection = async (planId: string) => {
    setSavingReflection(true);
    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({
          reflection_objectives_achieved: reflectionData.objectives_achieved,
          reflection_activities_effective: reflectionData.activities_effective,
          reflection_implemented_as_planned: reflectionData.implemented_as_planned,
          reflection_notes: reflectionData.notes
        })
        .eq('id', planId);

      if (error) throw error;

      setAddingReflectionFor(null);
      setReflectionData({
        objectives_achieved: false,
        activities_effective: false,
        implemented_as_planned: false,
        notes: ''
      });
      loadLessonPlans();
      alert('Reflection added successfully!');
    } catch (error) {
      console.error('Error saving reflection:', error);
      alert('Failed to save reflection');
    } finally {
      setSavingReflection(false);
    }
  };

  const handleCancelReflection = () => {
    setAddingReflectionFor(null);
    setReflectionData({
      objectives_achieved: false,
      activities_effective: false,
      implemented_as_planned: false,
      notes: ''
    });
  };

  const handleDownloadWord = async (plan: LessonPlan) => {
    try {
      const { data: approval } = await supabase
        .from('approvals')
        .select('*')
        .eq('lesson_plan_id', plan.id)
        .maybeSingle();

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: plan.title || 'Lesson Plan (First Semester – 2025)',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Week: ", bold: true }),
                new TextRun(plan.week.toString() + "     "),
                new TextRun({ text: "Date: ", bold: true }),
                new TextRun(new Date(plan.date).toLocaleDateString() + "     "),
                new TextRun({ text: "Duration: ", bold: true }),
                new TextRun(plan.duration),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Lesson No: ", bold: true }),
                new TextRun(plan.lesson_no + "     "),
                new TextRun({ text: "Class(es): ", bold: true }),
                new TextRun(plan.class + "     "),
                new TextRun({ text: "Subject: ", bold: true }),
                new TextRun(plan.subject),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "No. of Students: ", bold: true }),
                new TextRun(plan.no_of_students.toString() + "     "),
                new TextRun({ text: "Topic: ", bold: true }),
                new TextRun(plan.topic),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Strand: ", bold: true }),
                new TextRun(plan.strand + "     "),
                new TextRun({ text: "Sub-strand: ", bold: true }),
                new TextRun(plan.sub_strand),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Outcome: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.outcome }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Indicator(s): ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.indicators }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Learning Intention: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.learning_intention }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Success Criteria: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.success_criteria }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Prior Knowledge: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.prior_knowledge }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Key Competencies: ", bold: true }),
                new TextRun(plan.key_competencies + "     "),
                new TextRun({ text: "Shared Values: ", bold: true }),
                new TextRun(plan.shared_values),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Materials Needed: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.materials_needed }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "INSTRUCTIONAL PROCEDURES",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "INTRODUCTION",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(plan.introduction_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.introduction_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.introduction_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "BODY",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(plan.body_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.body_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.body_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "EVALUATION",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(plan.evaluation_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.evaluation_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.evaluation_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "CONCLUSION",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(plan.conclusion_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.conclusion_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: plan.conclusion_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "REFLECTION",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.reflection_objectives_achieved ? '☑ ' : '☐ ' }),
                new TextRun('Objectives achieved'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.reflection_activities_effective ? '☑ ' : '☐ ' }),
                new TextRun('Learning activities effective'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.reflection_implemented_as_planned ? '☑ ' : '☐ ' }),
                new TextRun('Implemented as per the lesson plan'),
              ],
            }),
            ...(plan.reflection_notes ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Strengths and areas for improvement: ", bold: true }),
                ],
              }),
              new Paragraph({ text: plan.reflection_notes }),
            ] : []),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "PEDAGOGY AND ASSESSMENT",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.pedagogy_positive_environment ? '☑ ' : '☐ ' }),
                new TextRun('Creating a positive learning environment'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.pedagogy_connecting_learning ? '☑ ' : '☐ ' }),
                new TextRun('Connecting prior learning to new learning'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.pedagogy_reflective_practice ? '☑ ' : '☐ ' }),
                new TextRun('Fostering reflective practice'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.pedagogy_meaningful_learning ? '☑ ' : '☐ ' }),
                new TextRun('Making learning meaningful'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: plan.pedagogy_individual_differences ? '☑ ' : '☐ ' }),
                new TextRun('Recognizing individual differences'),
              ],
            }),
            new Paragraph({ text: "" }),

            ...(approval ? [
              new Paragraph({
                text: "APPROVED BY",
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Leading Teacher: ", bold: true }),
                  new TextRun(approval.leading_teacher_name),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Approved on: ", bold: true }),
                  new TextRun(new Date(approval.approved_at).toLocaleString()),
                ],
              }),
              ...(approval.comments ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Comments: ", bold: true }),
                    new TextRun(approval.comments),
                  ],
                }),
              ] : []),
            ] : []),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `lesson-plan-${plan.topic}-${new Date().toLocaleDateString()}.docx`);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document');
    }
  };

  const handleView = (plan: LessonPlan) => {
    setViewingPlan(plan);
  };

  const handleDuplicate = async (plan: LessonPlan) => {
    try {
      const newPlanData = {
        teacher_id: profile!.id,
        leading_teacher_id: plan.leading_teacher_id,
        week: plan.week,
        date: plan.date,
        duration: plan.duration,
        lesson_no: plan.lesson_no,
        class: plan.class,
        subject: plan.subject,
        no_of_students: plan.no_of_students,
        topic: plan.topic,
        strand: plan.strand,
        sub_strand: plan.sub_strand,
        outcome: plan.outcome,
        indicators: plan.indicators,
        learning_intention: plan.learning_intention,
        success_criteria: plan.success_criteria,
        prior_knowledge: plan.prior_knowledge,
        key_competencies: plan.key_competencies,
        shared_values: plan.shared_values,
        materials_needed: plan.materials_needed,
        introduction_time: plan.introduction_time,
        introduction_teacher_activity: plan.introduction_teacher_activity,
        introduction_student_activity: plan.introduction_student_activity,
        body_time: plan.body_time,
        body_teacher_activity: plan.body_teacher_activity,
        body_student_activity: plan.body_student_activity,
        evaluation_time: plan.evaluation_time,
        evaluation_teacher_activity: plan.evaluation_teacher_activity,
        evaluation_student_activity: plan.evaluation_student_activity,
        conclusion_time: plan.conclusion_time,
        conclusion_teacher_activity: plan.conclusion_teacher_activity,
        conclusion_student_activity: plan.conclusion_student_activity,
        pedagogy_positive_environment: plan.pedagogy_positive_environment,
        pedagogy_connecting_learning: plan.pedagogy_connecting_learning,
        pedagogy_reflective_practice: plan.pedagogy_reflective_practice,
        pedagogy_meaningful_learning: plan.pedagogy_meaningful_learning,
        pedagogy_individual_differences: plan.pedagogy_individual_differences,
        created_by_role: 'teacher',
        status: 'draft',
        submitted_at: null,
        revision_requested_by: null,
        revision_requested_at: null,
        revision_feedback: null,
        principal_status: 'pending',
        reflection_objectives_achieved: false,
        reflection_activities_effective: false,
        reflection_implemented_as_planned: false,
        reflection_notes: '',
        title: plan.title,
        rubrics_file_url: plan.rubrics_file_url,
        rubrics_file_name: plan.rubrics_file_name,
        language: plan.language || 'english'
      };

      const { data, error } = await supabase
        .from('lesson_plans')
        .insert([newPlanData])
        .select()
        .single();

      if (error) {
        console.error('Duplication error details:', error);
        throw error;
      }

      await loadLessonPlans();
      alert('Lesson plan duplicated successfully! You can now edit and submit it.');
    } catch (error: any) {
      console.error('Error duplicating lesson plan:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to duplicate lesson plan: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string, revisionRequested: boolean = false) => {
    if (revisionRequested) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border bg-orange-100 text-orange-700 border-orange-300">
          <AlertCircle className="w-4 h-4" />
          Changes Requested
        </span>
      );
    }

    const styles = {
      draft: 'bg-slate-100 text-slate-700 border-slate-300',
      submitted: 'bg-amber-100 text-amber-700 border-amber-300',
      approved: 'bg-green-100 text-green-700 border-green-300',
      rejected: 'bg-red-100 text-red-700 border-red-300',
    };

    const icons = {
      draft: <FileText className="w-4 h-4" />,
      submitted: <Clock className="w-4 h-4" />,
      approved: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (showForm) {
    return (
      <LessonPlanForm
        lessonPlanId={selectedPlanId}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowForm(false);
          setSelectedPlanId(undefined);
        }}
        language={selectedLanguage}
      />
    );
  }

  if (viewingPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <button
              onClick={() => setViewingPlan(null)}
              className="text-sky-600 hover:text-sky-700 font-medium mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-800">View Lesson Plan</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <LessonPlanView lessonPlan={viewingPlan} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Teacher Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Welcome, {profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-800">My Lesson Plans</h2>
          <div className="relative">
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-5 h-5" />
              Create New Lesson Plan
            </button>
            {showLanguageDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setSelectedLanguage('english');
                      setShowForm(true);
                      setShowLanguageDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-sky-50 transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                      EN
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">English Version</div>
                      <div className="text-xs text-slate-500">Create lesson plan in English</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLanguage('dhivehi');
                      setShowForm(true);
                      setShowLanguageDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-sky-50 transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                      DV
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">ދިވެހި ވާޝަން</div>
                      <div className="text-xs text-slate-500">ދިވެހި ބަހުން ދަރުސް ޕްލޭން ހެދުން</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!loading && lessonPlans.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by class, subject, or topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-sky-600 mx-auto"></div>
            <p className="mt-6 text-slate-700 font-medium text-lg">Loading lesson plans...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait</p>
          </div>
        ) : lessonPlans.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No lesson plans yet</h3>
            <p className="text-slate-500 mb-6">Create your first lesson plan to get started</p>
            <div className="relative inline-block">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium px-6 py-3 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Lesson Plan
              </button>
              {showLanguageDropdown && (
                <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedLanguage('english');
                        setShowForm(true);
                        setShowLanguageDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-sky-50 transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                        EN
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">English Version</div>
                        <div className="text-xs text-slate-500">Create lesson plan in English</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedLanguage('dhivehi');
                        setShowForm(true);
                        setShowLanguageDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-sky-50 transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 font-bold">
                        DV
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">ދިވެހި ވާޝަން</div>
                        <div className="text-xs text-slate-500">ދިވެހި ބަހުން ދަރުސް ޕްލޭން ހެދުން</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No lesson plans found</h3>
            <p className="text-slate-500">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupPlansByWeek(filteredPlans).map(([weekNumber, weekPlans]) => {
              const isExpanded = expandedWeeks.has(weekNumber);
              return (
                <div key={weekNumber} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <button
                    onClick={() => toggleWeekFolder(weekNumber)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <FolderOpen className="w-5 h-5 text-sky-600" />
                      ) : (
                        <Folder className="w-5 h-5 text-sky-600" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-slate-800">Week {weekNumber}</h3>
                        <p className="text-sm text-slate-600">{weekPlans.length} lesson plan{weekPlans.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        {(() => {
                          const draftCount = weekPlans.filter(p => p.status === 'draft').length;
                          const pendingCount = weekPlans.filter(p => p.status === 'pending' || p.status === 'submitted').length;
                          const approvedCount = weekPlans.filter(p => p.status === 'approved').length;
                          const needsRevisionCount = weekPlans.filter(p => p.status === 'needs_revision').length;
                          return (
                            <>
                              {draftCount > 0 && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                                  {draftCount} draft
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                                  {pendingCount} pending
                                </span>
                              )}
                              {approvedCount > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                  {approvedCount} approved
                                </span>
                              )}
                              {needsRevisionCount > 0 && (
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                                  {needsRevisionCount} needs revision
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 p-4 bg-gradient-to-br from-blue-50 to-sky-100">
                      <div className="space-y-4">
                        {weekPlans.map((plan) => {
              const hasRevisionRequest = plan.revision_requested_by && plan.revision_feedback;
              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{plan.topic}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {plan.subject} - Class {plan.class} - Week {plan.week}
                      </p>
                    </div>
                    {getStatusBadge(plan.status, hasRevisionRequest)}
                  </div>

                  {hasRevisionRequest && (
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800 mb-1">
                            Changes requested by {plan.revision_requested_by === 'leading_teacher' ? 'Leading Teacher' : 'Principal'}
                          </p>
                          <p className="text-sm text-orange-700">{plan.revision_feedback}</p>
                          <p className="text-xs text-orange-600 mt-1">
                            Requested on {plan.revision_requested_at ? new Date(plan.revision_requested_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {plan.status === 'approved' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-slate-700">Reflection Status:</span>
                          {(plan.reflection_objectives_achieved || plan.reflection_activities_effective || plan.reflection_implemented_as_planned || (plan.reflection_notes && plan.reflection_notes.trim() !== '')) ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              ✓ Added
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                              Not Added
                            </span>
                          )}
                        </div>
                      </div>

                      {(plan.reflection_objectives_achieved || plan.reflection_activities_effective || plan.reflection_implemented_as_planned || (plan.reflection_notes && plan.reflection_notes.trim() !== '')) ? (
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-100 border border-slate-200 rounded-lg space-y-3">
                          <h4 className="font-bold text-slate-800 mb-3">REFLECTION</h4>
                          <div className="flex flex-wrap items-center gap-6 mb-3">
                            <div className="flex items-center gap-2">
                              {plan.reflection_objectives_achieved ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-slate-300">○</span>
                              )}
                              <span className="text-sm text-slate-700">Objectives achieved</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {plan.reflection_activities_effective ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-slate-300">○</span>
                              )}
                              <span className="text-sm text-slate-700">Learning activities effective</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {plan.reflection_implemented_as_planned ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-slate-300">○</span>
                              )}
                              <span className="text-sm text-slate-700">Implemented as per the lesson plan</span>
                            </div>
                          </div>
                          {plan.reflection_notes && (
                            <div>
                              <p className="text-sm font-bold text-slate-800 mb-2">Strengths and areas for improvement</p>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">{plan.reflection_notes}</p>
                            </div>
                          )}
                        </div>
                      ) : addingReflectionFor === plan.id ? (
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-100 border border-slate-200 rounded-lg">
                          <h4 className="font-bold text-slate-800 mb-3">REFLECTION</h4>
                          <div className="flex flex-wrap items-center gap-6 mb-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={reflectionData.objectives_achieved}
                                onChange={(e) => setReflectionData({...reflectionData, objectives_achieved: e.target.checked})}
                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                              />
                              <label className="text-sm text-slate-700">Objectives achieved</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={reflectionData.activities_effective}
                                onChange={(e) => setReflectionData({...reflectionData, activities_effective: e.target.checked})}
                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                              />
                              <label className="text-sm text-slate-700">Learning activities effective</label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={reflectionData.implemented_as_planned}
                                onChange={(e) => setReflectionData({...reflectionData, implemented_as_planned: e.target.checked})}
                                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500 rounded"
                              />
                              <label className="text-sm text-slate-700">Implemented as per the lesson plan</label>
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              Strengths and areas for improvement
                            </label>
                            <textarea
                              value={reflectionData.notes}
                              onChange={(e) => setReflectionData({...reflectionData, notes: e.target.value})}
                              rows={3}
                              placeholder="Enter your reflection notes..."
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveReflection(plan.id)}
                              disabled={savingReflection}
                              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm"
                            >
                              <Save className="w-4 h-4" />
                              {savingReflection ? 'Saving...' : 'Save Reflection'}
                            </button>
                            <button
                              onClick={handleCancelReflection}
                              disabled={savingReflection}
                              className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-4 py-2 rounded-lg transition disabled:opacity-50 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddReflection(plan.id)}
                          className="w-full p-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition text-sm font-medium text-blue-700 flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Add Reflection
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Date:</span>
                      <span className="ml-2 text-slate-700 font-medium">{new Date(plan.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Duration:</span>
                      <span className="ml-2 text-slate-700 font-medium">{plan.duration}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Lesson No:</span>
                      <span className="ml-2 text-slate-700 font-medium">{plan.lesson_no}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Students:</span>
                      <span className="ml-2 text-slate-700 font-medium">{plan.no_of_students}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-sm">
                      <History className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-600">Revision History:</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plan.revision_request_count! > 0 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'}`}>
                        {plan.revision_request_count || 0} request{plan.revision_request_count !== 1 ? 's' : ''}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plan.revision_completed_count! > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                        {plan.revision_completed_count || 0} correction{plan.revision_completed_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {plan.status === 'draft' && (
                      <button
                        onClick={() => handleEdit(plan.id, plan.status)}
                        className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg transition"
                      >
                        Edit Draft
                      </button>
                    )}
                    {hasRevisionRequest && (
                      <button
                        onClick={() => handleEdit(plan.id, plan.status, true)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit and Resubmit
                      </button>
                    )}
                    {plan.status === 'approved' && !hasRevisionRequest && (
                      <>
                        <button
                          onClick={() => handleView(plan)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Approved Plan
                        </button>
                        <button
                          onClick={() => handleDuplicate(plan)}
                          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg transition"
                          title="Create a copy of this lesson plan to edit and resubmit"
                        >
                          <Copy className="w-4 h-4" />
                          Copy & Reuse
                        </button>
                        <button
                          onClick={() => handleDownloadWord(plan)}
                          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-medium px-4 py-2 rounded-lg transition"
                        >
                          <Download className="w-4 h-4" />
                          Download Word
                        </button>
                      </>
                    )}
                    {(plan.status === 'submitted' || plan.status === 'rejected') && !hasRevisionRequest && (
                      <button
                        onClick={() => handleView(plan)}
                        className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
