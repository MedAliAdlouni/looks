/**
 * Dashboard Page - Refactored with modular components
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Course } from '../types/api';
import { PageHeader, PageLayout } from '../components/layout';
import { Button, LoadingSpinner, Alert, Card } from '../components/ui';
import { CourseCard, CreateCourseForm } from '../components/dashboard';
import { theme } from '../theme';
import type { CSSProperties } from 'react';

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCourses();
      setCourses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (name: string, description: string) => {
    await apiClient.createCourse({ name, description });
    setShowCreateForm(false);
    await loadCourses();
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      await apiClient.deleteCourse(courseId);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
    }
  };

  const topBarStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  };

  const sectionTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.xs} 0`,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const sectionSubtitleStyle: CSSProperties = {
    margin: 0,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: theme.spacing['4xl'],
  };

  const emptyIconStyle: CSSProperties = {
    fontSize: '4rem',
    marginBottom: theme.spacing.md,
  };

  const emptyTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.sm} 0`,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const emptyTextStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.lg} 0`,
    color: theme.colors.text.tertiary,
  };

  const coursesGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: theme.spacing.lg,
  };

  return (
    <PageLayout>
      <PageHeader
        title="📚 Curriculum AI Tutor"
        subtitle="Manage and access your learning materials"
      />

      <main>
        <div style={topBarStyle}>
          <div>
            <h2 style={sectionTitleStyle}>My Courses</h2>
            <p style={sectionSubtitleStyle}>Manage and access your learning materials</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? '✕ Cancel' : '+ Create Course'}
          </Button>
        </div>

        {error && (
          <Alert variant="error" onClose={() => setError('')} style={{ marginBottom: theme.spacing.lg }}>
            {error}
          </Alert>
        )}

        {showCreateForm && (
          <CreateCourseForm
            onSubmit={handleCreateCourse}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {loading ? (
          <LoadingSpinner text="Loading courses..." />
        ) : courses.length === 0 ? (
          <Card padding="xl" style={emptyStyle}>
            <div style={emptyIconStyle}>📖</div>
            <h3 style={emptyTitleStyle}>No courses yet</h3>
            <p style={emptyTextStyle}>Create your first course to get started!</p>
            <Button variant="primary" onClick={() => setShowCreateForm(true)}>
              Create Your First Course
            </Button>
          </Card>
        ) : (
          <div style={coursesGridStyle}>
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={handleDeleteCourse}
                index={index}
              />
            ))}
          </div>
        )}
      </main>
    </PageLayout>
  );
}
