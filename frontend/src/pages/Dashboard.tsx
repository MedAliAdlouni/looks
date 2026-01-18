/**
 * Premium Dashboard Page
 * Clean, minimal design with premium feel
 */

import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import type { Course } from '../types/api';
import { PageLayout } from '../components/layout';
import { Alert, Modal, Button } from '../components/ui';
import {
  DashboardHeader,
  CourseCard,
  CreateCourseForm,
  UpdateCourseModal,
  CourseCardSkeleton,
} from '../components/dashboard';
import { theme } from '../theme';
import type { CSSProperties } from 'react';

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCourses(
        courses.filter(
          (course) =>
            course.name.toLowerCase().includes(query) ||
            (course.description?.toLowerCase().includes(query) ?? false)
        )
      );
    }
  }, [searchQuery, courses]);

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
    try {
      await apiClient.createCourse({ name, description });
      setShowCreateForm(false);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create course');
    }
  };

  const handleUpdateCourse = async (name: string, description: string) => {
    if (!editingCourse) return;
    try {
      await apiClient.updateCourse(editingCourse.id, { name, description });
      setEditingCourse(null);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update course');
      throw err;
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
  };

  const confirmDelete = async () => {
    if (!deletingCourseId) return;
    try {
      await apiClient.deleteCourse(deletingCourseId);
      setDeletingCourseId(null);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
      setDeletingCourseId(null);
    }
  };

  const containerStyle: CSSProperties = {
    minHeight: '100vh',
    background: theme.colors.background.secondary,
  };

  const mainStyle: CSSProperties = {
    padding: theme.spacing.xl,
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const emptyStyle: CSSProperties = {
    textAlign: 'center',
    padding: theme.spacing['4xl'],
    maxWidth: '500px',
    margin: '0 auto',
  };

  const emptyIconStyle: CSSProperties = {
    fontSize: '4rem',
    marginBottom: theme.spacing.lg,
    opacity: 0.5,
  };

  const emptyTitleStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.sm} 0`,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  };

  const emptyTextStyle: CSSProperties = {
    margin: `0 0 ${theme.spacing.xl} 0`,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
  };

  // Responsive grid - using auto-fill with minmax for better responsiveness
  const responsiveGridStyle: CSSProperties = {
    display: 'grid',
    gap: theme.spacing.lg,
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  };

  return (
    <div style={containerStyle}>
      <DashboardHeader
        onSearchChange={setSearchQuery}
        onCreateCourse={() => setShowCreateForm(true)}
      />
      <main style={mainStyle}>
        {error && (
          <Alert
            variant="error"
            onClose={() => setError('')}
            style={{ marginBottom: theme.spacing.lg }}
          >
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
          <div style={responsiveGridStyle}>
            {[...Array(6)].map((_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={emptyStyle}>
            <div style={emptyIconStyle}>📖</div>
            <h2 style={emptyTitleStyle}>
              {searchQuery ? 'No courses found' : 'No courses yet'}
            </h2>
            <p style={emptyTextStyle}>
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Create your first course to get started!'}
            </p>
            {!searchQuery && (
              <Button variant="primary" onClick={() => setShowCreateForm(true)}>
                New course
              </Button>
            )}
          </div>
        ) : (
          <div style={responsiveGridStyle}>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={setEditingCourse}
                onDelete={handleDeleteCourse}
              />
            ))}
          </div>
        )}
      </main>

      {editingCourse && (
        <UpdateCourseModal
          isOpen={!!editingCourse}
          onClose={() => setEditingCourse(null)}
          course={editingCourse}
          onUpdate={handleUpdateCourse}
        />
      )}

      <Modal
        isOpen={!!deletingCourseId}
        onClose={() => setDeletingCourseId(null)}
        title="Delete Course"
        maxWidth="400px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg }}>
          <p style={{ color: theme.colors.text.secondary, margin: 0 }}>
            Are you sure you want to delete this course? This action cannot be undone and will
            delete all associated documents and conversations.
          </p>
          <div
            style={{
              display: 'flex',
              gap: theme.spacing.md,
              justifyContent: 'flex-end',
            }}
          >
            <Button variant="ghost" onClick={() => setDeletingCourseId(null)}>
              Cancel
            </Button>
            <Button
              variant="error"
              onClick={confirmDelete}
              style={{
                background: theme.colors.error.DEFAULT,
                color: theme.colors.text.inverse,
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
