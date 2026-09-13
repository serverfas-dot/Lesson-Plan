import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database.types';
import {
  FileText, CheckCircle, Clock, XCircle, Search, RotateCcw, Download, Eye,
  Printer, ChevronDown, ChevronRight, BookOpen, GraduationCap, Calendar,
  Clock3, Target, Lightbulb, Award, Users, Layers, ClipboardList, PenTool,
  User, Mail, TrendingUp, BarChart3
} from 'lucide-react';
import jsPDF from 'jspdf';

type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface LessonPlanWithTeacher extends LessonPlan {
  teacher: Profile;
}

interface RevisionHistoryItem {
  id: string;
  lesson_plan_id: string;
  action_type: string;
  performed_by: string;
  comments: string;
  created_at: string;
}

interface Props {
  teacherIds: string[];
  teachers: Profile[];
  title?: string;
  subtitle?: string;
  canEdit?: boolean;
  onEdit?: (planId: string) => void;
  onView?: (plan: LessonPlanWithTeacher) => void;
}

type StatusFilter = 'all' | 'submitted' | 'approved' | 'rejected';
type PeriodFilter = 'all' | 'week' | 'month' | 'year';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  approved: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  submitted: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', icon: FileText },
  rejected: { label: 'Needs Review', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDate(dateStr: string) {
  if (!dateStr) return 'Not provided';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getDisplayValue(value: string | null | undefined): string {
  if (!value || value.trim() === '') return 'Not provided';
  return value;
}

function parseListItems(value: string | null | undefined): string[] {
  if (!value || value.trim() === '') return [];
  return value.split(/[;\n•\-\*]|\d+\./).map(s => s.trim()).filter(s => s.length > 0);
}

export function LessonPlanSummary({ teacherIds, teachers, title, subtitle, canEdit, onEdit, onView }: Props) {
  const [allPlans, setAllPlans] = useState<LessonPlanWithTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [revisionHistories, setRevisionHistories] = useState<Map<string, RevisionHistoryItem[]>>(new Map());

  // Filters
  const [filterTeacher, setFilterTeacher] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Period filters
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [filterWeek, setFilterWeek] = useState<string>('1');

  const reportRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (teacherIds.length === 0) {
      setAllPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let query = supabase
        .from('lesson_plans')
        .select(`
          *,
          teacher:profiles!lesson_plans_teacher_id_fkey(*)
        `)
        .in('teacher_id', teacherIds)
        .neq('status', 'draft');

      // Apply period filter server-side
      if (filterPeriod === 'year') {
        const yearNum = parseInt(filterYear);
        query = query
          .gte('date', `${yearNum}-01-01`)
          .lte('date', `${yearNum}-12-31`);
      } else if (filterPeriod === 'month') {
        const yearNum = parseInt(filterYear);
        const monthNum = parseInt(filterMonth);
        const lastDay = new Date(yearNum, monthNum, 0).getDate();
        query = query
          .gte('date', `${yearNum}-${String(monthNum).padStart(2, '0')}-01`)
          .lte('date', `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
      } else if (filterPeriod === 'week') {
        query = query.eq('week', parseInt(filterWeek));
        if (filterYear !== 'all') {
          const yearNum = parseInt(filterYear);
          query = query
            .gte('date', `${yearNum}-01-01`)
            .lte('date', `${yearNum}-12-31`);
        }
      }

      // Apply teacher filter server-side
      if (filterTeacher !== 'all') {
        query = query.eq('teacher_id', filterTeacher);
      }

      // Apply subject filter server-side
      if (filterSubject !== 'all') {
        query = query.eq('subject', filterSubject);
      }

      // Apply class filter server-side
      if (filterClass !== 'all') {
        query = query.eq('class', filterClass);
      }

      // Apply status filter server-side
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('date', { ascending: false }).limit(300);

      if (error) throw error;

      let plans = (data || []) as LessonPlanWithTeacher[];

      // Apply search client-side (on the fetched set)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        plans = plans.filter(p =>
          p.topic?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.strand?.toLowerCase().includes(q) ||
          p.sub_strand?.toLowerCase().includes(q) ||
          p.learning_intention?.toLowerCase().includes(q) ||
          p.teacher?.full_name?.toLowerCase().includes(q) ||
          p.subject?.toLowerCase().includes(q)
        );
      }

      setAllPlans(plans);
    } catch (error) {
      console.error('Error loading summary data:', error);
    } finally {
      setLoading(false);
    }
  }, [teacherIds.join(','), filterPeriod, filterYear, filterMonth, filterWeek, filterTeacher, filterSubject, filterClass, filterStatus, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derive filter options from data
  const subjects = useMemo(() => {
    const set = new Set(allPlans.map(p => p.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [allPlans]);

  const classes = useMemo(() => {
    const set = new Set(allPlans.map(p => p.class).filter(Boolean));
    return Array.from(set).sort();
  }, [allPlans]);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1, current + 2];
  }, []);

  const availableWeeks = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = allPlans.length;
    const completed = allPlans.filter(p => p.status === 'approved').length;
    const pending = allPlans.filter(p => p.status === 'submitted').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, completionRate };
  }, [allPlans]);

  // Per-teacher breakdown
  const teacherBreakdown = useMemo(() => {
    const map = new Map<string, { teacher: Profile; total: number; completed: number; pending: number; rejected: number }>();
    allPlans.forEach(plan => {
      const tid = plan.teacher_id;
      const teacher = plan.teacher || teachers.find(t => t.id === tid);
      if (!teacher) return;
      if (!map.has(tid)) {
        map.set(tid, { teacher, total: 0, completed: 0, pending: 0, rejected: 0 });
      }
      const entry = map.get(tid)!;
      entry.total++;
      if (plan.status === 'approved') entry.completed++;
      else if (plan.status === 'submitted') entry.pending++;
      else if (plan.status === 'rejected') entry.rejected++;
    });
    // Include teachers with zero plans
    teachers.forEach(t => {
      if (!map.has(t.id)) {
        map.set(t.id, { teacher: t, total: 0, completed: 0, pending: 0, rejected: 0 });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.teacher.full_name.localeCompare(b.teacher.full_name));
  }, [allPlans, teachers]);

  // Selected teacher info
  const selectedTeacherInfo = useMemo(() => {
    if (filterTeacher === 'all') return null;
    const teacher = teachers.find(t => t.id === filterTeacher);
    if (!teacher) return null;
    const teacherPlans = allPlans.filter(p => p.teacher_id === filterTeacher);
    const teacherSubjects = Array.from(new Set(teacherPlans.map(p => p.subject).filter(Boolean)));
    const teacherClasses = Array.from(new Set(teacherPlans.map(p => p.class).filter(Boolean)));
    const completed = teacherPlans.filter(p => p.status === 'approved').length;
    const pending = teacherPlans.filter(p => p.status === 'submitted').length;
    return {
      teacher,
      subjects: teacherSubjects,
      classes: teacherClasses,
      total: teacherPlans.length,
      completed,
      pending,
      completionRate: teacherPlans.length > 0 ? Math.round((completed / teacherPlans.length) * 100) : 0,
    };
  }, [filterTeacher, teachers, allPlans]);

  const resetFilters = () => {
    setFilterTeacher('all');
    setFilterSubject('all');
    setFilterClass('all');
    setFilterStatus('all');
    setSearchQuery('');
    setFilterPeriod('all');
    setFilterYear(new Date().getFullYear().toString());
    setFilterMonth((new Date().getMonth() + 1).toString());
    setFilterWeek('1');
  };

  const hasActiveFilters = filterTeacher !== 'all' || filterSubject !== 'all' || filterClass !== 'all' ||
    filterStatus !== 'all' || searchQuery.trim() !== '' || filterPeriod !== 'all';

  const togglePlan = async (planId: string) => {
    if (expandedPlanId === planId) {
      setExpandedPlanId(null);
      return;
    }
    setExpandedPlanId(planId);

    if (!revisionHistories.has(planId)) {
      const { data } = await supabase
        .from('revision_history')
        .select('*')
        .eq('lesson_plan_id', planId)
        .order('created_at', { ascending: false });
      setRevisionHistories(prev => new Map(prev).set(planId, (data || []) as any));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addText = (text: string, fontSize: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [30, 41, 59]) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      doc.setTextColor(color[0], color[1], color[2]);
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize * 0.4;
      lines.forEach((line: string) => {
        checkPageBreak(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      });
    };

    // Title
    addText(title || 'Teacher Lesson Plan Summary', 18, 'bold', [30, 64, 175]);
    y += 2;
    addText(subtitle || 'Overview of lesson plans, teaching activities, learning outcomes and assessment.', 10, 'normal', [100, 116, 139]);
    y += 4;

    // Period info
    let periodLabel = 'All Periods';
    if (filterPeriod === 'week') periodLabel = `Week ${filterWeek}${filterYear !== 'all' ? ', ' + filterYear : ''}`;
    else if (filterPeriod === 'month') periodLabel = `${MONTH_NAMES[parseInt(filterMonth) - 1]} ${filterYear}`;
    else if (filterPeriod === 'year') periodLabel = `Year ${filterYear}`;
    addText(`Period: ${periodLabel}`, 10, 'bold', [51, 65, 85]);
    y += 2;

    // Stats
    addText(`Total: ${stats.total}  |  Completed: ${stats.completed}  |  Pending: ${stats.pending}  |  Completion Rate: ${stats.completionRate}%`, 10, 'bold', [51, 65, 85]);
    y += 6;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Lesson plans
    addText('Lesson Plans', 14, 'bold', [30, 64, 175]);
    y += 4;

    if (allPlans.length === 0) {
      addText('No lesson plans found for the selected filters.', 10, 'normal', [100, 116, 139]);
    } else {
      allPlans.forEach((plan, idx) => {
        checkPageBreak(40);
        const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.submitted;

        addText(`#${String(idx + 1).padStart(2, '0')}  ${plan.title || plan.topic || 'Untitled Lesson'}`, 12, 'bold', [30, 41, 59]);
        y += 2;
        addText(`Status: ${statusCfg.label}  |  Date: ${formatDate(plan.date)}  |  Class: ${plan.class || 'N/A'}  |  Subject: ${plan.subject || 'N/A'}`, 9, 'normal', [100, 116, 139]);
        addText(`Teacher: ${plan.teacher?.full_name || 'N/A'}  |  Week: ${plan.week || 'N/A'}  |  Duration: ${plan.duration || 'N/A'}`, 9, 'normal', [100, 116, 139]);
        y += 2;
        addText(`Strand: ${getDisplayValue(plan.strand)}`, 9, 'normal', [71, 85, 105]);
        addText(`Sub-strand: ${getDisplayValue(plan.sub_strand)}`, 9, 'normal', [71, 85, 105]);
        addText(`Learning Intention: ${getDisplayValue(plan.learning_intention)}`, 9, 'normal', [71, 85, 105]);
        addText(`Outcome: ${getDisplayValue(plan.outcome)}`, 9, 'normal', [71, 85, 105]);
        y += 3;
        doc.setDrawColor(230, 230, 230);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      });
    }

    // Teacher summary
    if (teacherBreakdown.length > 0) {
      checkPageBreak(40);
      y += 4;
      addText('Teacher Summary', 14, 'bold', [30, 64, 175]);
      y += 4;
      teacherBreakdown.forEach((t) => {
        checkPageBreak(10);
        addText(`${t.teacher.full_name}: ${t.total} total, ${t.completed} completed, ${t.pending} pending`, 9, 'normal', [71, 85, 105]);
      });
    }

    doc.save('teacher-lesson-plan-summary.pdf');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-3 text-slate-600 font-medium text-sm">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={reportRef} className="bg-slate-50 print:bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 print:hidden rounded-xl mb-4">
        <div className="px-6 py-5">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {title || 'Teacher Lesson Plan Summary'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {subtitle || 'Overview of lesson plans, teaching activities, learning outcomes and assessment.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 print:hidden">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Period selector */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Period</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as PeriodFilter)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Time</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
              <option value="year">By Year</option>
            </select>
          </div>

          {/* Year selector - shown for week/month/year */}
          {filterPeriod !== 'all' && (
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => <option key={y} value={y.toString()}>{y}</option>)}
              </select>
            </div>
          )}

          {/* Month selector - shown only for month period */}
          {filterPeriod === 'month' && (
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Month</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {MONTH_NAMES.map((m, i) => <option key={i} value={(i + 1).toString()}>{m}</option>)}
              </select>
            </div>
          )}

          {/* Week selector - shown only for week period */}
          {filterPeriod === 'week' && (
            <div className="min-w-[120px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Week</label>
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {availableWeeks.map(w => <option key={w} value={w.toString()}>Week {w}</option>)}
              </select>
            </div>
          )}

          {/* Teacher */}
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Teacher</label>
            <select
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Teachers</option>
              {teachers.sort((a, b) => a.full_name.localeCompare(b.full_name)).map(t => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Class */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Grade/Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Completed</option>
              <option value="submitted">Pending</option>
              <option value="rejected">Needs Review</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lesson, topic, teacher..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-400 font-medium">Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-sm text-slate-500 mt-1">Total Lesson Plans</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 p-2.5 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">Completed</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.completed}</p>
          <p className="text-sm text-slate-500 mt-1">Completed Plans</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-amber-50 p-2.5 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-amber-600 font-medium">Pending</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.pending}</p>
          <p className="text-sm text-slate-500 mt-1">Pending Review</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-medium">Rate</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">{stats.completionRate}%</p>
          <p className="text-sm text-slate-500 mt-1">Completion Rate</p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Lesson Plan Progress</h2>
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-600">Completion Rate</span>
            <span className="text-2xl font-bold text-blue-600">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center bg-green-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
            <p className="text-xs text-green-600 mt-1">Completed</p>
          </div>
          <div className="text-center bg-amber-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
            <p className="text-xs text-amber-600 mt-1">Pending</p>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Teacher Profile Summary */}
      {selectedTeacherInfo && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Teacher Profile</h2>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {selectedTeacherInfo.teacher.full_name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedTeacherInfo.teacher.full_name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {selectedTeacherInfo.teacher.email}
                </p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Subject</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{selectedTeacherInfo.subjects.join(', ') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Classes</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{selectedTeacherInfo.classes.join(', ') || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Plans</p>
                <p className="text-sm font-bold text-slate-700 mt-1">{selectedTeacherInfo.total}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Completion</p>
                <p className="text-sm font-bold text-green-600 mt-1">{selectedTeacherInfo.completionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Summary Breakdown */}
      {filterTeacher === 'all' && teacherBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Teacher Summary</h2>
          </div>
          <div className="space-y-3">
            {teacherBreakdown.map((t) => (
              <div key={t.teacher.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {t.teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{t.teacher.full_name}</p>
                    <p className="text-xs text-slate-500">{t.teacher.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.completed > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                    {t.completed} Completed
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.pending > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                    {t.pending} Pending
                  </span>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                    {t.total} Total
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesson Plans List */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-800">Lesson Plans</h2>
          <span className="text-sm text-slate-400">({allPlans.length})</span>
        </div>

        {allPlans.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No lesson plans found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or selecting a different period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allPlans.map((plan, idx) => {
              const isExpanded = expandedPlanId === plan.id;
              const statusCfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.submitted;
              const StatusIcon = statusCfg.icon;
              const history = revisionHistories.get(plan.id) || [];
              const materials = parseListItems(plan.materials_needed);
              const competencies = parseListItems(plan.key_competencies);
              const values = parseListItems(plan.shared_values);
              const indicators = parseListItems(plan.indicators);

              return (
                <div key={plan.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                  {/* Card Header - Collapsed View */}
                  <div
                    className="p-5 cursor-pointer hover:bg-slate-50 transition"
                    onClick={() => togglePlan(plan.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="bg-slate-100 text-slate-500 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0">
                          #{String(idx + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-slate-800 truncate">
                            {plan.title || plan.topic || 'Untitled Lesson'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(plan.date)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {plan.class || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <BookOpen className="w-3.5 h-3.5" />
                              {plan.subject || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock3 className="w-3.5 h-3.5" />
                              {plan.duration || 'N/A'}
                            </span>
                            <span className="text-xs text-slate-500">
                              Week {plan.week}
                            </span>
                            <span className="text-xs text-slate-500">
                              Teacher: {plan.teacher?.full_name || 'N/A'}
                            </span>
                          </div>
                          {!isExpanded && (
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                              <span className="font-medium text-slate-600">Strand:</span> {getDisplayValue(plan.strand)}
                              <span className="mx-2 text-slate-300">|</span>
                              <span className="font-medium text-slate-600">Learning Intention:</span> {getDisplayValue(plan.learning_intention)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </span>
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 pb-5">
                      {/* Section A - Lesson Information */}
                      <div className="mt-5">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-blue-500" />
                          Lesson Information
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {[
                            { label: 'Teacher', value: plan.teacher?.full_name, icon: User },
                            { label: 'Subject', value: plan.subject, icon: BookOpen },
                            { label: 'Grade/Class', value: plan.class, icon: GraduationCap },
                            { label: 'Date', value: formatDate(plan.date), icon: Calendar },
                            { label: 'Week', value: plan.week ? `Week ${plan.week}` : null, icon: Calendar },
                            { label: 'Duration', value: plan.duration, icon: Clock3 },
                            { label: 'Lesson No', value: plan.lesson_no, icon: FileText },
                            { label: 'No. of Students', value: plan.no_of_students?.toString(), icon: Users },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                                  <Icon className="w-3 h-3" />
                                  {item.label}
                                </p>
                                <p className="text-sm font-medium text-slate-700 mt-1">{item.value || 'Not provided'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section B - Curriculum */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          Curriculum
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Strand</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.strand)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Sub-strand</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.sub_strand)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Outcome</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.outcome)}</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-4">
                            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Indicators</p>
                            {indicators.length > 0 ? (
                              <ul className="text-sm text-slate-700 mt-1 space-y-1">
                                {indicators.map((ind, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>{ind}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-slate-700 mt-1">Not provided</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section C - Learning */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-500" />
                          Learning
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Learning Intention</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.learning_intention)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Success Criteria</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.success_criteria)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Prior Knowledge</p>
                            <p className="text-sm text-slate-700 mt-1">{getDisplayValue(plan.prior_knowledge)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section D - Competencies & Values */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-500" />
                          Competencies & Values
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Key Competencies</p>
                            {competencies.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {competencies.map((c, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">{c}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700 mt-1">Not provided</p>
                            )}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-4">
                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Shared Values</p>
                            {values.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {values.map((v, i) => (
                                  <span key={i} className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">{v}</span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-700 mt-1">Not provided</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Section E - Lesson Procedure Timeline */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500" />
                          Lesson Procedure
                        </h4>
                        <div className="space-y-0">
                          {[
                            { num: '01', label: 'Introduction', time: plan.introduction_time, teacherActivity: plan.introduction_teacher_activity, studentActivity: plan.introduction_student_activity },
                            { num: '02', label: 'Body', time: plan.body_time, teacherActivity: plan.body_teacher_activity, studentActivity: plan.body_student_activity },
                            { num: '03', label: 'Evaluation', time: plan.evaluation_time, teacherActivity: plan.evaluation_teacher_activity, studentActivity: plan.evaluation_student_activity },
                            { num: '04', label: 'Conclusion', time: plan.conclusion_time, teacherActivity: plan.conclusion_teacher_activity, studentActivity: plan.conclusion_student_activity },
                          ].map((stage, sIdx) => (
                            <div key={stage.num}>
                              <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center">
                                  <div className="bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                    {stage.num}
                                  </div>
                                  {sIdx < 3 && <div className="w-0.5 h-full min-h-[40px] bg-slate-200 mt-1" />}
                                </div>
                                <div className="flex-1 pb-6">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{stage.label}</h5>
                                    <span className="text-xs text-slate-400 font-medium">{stage.time || 0} minutes</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                      <p className="text-xs text-blue-600 font-medium uppercase tracking-wide flex items-center gap-1 mb-2">
                                        <PenTool className="w-3 h-3" />
                                        Teacher Activities
                                      </p>
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{getDisplayValue(stage.teacherActivity)}</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                      <p className="text-xs text-green-600 font-medium uppercase tracking-wide flex items-center gap-1 mb-2">
                                        <GraduationCap className="w-3 h-3" />
                                        Student Activities
                                      </p>
                                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{getDisplayValue(stage.studentActivity)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Materials / Resources */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-blue-500" />
                          Learning Resources
                        </h4>
                        {materials.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {materials.map((m, i) => (
                              <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200">{m}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Not provided</p>
                        )}
                      </div>

                      {/* Pedagogy & Assessment */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-500" />
                          Pedagogy & Assessment
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            { label: 'Positive learning environment', value: plan.pedagogy_positive_environment },
                            { label: 'Connecting prior learning to new learning', value: plan.pedagogy_connecting_learning },
                            { label: 'Reflective practice', value: plan.pedagogy_reflective_practice },
                            { label: 'Making learning meaningful', value: plan.pedagogy_meaningful_learning },
                            { label: 'Addressing individual differences', value: plan.pedagogy_individual_differences },
                          ].map((item) => (
                            <div key={item.label} className={`flex items-center gap-2 p-3 rounded-lg ${item.value ? 'bg-green-50' : 'bg-slate-50'}`}>
                              {item.value ? (
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                              )}
                              <span className={`text-sm ${item.value ? 'text-slate-700' : 'text-slate-400'}`}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Teacher Reflection */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <PenTool className="w-4 h-4 text-blue-500" />
                          Teacher Reflection / Remarks
                        </h4>
                        <div className="bg-slate-50 rounded-lg p-4">
                          {plan.reflection_notes && plan.reflection_notes.trim() ? (
                            <div>
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{plan.reflection_notes}</p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {plan.reflection_objectives_achieved !== null && (
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${plan.reflection_objectives_achieved ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {plan.reflection_objectives_achieved ? '✓ Objectives achieved' : 'Objectives not achieved'}
                                  </span>
                                )}
                                {plan.reflection_activities_effective !== null && (
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${plan.reflection_activities_effective ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {plan.reflection_activities_effective ? '✓ Activities effective' : 'Activities not effective'}
                                  </span>
                                )}
                                {plan.reflection_implemented_as_planned !== null && (
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${plan.reflection_implemented_as_planned ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {plan.reflection_implemented_as_planned ? '✓ Implemented as planned' : 'Not implemented as planned'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">No teacher reflection submitted yet.</p>
                          )}
                        </div>
                      </div>

                      {/* Revision History */}
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-blue-500" />
                          Revision History
                        </h4>
                        {history.length > 0 ? (
                          <div className="space-y-0">
                            {history.map((rev, rIdx) => (
                              <div key={rev.id} className="flex items-start gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${rIdx === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                  {rIdx < history.length - 1 && <div className="w-0.5 h-8 bg-slate-200" />}
                                </div>
                                <div className="pb-4">
                                  <p className="text-sm font-medium text-slate-700 capitalize">{rev.action_type.replace(/_/g, ' ')}</p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    {formatDate(rev.created_at)} {rev.comments && `• ${rev.comments}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No revision history.</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-slate-100 print:hidden">
                        {onView && (
                          <button
                            onClick={() => onView(plan)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Lesson Plan
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(plan.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium"
                          >
                            <PenTool className="w-4 h-4" />
                            Edit Lesson Plan
                          </button>
                        )}
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition text-sm font-medium"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
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
