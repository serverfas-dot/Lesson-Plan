import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Shield, Key, LogOut, RefreshCw, Plus, Edit2, Trash2, X, FileText, Database as DatabaseIcon, Download, Upload, ClipboardList, ArrowLeft, ChevronUp, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { Database } from '../../types/database.types';
import { LessonPlanForm } from '../LessonPlan/LessonPlanForm';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LessonPlan = Database['public']['Tables']['lesson_plans']['Row'];

interface UsersByRole {
  teachers: Profile[];
  leadingTeachers: Profile[];
  principals: Profile[];
}

interface UserFormData {
  userId?: string;
  email: string;
  password: string;
  full_name: string;
  role: 'principal' | 'leading_teacher' | 'teacher';
  leading_teacher_id?: string;
}

interface FieldLabel {
  id: string;
  field_key: string;
  field_label: string;
  label_en: string;
  label_dv: string;
  field_category: string;
  display_order: number;
  field_type: string;
  field_options: string[];
  is_required: boolean;
  is_enabled: boolean;
  placeholder: string;
  help_text: string;
}

interface FieldFormData {
  id?: string;
  field_key: string;
  field_label: string;
  label_en: string;
  label_dv: string;
  field_category: string;
  field_type: string;
  field_options: string[];
  is_required: boolean;
  is_enabled: boolean;
  placeholder: string;
  help_text: string;
}

interface BackupSchedule {
  id: string;
  backup_type: 'weekly' | 'monthly';
  is_enabled: boolean;
  last_backup_at: string | null;
  next_backup_at: string | null;
}

interface BackupHistory {
  id: string;
  backup_type: string;
  backup_name: string;
  backup_size: number;
  storage_path: string;
  tables_included: string[];
  created_at: string;
  status: string;
}

