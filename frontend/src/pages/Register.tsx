/**
 * Register Page - Refactored with modular components
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert, Card } from '../components/ui';
import { PageLayout } from '../components/layout';
import { theme } from '../theme';
import type { CSSProperties } from 'react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, fullName);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: theme.spacing.md,
  };

  const cardContentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xl,
  };

  const headerStyle: CSSProperties = {
    textAlign: 'center',
  };

  const logoStyle: CSSProperties = {
    fontSize: '3rem',
    marginBottom: theme.spacing.sm,
  };

  const titleStyle: CSSProperties = {
    marginBottom: theme.spacing.sm,
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  };

  const subtitleStyle: CSSProperties = {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  };

  const formStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  };

  const linkStyle: CSSProperties = {
    textAlign: 'center',
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  };

  const linkTextStyle: CSSProperties = {
    color: theme.colors.primary.DEFAULT,
    fontWeight: theme.typography.fontWeight.semibold,
    textDecoration: 'none',
    transition: `color ${theme.transitions.default}`,
  };

  return (
    <PageLayout padding="none">
      <div style={containerStyle}>
        <Card padding="xl" style={{ width: '100%', maxWidth: '420px' }}>
          <div style={cardContentStyle}>
            <div style={headerStyle}>
              <div style={logoStyle}>📚</div>
              <h1 style={titleStyle}>Create Account</h1>
              <p style={subtitleStyle}>Start your learning journey today</p>
            </div>

            {error && (
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={formStyle}>
              <Input
                type="text"
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
                autoComplete="name"
              />

              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a strong password"
                autoComplete="new-password"
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                fullWidth
              >
                Create Account
              </Button>
            </form>

            <p style={linkStyle}>
              Already have an account?{' '}
              <Link to="/login" style={linkTextStyle}>
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
