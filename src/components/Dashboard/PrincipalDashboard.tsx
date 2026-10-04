import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, FileText, CheckCircle, Clock, LogOut, Eye, UserPlus, Trash2, XCircle, AlertCircle, ChevronDown, ChevronRight, Folder, FolderOpen, Upload, Edit2, Settings, Calendar, ChevronLeft, BarChart3 } from 'lucide-react';
import { Database } from '../../types/database.types';
import { LessonPlanView } from '../LessonPlan/LessonPlanView';
import { LessonPlanSummary } from './LessonPlanSummary';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const lessonPlanListSelect = `
  id, teacher_id, leading_teacher_id, title, week, date, duration, lesson_no, class, subject,
  topic, status, principal_status, submitted_at, approved_at, created_at,
  revision_requested_by, revision_feedback, revision_requested_at,
  reflection_objectives_achieved, reflection_activities_effective,
  reflection_implemented_as_planned, reflection_notes,
  teacher:profiles!lesson_plans_teacher_id_fkey(id, full_name, email),
  leading_teacher:profiles!lesson_plans_leading_teacher_id_fkey(id, full_name, email)
`;

interface LessonPlanWithDetails extends LessonPlan {
  teacher: Profile;
  leading_teacher: Profile;
}

interface LeadingTeacherGroup {
  leadingTeacher: Profile;
  teachers: Profile[];
  lessonPlans: LessonPlanWithDetails[];
}

