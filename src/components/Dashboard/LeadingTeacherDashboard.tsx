import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, FileText, Users, LogOut, Eye, PenTool, Upload, Download, Printer, UserPlus, Trash2, Plus, AlertCircle, MessageSquare, History, Copy, ChevronDown, ChevronRight, Folder, FolderOpen, BarChart3, Clock } from 'lucide-react';
import { Database } from '../../types/database.types';
import { LessonPlanView } from '../LessonPlan/LessonPlanView';
import { LessonPlanForm } from '../LessonPlan/LessonPlanForm';
import { LessonPlanSummary } from './LessonPlanSummary';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface LessonPlanWithTeacher extends LessonPlan {
  teacher: Profile;
  revision_request_count?: number;
  revision_completed_count?: number;
}

export function LeadingTeacherDashboard() {
  const { profile, signOut } = useAuth();
  const [lessonPlans, setLessonPlans] = useState<LessonPlanWithTeacher[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<LessonPlanWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredLoading, setFilteredLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlanWithTeacher | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [comments, setComments] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState(profile?.signature_url || '');
  const [uploading, setUploading] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<Profile[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const lessonPlanRef = useRef<HTMLDivElement>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'dhivehi'>('english');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>();
  const [myLessonPlans, setMyLessonPlans] = useState<LessonPlanWithTeacher[]>([]);
  const [showRequestChangesModal, setShowRequestChangesModal] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [expandedTeachers, setExpandedTeachers] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedMyPlanFolders, setExpandedMyPlanFolders] = useState<Set<string>>(new Set());
  const [showSummaryReport, setShowSummaryReport] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  // Server-side filtered fetch for All Lesson Plans section
  useEffect(() => {
    if (teacherIds.length === 0) return;
    loadFilteredPlans();
  }, [teacherIds, selectedTeacher, selectedYear, selectedSemester, selectedWeek]);

  // Client-side search filter on the already-fetched set
  useEffect(() => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      setFilteredPlans(lessonPlans.filter(plan =>
        (plan.topic || '').toLowerCase().includes(q) ||
        (plan.subject || '').toLowerCase().includes(q) ||
        (plan.title || '').toLowerCase().includes(q) ||
        (plan.teacher?.full_name || '').toLowerCase().includes(q)
      ));
    } else {
      setFilteredPlans(lessonPlans);
    }
  }, [lessonPlans, searchTerm]);

  const toggleTeacherFolder = (teacherId: string) => {
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

  const toggleWeekFolder = (key: string) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const groupPlansByWeek = (plans: LessonPlanWithTeacher[]) => {
    const grouped = new Map<number, LessonPlanWithTeacher[]>();
    plans.forEach(plan => {
      if (!grouped.has(plan.week)) {
        grouped.set(plan.week, []);
      }
      grouped.get(plan.week)!.push(plan);
    });
    return new Map([...grouped.entries()].sort((a, b) => a[0] - b[0]));
  };

  const groupPlansByTeacher = (plans: LessonPlanWithTeacher[]) => {
    const grouped = new Map<string, LessonPlanWithTeacher[]>();
    plans.forEach(plan => {
      const teacherId = plan.teacher_id;
      if (!grouped.has(teacherId)) {
        grouped.set(teacherId, []);
      }
      grouped.get(teacherId)!.push(plan);
    });
    return grouped;
  };

  const toggleMyPlanFolder = (folderId: string) => {
    setExpandedMyPlanFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const groupMyPlansByStatus = (plans: LessonPlanWithTeacher[]) => {
    const grouped = new Map<string, { label: string; plans: LessonPlanWithTeacher[]; color: string }>();

    const draft = plans.filter(p => p.status === 'draft');
    const pending = plans.filter(p => p.principal_status === 'pending' && p.status === 'submitted');
    const approved = plans.filter(p => p.principal_status === 'approved');
    const needsRevision = plans.filter(p => p.principal_status === 'needs_revision');

    if (draft.length > 0) {
      grouped.set('draft', { label: 'Draft Plans', plans: draft, color: 'blue' });
    }
    if (pending.length > 0) {
      grouped.set('pending', { label: 'Pending Principal Approval', plans: pending, color: 'amber' });
    }
    if (approved.length > 0) {
      grouped.set('approved', { label: 'Approved by Principal', plans: approved, color: 'green' });
    }
    if (needsRevision.length > 0) {
      grouped.set('needs_revision', { label: 'Needs Revision', plans: needsRevision, color: 'red' });
    }

    return grouped;
  };

  const loadData = async () => {
    try {
      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('leading_teacher_id', profile!.id)
        .neq('id', profile!.id);

      if (teachersError) throw teachersError;
      setTeachers(teachersData || []);

      const tIds = (teachersData || []).map(t => t.id);
      setTeacherIds(tIds);

      if (tIds.length === 0) {
        setLessonPlans([]);
        setMyLessonPlans([]);
        setStats({ pending: 0, approved: 0, total: 0 });
        return;
      }

      // Fire-and-forget: sync leading_teacher_id on stale plans (don't block UI)
      supabase
        .from('lesson_plans')
        .update({ leading_teacher_id: profile!.id })
        .in('teacher_id', tIds)
        .neq('leading_teacher_id', profile!.id)
        .then(() => {});

      // Fetch my plans and stats in parallel (All Lesson Plans fetched separately with filters)
      const [
        { data: myPlansData, error: myPlansError },
        { count: pendingCount },
        { count: approvedCount },
        { count: totalCount }
      ] = await Promise.all([
        supabase
          .from('lesson_plans')
          .select(`
            *,
            teacher:profiles!lesson_plans_teacher_id_fkey(*)
          `)
          .eq('teacher_id', profile!.id)
          .eq('created_by_role', 'leading_teacher')
          .order('submitted_at', { ascending: false })
          .limit(100),
        supabase
          .from('lesson_plans')
          .select('*', { count: 'exact', head: true })
          .in('teacher_id', tIds)
          .eq('status', 'submitted'),
        supabase
          .from('lesson_plans')
          .select('*', { count: 'exact', head: true })
          .in('teacher_id', tIds)
          .eq('status', 'approved'),
        supabase
          .from('lesson_plans')
          .select('*', { count: 'exact', head: true })
          .in('teacher_id', tIds)
      ]);

      if (myPlansError) throw myPlansError;

      setStats({
        pending: pendingCount || 0,
        approved: approvedCount || 0,
        total: totalCount || 0
      });

      // Fetch revision history only for my plans (All Lesson Plans fetched separately)
      const allPlanIds = [...(myPlansData || []).map(p => p.id)];
      if (allPlanIds.length > 0) {
        const { data: allRevisionHistory } = await supabase
          .from('revision_history')
          .select('lesson_plan_id, action_type')
          .in('lesson_plan_id', allPlanIds);

        const revMap = new Map<string, { requested: number; completed: number }>();
        (allRevisionHistory || []).forEach(r => {
          if (!revMap.has(r.lesson_plan_id)) revMap.set(r.lesson_plan_id, { requested: 0, completed: 0 });
          const entry = revMap.get(r.lesson_plan_id)!;
          if (r.action_type === 'revision_requested') entry.requested++;
          if (r.action_type === 'revision_completed' || r.action_type === 'resubmitted') entry.completed++;
        });

        const addRevCounts = (plan: any) => {
          const rev = revMap.get(plan.id) || { requested: 0, completed: 0 };
          return { ...plan, revision_request_count: rev.requested, revision_completed_count: rev.completed };
        };

        setMyLessonPlans((myPlansData || []).map(addRevCounts) as any);
      } else {
        setMyLessonPlans([]);
      }
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

  const loadFilteredPlans = async () => {
    setFilteredLoading(true);
    try {
      let query = supabase
        .from('lesson_plans')
        .select(`
          *,
          teacher:profiles!lesson_plans_teacher_id_fkey(*)
        `)
        .in('teacher_id', teacherIds)
        .neq('status', 'draft');

      if (selectedTeacher !== 'all') {
        query = query.eq('teacher_id', selectedTeacher);
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

      setLessonPlans((data || []) as any);
    } catch (error) {
      console.error('Error loading filtered plans:', error);
    } finally {
      setFilteredLoading(false);
    }
  };

  const availableYears = [2026, 2027, 2028, 2029, 2030];
  const availableWeeks = Array.from({ length: 30 }, (_, i) => i + 1);




  const handleApprove = async () => {
    if (!selectedPlan || !profile) return;
    if (!profile.signature_url) {
      alert('Please set your signature first');
      setShowSignatureModal(true);
      return;
    }

    try {
      const { error: approvalError } = await supabase.from('approvals').upsert({
        lesson_plan_id: selectedPlan.id,
        leading_teacher_id: profile.id,
        leading_teacher_name: profile.full_name,
        signature_url: profile.signature_url,
        comments,
      }, {
        onConflict: 'lesson_plan_id'
      });

      if (approvalError) throw approvalError;

      const { error: updateError } = await supabase
        .from('lesson_plans')
        .update({
          status: 'approved',
          principal_status: 'pending'
        })
        .eq('id', selectedPlan.id);

      if (updateError) throw updateError;

      setShowApprovalModal(false);
      setSelectedPlan(null);
      setComments('');
      loadData();
      alert('Lesson plan approved successfully!');
    } catch (error) {
      console.error('Error approving lesson plan:', error);
      alert('Failed to approve lesson plan');
    }
  };

  const handleReject = async () => {
    if (!selectedPlan) return;

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .update({ status: 'rejected' })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      setShowApprovalModal(false);
      setSelectedPlan(null);
      loadData();
    } catch (error) {
      console.error('Error rejecting lesson plan:', error);
      alert('Failed to reject lesson plan');
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedPlan) return;
    if (!revisionFeedback.trim()) {
      alert('Please provide feedback for the requested changes');
      return;
    }

    try {
      // Delete any existing approval records to allow re-approval after revision
      const { error: deleteError } = await supabase
        .from('approvals')
        .delete()
        .eq('lesson_plan_id', selectedPlan.id);

      if (deleteError) throw deleteError;

      const { error } = await supabase
        .from('lesson_plans')
        .update({
          revision_requested_by: 'leading_teacher',
          revision_feedback: revisionFeedback,
          revision_requested_at: new Date().toISOString(),
          status: 'draft',
        })
        .eq('id', selectedPlan.id);

      if (error) throw error;

      const { error: historyError } = await supabase
        .from('revision_history')
        .insert({
          lesson_plan_id: selectedPlan.id,
          teacher_id: selectedPlan.teacher_id,
          leading_teacher_id: profile!.id,
          action_type: 'revision_requested',
          comments: revisionFeedback,
        });

      if (historyError) throw historyError;

      setShowRequestChangesModal(false);
      setSelectedPlan(null);
      setRevisionFeedback('');
      loadData();
      alert('Changes requested successfully! Teacher will be notified.');
    } catch (error) {
      console.error('Error requesting changes:', error);
      alert('Failed to request changes');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setSignatureFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignaturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSignature = async () => {
    if (!signatureFile) {
      alert('Please select a signature image');
      return;
    }

    try {
      setUploading(true);

      const fileExt = signatureFile.name.split('.').pop();
      const fileName = `${profile!.id}/signature.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, signatureFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ signature_url: publicUrl })
        .eq('id', profile!.id);

      if (updateError) throw updateError;

      setShowSignatureModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature');
    } finally {
      setUploading(false);
    }
  };

  const convertImageToBase64 = async (url: string): Promise<string> => {
    try {
      if (url.startsWith('data:')) return url;

      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return url;
    }
  };

  const handleDownloadPDF = async () => {
    if (!lessonPlanRef.current || !selectedPlan) return;

    try {
      setGeneratingPdf(true);

      // Get all images and convert to base64 to avoid CORS issues
      const images = lessonPlanRef.current.getElementsByTagName('img');
      const imageData: { element: HTMLImageElement; originalSrc: string }[] = [];

      for (const img of Array.from(images)) {
        const originalSrc = img.src;
        imageData.push({ element: img, originalSrc });

        // Convert to base64
        const base64 = await convertImageToBase64(originalSrc);
        img.src = base64;
      }

      // Wait for DOM to update
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now capture without cross-origin issues
      const canvas = await html2canvas(lessonPlanRef.current, {
        scale: 2,
        useCORS: false,
        allowTaint: false,
        logging: true,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
      });

      // Restore original image sources
      imageData.forEach(({ element, originalSrc }) => {
        element.src = originalSrc;
      });

      // Check if canvas has content
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture content');
      }

      const imgData = canvas.toDataURL('image/png');

      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data');
      }
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // Calculate the width ratio to fit the page width with small margins
      const margin = 5;
      const availableWidth = pdfWidth - (margin * 2);
      const widthRatio = availableWidth / imgWidth;

      // Calculate scaled dimensions
      const scaledWidth = imgWidth * widthRatio;
      const scaledHeight = imgHeight * widthRatio;

      // Calculate available height per page with smaller margins
      const availableHeight = pdfHeight - (margin * 2);

      // If content fits on one page
      if (scaledHeight <= availableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, scaledWidth, scaledHeight);
      } else {
        // Split content across multiple pages with better handling
        let sourceY = 0;
        let pageNum = 0;

        while (sourceY < imgHeight) {
          if (pageNum > 0) {
            pdf.addPage();
          }

          // Calculate how much height we can capture from the source canvas
          const sourceHeightForPage = Math.min((availableHeight / widthRatio), imgHeight - sourceY);

          // Create a temporary canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = imgWidth;
          pageCanvas.height = sourceHeightForPage;
          const pageCtx = pageCanvas.getContext('2d');

          if (pageCtx) {
            // Draw the section from the main canvas
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, imgWidth, sourceHeightForPage);
            pageCtx.drawImage(
              canvas,
              0, sourceY,                    // source x, y
              imgWidth, sourceHeightForPage, // source width, height
              0, 0,                          // dest x, y
              imgWidth, sourceHeightForPage  // dest width, height
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            const pageScaledHeight = sourceHeightForPage * widthRatio;
            pdf.addImage(pageImgData, 'PNG', margin, margin, scaledWidth, pageScaledHeight);
          }

          sourceY += sourceHeightForPage;
          pageNum++;
        }
      }

      pdf.save(`lesson-plan-${selectedPlan.topic}-${new Date().toLocaleDateString()}.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}. Please try again or check the console for details.`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!selectedPlan) return;

    try {
      const { data: approval } = await supabase
        .from('approvals')
        .select('*')
        .eq('lesson_plan_id', selectedPlan.id)
        .maybeSingle();

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: selectedPlan.language === 'dhivehi' ? 'ލެސަން ޕްލޭން 2026' : 'Lesson Plan 2026',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Week: ", bold: true }),
                new TextRun(selectedPlan.week.toString() + "     "),
                new TextRun({ text: "Date: ", bold: true }),
                new TextRun(new Date(selectedPlan.date).toLocaleDateString() + "     "),
                new TextRun({ text: "Duration: ", bold: true }),
                new TextRun(selectedPlan.duration),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Lesson No: ", bold: true }),
                new TextRun(selectedPlan.lesson_no + "     "),
                new TextRun({ text: "Class(es): ", bold: true }),
                new TextRun(selectedPlan.class + "     "),
                new TextRun({ text: "Subject: ", bold: true }),
                new TextRun(selectedPlan.subject),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "No. of Students: ", bold: true }),
                new TextRun(selectedPlan.no_of_students.toString() + "     "),
                new TextRun({ text: "Topic: ", bold: true }),
                new TextRun(selectedPlan.topic),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Strand: ", bold: true }),
                new TextRun(selectedPlan.strand + "     "),
                new TextRun({ text: "Sub-strand: ", bold: true }),
                new TextRun(selectedPlan.sub_strand),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Outcome: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.outcome }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Indicator(s): ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.indicators }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Learning Intention: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.learning_intention }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Success Criteria: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.success_criteria }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Prior Knowledge: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.prior_knowledge }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Key Competencies: ", bold: true }),
                new TextRun(selectedPlan.key_competencies + "     "),
                new TextRun({ text: "Shared Values: ", bold: true }),
                new TextRun(selectedPlan.shared_values),
              ],
            }),
            new Paragraph({ text: "" }),

            new Paragraph({
              children: [
                new TextRun({ text: "Materials Needed: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.materials_needed }),
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
                new TextRun(selectedPlan.introduction_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.introduction_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.introduction_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "BODY",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(selectedPlan.body_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.body_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.body_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "EVALUATION",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(selectedPlan.evaluation_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.evaluation_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.evaluation_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "CONCLUSION",
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Time/min: ", bold: true }),
                new TextRun(selectedPlan.conclusion_time || ''),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Teachers Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.conclusion_teacher_activity || '' }),
            new Paragraph({
              children: [
                new TextRun({ text: "Students Activity: ", bold: true }),
              ],
            }),
            new Paragraph({ text: selectedPlan.conclusion_student_activity || '' }),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "REFLECTION",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.reflection_objectives_achieved ? '☑ ' : '☐ ' }),
                new TextRun('Objectives achieved'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.reflection_activities_effective ? '☑ ' : '☐ ' }),
                new TextRun('Learning activities effective'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.reflection_implemented_as_planned ? '☑ ' : '☐ ' }),
                new TextRun('Implemented as per the lesson plan'),
              ],
            }),
            ...(selectedPlan.reflection_notes ? [
              new Paragraph({
                children: [
                  new TextRun({ text: "Strengths and areas for improvement: ", bold: true }),
                ],
              }),
              new Paragraph({ text: selectedPlan.reflection_notes }),
            ] : []),
            new Paragraph({ text: "" }),

            new Paragraph({
              text: "PEDAGOGY AND ASSESSMENT",
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.pedagogy_positive_environment ? '☑ ' : '☐ ' }),
                new TextRun('Creating a positive learning environment'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.pedagogy_connecting_learning ? '☑ ' : '☐ ' }),
                new TextRun('Connecting prior learning to new learning'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.pedagogy_reflective_practice ? '☑ ' : '☐ ' }),
                new TextRun('Fostering reflective practice'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.pedagogy_meaningful_learning ? '☑ ' : '☐ ' }),
                new TextRun('Making learning meaningful'),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: selectedPlan.pedagogy_individual_differences ? '☑ ' : '☐ ' }),
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
      saveAs(blob, `lesson-plan-${selectedPlan.topic}-${new Date().toLocaleDateString()}.docx`);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const loadAvailableTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .neq('id', profile!.id);

      if (error) throw error;

      const available = (data || []).filter(t => t.leading_teacher_id !== profile!.id);
      setAvailableTeachers(available);
    } catch (error) {
      console.error('Error loading available teachers:', error);
    }
  };

  const handleAddTeacher = async (teacherId: string) => {
    try {
      const teacher = availableTeachers.find(t => t.id === teacherId);

      if (teacher?.leading_teacher_id) {
        if (!confirm(`${teacher.full_name} is currently assigned to another Leading Teacher. Are you sure you want to reassign them to your group?`)) {
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ leading_teacher_id: profile!.id })
        .eq('id', teacherId);

      if (error) throw error;

      await supabase
        .from('lesson_plans')
        .update({ leading_teacher_id: profile!.id })
        .eq('teacher_id', teacherId);

      loadData();
      loadAvailableTeachers();
    } catch (error) {
      console.error('Error adding teacher:', error);
      alert('Failed to add teacher');
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!confirm('Are you sure you want to remove this teacher from your group?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ leading_teacher_id: null })
        .eq('id', teacherId);

      if (error) throw error;

      await supabase
        .from('lesson_plans')
        .update({ leading_teacher_id: null })
        .eq('teacher_id', teacherId);

      loadData();
    } catch (error) {
      console.error('Error removing teacher:', error);
      alert('Failed to remove teacher');
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

  const submittedPlans = filteredPlans.filter(p => p.status === 'submitted');
  const approvedPlans = filteredPlans.filter(p => p.status === 'approved');
  // Use server-side stats for the summary cards, fall back to filtered counts for the visible list

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setEditingPlanId(undefined);
    loadData();
  };

  const handleDuplicate = async (plan: LessonPlanWithTeacher) => {
    try {
      const newPlanData = {
        teacher_id: profile!.id,
        leading_teacher_id: plan.leading_teacher_id || profile!.id,
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
        created_by_role: 'leading_teacher',
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

      await loadData();
      alert('Lesson plan duplicated successfully! You can now edit and submit it.');
    } catch (error: any) {
      console.error('Error duplicating lesson plan:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to duplicate lesson plan: ${errorMessage}`);
    }
  };

  if (showCreateForm) {
    return (
      <LessonPlanForm
        lessonPlanId={editingPlanId}
        onSuccess={handleFormSuccess}
        onCancel={() => {
          setShowCreateForm(false);
          setEditingPlanId(undefined);
        }}
        isLeadingTeacher={true}
        language={selectedLanguage}
      />
    );
  }

  if (selectedPlan && !showApprovalModal && !showRequestChangesModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
        <div className="bg-white border-b border-slate-200 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <button
              onClick={() => setSelectedPlan(null)}
              className="text-sky-600 hover:text-sky-700 font-medium mb-2"
            >
              ← Back to Dashboard
            </button>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800">Review Lesson Plan</h1>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={generatingPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  {generatingPdf ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleDownloadWord}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
                >
                  <Download className="w-5 h-5" />
                  Download Word
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  <Printer className="w-5 h-5" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div ref={lessonPlanRef}>
            <LessonPlanView lessonPlan={selectedPlan} />
          </div>
          {selectedPlan.status === 'submitted' && selectedPlan.teacher_id !== profile?.id && (
            <div className="mt-6 grid grid-cols-3 gap-3 print:hidden">
              <button
                onClick={() => setShowApprovalModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => setShowRequestChangesModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Request Changes
              </button>
              <button
                onClick={handleReject}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
            </div>
          )}
          {selectedPlan.status === 'submitted' && selectedPlan.teacher_id === profile?.id && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 print:hidden">
              <p className="text-sm font-medium">You cannot approve your own lesson plan. Another leading teacher or principal must review and approve it.</p>
            </div>
          )}
        </div>

        {showRequestChangesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Request Changes</h3>
              <p className="text-sm text-slate-600 mb-4">
                Please provide specific feedback on what needs to be corrected in this lesson plan.
                The teacher will be able to edit and resubmit it.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Feedback for Teacher <span className="text-red-600">*</span>
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
                  onClick={handleRequestChanges}
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
            <h1 className="text-2xl font-bold text-slate-800">Leading Teacher Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Welcome, {profile?.full_name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSummaryReport(!showSummaryReport)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                showSummaryReport
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              {showSummaryReport ? 'Hide' : 'Generate'} Summary
            </button>
            <button
              onClick={() => setShowSignatureModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              <PenTool className="w-5 h-5" />
              {profile?.signature_url ? 'Update Signature' : 'Set Signature'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-sky-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-sky-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">My Teachers</p>
                <p className="text-2xl font-bold text-slate-800">{teachers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Review</p>
                <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
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
                <p className="text-2xl font-bold text-slate-800">{stats.approved}</p>
              </div>
            </div>
          </div>
        </div>

        {showSummaryReport && (
          <LessonPlanSummary
            teacherIds={teachers.map(t => t.id)}
            teachers={teachers}
            title="Teacher Lesson Plan Summary"
            subtitle="Monitor and review lesson planning across your teachers."
            canEdit={false}
            onView={(plan) => setSelectedPlan(plan)}
          />
        )}

        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">My Teachers</h2>
            <button
              onClick={() => {
                loadAvailableTeachers();
                setShowTeacherModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition"
            >
              <UserPlus className="w-5 h-5" />
              Manage Teachers
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teachers.map(teacher => (
              <div key={teacher.id} className="flex items-center justify-between gap-3 p-3 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-medium">
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{teacher.full_name}</p>
                    <p className="text-sm text-slate-600">{teacher.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveTeacher(teacher.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Remove teacher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">My Lesson Plans</h2>
            <div className="relative">
              <button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Lesson Plan
              </button>
              {showLanguageDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-10">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedLanguage('english');
                        setShowCreateForm(true);
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
                        setShowCreateForm(true);
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
          {myLessonPlans.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No lesson plans yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {Array.from(groupMyPlansByStatus(myLessonPlans)).map(([statusKey, { label, plans: statusPlans, color }]) => {
                const isExpanded = expandedMyPlanFolders.has(statusKey);

                const colorClasses = {
                  blue: {
                    folder: 'text-blue-600',
                    bg: 'bg-blue-50',
                    border: 'border-blue-200',
                    badge: 'bg-blue-100 text-blue-800'
                  },
                  amber: {
                    folder: 'text-amber-600',
                    bg: 'bg-amber-50',
                    border: 'border-amber-200',
                    badge: 'bg-amber-100 text-amber-800'
                  },
                  green: {
                    folder: 'text-green-600',
                    bg: 'bg-green-50',
                    border: 'border-green-200',
                    badge: 'bg-green-100 text-green-800'
                  },
                  red: {
                    folder: 'text-red-600',
                    bg: 'bg-red-50',
                    border: 'border-red-200',
                    badge: 'bg-red-100 text-red-800'
                  }
                };

                const classes = colorClasses[color as keyof typeof colorClasses];

                return (
                  <div key={statusKey} className={`bg-white rounded-lg border-2 ${classes.border} overflow-hidden`}>
                    <button
                      onClick={() => toggleMyPlanFolder(statusKey)}
                      className={`w-full flex items-center justify-between p-4 ${classes.bg} hover:opacity-80 transition`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <FolderOpen className={`w-6 h-6 ${classes.folder}`} />
                        ) : (
                          <Folder className={`w-6 h-6 ${classes.folder}`} />
                        )}
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-800 text-lg">{label}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 ${classes.badge} rounded-full text-sm font-medium`}>
                          {statusPlans.length} plan{statusPlans.length !== 1 ? 's' : ''}
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
                        <div className="p-4 space-y-3">
                          {statusPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg hover:bg-slate-100 transition"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-800">{plan.topic}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {plan.subject} - Week {plan.week} - {new Date(plan.date).toLocaleDateString()}
                    </p>
                    {plan.status === 'approved' && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span className="text-slate-600">Reflection:</span>
                          {(plan.reflection_objectives_achieved || plan.reflection_activities_effective || plan.reflection_implemented_as_planned || (plan.reflection_notes && plan.reflection_notes.trim() !== '')) ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 font-medium rounded-full">
                              ✓ Added
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 font-medium rounded-full">
                              Not Added
                            </span>
                          )}
                        </div>
                        {(plan.reflection_objectives_achieved || plan.reflection_activities_effective || plan.reflection_implemented_as_planned || (plan.reflection_notes && plan.reflection_notes.trim() !== '')) && (
                          <div className="ml-5 mt-1 text-xs text-slate-700 bg-blue-50 p-2 rounded border border-blue-200">
                            <div className="flex flex-wrap gap-3 mb-1">
                              <span className={plan.reflection_objectives_achieved ? "text-green-600" : "text-slate-400"}>
                                {plan.reflection_objectives_achieved ? '✓' : '○'} Objectives achieved
                              </span>
                              <span className={plan.reflection_activities_effective ? "text-green-600" : "text-slate-400"}>
                                {plan.reflection_activities_effective ? '✓' : '○'} Activities effective
                              </span>
                              <span className={plan.reflection_implemented_as_planned ? "text-green-600" : "text-slate-400"}>
                                {plan.reflection_implemented_as_planned ? '✓' : '○'} Implemented as planned
                              </span>
                            </div>
                            {plan.reflection_notes && (
                              <p className="line-clamp-2">{plan.reflection_notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <History className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-600">Revision History:</span>
                        <span className={`px-2 py-0.5 font-medium rounded-full ${plan.revision_request_count! > 0 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'}`}>
                          {plan.revision_request_count || 0} request{plan.revision_request_count !== 1 ? 's' : ''}
                        </span>
                        <span className={`px-2 py-0.5 font-medium rounded-full ${plan.revision_completed_count! > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                          {plan.revision_completed_count || 0} correction{plan.revision_completed_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    {plan.revision_requested_by === 'principal' && plan.revision_feedback && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-800">Principal Requested Changes:</span>
                        </div>
                        <p className="text-sm text-slate-700">{plan.revision_feedback}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(plan.status)}
                    {plan.principal_status && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        plan.principal_status === 'approved' ? 'bg-green-100 text-green-700' :
                        plan.principal_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        plan.principal_status === 'needs_revision' ? 'bg-orange-100 text-orange-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        Principal: {plan.principal_status.replace('_', ' ')}
                      </span>
                    )}
                    {(plan.status === 'draft' || plan.revision_requested_by === 'principal') && (
                      <button
                        onClick={() => {
                          setEditingPlanId(plan.id);
                          setShowCreateForm(true);
                        }}
                        className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {plan.status === 'approved' && (
                      <button
                        onClick={() => handleDuplicate(plan)}
                        className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition text-sm flex items-center gap-2"
                        title="Create a copy of this lesson plan to edit and resubmit"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {submittedPlans.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Pending Approval - By Teacher</h2>
            <div className="grid gap-3">
              {Array.from(groupPlansByTeacher(submittedPlans)).map(([teacherId, teacherPlans]) => {
                const teacher = teacherPlans[0].teacher;
                const isExpanded = expandedTeachers.has(teacherId);
                const pendingCount = teacherPlans.filter(p => p.status === 'submitted').length;

                return (
                  <div key={teacherId} className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200 overflow-hidden shadow-sm hover:shadow-md transition">
                    <button
                      onClick={() => toggleTeacherFolder(teacherId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br hover:from-orange-100 hover:to-amber-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <FolderOpen className="w-6 h-6 text-orange-600" />
                        ) : (
                          <Folder className="w-6 h-6 text-orange-600" />
                        )}
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-800">{teacher.full_name}</h3>
                          <p className="text-sm text-slate-600">{teacher.email}</p>
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
                      <div className="border-t-2 border-orange-200 bg-gradient-to-br from-sky-50 to-blue-50 p-2">
                        {Array.from(groupPlansByWeek(teacherPlans)).map(([week, weekPlans]) => {
                          const weekKey = `${teacherId}-week-${week}`;
                          const isWeekExpanded = expandedWeeks.has(weekKey);
                          const weekPendingCount = weekPlans.filter(p => p.status === 'submitted').length;

                          return (
                            <div key={weekKey} className="mb-2 last:mb-0 rounded-lg bg-white border border-sky-200 overflow-hidden shadow-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWeekFolder(weekKey);
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-sky-50 hover:to-blue-50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {isWeekExpanded ? (
                                    <FolderOpen className="w-5 h-5 text-sky-600" />
                                  ) : (
                                    <Folder className="w-5 h-5 text-sky-600" />
                                  )}
                                  <span className="font-medium text-slate-700">Week {week}</span>
                                  <span className="text-sm text-slate-500">({weekPlans.length} plans)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {weekPendingCount > 0 && (
                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                      {weekPendingCount} pending
                                    </span>
                                  )}
                                  {isWeekExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </button>

                              {isWeekExpanded && (
                                <div className="bg-white">
                                  {weekPlans.map((plan) => (
                                    <div
                                      key={plan.id}
                                      className="p-4 border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                                      onClick={() => setSelectedPlan(plan)}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h4 className="font-medium text-slate-800">{plan.topic}</h4>
                                          <p className="text-sm text-slate-600 mt-1">
                                            {plan.subject} - Class {plan.class}
                                          </p>
                                          <p className="text-xs text-slate-500 mt-1">
                                            Submitted: {new Date(plan.submitted_at!).toLocaleDateString()}
                                          </p>
                                        </div>
                                        {getStatusBadge(plan.status)}
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-800">All Lesson Plans</h2>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                >
                  <option value="all">All Teachers</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                  ))}
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
                    setSelectedTeacher('all');
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

          <div className="grid gap-3">
            {teachers.map((teacher) => {
              const teacherPlans = filteredPlans.filter(p => p.teacher_id === teacher.id);
              const isExpanded = expandedTeachers.has(teacher.id);
              const approvedCount = teacherPlans.filter(p => p.status === 'approved').length;
              const pendingCount = teacherPlans.filter(p => p.status === 'submitted').length;
              const revisionCount = teacherPlans.filter(p => p.status === 'revision_requested').length;

              return (
                <div key={teacher.id} className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border-2 border-emerald-200 overflow-hidden shadow-sm hover:shadow-md transition">
                  <button
                    onClick={() => toggleTeacherFolder(teacher.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gradient-to-br hover:from-emerald-100 hover:to-teal-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <FolderOpen className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <Folder className="w-6 h-6 text-emerald-600" />
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-slate-800">{teacher.full_name}</h3>
                        <p className="text-sm text-slate-600">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-sm font-medium">
                        {teacherPlans.length} total
                      </span>
                      {approvedCount > 0 && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {approvedCount} approved
                        </span>
                      )}
                      {pendingCount > 0 && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                          {pendingCount} pending
                        </span>
                      )}
                      {revisionCount > 0 && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                          {revisionCount} revision
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
                    <div className="border-t-2 border-emerald-200 bg-gradient-to-br from-violet-50 to-purple-50 p-2">
                      {teacherPlans.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No lesson plans yet</p>
                        </div>
                      ) : (
                        Array.from(groupPlansByWeek(teacherPlans)).map(([week, weekPlans]) => {
                          const weekKey = `${teacher.id}-all-week-${week}`;
                          const isWeekExpanded = expandedWeeks.has(weekKey);
                          const weekApprovedCount = weekPlans.filter(p => p.status === 'approved').length;
                          const weekPendingCount = weekPlans.filter(p => p.status === 'submitted').length;
                          const weekRevisionCount = weekPlans.filter(p => p.status === 'revision_requested').length;

                          return (
                            <div key={weekKey} className="mb-2 last:mb-0 rounded-lg bg-white border border-violet-200 overflow-hidden shadow-sm">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWeekFolder(weekKey);
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-gradient-to-r hover:from-violet-50 hover:to-purple-50 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {isWeekExpanded ? (
                                    <FolderOpen className="w-5 h-5 text-violet-600" />
                                  ) : (
                                    <Folder className="w-5 h-5 text-violet-600" />
                                  )}
                                  <span className="font-medium text-slate-700">Week {week}</span>
                                  <span className="text-sm text-slate-500">({weekPlans.length} plans)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {weekApprovedCount > 0 && (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                      {weekApprovedCount} approved
                                    </span>
                                  )}
                                  {weekPendingCount > 0 && (
                                    <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                      {weekPendingCount} pending
                                    </span>
                                  )}
                                  {weekRevisionCount > 0 && (
                                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                                      {weekRevisionCount} revision
                                    </span>
                                  )}
                                  {isWeekExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </button>

                              {isWeekExpanded && (
                                <div className="bg-white">
                                  {weekPlans.map((plan) => (
                                    <div
                                      key={plan.id}
                                      className="p-4 border-t border-slate-100 hover:bg-slate-50 transition cursor-pointer"
                                      onClick={() => setSelectedPlan(plan)}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <h4 className="font-medium text-slate-800">{plan.topic}</h4>
                                          <p className="text-sm text-slate-600 mt-1">
                                            {plan.subject} - Class {plan.class}
                                          </p>
                                          <p className="text-xs text-slate-500 mt-1">
                                            Date: {new Date(plan.date).toLocaleDateString()} | Duration: {plan.duration}
                                          </p>
                                          {plan.submitted_at && (
                                            <p className="text-xs text-slate-500">
                                              Submitted: {new Date(plan.submitted_at).toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                        {getStatusBadge(plan.status)}
                                      </div>

                                      {plan.status === 'approved' && (
                                        <div className="mt-3 mb-2">
                                          <div className="flex items-center gap-2 text-sm">
                                            <MessageSquare className="w-4 h-4 text-blue-600" />
                                            <span className="text-slate-600">Reflection:</span>
                                            {(plan.reflection_objectives_achieved || plan.reflection_activities_effective || plan.reflection_implemented_as_planned || (plan.reflection_notes && plan.reflection_notes.trim() !== '')) ? (
                                              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                                ✓ Added
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                                Not Added
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      <div className="mt-2">
                                        <div className="flex items-center gap-2 text-sm">
                                          <History className="w-4 h-4 text-slate-500" />
                                          <span className="text-slate-600">Revisions:</span>
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plan.revision_request_count! > 0 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {plan.revision_request_count || 0} request{plan.revision_request_count !== 1 ? 's' : ''}
                                          </span>
                                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${plan.revision_completed_count! > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                            {plan.revision_completed_count || 0} correction{plan.revision_completed_count !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 text-sm text-sky-600 mt-3">
                                        <Eye className="w-4 h-4" />
                                        Click to view details
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredPlans.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No lesson plans found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Approve Lesson Plan</h3>
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
                onClick={handleApprove}
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
            <h3 className="text-xl font-bold text-slate-800 mb-4">Set Your Signature</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Upload Signature Image</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-sky-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="signature-upload"
                />
                <label
                  htmlFor="signature-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-700">Click to select image</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF up to 2MB</p>
                </label>
              </div>
            </div>
            {signaturePreview && (
              <div className="mb-4 bg-gradient-to-br from-blue-50 to-sky-100 p-4 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                <img src={signaturePreview} alt="Signature preview" className="max-h-20 mx-auto" />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSaveSignature}
                disabled={uploading || !signatureFile}
                className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Save Signature'}
              </button>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setSignatureFile(null);
                  setSignaturePreview(profile?.signature_url || '');
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
            <p className="text-sm text-slate-600 mb-4">
              Please provide specific feedback on what needs to be corrected in this lesson plan.
              The teacher will be able to edit and resubmit it.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Feedback for Teacher <span className="text-red-600">*</span>
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
                onClick={handleRequestChanges}
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

      {showTeacherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Add Teachers to Your Group</h3>
            {availableTeachers.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No available teachers to add</p>
            ) : (
              <div className="space-y-3">
                {availableTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="bg-sky-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-medium">
                        {teacher.full_name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{teacher.full_name}</p>
                        <p className="text-sm text-slate-600">{teacher.email}</p>
                        {teacher.leading_teacher_id && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                            Already assigned to another Leading Teacher
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddTeacher(teacher.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              <button
                onClick={() => setShowTeacherModal(false)}
                className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
