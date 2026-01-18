/**
 * Login Page - Refactored with modular components
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert, Card } from '../components/ui';
import { PageLayout } from '../components/layout';
import { theme } from '../theme';
import type { CSSProperties } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
              <h1 style={titleStyle}>Welcome Back</h1>
              <p style={subtitleStyle}>Sign in to continue to your courses</p>
            </div>

            {error && (
              <Alert variant="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} style={formStyle}>
              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />

              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={loading}
                fullWidth
              >
                Sign In
              </Button>
            </form>

            <p style={linkStyle}>
              Don't have an account?{' '}
              <Link to="/register" style={linkTextStyle}>
                Create one here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
