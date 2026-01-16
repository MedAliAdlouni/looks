/**
 * Assessments Tab Component
 */

import React from 'react';
import { Tabs } from '../ui/Tabs';
import { Card } from '../ui/Card';
import { MCQAssessment, OpenEndedAssessment } from '../assessments';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface AssessmentsTabProps {
  courseId: string;
  activeSubTab: 'mcq' | 'open-ended';
  onSubTabChange: (tab: 'mcq' | 'open-ended') => void;
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
  ];

  return (
    <div style={containerStyle}>
      <Tabs
        tabs={tabs}
        activeTab={activeSubTab}
        onTabChange={(tabId) => onSubTabChange(tabId as 'mcq' | 'open-ended')}
        fullWidth
      />

      <Card padding="xl">
        {activeSubTab === 'mcq' && <MCQAssessment courseId={courseId} />}
        {activeSubTab === 'open-ended' && <OpenEndedAssessment courseId={courseId} />}
      </Card>
    </div>
  );
};

