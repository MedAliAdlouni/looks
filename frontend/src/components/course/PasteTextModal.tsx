/**
 * Paste Text Modal
 * Modal for pasting text content to create a text document
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input, Button } from '../ui';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface PasteTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, text: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const PasteTextModal: React.FC<PasteTextModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<{ title?: string; text?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: { title?: string; text?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!text.trim()) {
      newErrors.text = 'Text is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    try {
      await onSubmit(title.trim(), text.trim());
      // Reset form on success
      setTitle('');
      setText('');
      onClose();
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to submit text:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setText('');
      setErrors({});
      onClose();
    }
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  };

  const labelStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: '200px',
    padding: theme.spacing.md,
    border: `1px solid ${errors.text ? theme.colors.error.DEFAULT : theme.colors.gray[300]}`,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.sans,
    resize: 'vertical' as const,
    outline: 'none',
    transition: `border-color ${theme.transitions.default}`,
  };

  const errorStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error.DEFAULT,
    margin: 0,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.sm,
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Paste Text" maxWidth="700px">
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={fieldStyle}>
          <label htmlFor="paste-title" style={labelStyle}>
            Title <span style={{ color: theme.colors.error.DEFAULT }}>*</span>
          </label>
          <Input
            id="paste-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors({ ...errors, title: undefined });
              }
            }}
            placeholder="Enter document title"
            disabled={isSubmitting}
            style={{
              borderColor: errors.title ? theme.colors.error.DEFAULT : undefined,
            }}
          />
          {errors.title && <p style={errorStyle}>{errors.title}</p>}
        </div>

        <div style={fieldStyle}>
          <label htmlFor="paste-text" style={labelStyle}>
            Text <span style={{ color: theme.colors.error.DEFAULT }}>*</span>
          </label>
          <textarea
            id="paste-text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (errors.text) {
                setErrors({ ...errors, text: undefined });
              }
            }}
            placeholder="Paste or type your text here..."
            disabled={isSubmitting}
            style={textareaStyle}
          />
          {errors.text && <p style={errorStyle}>{errors.text}</p>}
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

