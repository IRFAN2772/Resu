import { memo, useRef, useCallback } from 'react';
import s from './EditableText.module.css';

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
}: EditableTextProps) {
  const prevValue = useRef(value);
  const isEditing = isEdit && editingField === fieldKey;

  const handleFocus = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (el) {
        prevValue.current = value;
        el.focus();
        el.select();
      }
    },
    [value],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        onBlur();
      } else if (e.key === 'Escape') {
        onChange(prevValue.current);
        onBlur();
      }
    },
    [multiline, onBlur, onChange],
  );

  if (isEditing) {
    const field = multiline ? (
      <textarea
        className={s.editTextarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        ref={handleFocus}
        rows={Math.max(2, value.split('\n').length)}
      />
    ) : (
      <input
        className={s.editInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        ref={handleFocus}
      />
    );

    return (
      <span className={multiline ? s.editWrapBlock : undefined}>
        {field}
        <span className={s.editHint}>
          {multiline ? null : (
            <>
              <kbd>Enter</kbd> save
            </>
          )}
          <kbd>Esc</kbd> cancel
        </span>
      </span>
    );
  }

  if (!isEdit) {
    return <Tag className={className}>{value}</Tag>;
  }

  const wrapClass = multiline || Tag === 'p' ? s.editWrapBlock : s.editWrap;

  return (
    <Tag
      className={`${className ?? ''} ${wrapClass}`}
      onClick={() => onFieldClick(fieldKey)}
      title="Click to edit"
    >
      {value || '\u00A0'}
    </Tag>
  );
});
