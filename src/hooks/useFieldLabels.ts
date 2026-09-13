import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FieldLabel {
  id: string;
  field_key: string;
  field_label: string;
  label_en: string;
  label_dv: string;
  field_category: string;
  display_order: number;
  field_type?: string;
  field_options?: any[];
  is_required?: boolean;
  is_enabled?: boolean;
  placeholder?: string;
  help_text?: string;
}

type Language = 'english' | 'dhivehi';

export function useFieldLabels(language: Language = 'english') {
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [fieldData, setFieldData] = useState<Record<string, FieldLabel>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFieldLabels();
  }, [language]);

  const loadFieldLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_plan_field_labels')
        .select('*')
        .order('display_order');

      if (error) throw error;

      const labelsMap: Record<string, string> = {};
      const dataMap: Record<string, FieldLabel> = {};
      (data || []).forEach((field: FieldLabel) => {
        if (language === 'dhivehi' && field.label_dv) {
          labelsMap[field.field_key] = field.label_dv;
        } else if (language === 'english' && field.label_en) {
          labelsMap[field.field_key] = field.label_en;
        } else {
          labelsMap[field.field_key] = field.field_label;
        }
        dataMap[field.field_key] = field;
      });

      setFieldLabels(labelsMap);
      setFieldData(dataMap);
    } catch (error) {
      console.error('Error loading field labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLabel = (fieldKey: string, defaultLabel: string = '') => {
    return fieldLabels[fieldKey] || defaultLabel;
  };

  const getFieldOptions = (fieldKey: string, language: Language = 'english') => {
    const field = fieldData[fieldKey];
    if (!field || !field.field_options || !Array.isArray(field.field_options)) {
      return [];
    }

    return field.field_options.map(option => {
      if (typeof option === 'string') {
        return option;
      }
      if (typeof option === 'object' && option !== null) {
        if (language === 'dhivehi' && option.dv) {
          return option.dv;
        }
        if (language === 'english' && option.en) {
          return option.en;
        }
        return option.en || option.dv || '';
      }
      return '';
    });
  };

  const getFieldOptionsWithValues = (fieldKey: string, language: Language = 'english') => {
    const field = fieldData[fieldKey];
    if (!field || !field.field_options || !Array.isArray(field.field_options)) {
      return [];
    }

    return field.field_options.map(option => {
      if (typeof option === 'string') {
        return { value: option, label: option };
      }
      if (typeof option === 'object' && option !== null) {
        const displayLabel = language === 'dhivehi' && option.dv ? option.dv : option.en;
        return { value: option.en || '', label: displayLabel || option.en || '' };
      }
      return { value: '', label: '' };
    });
  };

  return { fieldLabels, fieldData, loading, getLabel, getFieldOptions, getFieldOptionsWithValues };
}
