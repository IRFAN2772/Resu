import { memo } from 'react';

interface EditableTextProps {
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  isEdit: boolean;
  editingField: string | null;
  onFieldClick: (field: string) => void;
  onBlur: () => void;
  tag?: 'span' | 'p' | 'strong';
  className?: string;
  multiline?: boolean;
  styles: Record<string, string>;
}

export const EditableText = memo(function EditableText({
  fieldKey,
  value,
  onChange,
  isEdit,
  editingField,
  onFieldClick,
  onBlur,
  tag: Tag = 'span',
  className,
  multiline = false,
  styles,
}: EditableTextProps) {
  if (isEdit && editingField === fieldKey) {
    if (multiline) {
      return (
        <textarea
          className={styles['edit-textarea']}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoFocus
        />
      );
    }
    return (
      <input
        className={styles['edit-input']}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === 'Enter' && onBlur()}
        autoFocus
      />
    );
  }
  return (
    <Tag
      className={`${className ?? ''} ${isEdit ? styles.editable : ''}`}
      onClick={() => onFieldClick(fieldKey)}
    >
      {value}
    </Tag>
  );
});
