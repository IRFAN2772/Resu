import type { ResumeData } from '@resu/shared';

export interface ResumeTemplateProps {
  data: ResumeData;
  mode: 'preview' | 'edit' | 'pdf';
  onSave?: (data: ResumeData) => void;
}
