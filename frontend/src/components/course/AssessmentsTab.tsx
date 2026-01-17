/**
 * Assessments Tab Component
 */

import React from 'react';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { MCQAssessment, OpenEndedAssessment, FindMistakeAssessment, CaseBasedAssessment } from '../assessments';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export type AssessmentType = 'mcq' | 'open-ended' | 'find-mistake' | 'case-based';

export interface AssessmentsTabProps {
  courseId: string;
  activeSubTab: AssessmentType;
  onSubTabChange: (tab: AssessmentType) => void;
}

export const AssessmentsTab: React.FC<AssessmentsTabProps> = ({
  courseId,
  activeSubTab,
  onSubTabChange,
}) => {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  };

  const tabs: Array<{ id: string; label: React.ReactNode }> = [
    { id: 'mcq', label: '✓ Multiple Choice' },
    { id: 'open-ended', label: '✍️ Open-Ended' },
    { id: 'find-mistake', label: '🔍 Find the Mistake' },
    { id: 'case-based', label: '📋 Case-Based' },
  ];

  return (
    <div style={containerStyle}>
      <Tabs
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={(tabId) => onSubTabChange(tabId as AssessmentType)}
        fullWidth
      />

      <Card padding="xl">
        {activeSubTab === 'mcq' && <MCQAssessment courseId={courseId} />}
        {activeSubTab === 'open-ended' && <OpenEndedAssessment courseId={courseId} />}
        {activeSubTab === 'find-mistake' && <FindMistakeAssessment courseId={courseId} />}
        {activeSubTab === 'case-based' && <CaseBasedAssessment courseId={courseId} />}
      </Card>
    </div>
  );
};

