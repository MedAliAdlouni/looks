/**
 * Update Course Modal Component
 * Modal for editing course name and description
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button, Input } from '../ui';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';
import type { Course } from '../../types/api';

export interface UpdateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onUpdate: (name: string, description: string) => Promise<void>;
}

export const UpdateCourseModal: React.FC<UpdateCourseModalProps> = ({
  isOpen,
  onClose,
  course,
  onUpdate,
}) => {
  const [name, setName] = useState(course?.name || '');
  const [description, setDescription] = useState(course?.description || '');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  React.useEffect(() => {
    if (course) {
      setName(course.name);
      setDescription(course.description || '');
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUpdating(true);

    try {
      await onUpdate(name, description);
      onClose();
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
    } finally {
      setUpdating(false);
    }
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  };

  const buttonsStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  };

  if (!course) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Course" maxWidth="500px">
      <form onSubmit={handleSubmit} style={formStyle}>
        {error && (
          <div
            style={{
              padding: theme.spacing.md,
              background: theme.colors.error.light,
              color: theme.colors.error.DEFAULT,
              borderRadius: theme.borderRadius.md,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        )}
        <Input
          type="text"
          label="Course Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Mathematics 101"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          <label
            style={{
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text.secondary,
              fontSize: theme.typography.fontSize.sm,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Description
          </label>
          <Input
            as="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Course description..."
            rows={3}
          />
        </div>
        <div style={buttonsStyle}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={updating}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

