/**
 * Kebab Menu Component (⋮)
 * Dropdown menu for course actions
 */

import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';

export interface KebabMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export const KebabMenu: React.FC<KebabMenuProps> = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const buttonStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.xl,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    transition: `all ${theme.transitions.fast}`,
  };

  const menuStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.xl,
    minWidth: '180px',
    padding: theme.spacing.xs,
    zIndex: theme.zIndex.dropdown,
  };

  const menuItemStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    transition: `all ${theme.transitions.fast}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const menuItemDangerStyle: CSSProperties = {
    ...menuItemStyle,
    color: theme.colors.error.DEFAULT,
  };

  return (
    <div style={{ position: 'relative' }} ref={menuRef}>
      <button
        style={buttonStyle}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.colors.gray[100];
          e.currentTarget.style.color = theme.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = theme.colors.text.secondary;
        }}
        aria-label="Course options"
      >
        ⋮
      </button>
      {isOpen && (
        <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
          <div
            style={menuItemStyle}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ✏️ Edit course
          </div>
          <div
            style={menuItemDangerStyle}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.error.light;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            🗑️ Delete course
          </div>
        </div>
      )}
    </div>
  );
};

