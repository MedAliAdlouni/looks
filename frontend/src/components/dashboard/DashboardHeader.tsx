/**
 * Premium Dashboard Header Component
 * Clean, minimal top navigation bar with Notion/Linear-style design
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme';
import type { CSSProperties } from 'react';
import logoImage from '../../assets/logo.png';

export interface DashboardHeaderProps {
  onSearchChange?: (query: string) => void;
  onCreateCourse: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onSearchChange,
  onCreateCourse,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);

  useEffect(() => {
    onSearchChange?.(searchQuery);
  }, [searchQuery, onSearchChange]);

  const headerStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.sticky,
    background: theme.colors.background.primary,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    boxShadow: theme.shadows.sm,
    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
  };

  const containerStyle: CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xl,
  };

  const leftSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexShrink: 0,
  };

  const logoContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginLeft: '40px',
  };
; ;
  const logoImageStyle: CSSProperties = {
    height: '40px',
    width: 'auto',
    objectFit: 'contain',
  };

  const centerSectionStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    maxWidth: '600px',
    margin: `0 ${theme.spacing.xl}`,
  };

  const searchInputStyle: CSSProperties = {
    width: '100%',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.gray[200]}`,
    background: theme.colors.background.primary,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.sans,
    transition: `all ${theme.transitions.default}`,
    outline: 'none',
  };

  const rightSectionStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    flexShrink: 0,
  };

  const newCourseButtonStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    height: '40px', // Match profile button height
    borderRadius: theme.borderRadius.full,
    background: theme.colors.accent.DEFAULT,
    color: theme.colors.text.inverse,
    border: 'none',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: `all ${theme.transitions.default}`,
    fontFamily: theme.typography.fontFamily.sans,
  };

  const profileButtonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.xs} ${theme.spacing.sm} ${theme.spacing.xs} ${theme.spacing.xs}`,
    borderRadius: theme.borderRadius.full,
    border: `1px solid ${theme.colors.gray[200]}`,
    background: theme.colors.background.primary,
    cursor: 'pointer',
    transition: `all ${theme.transitions.default}`,
  };

  const avatarStyle: CSSProperties = {
    width: '32px',
    height: '32px',
    borderRadius: theme.borderRadius.full,
    background: '#000000',
    color: theme.colors.text.inverse,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
    flexShrink: 0,
  };

  const usernameStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.normal,
    color: theme.colors.text.secondary,
    margin: 0,
    paddingRight: theme.spacing.sm,
  };

  const profileMenuStyle: CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.gray[200]}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.xl,
    minWidth: '200px',
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
  };

  const menuItemDangerStyle: CSSProperties = {
    ...menuItemStyle,
    color: theme.colors.error.DEFAULT,
  };

  const userInfoStyle: CSSProperties = {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.colors.gray[200]}`,
    marginBottom: theme.spacing.xs,
  };

  const userNameStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    margin: `0 0 ${theme.spacing.xs} 0`,
  };

  const userEmailStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    margin: 0,
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <header style={headerStyle}>
      <div style={containerStyle}>
        {/* Left Section */}
        <div style={leftSectionStyle}>
          <div style={logoContainerStyle}>
            <img
              src={logoImage}
              alt="Looks Logo"
              style={logoImageStyle}
            />
          </div>
        </div>

        {/* Center Section */}
        <div style={centerSectionStyle}>
          <input
            type="text"
            placeholder="Search courses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchInputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.colors.accent.DEFAULT;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent[50]}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.colors.gray[200];
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Right Section */}
        <div style={rightSectionStyle}>
          <button
            style={newCourseButtonStyle}
            onClick={onCreateCourse}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.colors.accent[700];
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = theme.colors.accent.DEFAULT;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            New course
          </button>
          <div style={{ position: 'relative' }} ref={profileMenuRef}>
            <button
              style={profileButtonStyle}
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = theme.colors.gray[50];
                e.currentTarget.style.borderColor = theme.colors.gray[300];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = theme.colors.background.primary;
                e.currentTarget.style.borderColor = theme.colors.gray[200];
              }}
              aria-label="Profile menu"
            >
              <div style={avatarStyle}>
                {getInitials(user?.full_name, user?.email)}
              </div>
              <span style={usernameStyle}>
                {user?.full_name || user?.email?.split('@')[0] || 'User'}
              </span>
            </button>
            {showProfileMenu && (
              <div style={profileMenuStyle}>
                <div style={userInfoStyle}>
                  <p style={userNameStyle}>{user?.full_name || 'User'}</p>
                  <p style={userEmailStyle}>{user?.email}</p>
                </div>
                <div
                  style={menuItemDangerStyle}
                  onClick={logout}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.colors.error.light;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