export function PrincipalDashboard() {
  const { profile, signOut } = useAuth();
  const [groups, setGroups] = useState<LeadingTeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanWithDetails | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showLeadingTeacherModal, setShowLeadingTeacherModal] = useState(false);
  const [availableLeadingTeachers, setAvailableLeadingTeachers] = useState<Profile[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [comments, setComments] = useState('');
  const [leadingTeacherPlans, setLeadingTeacherPlans] = useState<LessonPlanWithDetails[]>([]);
  const [filteredLeadingTeacherPlans, setFilteredLeadingTeacherPlans] = useState<LessonPlanWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadingTeacher, setSelectedLeadingTeacher] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [expandedLeadingTeachers, setExpandedLeadingTeachers] = useState<Set<string>>(new Set());
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [showAddLeadingTeacherModal, setShowAddLeadingTeacherModal] = useState(false);
  const [showEditLeadingTeacherModal, setShowEditLeadingTeacherModal] = useState(false);
  const [editingLeadingTeacher, setEditingLeadingTeacher] = useState<Profile | null>(null);
  const [editLeadingTeacherName, setEditLeadingTeacherName] = useState('');
  const [editLeadingTeacherEmail, setEditLeadingTeacherEmail] = useState('');
  const [availableTeachers, setAvailableTeachers] = useState<Profile[]>([]);
  const [selectedTeacherForPromotion, setSelectedTeacherForPromotion] = useState<string>('');
  const [showWeeklyTracking, setShowWeeklyTracking] = useState(false);
  const [trackingWeekStart, setTrackingWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [allTeachers, setAllTeachers] = useState<Profile[]>([]);
  const [weeklySubmissions, setWeeklySubmissions] = useState<Map<string, LessonPlanWithDetails[]>>(new Map());
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [allWeeklyPlans, setAllWeeklyPlans] = useState<LessonPlanWithDetails[]>([]);
  const [showTeacherReport, setShowTeacherReport] = useState(false);
  const initialPlans = useRef<LessonPlanWithDetails[]>([]);

  useEffect(() => {
    if (profile?.id) loadData();
  }, [profile?.id]);

  // Server-side filtered fetch for All Lesson Plans section
  useEffect(() => {
    if (loading || initialPlans.current.length === 0) return;

    const hasActiveFilter = selectedLeadingTeacher !== 'all' || selectedYear !== 'all' || selectedSemester !== 'all' || selectedWeek !== 'all';
    if (hasActiveFilter) {
      loadFilteredLeadingTeacherPlans();
    } else {
      setLeadingTeacherPlans(initialPlans.current);
    }
  }, [loading, selectedLeadingTeacher, selectedYear, selectedSemester, selectedWeek]);

  // Client-side search filter on the already-fetched set
  useEffect(() => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      setFilteredLeadingTeacherPlans(leadingTeacherPlans.filter(plan =>
        (plan.topic || '').toLowerCase().includes(q) ||
        (plan.subject || '').toLowerCase().includes(q) ||
        (plan.title || '').toLowerCase().includes(q) ||
        (plan.teacher?.full_name || '').toLowerCase().includes(q)
      ));
    } else {
      setFilteredLeadingTeacherPlans(leadingTeacherPlans);
    }
  }, [leadingTeacherPlans, searchTerm]);

  const toggleLeadingTeacherFolder = (leadingTeacherId: string) => {
    setExpandedLeadingTeachers(prev => {
      const next = new Set(prev);
      if (next.has(leadingTeacherId)) {
        next.delete(leadingTeacherId);
      } else {
        next.add(leadingTeacherId);
      }
      return next;
    });
  };

  const groupPlansByLeadingTeacher = (plans: LessonPlanWithDetails[]) => {
    const grouped = new Map<string, LessonPlanWithDetails[]>();
    plans.forEach(plan => {
      // For leading teacher's own plans, leading_teacher_id is NULL, so use teacher_id
      const leadingTeacherId = plan.leading_teacher_id || plan.teacher_id;
      if (!leadingTeacherId) return;
      if (!grouped.has(leadingTeacherId)) {
        grouped.set(leadingTeacherId, []);
      }
      grouped.get(leadingTeacherId)!.push(plan);
    });
    return grouped;
  };

  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(trackingWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setTrackingWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    setTrackingWeekStart(getWeekStart(new Date()));
  };

  const loadWeeklySubmissions = async () => {
    try {
      const weekEnd = new Date(trackingWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const { data: plans, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          teacher:profiles!lesson_plans_teacher_id_fkey(*),
          leading_teacher:profiles!lesson_plans_leading_teacher_id_fkey(*)
        `)
        .gte('date', trackingWeekStart.toISOString())
        .lte('date', weekEnd.toISOString());

      if (error) throw error;

      const submissionMap = new Map<string, LessonPlanWithDetails[]>();
      (plans as any || []).forEach((plan: LessonPlanWithDetails) => {
        const teacherId = plan.teacher_id;
        if (!submissionMap.has(teacherId)) {
          submissionMap.set(teacherId, []);
        }
        submissionMap.get(teacherId)!.push(plan);
      });

      setWeeklySubmissions(submissionMap);
      setAllWeeklyPlans(plans as any || []);
    } catch (error) {
      console.error('Error loading weekly submissions:', error);
    }
  };

  const toggleTeacherExpansion = (teacherId: string) => {
    setExpandedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (showWeeklyTracking) {
      loadWeeklySubmissions();
    }
  }, [trackingWeekStart, showWeeklyTracking]);

  const loadData = async () => {
    try {
      // Fetch all data in parallel for better performance
      const [
        { data: leadingTeachers, error: ltError },
        { data: allTeachers, error: teachersError },
        { data: allPlans, error: plansError }
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['leading_teacher', 'principal'])
          .order('full_name'),

        supabase
          .from('profiles')
          .select('*')
          .not('leading_teacher_id', 'is', null)
          .order('full_name'),

        supabase
          .from('lesson_plans')
          .select(lessonPlanListSelect)
          .neq('status', 'draft')
          .order('date', { ascending: false })
          .limit(500)
      ]);

      if (ltError) throw ltError;
      if (teachersError) throw teachersError;
      if (plansError) throw plansError;

      // Group data by leading teacher — use the teacher's current leading_teacher_id
      // from their profile, not the potentially stale leading_teacher_id on the lesson plan
      const teacherToLT = new Map<string, string | null>();
      (allTeachers || []).forEach(t => teacherToLT.set(t.id, t.leading_teacher_id));

      const groupsData: LeadingTeacherGroup[] = (leadingTeachers || []).map(lt => ({
        leadingTeacher: lt,
        teachers: (allTeachers || []).filter(t => t.leading_teacher_id === lt.id),
        lessonPlans: (allPlans as any || []).filter((p: any) => {
          const currentLT = teacherToLT.get(p.teacher_id);
          return currentLT === lt.id;
        }),
      }));

      const initialVisiblePlans = (allPlans || []) as LessonPlanWithDetails[];
      initialPlans.current = initialVisiblePlans;
      setLeadingTeacherPlans(initialVisiblePlans);
      setGroups(groupsData);
      setAllTeachers([...(leadingTeachers || []), ...(allTeachers || [])]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSemesterDateRange = (year: string, semester: string) => {
    const yearNum = parseInt(year);
    if (semester === 'first') {
      return {
        start: new Date(yearNum, 0, 25),
        end: new Date(yearNum, 6, 16)
      };
    } else if (semester === 'second') {
      return {
        start: new Date(yearNum, 7, 2),
        end: new Date(yearNum, 11, 17)
      };
    }
    return null;
  };

  const loadFilteredLeadingTeacherPlans = async () => {
    setFilteredLoading(true);
    try {
      let query = supabase
        .from('lesson_plans')
        .select(lessonPlanListSelect)
        .neq('status', 'draft');

      if (selectedLeadingTeacher !== 'all') {
        query = query.or(`leading_teacher_id.eq.${selectedLeadingTeacher},and(leading_teacher_id.is.null,teacher_id.eq.${selectedLeadingTeacher})`);
      }

      if (selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear);
        query = query.gte('date', `${yearNum}-01-01`).lte('date', `${yearNum}-12-31`);
      }

      if (selectedSemester !== 'all' && selectedYear !== 'all') {
        const dateRange = getSemesterDateRange(selectedYear, selectedSemester);
        if (dateRange) {
          const startStr = `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, '0')}-${String(dateRange.start.getDate()).padStart(2, '0')}`;
          const endStr = `${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, '0')}-${String(dateRange.end.getDate()).padStart(2, '0')}`;
          query = query.gte('date', startStr).lte('date', endStr);
        }
      }

      if (selectedWeek !== 'all') {
        query = query.eq('week', parseInt(selectedWeek));
      }

      const { data, error } = await query.order('date', { ascending: false }).limit(500);

      if (error) throw error;

      setLeadingTeacherPlans((data || []) as any);
    } catch (error) {
      console.error('Error loading filtered leading teacher plans:', error);
    } finally {
      setFilteredLoading(false);
    }
  };

  const availableYears = [2026, 2027, 2028, 2029, 2030];
  const availableWeeks = Array.from({ length: 30 }, (_, i) => i + 1);

  const loadAvailableLeadingTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['leading_teacher', 'principal'])
        .order('full_name');

      if (error) throw error;
      setAvailableLeadingTeachers(data || []);
    } catch (error) {
      console.error('Error loading available leading teachers:', error);
    }
  };

  const loadAvailableTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .is('leading_teacher_id', null)
        .order('full_name');

      if (error) throw error;
      setAvailableTeachers(data || []);
    } catch (error) {
      console.error('Error loading available teachers:', error);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignaturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSignature = async () => {
    if (!signatureFile || !profile) return;
    setUploadingSignature(true);

    try {
      const fileExt = signatureFile.name.split('.').pop();
      const fileName = `signature-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, signatureFile, {
          upsert: true,
          contentType: signatureFile.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ signature_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      setShowSignatureModal(false);
      setSignatureFile(null);
      setSignaturePreview(null);
      window.location.reload();
      alert('Signature uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      alert(`Failed to upload signature: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleAddLeadingTeacher = async () => {
    if (!selectedTeacherForPromotion) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'leading_teacher' })
        .eq('id', selectedTeacherForPromotion);

      if (error) throw error;

      setShowAddLeadingTeacherModal(false);
      setSelectedTeacherForPromotion('');
      await loadData();
      alert('Leading teacher added successfully!');
    } catch (error) {
      console.error('Error adding leading teacher:', error);
      alert('Failed to add leading teacher');
    }
  };

  const handleEditLeadingTeacher = async () => {
    if (!editingLeadingTeacher) return;
    if (!editLeadingTeacherName.trim() || !editLeadingTeacherEmail.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editLeadingTeacherName,
          email: editLeadingTeacherEmail
        })
        .eq('id', editingLeadingTeacher.id);

      if (error) throw error;

      setShowEditLeadingTeacherModal(false);
      setEditingLeadingTeacher(null);
      setEditLeadingTeacherName('');
      setEditLeadingTeacherEmail('');
      await loadData();
      alert('Leading teacher updated successfully!');
    } catch (error) {
      console.error('Error updating leading teacher:', error);
      alert('Failed to update leading teacher');
    }
  };

  const handleRemoveLeadingTeacher = async (leadingTeacherId: string) => {
    if (!confirm('Are you sure you want to remove this leading teacher? All their teachers will be unassigned.')) return;

    try {
      await supabase
        .from('lesson_plans')
        .update({ leading_teacher_id: null })
        .eq('leading_teacher_id', leadingTeacherId);

      const { error: updateTeachersError } = await supabase
        .from('profiles')
        .update({ leading_teacher_id: null })
        .eq('leading_teacher_id', leadingTeacherId);

      if (updateTeachersError) throw updateTeachersError;

      const { error: deleteError } = await supabase
        .from('profiles')
        .update({ role: 'teacher' })
        .eq('id', leadingTeacherId);

      if (deleteError) throw deleteError;

      await loadData();
      alert('Leading teacher removed successfully');
    } catch (error) {
      console.error('Error removing leading teacher:', error);
      alert('Failed to remove leading teacher');
    }
  };




  const openPlanDetails = async (plan: LessonPlanWithDetails) => {
    setSelectedPlan(plan);

    const { data, error } = await supabase
      .from('lesson_plans')
      .select(`*, teacher:profiles!lesson_plans_teacher_id_fkey(*), leading_teacher:profiles!lesson_plans_leading_teacher_id_fkey(*)`)
      .eq('id', plan.id)
      .maybeSingle();

    if (!error && data) setSelectedPlan(data as LessonPlanWithDetails);
  };

  const handlePrincipalApprove = async () => {
    if (!selectedPlan || !profile) return;
    if (!profile.signature_url) {
      alert('Please set your signature first');
      return;
    }

    if (!confirm('Are you sure you want to approve this lesson plan?')) {
      return;
    }

    try {
      const { error: approvalError } = await supabase.from('principal_approvals').insert({
        lesson_plan_id: selectedPlan.id,
        principal_id: profile.id,
        principal_name: profile.full_name,
        signature_url: profile.signature_url,
        comments,
      });

      if (approvalError) throw approvalError;

      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({
          status: 'approved',
          principal_status: 'approved'
        })
        .eq('id', selectedPlan.id);

      if (updateError) throw updateError;

      setShowApprovalModal(false);
      setSelectedPlan(null);
      setComments('');

      setLeadingTeacherPlans(prev =>
        prev.map(plan =>
          plan.id === selectedPlan.id
            ? { ...plan, status: 'approved', principal_status: 'approved' }
            : plan
        )
      );

      alert('Lesson plan approved successfully!');
    } catch (error) {
      console.error('Error approving lesson plan:', error);
      alert('Failed to approve lesson plan');
    }
  };

  const handlePrincipalReject = async () => {
    if (!selectedPlan) return;

    if (!confirm('Are you sure you want to reject this lesson plan?')) return;

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({ principal_status: 'rejected' })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      setShowApprovalModal(false);
      setSelectedPlan(null);

      setLeadingTeacherPlans(prev =>
        prev.map(plan =>
          plan.id === selectedPlan.id
            ? { ...plan, principal_status: 'rejected' }
            : plan
        )
      );

      alert('Lesson plan rejected');
    } catch (error) {
      console.error('Error rejecting lesson plan:', error);
      alert('Failed to reject lesson plan');
    }
  };

  const handlePrincipalRequestChanges = async () => {
    if (!selectedPlan) return;
    if (!revisionFeedback.trim()) {
      alert('Please provide feedback for the requested changes');
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({
          revision_requested_by: 'principal',
          revision_feedback: revisionFeedback,
          revision_requested_at: new Date().toISOString(),
          principal_status: 'needs_revision',
          status: 'submitted'
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      const { error: historyError } = await supabase
        .from('revision_history')
        .insert({
          lesson_plan_id: selectedPlan.id,
          teacher_id: selectedPlan.teacher_id,
          leading_teacher_id: selectedPlan.leading_teacher_id,
          action_type: 'revision_requested',
          comments: revisionFeedback,
        });

      if (historyError) throw historyError;

      setShowRequestChangesModal(false);
      setSelectedPlan(null);
      setRevisionFeedback('');

      setLeadingTeacherPlans(prev =>
        prev.map(plan =>
          plan.id === selectedPlan.id
            ? {
                ...plan,
                revision_requested_by: 'principal',
                revision_feedback: revisionFeedback,
                revision_requested_at: new Date().toISOString()
              }
            : plan
        )
      );

      alert('Changes requested successfully! Leading Teacher will be notified.');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to request changes');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      submitted: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const totalTeachers = groups.reduce((sum, g) => sum + g.teachers.length, 0);
  const totalPlans = groups.reduce((sum, g) => sum + g.lessonPlans.length, 0);
  // Include both teacher plans and leading teacher's own plans in counts
  // Pending = plans waiting for PRINCIPAL approval (status = 'submitted')
  // Approved = plans approved BY PRINCIPAL (status = 'approved')
  const teacherPendingPlans = groups.reduce((sum, g) => sum + g.lessonPlans.filter(p => p.status === 'submitted').length, 0);
  const teacherApprovedPlans = groups.reduce((sum, g) => sum + g.lessonPlans.filter(p => p.status === 'approved').length, 0);
  const ltPendingPlans = leadingTeacherPlans.filter(p => p.status === 'submitted').length;
  const ltApprovedPlans = leadingTeacherPlans.filter(p => p.status === 'approved').length;
  const pendingPlans = teacherPendingPlans + ltPendingPlans;
  const approvedPlans = teacherApprovedPlans + ltApprovedPlans;

  if (selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-sky-600 hover:text-sky-700 font-medium mb-2"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-slate-800">View Lesson Plan</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <LessonPlanView lessonPlan={selectedPlan} />
          {selectedPlan.principal_status === 'pending' && (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => setShowApprovalModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve as Principal
              </button>
              <button
                onClick={() => setShowRequestChangesModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Request Changes
              </button>
              <button
                onClick={handlePrincipalReject}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          )}
          {selectedPlan.principal_status === 'approved' && (
            <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-semibold">This lesson plan has been approved by the Principal</p>
            </div>
          )}
          {selectedPlan.principal_status === 'rejected' && (
            <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-semibold">This lesson plan has been rejected by the Principal</p>
            </div>
          )}
        </div>

        {showApprovalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Approve Lesson Plan as Principal</h3>
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-2">Your signature will be automatically added to the approved lesson plan.</p>
                {profile?.signature_url && (
                  <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-2">Your Signature:</p>
                    <img src={profile.signature_url} alt="Signature" className="max-h-20" />
                  </div>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Comments (Optional)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  placeholder="Add any comments..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePrincipalApprove}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition"
                >
                  Confirm Approval
                </button>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setComments('');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showRequestChangesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Request Changes</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Changes *</label>
                <textarea
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Explain what changes are needed..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePrincipalRequestChanges}
                  disabled={!revisionFeedback.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Request
                </button>
                <button
                  onClick={() => {
                    setShowRequestChangesModal(false);
                    setRevisionFeedback('');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Principal Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Welcome, {profile?.full_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowWeeklyTracking(!showWeeklyTracking);
                if (!showWeeklyTracking) {
                  goToCurrentWeek();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showWeeklyTracking
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
              }`}
            >
              <Calendar className="w-5 h-5" />
              {showWeeklyTracking ? 'Hide' : 'Show'} Weekly Tracking
            </button>
            <button
              onClick={() => setShowTeacherReport(!showTeacherReport)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showTeacherReport
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              {showTeacherReport ? 'Hide' : 'Show'} Teacher Reports
            </button>
            <button
              onClick={() => setShowSignatureModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            >
              <Settings className="w-5 h-5" />
              {profile?.signature_url ? 'Update Signature' : 'Upload Signature'}
            </button>
            <button
              onClick={() => {
                loadAvailableLeadingTeachers();
                setShowLeadingTeacherModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
            >
              <UserPlus className="w-5 h-5" />
              Manage Leading Teachers
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Leading Teachers</p>
                <p className="text-2xl font-bold text-slate-800">{groups.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Teachers</p>
                <p className="text-2xl font-bold text-slate-800">{totalTeachers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending</p>
                <p className="text-2xl font-bold text-slate-800">{pendingPlans}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-slate-800">{approvedPlans}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-sky-600 mx-auto"></div>
            <p className="mt-6 text-slate-700 font-medium text-lg">Loading dashboard...</p>
            <p className="text-slate-500 text-sm mt-2">Please wait</p>
          </div>
        ) : (
          <div className="space-y-6">
            {showTeacherReport && (
              <LessonPlanSummary
                teacherIds={allTeachers.filter(t => t.role === 'teacher' || t.role === 'leading_teacher').map(t => t.id)}
                teachers={allTeachers.filter(t => t.role === 'teacher' || t.role === 'leading_teacher')}
                title="Teacher Lesson Plan Summary"
                subtitle="Monitor and review lesson planning across all teachers, subjects and classes."
                canEdit={true}
                onEdit={(planId) => {
                  const plan = allPlans.find(p => p.id === planId);
                  if (plan) openPlanDetails(plan);
                }}
              />
            )}

            {showWeeklyTracking && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-800">Weekly Submission Tracking</h2>
                    <p className="text-sm text-slate-600 mt-1">Monitor which teachers submitted lesson plans this week</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-2 hover:bg-slate-100 rounded-lg transition"
                      title="Previous Week"
                    >
                      <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="text-center px-4 py-2 bg-slate-100 rounded-lg">
                      <div className="text-sm font-medium text-slate-800">
                        {trackingWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' - '}
                        {new Date(trackingWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-2 hover:bg-slate-100 rounded-lg transition"
                      title="Next Week"
                    >
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                    <button
                      onClick={goToCurrentWeek}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition text-sm font-medium"
                    >
                      Current Week
                    </button>
                  </div>
                </div>

                {(() => {
                  const teachersWithSubmissions = Array.from(weeklySubmissions.keys()).length;
                  const teachersWithoutSubmissions = allTeachers.filter(t => t.role === 'teacher').length - teachersWithSubmissions;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Total Teachers</p>
                            <p className="text-2xl font-bold text-slate-800">{allTeachers.filter(t => t.role === 'teacher').length}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-3 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Submitted</p>
                            <p className="text-2xl font-bold text-green-700">{teachersWithSubmissions}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-red-100 p-3 rounded-lg">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Not Submitted</p>
                            <p className="text-2xl font-bold text-red-700">{teachersWithoutSubmissions}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-6">
                  <div className="bg-gradient-to-r from-sky-600 to-sky-700 rounded-lg p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">Leading Teachers Weekly Statistics</h3>
                    <p className="text-sky-100">Detailed lesson plan tracking for all leading teachers</p>
                  </div>

                  <div className="space-y-3">
                    {allTeachers.filter(t => t.role === 'leading_teacher' || t.role === 'principal').map((teacher) => {
                      const isExpanded = expandedTeachers.has(teacher.id);
                      const teacherPlans = weeklySubmissions.get(teacher.id) || [];
                      const totalPlans = teacherPlans.length;
                      const submittedPlans = teacherPlans.filter(p => p.status !== 'draft').length;
                      const draftPlans = teacherPlans.filter(p => p.status === 'draft').length;
                      const approvedPlans = teacherPlans.filter(p => p.principal_status === 'approved').length;
                      const pendingApproval = teacherPlans.filter(p => p.status === 'submitted' && !p.principal_status).length;

                      return (
                        <div key={teacher.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <button
                            onClick={() => toggleTeacherExpansion(teacher.id)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="w-5 h-5 text-sky-600" /> : <ChevronRight className="w-5 h-5 text-sky-600" />}
                              <div className="text-left">
                                <h4 className="font-semibold text-slate-800">{teacher.full_name}</h4>
                                <p className="text-xs text-slate-600">{teacher.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                Total: {totalPlans}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                Submitted: {submittedPlans}
                              </span>
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                Draft: {draftPlans}
                              </span>
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                Approved: {approvedPlans}
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 to-sky-100 p-4">
                              {totalPlans === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                                  <p className="text-sm">No lesson plans for this week</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {teacherPlans.map((plan) => (
                                    <div
                                      key={plan.id}
                                      className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition cursor-pointer"
                                      onClick={() => openPlanDetails(plan)}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-sky-600" />
                                            <span className="font-medium text-slate-800 text-sm">
                                              {plan.title || `${plan.class} - ${plan.subject}`}
                                            </span>
                                          </div>
                                          <div className="text-xs text-slate-600 space-y-1">
                                            <p>Class: {plan.class} | Subject: {plan.subject} | Week: {plan.week_number}</p>
                                            <p>Date: {new Date(plan.date).toLocaleDateString()}</p>
                                            {plan.submitted_at && (
                                              <p>Submitted: {new Date(plan.submitted_at).toLocaleString()}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end ml-3">
                                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            plan.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                            plan.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                            plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            'bg-red-100 text-red-700'
                                          }`}>
                                            {plan.status}
                                          </span>
                                          {plan.principal_status && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                              plan.principal_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                              'bg-red-100 text-red-700'
                                            }`}>
                                              Principal: {plan.principal_status}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white mt-8">
                    <h3 className="text-xl font-bold mb-2">Regular Teachers Weekly Statistics</h3>
                    <p className="text-green-100">Detailed lesson plan tracking for all teachers</p>
                  </div>

                  <div className="space-y-4">
                    {groups.map((group) => {
                      const groupTeachers = group.teachers;

                      return (
                        <div key={group.leadingTeacher.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="bg-slate-700 text-white p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-semibold text-lg">{group.leadingTeacher.full_name}'s Team</h3>
                                <p className="text-sm text-slate-300 mt-1">{group.leadingTeacher.email}</p>
                              </div>
                              <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                {groupTeachers.length} Teacher{groupTeachers.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="space-y-3">
                              {groupTeachers.map((teacher) => {
                                const isExpanded = expandedTeachers.has(teacher.id);
                                const teacherPlans = weeklySubmissions.get(teacher.id) || [];
                                const totalPlans = teacherPlans.length;
                                const submittedPlans = teacherPlans.filter(p => p.status !== 'draft').length;
                                const draftPlans = teacherPlans.filter(p => p.status === 'draft').length;
                                const approvedByLT = teacherPlans.filter(p => p.status === 'approved').length;
                                const approvedByPrincipal = teacherPlans.filter(p => p.principal_status === 'approved').length;
                                const pendingApproval = teacherPlans.filter(p => p.status === 'submitted').length;

                                return (
                                  <div key={teacher.id} className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg border border-slate-200 overflow-hidden">
                                    <button
                                      onClick={() => toggleTeacherExpansion(teacher.id)}
                                      className="w-full flex items-center justify-between p-3 hover:bg-slate-100 transition"
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-green-600" /> : <ChevronRight className="w-4 h-4 text-green-600" />}
                                        <div className="text-left">
                                          <h5 className="font-medium text-slate-800 text-sm">{teacher.full_name}</h5>
                                          <p className="text-xs text-slate-600">{teacher.email}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                          Total: {totalPlans}
                                        </span>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                          Submitted: {submittedPlans}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                          Draft: {draftPlans}
                                        </span>
                                        <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-medium">
                                          LT Approved: {approvedByLT}
                                        </span>
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                                          Principal Approved: {approvedByPrincipal}
                                        </span>
                                      </div>
                                    </button>

                                    {isExpanded && (
                                      <div className="border-t border-slate-200 bg-white p-3">
                                        {totalPlans === 0 ? (
                                          <div className="text-center py-6 text-slate-500">
                                            <XCircle className="w-6 h-6 mx-auto mb-2 text-red-400" />
                                            <p className="text-xs font-medium text-red-600">No lesson plans submitted this week</p>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            {teacherPlans.map((plan) => (
                                              <div
                                                key={plan.id}
                                                className="bg-gradient-to-br from-blue-50 to-sky-100 rounded border border-slate-200 p-2 hover:shadow-sm transition cursor-pointer"
                                                onClick={() => openPlanDetails(plan)}
                                              >
                                                <div className="flex justify-between items-start">
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <FileText className="w-3 h-3 text-green-600" />
                                                      <span className="font-medium text-slate-800 text-xs">
                                                        {plan.title || `${plan.class} - ${plan.subject}`}
                                                      </span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 space-y-0.5">
                                                      <p>Class: {plan.class} | Subject: {plan.subject} | Week: {plan.week_number}</p>
                                                      <p>Date: {new Date(plan.date).toLocaleDateString()}</p>
                                                      {plan.submitted_at && (
                                                        <p className="text-green-600 font-medium">Submitted: {new Date(plan.submitted_at).toLocaleString()}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="flex flex-col gap-1 items-end ml-2">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                      plan.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                                      plan.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                                      plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                      'bg-red-100 text-red-700'
                                                    }`}>
                                                      {plan.status}
                                                    </span>
                                                    {plan.principal_status && (
                                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                        plan.principal_status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-red-100 text-red-700'
                                                      }`}>
                                                        P: {plan.principal_status}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {leadingTeacherPlans.filter(p => p.status === 'submitted').length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Pending Approval - By Leading Teacher</h2>
                <div className="grid gap-3">
                  {Array.from(groupPlansByLeadingTeacher(leadingTeacherPlans.filter(p => p.status === 'submitted'))).map(([leadingTeacherId, ltPlans]) => {
                    const leadingTeacher = ltPlans[0]?.leading_teacher || ltPlans[0]?.teacher;
                    if (!leadingTeacher) return null;
                    const isExpanded = expandedLeadingTeachers.has(leadingTeacherId);
                    const pendingCount = ltPlans.filter(p => p.status === 'submitted').length;

                    return (
                      <div key={leadingTeacherId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => toggleLeadingTeacherFolder(leadingTeacherId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <FolderOpen className="w-5 h-5 text-amber-600" />
                            ) : (
                              <Folder className="w-5 h-5 text-amber-600" />
                            )}
                            <div className="text-left">
                              <h3 className="font-semibold text-slate-800">{leadingTeacher.full_name}</h3>
                              <p className="text-sm text-slate-600">{leadingTeacher.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                              {pendingCount} pending
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 to-sky-100">
                            {ltPlans.map((plan) => (
                              <div
                                key={plan.id}
                                className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-white transition cursor-pointer"
                                onClick={() => openPlanDetails(plan)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium text-slate-800">{plan.topic}</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {plan.subject} - Class {plan.class} - Week {plan.week}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Submitted: {new Date(plan.submitted_at!).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    plan.principal_status === 'approved' ? 'bg-green-100 text-green-700' :
                                    plan.principal_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {plan.principal_status || 'pending'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-sky-600">
                                  <Eye className="w-4 h-4" />
                                  Click to review and approve
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {leadingTeacherPlans.filter(p => p.status === 'approved' && p.principal_status === 'approved').length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Approved Plans - By Principal</h2>
                <div className="grid gap-3">
                  {Array.from(groupPlansByLeadingTeacher(leadingTeacherPlans.filter(p => p.status === 'approved' && p.principal_status === 'approved'))).map(([leadingTeacherId, ltPlans]) => {
                    const leadingTeacher = ltPlans[0]?.leading_teacher || ltPlans[0]?.teacher;
                    if (!leadingTeacher) return null;

                    const isExpanded = expandedLeadingTeachers.has(leadingTeacherId);
                    const approvedCount = ltPlans.filter(p => p.principal_status === 'approved').length;

                    return (
                      <div key={leadingTeacherId} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => toggleLeadingTeacherFolder(leadingTeacherId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <FolderOpen className="w-5 h-5 text-green-600" />
                            ) : (
                              <Folder className="w-5 h-5 text-green-600" />
                            )}
                            <div className="text-left">
                              <h3 className="font-semibold text-slate-800">{leadingTeacher.full_name}</h3>
                              <p className="text-sm text-slate-600">{leadingTeacher.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              {approvedCount} approved
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 to-sky-100">
                            {ltPlans.filter(p => p.principal_status === 'approved').map(plan => (
                              <div
                                key={plan.id}
                                onClick={() => openPlanDetails(plan)}
                                className="p-4 hover:bg-slate-100 cursor-pointer transition border-b border-slate-200 last:border-b-0"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="w-4 h-4 text-sky-600" />
                                      <span className="font-medium text-slate-800">
                                        {plan.title || `${plan.class} - ${plan.subject}`}
                                      </span>
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                                        Approved by Principal
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-600">
                                      <span>{plan.class} | {plan.subject}</span>
                                      <span>Week {plan.week_number}</span>
                                      <span>{new Date(plan.submitted_at || '').toLocaleDateString()}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-sm text-sky-600">
                                    <Eye className="w-4 h-4" />
                                    Click to view
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Leading Teacher Lesson Plans</h2>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg border border-slate-200 p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Leading Teacher</label>
                    <select
                      value={selectedLeadingTeacher}
                      onChange={(e) => setSelectedLeadingTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                      <option value="all">All Leading Teachers</option>
                      {(() => {
                        // Get unique leading teachers from lesson plans
                        const uniqueTeachers = new Map<string, Profile>();
                        leadingTeacherPlans.forEach(plan => {
                          const teacher = plan.leading_teacher || plan.teacher;
                          if (teacher) {
                            uniqueTeachers.set(teacher.id, teacher);
                          }
                        });
                        return Array.from(uniqueTeachers.values())
                          .sort((a, b) => a.full_name.localeCompare(b.full_name))
                          .map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.full_name}
                            </option>
                          ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(e.target.value);
                        setSelectedSemester('all');
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                      <option value="all">All Years</option>
                      {availableYears.map(year => (
                        <option key={year} value={year.toString()}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                    <select
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      disabled={selectedYear === 'all'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="all">All Semesters</option>
                      <option value="first">First Semester (Jan 25 - Jul 16)</option>
                      <option value="second">Second Semester (Aug 2 - Dec 17)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Week</label>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                    >
                      <option value="all">All Weeks</option>
                      {availableWeeks.map(week => (
                        <option key={week} value={week.toString()}>Week {week}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedLeadingTeacher('all');
                        setSelectedYear('all');
                        setSelectedSemester('all');
                        setSelectedWeek('all');
                      }}
                      className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {filteredLeadingTeacherPlans.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No lesson plans from leading teachers yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {Array.from(groupPlansByLeadingTeacher(filteredLeadingTeacherPlans)).map(([leadingTeacherId, ltPlans]) => {
                    // For leading teacher's own plans, leading_teacher is null, so use teacher
                    const leadingTeacher = ltPlans[0]?.leading_teacher || ltPlans[0]?.teacher;
                    if (!leadingTeacher) return null;

                    const isExpanded = expandedLeadingTeachers.has(leadingTeacherId);
                    const totalPlans = ltPlans.length;
                    const pendingCount = ltPlans.filter(p => p.status === 'submitted').length;
                    const approvedCount = ltPlans.filter(p => p.status === 'approved').length;

                    return (
                      <div key={leadingTeacherId} className="bg-white rounded-lg border-2 border-slate-300 overflow-hidden">
                        <button
                          onClick={() => toggleLeadingTeacherFolder(leadingTeacherId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <FolderOpen className="w-6 h-6 text-sky-600" />
                            ) : (
                              <Folder className="w-6 h-6 text-sky-600" />
                            )}
                            <div className="text-left">
                              <h3 className="font-semibold text-slate-800 text-lg">{leadingTeacher.full_name}</h3>
                              <p className="text-sm text-slate-600">{leadingTeacher.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm font-medium">
                              {totalPlans} total
                            </span>
                            {pendingCount > 0 && (
                              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                                {pendingCount} pending
                              </span>
                            )}
                            {approvedCount > 0 && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                {approvedCount} approved
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-gradient-to-br from-blue-50 to-sky-100">
                            {ltPlans.map((plan) => (
                              <div
                                key={plan.id}
                                className="p-4 border-b border-slate-200 last:border-b-0 hover:bg-white transition cursor-pointer"
                                onClick={() => openPlanDetails(plan)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-slate-800">{plan.topic}</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {plan.subject} - Class {plan.class} - Week {plan.week}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Date: {new Date(plan.date).toLocaleDateString()}
                                      {plan.submitted_at && ` • Submitted: ${new Date(plan.submitted_at).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      plan.status === 'draft' ? 'bg-slate-100 text-slate-700' :
                                      plan.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                                      plan.status === 'approved' ? 'bg-green-100 text-green-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {plan.status}
                                    </span>
                                    {plan.principal_status && (
                                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        plan.principal_status === 'approved' ? 'bg-green-100 text-green-700' :
                                        plan.principal_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                        'bg-amber-100 text-amber-700'
                                      }`}>
                                        {plan.principal_status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-sky-600">
                                  <Eye className="w-4 h-4" />
                                  Click to view and manage
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {groups.map((group) => (
              <div key={group.leadingTeacher.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-600 text-white p-4 flex justify-between items-center">
                  <div
                    className="flex-1 cursor-pointer hover:opacity-90 transition"
                    onClick={() => setSelectedGroup(selectedGroup === group.leadingTeacher.id ? null : group.leadingTeacher.id)}
                  >
                    <h2 className="text-xl font-semibold">{group.leadingTeacher.full_name}</h2>
                    <p className="text-sm text-slate-200 mt-1">
                      {group.teachers.length} Teachers - {group.lessonPlans.length} Lesson Plans
                    </p>
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{group.lessonPlans.length}</p>
                      <p className="text-xs text-slate-200">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{group.lessonPlans.filter(p => p.status === 'submitted').length}</p>
                      <p className="text-xs text-slate-200">Pending</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{group.lessonPlans.filter(p => p.status === 'approved').length}</p>
                      <p className="text-xs text-slate-200">Approved</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLeadingTeacher(group.leadingTeacher.id);
                      }}
                      className="p-2 hover:bg-red-600 rounded-lg transition ml-2"
                      title="Remove leading teacher"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {selectedGroup === group.leadingTeacher.id && (
                  <div className="p-6">
                    <div className="mb-6">
                      <h3 className="font-semibold text-slate-800 mb-3">Teachers</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {group.teachers.map(teacher => (
                          <div key={teacher.id} className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                            <div className="bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-medium">
                              {teacher.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{teacher.full_name}</p>
                              <p className="text-sm text-slate-600">{teacher.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3">Lesson Plans</h3>
                      {group.lessonPlans.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No lesson plans yet</p>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {group.lessonPlans.map((plan) => (
                            <div
                              key={plan.id}
                              className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                              onClick={() => openPlanDetails(plan)}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-semibold text-slate-800">{plan.topic}</h4>
                                  <p className="text-sm text-slate-600 mt-1">
                                    By {plan.teacher.full_name} - {plan.subject} - Class {plan.class}
                                  </p>
                                </div>
                                {getStatusBadge(plan.status)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                                <Eye className="w-4 h-4" />
                                Click to view details
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showLeadingTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Manage Leading Teachers</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-700">Current Leading Teachers</h4>
                <button
                  onClick={() => {
                    loadAvailableTeachers();
                    setShowAddLeadingTeacherModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add New
                </button>
              </div>
              <div>
                {groups.length === 0 ? (
                  <p className="text-slate-600 text-center py-4">No leading teachers yet</p>
                ) : (
                  <div className="space-y-2">
                    {groups.map(group => (
                      <div key={group.leadingTeacher.id} className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-medium">
                            {group.leadingTeacher.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{group.leadingTeacher.full_name}</p>
                            <p className="text-sm text-slate-600">{group.leadingTeacher.email}</p>
                            <p className="text-xs text-slate-500">{group.teachers.length} teachers assigned</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingLeadingTeacher(group.leadingTeacher);
                              setEditLeadingTeacherName(group.leadingTeacher.full_name);
                              setEditLeadingTeacherEmail(group.leadingTeacher.email);
                              setShowEditLeadingTeacherModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              handleRemoveLeadingTeacher(group.leadingTeacher.id);
                              setShowLeadingTeacherModal(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowLeadingTeacherModal(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestChangesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Request Changes</h3>
            <p className="text-sm text-slate-600 mb-4">
              Please provide specific feedback on what needs to be corrected in this lesson plan.
              The leading teacher will be able to edit and resubmit it.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Feedback for Leading Teacher <span className="text-red-600">*</span>
              </label>
              <textarea
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder="Describe what changes are needed..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrincipalRequestChanges}
                disabled={!revisionFeedback.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setShowRequestChangesModal(false);
                  setRevisionFeedback('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Approve Lesson Plan as Principal</h3>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">Your signature will be automatically added to the approved lesson plan.</p>
              {profile?.signature_url && (
                <div className="bg-gradient-to-br from-blue-50 to-sky-100 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Your Signature:</p>
                  <img src={profile.signature_url} alt="Signature" className="max-h-20" />
                </div>
              )}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Comments (Optional)</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder="Add any comments..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePrincipalApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                Confirm Approval
              </button>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setComments('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Upload Principal Signature</h3>
            {profile?.signature_url && (
              <div className="mb-4 bg-gradient-to-br from-blue-50 to-sky-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Current Signature:</p>
                <img src={profile.signature_url} alt="Current Signature" className="max-h-20 border border-slate-200 rounded" />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Signature Image <span className="text-red-600">*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleSignatureFileChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Supported formats: PNG, JPG, JPEG, SVG</p>
            </div>
            {signaturePreview && (
              <div className="mb-4 bg-gradient-to-br from-blue-50 to-sky-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                <img src={signaturePreview} alt="Preview" className="max-h-32 border border-slate-200 rounded" />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleUploadSignature}
                disabled={!signatureFile || uploadingSignature}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploadingSignature ? 'Uploading...' : 'Upload Signature'}
              </button>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setSignatureFile(null);
                  setSignaturePreview(null);
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddLeadingTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Leading Teacher</h3>
            <p className="text-sm text-slate-600 mb-4">
              Select a teacher to promote to Leading Teacher role.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Teacher <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedTeacherForPromotion}
                onChange={(e) => setSelectedTeacherForPromotion(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              >
                <option value="">Select a teacher...</option>
                {availableTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.full_name} ({teacher.email})
                  </option>
                ))}
              </select>
              {availableTeachers.length === 0 && (
                <p className="text-sm text-amber-600 mt-2">No available teachers to promote. All teachers are already assigned or promoted.</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddLeadingTeacher}
                disabled={!selectedTeacherForPromotion}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Leading Teacher
              </button>
              <button
                onClick={() => {
                  setShowAddLeadingTeacherModal(false);
                  setSelectedTeacherForPromotion('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditLeadingTeacherModal && editingLeadingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edit Leading Teacher</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={editLeadingTeacherName}
                  onChange={(e) => setEditLeadingTeacherName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={editLeadingTeacherEmail}
                  onChange={(e) => setEditLeadingTeacherEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter email"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleEditLeadingTeacher}
                disabled={!editLeadingTeacherName.trim() || !editLeadingTeacherEmail.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditLeadingTeacherModal(false);
                  setEditingLeadingTeacher(null);
                  setEditLeadingTeacherName('');
                  setEditLeadingTeacherEmail('');
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
