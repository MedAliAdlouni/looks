/**
 * Create Course Form Component
 */

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button, Input, Alert } from '../ui';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface CreateCourseFormProps {
  onSubmit: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}

export const CreateCourseForm: React.FC<CreateCourseFormProps> = ({ onSubmit, onCancel }) => {
  const [courseName, setCourseName] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      await onSubmit(courseName, courseDescription);
      setCourseName('');
      setCourseDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  };

  const titleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.lg} 0`,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const buttonsStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
  };

  return (
    <Card padding="xl" className="animate-fade-in">
      <h3 style={titleStyle}>Create New Course</h3>
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit} style={formStyle}>
        <Input
          type="text"
          label="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          required
          placeholder="e.g., Mathematics 101"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          <label style={{
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.text.secondary,
            fontSize: theme.typography.fontSize.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Description
          </label>
          <Input
            as="textarea"
            value={courseDescription}
            onChange={(e) => setCourseDescription(e.target.value)}
            placeholder="Course description..."
            rows={3}
          />
        </div>
        <div style={buttonsStyle}>
          <Button type="submit" variant="success" isLoading={creating} fullWidth>
            Create Course
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

