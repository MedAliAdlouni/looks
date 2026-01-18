/**
 * Landing Page - Premium, minimal landing page
 * Explains the product and drives users to Register or Login
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui';
import { PageLayout } from '../components/layout';
import { theme } from '../theme';
import type { CSSProperties } from 'react';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const containerStyle: CSSProperties = {
    width: '100%',
    minHeight: '100vh',
    background: 'linear-gradient(to bottom, #fef9f3 0%, #ffffff 30%)',
  };

  const sectionStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `0 ${theme.spacing.xl}`,
  };

  // Hero Section
  const heroSectionStyle: CSSProperties = {
    ...sectionStyle,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing['4xl'],
    textAlign: 'center',
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef3c7 100%)',
    borderRadius: '0 0 48px 48px',
    marginBottom: theme.spacing['2xl'],
  };

  const logoTextStyle: CSSProperties = {
    fontSize: 'clamp(4rem, 8vw, 6rem)',
    fontWeight: theme.typography.fontWeight.normal,
    color: '#000000',
    letterSpacing: '0.02em',
    marginBottom: theme.spacing.xl,
    fontFamily: "'Patrick Hand', cursive",
  };

  const heroTitleStyle: CSSProperties = {
    fontSize: 'clamp(2.5rem, 5vw, 4rem)',
    fontWeight: theme.typography.fontWeight.bold,
    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: theme.typography.lineHeight.tight,
    marginBottom: theme.spacing.lg,
    letterSpacing: '-0.02em',
  };

  const heroSubtitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.xl,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeight.relaxed,
    maxWidth: '600px',
    margin: `0 auto ${theme.spacing['3xl']} auto`,
  };

  const ctaContainerStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.md,
    justifyContent: 'center',
    flexWrap: 'wrap',
  };

  // How It Works Section
  const howItWorksSectionStyle: CSSProperties = {
    ...sectionStyle,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing['4xl'],
    background: 'linear-gradient(to bottom, #f0f9ff 0%, #e0f2fe 100%)',
    borderRadius: '48px',
    marginTop: theme.spacing['2xl'],
    marginBottom: theme.spacing['2xl'],
  };

  const sectionTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    letterSpacing: '-0.01em',
  };

  const stepsContainerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: theme.spacing.xl,
    marginTop: theme.spacing['2xl'],
  };

  const stepCardStyle: CSSProperties = {
    background: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing['2xl'],
    border: `1px solid ${theme.colors.gray[200]}`,
    boxShadow: theme.shadows.md,
    textAlign: 'center',
    transition: `all ${theme.transitions.default}`,
  };

  // Warm color palette for step numbers
  const stepColors = [
    { bg: '#fef3c7', color: '#d97706' }, // Warm yellow/amber
    { bg: '#fce7f3', color: '#db2777' }, // Warm pink
    { bg: '#ddd6fe', color: '#7c3aed' }, // Warm purple
    { bg: '#cffafe', color: '#0891b2' }, // Warm cyan
  ];

  const stepNumberStyle = (index: number): CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: theme.borderRadius.full,
    background: stepColors[index].bg,
    color: stepColors[index].color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    margin: `0 auto ${theme.spacing.lg} auto`,
    boxShadow: `0 2px 8px ${stepColors[index].bg}80`,
  });

  const stepTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  };

  const stepDescriptionStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeight.relaxed,
  };

  const stepIconStyle: CSSProperties = {
    fontSize: '2.5rem',
    marginBottom: theme.spacing.md,
  };

  // Benefits Section
  const benefitsSectionStyle: CSSProperties = {
    ...sectionStyle,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing['4xl'],
    background: 'linear-gradient(to bottom, #ffffff 0%, #fff7ed 100%)',
  };

  const benefitsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: theme.spacing.xl,
    marginTop: theme.spacing['2xl'],
  };

  // Warm colors for benefit cards
  const benefitColors = [
    { border: '#fed7aa', bg: '#fff7ed' }, // Warm orange
    { border: '#fbcfe8', bg: '#fdf2f8' }, // Warm pink
    { border: '#c7d2fe', bg: '#eef2ff' }, // Warm indigo
    { border: '#a7f3d0', bg: '#ecfdf5' }, // Warm green
  ];

  const benefitCardStyle = (index: number): CSSProperties => ({
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    border: `2px solid ${benefitColors[index].border}`,
    background: benefitColors[index].bg,
    boxShadow: theme.shadows.md,
    transition: `all ${theme.transitions.default}`,
  });

  const benefitTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  };

  const benefitDescriptionStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.lineHeight.relaxed,
  };

  // Final CTA Section
  const finalCtaSectionStyle: CSSProperties = {
    ...sectionStyle,
    paddingTop: theme.spacing['4xl'],
    paddingBottom: theme.spacing['4xl'],
    background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fce7f3 100%)',
    textAlign: 'center',
    borderRadius: '48px 48px 0 0',
    marginTop: theme.spacing['2xl'],
  };

  const finalCtaTitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    letterSpacing: '-0.01em',
  };

  const finalCtaSubtitleStyle: CSSProperties = {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['2xl'],
    maxWidth: '500px',
    margin: `0 auto ${theme.spacing['2xl']} auto`,
  };

  return (
    <PageLayout padding="none">
      <div style={containerStyle}>
        {/* Hero Section */}
        <section style={heroSectionStyle}>
          <div style={logoTextStyle}>Looks</div>
          <h1 style={heroTitleStyle}>
            Learn with AI that stays true to your curriculum
          </h1>
          <p style={heroSubtitleStyle}>
            Upload your course materials and get personalized tutoring that only uses your documents. No hallucinations, no off-curriculum answers, just focused learning.
          </p>
          <div style={ctaContainerStyle}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/register')}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
                fontSize: theme.typography.fontSize.base,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              }}
            >
              Get started
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/login')}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
                fontSize: theme.typography.fontSize.base,
                background: theme.colors.background.primary,
                border: `2px solid ${theme.colors.gray[300]}`,
              }}
            >
              Log in
            </Button>
          </div>
        </section>

        {/* How It Works Section */}
        <section style={howItWorksSectionStyle}>
          <h2 style={sectionTitleStyle}>How it works</h2>
          <div style={stepsContainerStyle}>
            <div
              style={stepCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <div style={stepIconStyle}>📚</div>
              <div style={stepNumberStyle(0)}>1</div>
              <h3 style={stepTitleStyle}>Upload material</h3>
              <p style={stepDescriptionStyle}>
                Add your course documents, PDFs, Word files, PowerPoints, or images. Everything stays organized in your courses.
              </p>
            </div>
            <div
              style={stepCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <div style={stepIconStyle}>💬</div>
              <div style={stepNumberStyle(1)}>2</div>
              <h3 style={stepTitleStyle}>Learn with AI</h3>
              <p style={stepDescriptionStyle}>
                Ask questions and get answers with citations. The AI only uses information from your uploaded materials.
              </p>
            </div>
            <div
              style={stepCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <div style={stepIconStyle}>🧩</div>
              <div style={stepNumberStyle(2)}>3</div>
              <h3 style={stepTitleStyle}>Practice</h3>
              <p style={stepDescriptionStyle}>
                Get step-by-step guidance on exercises and problems using your course content as the reference.
              </p>
            </div>
            <div
              style={stepCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <div style={stepIconStyle}>✅</div>
              <div style={stepNumberStyle(3)}>4</div>
              <h3 style={stepTitleStyle}>Assess</h3>
              <p style={stepDescriptionStyle}>
                Generate practice questions and test your understanding with MCQs and open-ended assessments.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section style={benefitsSectionStyle}>
          <h2 style={sectionTitleStyle}>Why students love it</h2>
          <div style={benefitsGridStyle}>
            <div
              style={benefitCardStyle(0)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <h3 style={benefitTitleStyle}>Understand deeply</h3>
              <p style={benefitDescriptionStyle}>
                Get explanations that match your teacher's methods and curriculum. Every answer is grounded in your materials.
              </p>
            </div>
            <div
              style={benefitCardStyle(1)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <h3 style={benefitTitleStyle}>Practice effectively</h3>
              <p style={benefitDescriptionStyle}>
                Work through exercises with step-by-step guidance that references your course content, not generic solutions.
              </p>
            </div>
            <div
              style={benefitCardStyle(2)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <h3 style={benefitTitleStyle}>Reflect and learn</h3>
              <p style={benefitDescriptionStyle}>
                See exactly where information comes from with citations. Build confidence by understanding the source.
              </p>
            </div>
            <div
              style={benefitCardStyle(3)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme.shadows.xl;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.shadows.md;
              }}
            >
              <h3 style={benefitTitleStyle}>Explain clearly</h3>
              <p style={benefitDescriptionStyle}>
                When the AI doesn't know something from your materials, it tells you, no hallucinations, no guessing.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section style={finalCtaSectionStyle}>
          <h2 style={finalCtaTitleStyle}>Ready to start learning?</h2>
          <p style={finalCtaSubtitleStyle}>
            Join students who are mastering their courses with AI that stays true to their curriculum.
          </p>
          <div style={ctaContainerStyle}>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/register')}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
                fontSize: theme.typography.fontSize.base,
              }}
            >
              Get started
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/login')}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing['2xl']}`,
                fontSize: theme.typography.fontSize.base,
              }}
            >
              Log in
            </Button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