export function SuperAdminDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'fields' | 'backup' | 'lesson-plans'>('users');
  const [users, setUsers] = useState<UsersByRole>({
    teachers: [],
    leadingTeachers: [],
    principals: [],
  });
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [editingLessonPlan, setEditingLessonPlan] = useState<string | null>(null);
  const [fieldLabels, setFieldLabels] = useState<FieldLabel[]>([]);
  const [editingField, setEditingField] = useState<FieldLabel | null>(null);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [fieldFormData, setFieldFormData] = useState<FieldFormData>({
    field_key: '',
    field_label: '',
    label_en: '',
    label_dv: '',
    field_category: 'basic_info',
    field_type: 'text',
    field_options: [],
    is_required: true,
    is_enabled: true,
    placeholder: '',
    help_text: '',
  });
  const [optionsInput, setOptionsInput] = useState('');
  const [optionsInputEn, setOptionsInputEn] = useState('');
  const [optionsInputDv, setOptionsInputDv] = useState('');
  const [backupSchedules, setBackupSchedules] = useState<BackupSchedule[]>([]);
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher',
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'fields') {
      loadFieldLabels();
    } else if (activeTab === 'backup') {
      loadBackupData();
    } else if (activeTab === 'lesson-plans') {
      loadLessonPlans();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [
        { data: teachersData, error: teachersError },
        { data: leadingTeachersData, error: ltError },
        { data: principalsData, error: principalsError }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'teacher').order('full_name'),
        supabase.from('profiles').select('*').eq('role', 'leading_teacher').order('full_name'),
        supabase.from('profiles').select('*').eq('role', 'principal').order('full_name')
      ]);

      if (teachersError) throw teachersError;
      if (ltError) throw ltError;
      if (principalsError) throw principalsError;

      setUsers({
        teachers: teachersData || [],
        leadingTeachers: leadingTeachersData || [],
        principals: principalsData || [],
      });
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFieldLabels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plan_field_labels')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setFieldLabels(data || []);
    } catch (error) {
      console.error('Error loading field labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLessonPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lesson_plans')
        .select(`
          *,
          teacher:teacher_id(full_name, email),
          leading_teacher:leading_teacher_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLessonPlans(data || []);
    } catch (error) {
      console.error('Error loading lesson plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLessonPlan = async (lessonPlanId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the lesson plan "${title}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', lessonPlanId);

      if (error) throw error;

      setLessonPlans(prev => prev.filter(plan => plan.id !== lessonPlanId));
      showNotification('Lesson plan deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting lesson plan:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to delete lesson plan', 'error');
    }
  };

  const handleUpdateFieldLabel = async (fieldId: string, newLabel: string) => {
    try {
      const { error } = await supabase
        .from('lesson_plan_field_labels')
        .update({
          field_label: newLabel,
          updated_at: new Date().toISOString(),
          updated_by: profile!.id
        })
        .eq('id', fieldId);

      if (error) throw error;

      setFieldLabels(prev =>
        prev.map(field =>
          field.id === fieldId
            ? { ...field, field_label: newLabel }
            : field
        )
      );
      setEditingField(null);
      showNotification('Field label updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating field label:', error);
      showNotification('Failed to update field label', 'error');
    }
  };

  const openAddFieldModal = () => {
    setFieldFormData({
      field_key: '',
      field_label: '',
      field_category: 'basic_info',
      field_type: 'text',
      field_options: [],
      is_required: true,
      is_enabled: true,
      placeholder: '',
      help_text: '',
    });
    setOptionsInput('');
    setShowFieldModal(true);
  };

  const openEditFieldModal = (field: FieldLabel) => {
    setFieldFormData({
      id: field.id,
      field_key: field.field_key,
      field_label: field.field_label,
      label_en: field.label_en || field.field_label,
      label_dv: field.label_dv || '',
      field_category: field.field_category,
      field_type: field.field_type,
      field_options: field.field_options || [],
      is_required: field.is_required,
      is_enabled: field.is_enabled,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
    });

    const options = field.field_options || [];
    const isBilingual = options.length > 0 && typeof options[0] === 'object' && options[0] !== null && ('en' in options[0] || 'dv' in options[0]);

    if (isBilingual) {
      const enOptions = options.map((opt: any) => opt.en || '').join('\n');
      const dvOptions = options.map((opt: any) => opt.dv || '').join('\n');
      setOptionsInputEn(enOptions);
      setOptionsInputDv(dvOptions);
      setOptionsInput('');
    } else {
      setOptionsInput(options.join('\n'));
      setOptionsInputEn('');
      setOptionsInputDv('');
    }

    setShowFieldModal(true);
  };

  const closeFieldModal = () => {
    setShowFieldModal(false);
    setFieldFormData({
      field_key: '',
      field_label: '',
      label_en: '',
      label_dv: '',
      field_category: 'basic_info',
      field_type: 'text',
      field_options: [],
      is_required: true,
      is_enabled: true,
      placeholder: '',
      help_text: '',
    });
    setOptionsInput('');
    setOptionsInputEn('');
    setOptionsInputDv('');
  };

  const handleSubmitField = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let options: any[] = [];

      if (optionsInputEn.trim() || optionsInputDv.trim()) {
        const enOptions = optionsInputEn.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
        const dvOptions = optionsInputDv.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
        const maxLength = Math.max(enOptions.length, dvOptions.length);

        options = Array.from({ length: maxLength }, (_, i) => ({
          en: enOptions[i] || '',
          dv: dvOptions[i] || ''
        }));
      } else if (optionsInput.trim()) {
        options = optionsInput.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
      }

      const fieldData = {
        field_key: fieldFormData.field_key,
        field_label: fieldFormData.field_label,
        label_en: fieldFormData.label_en,
        label_dv: fieldFormData.label_dv,
        field_category: fieldFormData.field_category,
        field_type: fieldFormData.field_type,
        field_options: options,
        is_required: fieldFormData.is_required,
        is_enabled: fieldFormData.is_enabled,
        placeholder: fieldFormData.placeholder,
        help_text: fieldFormData.help_text,
        updated_at: new Date().toISOString(),
        updated_by: profile!.id,
      };

      if (fieldFormData.id) {
        const { error } = await supabase
          .from('lesson_plan_field_labels')
          .update(fieldData)
          .eq('id', fieldFormData.id);

        if (error) throw error;

        setFieldLabels(prev =>
          prev.map(field =>
            field.id === fieldFormData.id
              ? { ...field, ...fieldData }
              : field
          )
        );
        showNotification('Field updated successfully!', 'success');
      } else {
        const maxOrder = Math.max(...fieldLabels.map(f => f.display_order), 0);
        const { data, error } = await supabase
          .from('lesson_plan_field_labels')
          .insert({
            ...fieldData,
            display_order: maxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;

        setFieldLabels(prev => [...prev, data]);
        showNotification('Field added successfully!', 'success');
      }

      closeFieldModal();
    } catch (error) {
      console.error('Error saving field:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to save field', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (fieldId: string, fieldLabel: string) => {
    if (!confirm(`Are you sure you want to delete the field "${fieldLabel}"? This action cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('lesson_plan_field_labels')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setFieldLabels(prev => prev.filter(field => field.id !== fieldId));
      showNotification('Field deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting field:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to delete field', 'error');
    }
  };

  const handleReorderField = async (fieldId: string, direction: 'up' | 'down') => {
    const currentField = fieldLabels.find(f => f.id === fieldId);
    if (!currentField) return;

    const sameCategory = fieldLabels.filter(f => f.field_category === currentField.field_category);
    const currentIndex = sameCategory.findIndex(f => f.id === fieldId);

    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sameCategory.length - 1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const swapField = sameCategory[swapIndex];

    try {
      await supabase
        .from('lesson_plan_field_labels')
        .update({ display_order: swapField.display_order })
        .eq('id', currentField.id);

      await supabase
        .from('lesson_plan_field_labels')
        .update({ display_order: currentField.display_order })
        .eq('id', swapField.id);

      setFieldLabels(prev =>
        prev.map(field => {
          if (field.id === currentField.id) {
            return { ...field, display_order: swapField.display_order };
          }
          if (field.id === swapField.id) {
            return { ...field, display_order: currentField.display_order };
          }
          return field;
        }).sort((a, b) => a.display_order - b.display_order)
      );
    } catch (error) {
      console.error('Error reordering field:', error);
      showNotification('Failed to reorder field', 'error');
    }
  };

  const loadBackupData = async () => {
    setLoading(true);
    try {
      const [schedulesResult, historyResult] = await Promise.all([
        supabase.from('backup_schedules').select('*').order('backup_type'),
        supabase.from('backup_history').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (schedulesResult.error) throw schedulesResult.error;
      if (historyResult.error) throw historyResult.error;

      setBackupSchedules(schedulesResult.data || []);
      setBackupHistory(historyResult.data || []);
    } catch (error) {
      console.error('Error loading backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-backup`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupType: 'manual' })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Backup failed');

      showNotification('Manual backup created successfully!', 'success');
      await loadBackupData();
    } catch (error) {
      console.error('Error creating backup:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to create backup', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSchedule = async (backupType: 'weekly' | 'monthly', isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('backup_schedules')
        .update({
          is_enabled: isEnabled,
          next_backup_at: isEnabled ? calculateNextBackup(backupType) : null,
          updated_at: new Date().toISOString()
        })
        .eq('backup_type', backupType);

      if (error) throw error;

      setBackupSchedules(prev =>
        prev.map(schedule =>
          schedule.backup_type === backupType
            ? { ...schedule, is_enabled: isEnabled }
            : schedule
        )
      );

      showNotification(`${backupType.charAt(0).toUpperCase() + backupType.slice(1)} backup ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      console.error('Error toggling schedule:', error);
      showNotification('Failed to update backup schedule', 'error');
    }
  };

  const handleRestoreBackup = async (backupPath: string, backupName: string) => {
    if (!confirm(`Are you sure you want to restore from "${backupName}"? This will overwrite current field labels and schedules.`)) {
      return;
    }

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/database-restore`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backupPath })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Restore failed');

      showNotification('Database restored successfully! Refreshing page...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error restoring backup:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to restore backup', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadBackup = async (storagePath: string, backupName: string) => {
    try {
      setSubmitting(true);

      const { data, error } = await supabase.storage
        .from('database-backups')
        .download(storagePath);

      if (error) throw error;
      if (!data) throw new Error('No data received');

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('Backup downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading backup:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to download backup', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBackup = async (backupId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      await supabase.storage.from('database-backups').remove([storagePath]);
      await supabase.from('backup_history').delete().eq('id', backupId);

      setBackupHistory(prev => prev.filter(b => b.id !== backupId));
      showNotification('Backup deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting backup:', error);
      showNotification('Failed to delete backup', 'error');
    }
  };

  const calculateNextBackup = (backupType: string): string => {
    const now = new Date();
    if (backupType === 'weekly') {
      now.setDate(now.getDate() + 7);
    } else if (backupType === 'monthly') {
      now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const openPasswordResetModal = (user: Profile) => {
    setPasswordResetUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordResetUser(null);
    setNewPassword('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          userId: passwordResetUser.id,
          password: newPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to reset password');

      showNotification('Password reset successfully!', 'success');
      closePasswordModal();
    } catch (error) {
      console.error('Error resetting password:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddUserModal = (role: 'principal' | 'leading_teacher' | 'teacher') => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role,
    });
    setShowUserModal(true);
  };

  const openEditUserModal = (user: Profile) => {
    setEditingUser(user);
    setFormData({
      userId: user.id,
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role as 'principal' | 'leading_teacher' | 'teacher',
      leading_teacher_id: user.leading_teacher_id || undefined,
    });
    setShowUserModal(true);
  };

  const closeModal = () => {
    setShowUserModal(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'teacher',
    });
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      if (editingUser) {
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            userId: formData.userId,
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            leading_teacher_id: formData.leading_teacher_id,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          const errorMsg = result.details
            ? `${result.error}\n${result.details}`
            : result.error || 'Failed to update user';
          throw new Error(errorMsg);
        }

        showNotification('User updated successfully!', 'success');
      } else {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            leading_teacher_id: formData.leading_teacher_id,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create user');

        showNotification('User created successfully!', 'success');
      }

      closeModal();
      await loadUsers();
    } catch (error) {
      console.error('Error submitting user:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to save user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users?userId=${userId}`;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
      };

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user');

      showNotification('User deleted successfully!', 'success');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to delete user', 'error');
    }
  };

  const totalUsers = users.teachers.length + users.leadingTeachers.length + users.principals.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-sky-100">
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 transition-all duration-300 transform ${
            notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
          style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:bg-white hover:bg-opacity-20 rounded p-1 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
            </div>
            <p className="text-sm text-slate-300">Welcome, {profile?.full_name}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-white hover:bg-slate-700 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'users'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('lesson-plans')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'lesson-plans'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            Lesson Plans
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'fields'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            Lesson Plan Fields
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'backup'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <DatabaseIcon className="w-5 h-5" />
            Backup & Restore
          </button>
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Users</p>
                    <p className="text-2xl font-bold text-slate-800">{totalUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Principals</p>
                    <p className="text-2xl font-bold text-slate-800">{users.principals.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-sky-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Leading Teachers</p>
                    <p className="text-2xl font-bold text-slate-800">{users.leadingTeachers.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Teachers</p>
                    <p className="text-2xl font-bold text-slate-800">{users.teachers.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-800 mx-auto"></div>
                <p className="mt-6 text-slate-700 font-medium text-lg">Loading users...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait</p>
              </div>
            ) : (
              <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Principals ({users.principals.length})</h2>
                <button
                  onClick={() => openAddUserModal('principal')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Principal
                </button>
              </div>
              <div className="p-6">
                {users.principals.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No principals found</p>
                ) : (
                  <div className="grid gap-3">
                    {users.principals.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-medium">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{user.full_name}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openPasswordResetModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Key className="w-4 h-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-sky-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Leading Teachers ({users.leadingTeachers.length})</h2>
                <button
                  onClick={() => openAddUserModal('leading_teacher')}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Leading Teacher
                </button>
              </div>
              <div className="p-6">
                {users.leadingTeachers.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No leading teachers found</p>
                ) : (
                  <div className="grid gap-3">
                    {users.leadingTeachers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-sky-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-medium">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{user.full_name}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openPasswordResetModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Key className="w-4 h-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-green-600 text-white p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Teachers ({users.teachers.length})</h2>
                <button
                  onClick={() => openAddUserModal('teacher')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Teacher
                </button>
              </div>
              <div className="p-6">
                {users.teachers.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No teachers found</p>
                ) : (
                  <div className="grid gap-3">
                    {users.teachers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-medium">
                            {user.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{user.full_name}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                            {user.leading_teacher_id && (
                              <p className="text-xs text-slate-500">Assigned to Leading Teacher</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => openPasswordResetModal(user)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                          >
                            <Key className="w-4 h-4" />
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
            )}
          </>
        ) : activeTab === 'lesson-plans' ? (
          <>
            {editingLessonPlan ? (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setEditingLessonPlan(null);
                    loadLessonPlans();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to List
                </button>
                <LessonPlanForm
                  lessonPlanId={editingLessonPlan}
                  isSuperAdmin={true}
                  onSuccess={() => {
                    setEditingLessonPlan(null);
                    loadLessonPlans();
                  }}
                  onCancel={() => setEditingLessonPlan(null)}
                />
              </div>
            ) : loading ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-800 mx-auto"></div>
                <p className="mt-6 text-slate-700 font-medium text-lg">Loading lesson plans...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-700 text-white p-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">All Lesson Plans ({lessonPlans.length})</h2>
                  <button
                    onClick={loadLessonPlans}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-800 text-white rounded-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
                <div className="p-6">
                  {lessonPlans.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">No lesson plans found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Title</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Teacher</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Subject</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Class</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lessonPlans.map((plan) => (
                            <tr key={plan.id} className="border-b border-slate-100 hover:bg-gradient-to-br from-blue-50 to-sky-100">
                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-800">{plan.title || plan.topic}</p>
                                <p className="text-sm text-slate-500">Week {plan.week}</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="text-slate-800">{(plan.teacher as any)?.full_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{(plan.teacher as any)?.email}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-700">{plan.subject}</td>
                              <td className="py-3 px-4 text-slate-700">{plan.class}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                  plan.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : plan.status === 'submitted'
                                    ? 'bg-blue-100 text-blue-800'
                                    : plan.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {plan.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {new Date(plan.date).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingLessonPlan(plan.id)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLessonPlan(plan.id, plan.title || plan.topic)}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'fields' ? (
          <>
            {loading ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-800 mx-auto"></div>
                <p className="mt-6 text-slate-700 font-medium text-lg">Loading field labels...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Lesson Plan Format Customization</h3>
                  <p className="text-sm text-blue-800">
                    Customize your lesson plan format by adding, editing, or removing fields. You can also change field types, add dropdown options, and reorder fields within each category.
                  </p>
                </div>

                {['basic_info', 'curriculum', 'instructional', 'pedagogy', 'reflection', 'revision_history'].map((category) => (
                  <div key={category} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="bg-slate-700 text-white p-4 flex justify-between items-center">
                      <h2 className="text-xl font-semibold capitalize">
                        {category === 'basic_info' && 'Basic Information'}
                        {category === 'curriculum' && 'Curriculum Details'}
                        {category === 'instructional' && 'Instructional Procedures'}
                        {category === 'pedagogy' && 'Pedagogy & Assessment'}
                        {category === 'reflection' && 'Reflection (Post-Approval)'}
                        {category === 'revision_history' && 'Revision History'}
                      </h2>
                      <button
                        onClick={openAddFieldModal}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-800 text-white rounded-lg transition"
                      >
                        <Plus className="w-4 h-4" />
                        Add Field
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid gap-3">
                        {fieldLabels
                          .filter((field) => field.field_category === category)
                          .map((field, index, array) => (
                            <div key={field.id} className={`p-4 rounded-lg border-2 ${
                              field.is_enabled ? 'bg-white border-slate-300' : 'bg-slate-100 border-slate-200 opacity-60'
                            }`}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className="px-2 py-1 text-xs bg-slate-600 text-white rounded font-mono">{field.field_key}</span>
                                    {!field.is_enabled && (
                                      <span className="px-2 py-1 text-xs bg-slate-300 text-slate-700 rounded">Disabled</span>
                                    )}
                                    {field.is_required && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Required</span>
                                    )}
                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">{field.field_type}</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-2">
                                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <p className="text-xs font-semibold text-blue-700 mb-1">ENGLISH LABEL</p>
                                      <p className="text-sm font-medium text-slate-800">{field.label_en || field.field_label}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <p className="text-xs font-semibold text-green-700 mb-1">DHIVEHI LABEL (ދިވެހި)</p>
                                      <p className="text-sm font-medium text-slate-800" dir="rtl">{field.label_dv || '-'}</p>
                                    </div>
                                  </div>

                                  {(field.placeholder || field.help_text || (field.field_options && field.field_options.length > 0)) && (
                                    <div className="text-xs text-slate-600 space-y-1 mt-2">
                                      {field.placeholder && (
                                        <p><span className="font-medium">Placeholder:</span> {field.placeholder}</p>
                                      )}
                                      {field.help_text && (
                                        <p><span className="font-medium">Help Text:</span> {field.help_text}</p>
                                      )}
                                      {field.field_options && field.field_options.length > 0 && (
                                        <p><span className="font-medium">Options:</span> {field.field_options.join(', ')}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => handleReorderField(field.id, 'up')}
                                      disabled={index === 0}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="Move up"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleReorderField(field.id, 'down')}
                                      disabled={index === array.length - 1}
                                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="Move down"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => openEditFieldModal(field)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteField(field.id, field.field_label)}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'backup' ? (
          <>
            {loading ? (
              <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-800 mx-auto"></div>
                <p className="mt-6 text-slate-700 font-medium text-lg">Loading backup data...</p>
                <p className="text-slate-500 text-sm mt-2">Please wait</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Database Backup & Restore</h2>
                      <p className="text-sm text-slate-600 mt-1">Manage your database backups and restore data</p>
                    </div>
                    <button
                      onClick={handleManualBackup}
                      disabled={submitting}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                    >
                      <Download className="w-5 h-5" />
                      Create Manual Backup
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {backupSchedules.map((schedule) => (
                      <div key={schedule.id} className="p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg border border-slate-300">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-slate-800 capitalize">{schedule.backup_type} Backup</h3>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={schedule.is_enabled}
                              onChange={(e) => handleToggleSchedule(schedule.backup_type, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        {schedule.last_backup_at && (
                          <p className="text-sm text-slate-600 mb-1">
                            Last backup: {formatDate(schedule.last_backup_at)}
                          </p>
                        )}
                        {schedule.is_enabled && schedule.next_backup_at && (
                          <p className="text-sm text-green-600">
                            Next backup: {formatDate(schedule.next_backup_at)}
                          </p>
                        )}
                        {!schedule.is_enabled && (
                          <p className="text-sm text-slate-500">Automatic backups disabled</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-700 text-white p-4">
                    <h2 className="text-xl font-semibold">Backup History</h2>
                  </div>
                  <div className="p-6">
                    {backupHistory.length === 0 ? (
                      <p className="text-slate-600 text-center py-8">No backups found</p>
                    ) : (
                      <div className="grid gap-3">
                        {backupHistory.map((backup) => (
                          <div key={backup.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-sky-100 rounded-lg border border-slate-300">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <DatabaseIcon className="w-5 h-5 text-slate-600" />
                                <div>
                                  <p className="font-medium text-slate-800">{backup.backup_name}</p>
                                  <p className="text-sm text-slate-600">
                                    {formatDate(backup.created_at)} • {formatBytes(backup.backup_size)} • {backup.tables_included.length} tables
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  backup.backup_type === 'manual'
                                    ? 'bg-blue-100 text-blue-800'
                                    : backup.backup_type === 'weekly'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {backup.backup_type}
                                </span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  backup.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {backup.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadBackup(backup.storage_path, backup.backup_name)}
                                disabled={submitting}
                                className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                              <button
                                onClick={() => handleRestoreBackup(backup.storage_path, backup.backup_name)}
                                disabled={submitting}
                                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                              >
                                <Upload className="w-4 h-4" />
                                Restore
                              </button>
                              <button
                                onClick={() => handleDeleteBackup(backup.id, backup.storage_path)}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-800">
                {editingUser ? 'Edit User' : `Add ${formData.role === 'principal' ? 'Principal' : formData.role === 'leading_teacher' ? 'Leading Teacher' : 'Teacher'}`}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="user@school.com"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value as 'principal' | 'leading_teacher' | 'teacher';
                      setFormData({ ...formData, role: newRole, leading_teacher_id: newRole === 'teacher' ? formData.leading_teacher_id : undefined });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="leading_teacher">Leading Teacher</option>
                    <option value="principal">Principal</option>
                  </select>
                  {editingUser.role !== formData.role && (
                    <p className="text-xs text-amber-600 mt-1">
                      {formData.role === 'teacher' && editingUser.role === 'leading_teacher' && 'This leading teacher will become a regular teacher. Teachers previously assigned to them will be unassigned.'}
                      {formData.role === 'leading_teacher' && editingUser.role === 'teacher' && 'This teacher will become a leading teacher. Their leading teacher assignment will be removed.'}
                      {formData.role === 'principal' && 'This user will become a principal. Any teacher assignments will be cleared.'}
                    </p>
                  )}
                </div>
              )}

              {formData.role === 'teacher' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Leading Teacher (Optional)</label>
                  <select
                    value={formData.leading_teacher_id || ''}
                    onChange={(e) => setFormData({ ...formData, leading_teacher_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">None</option>
                    {[...users.leadingTeachers, ...users.principals].filter(lt => lt.id !== editingUser?.id).map((lt) => (
                      <option key={lt.id} value={lt.id}>{lt.full_name}{lt.role === 'principal' ? ' (Principal)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && passwordResetUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-800">
                Reset Password for {passwordResetUser.full_name}
              </h3>
              <button onClick={closePasswordModal} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="text"
                  disabled
                  value={passwordResetUser.email}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
                >
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col my-8">
            <div className="flex justify-between items-center mb-4 p-6 pb-0 flex-shrink-0">
              <h3 className="text-xl font-semibold text-slate-800">
                {fieldFormData.id ? 'Edit Field' : 'Add New Field'}
              </h3>
              <button onClick={closeFieldModal} className="text-slate-500 hover:text-slate-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form id="field-form" onSubmit={handleSubmitField} className="space-y-4 overflow-y-auto px-6 pb-6 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Key *</label>
                  <input
                    type="text"
                    required
                    value={fieldFormData.field_key}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="e.g., my_custom_field"
                    disabled={!!fieldFormData.id}
                  />
                  <p className="text-xs text-slate-500 mt-1">Internal identifier (cannot be changed after creation)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Label * (Fallback)</label>
                  <input
                    type="text"
                    required
                    value={fieldFormData.field_label}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, field_label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    placeholder="e.g., My Custom Field"
                  />
                  <p className="text-xs text-slate-500 mt-1">Used as fallback if language-specific labels are not set</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Format Scope (Optional)</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Leave both blank to create a global template, or specify grade and subject for a custom format.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                    <input
                      type="text"
                      value={fieldFormData.grade}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, grade: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="e.g., Grade 5, KG, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={fieldFormData.subject}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      placeholder="e.g., Mathematics, Science, etc."
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Language-Specific Labels</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                    <label className="block text-sm font-bold text-blue-700 mb-2">English Label *</label>
                    <input
                      type="text"
                      required
                      value={fieldFormData.label_en}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, label_en: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="Enter English label"
                    />
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300">
                    <label className="block text-sm font-bold text-green-700 mb-2">Dhivehi Label (ދިވެހި) *</label>
                    <input
                      type="text"
                      required
                      value={fieldFormData.label_dv}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, label_dv: e.target.value })}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      placeholder="ދިވެހި ލޭބަލް ލިޔުއްވާ"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    required
                    value={fieldFormData.field_category}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, field_category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="basic_info">Basic Information</option>
                    <option value="curriculum">Curriculum Details</option>
                    <option value="instructional">Instructional Procedures</option>
                    <option value="pedagogy">Pedagogy & Assessment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Field Type *</label>
                  <select
                    required
                    value={fieldFormData.field_type}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, field_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox-group">Checkbox Group</option>
                    <option value="heading">Heading (Section Title)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Placeholder Text</label>
                <input
                  type="text"
                  value={fieldFormData.placeholder}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="e.g., Enter value here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Help Text</label>
                <input
                  type="text"
                  value={fieldFormData.help_text}
                  onChange={(e) => setFieldFormData({ ...fieldFormData, help_text: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Additional instructions for this field"
                />
              </div>

              {(fieldFormData.field_type === 'dropdown' || fieldFormData.field_type === 'checkbox-group') && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="bilingualOptions"
                      checked={!!optionsInputEn || !!optionsInputDv}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOptionsInputEn(optionsInput);
                          setOptionsInputDv('');
                          setOptionsInput('');
                        } else {
                          setOptionsInput(optionsInputEn);
                          setOptionsInputEn('');
                          setOptionsInputDv('');
                        }
                      }}
                      className="w-4 h-4 text-slate-600 border-slate-300 rounded"
                    />
                    <label htmlFor="bilingualOptions" className="text-sm font-medium text-slate-700">
                      Bilingual Options (English & Dhivehi)
                    </label>
                  </div>

                  {optionsInputEn || optionsInputDv ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          English Options *
                        </label>
                        <textarea
                          required
                          value={optionsInputEn}
                          onChange={(e) => setOptionsInputEn(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          rows={6}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                        <p className="text-xs text-slate-500 mt-1">One option per line</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" dir="rtl">
                          Dhivehi Options (ދިވެހި) *
                        </label>
                        <textarea
                          required
                          value={optionsInputDv}
                          onChange={(e) => setOptionsInputDv(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          rows={6}
                          dir="rtl"
                          placeholder="އޮޕްޝަން 1&#10;އޮޕްޝަން 2&#10;އޮޕްޝަން 3"
                        />
                        <p className="text-xs text-slate-500 mt-1" dir="rtl">ކޮންމެ ލައިނެއްގައި އޮޕްޝަނެއް</p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Options (one per line) *
                      </label>
                      <textarea
                        required
                        value={optionsInput}
                        onChange={(e) => setOptionsInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        rows={6}
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                      <p className="text-xs text-slate-500 mt-1">Enter each option on a new line</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldFormData.is_required}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, is_required: e.target.checked })}
                    className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Required Field</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fieldFormData.is_enabled}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, is_enabled: e.target.checked })}
                    className="w-4 h-4 text-slate-600 border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Enabled (Show in Form)</span>
                </label>
              </div>

            </form>

            <div className="flex gap-3 p-6 pt-4 border-t border-slate-200 flex-shrink-0 bg-white">
              <button
                type="button"
                onClick={closeFieldModal}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-gradient-to-br from-blue-50 to-sky-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="field-form"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : fieldFormData.id ? 'Update Field' : 'Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
