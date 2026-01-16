# Quick Reference Guide

## 🎨 Changing UI Appearance

### Change Colors
Edit `frontend/src/theme/theme.ts`:

```typescript
colors: {
  primary: {
    DEFAULT: '#667eea',  // ← Change primary color here
    500: '#667eea',
    600: '#5a67d8',
    // ... other shades
  },
  // Change any color in the theme
}
```

### Change Spacing
```typescript
spacing: {
  xs: '0.25rem',  // ← Adjust spacing scale
  sm: '0.5rem',
  md: '1rem',     // ← Default spacing
  // ...
}
```

### Change Border Radius
```typescript
borderRadius: {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',  // ← Default radius
  // ...
}
```

### Change Typography
```typescript
typography: {
  fontSize: {
    base: '1rem',  // ← Default font size
    lg: '1.125rem',
    // ...
  },
  fontWeight: {
    normal: '400',
    semibold: '600',  // ← Default weight
    // ...
  }
}
```

## 🧩 Using Components

### Button
```tsx
import { Button } from '../components/ui';

// Primary button
<Button variant="primary">Click Me</Button>

// With loading state
<Button variant="primary" isLoading={loading}>
  Submit
</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// Full width
<Button fullWidth>Full Width</Button>
```

### Input
```tsx
import { Input } from '../components/ui';

// Text input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// With error
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// Textarea
<Input
  as="textarea"
  label="Description"
  rows={3}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
/>
```

### Card
```tsx
import { Card } from '../components/ui';

<Card padding="lg" hover>
  Content here
</Card>

// Different padding sizes
<Card padding="sm">Small padding</Card>
<Card padding="md">Medium padding</Card>
<Card padding="xl">Extra large padding</Card>
```

### Alert
```tsx
import { Alert } from '../components/ui';

<Alert variant="error">Error message</Alert>
<Alert variant="success">Success message</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="info">Info message</Alert>

// With close button
<Alert variant="error" onClose={() => setError('')}>
  Error message
</Alert>
```

### Tabs
```tsx
import { Tabs } from '../components/ui';

const tabs = [
  { id: 'tab1', label: 'Tab 1', badge: 5 },
  { id: 'tab2', label: 'Tab 2' },
];

<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  fullWidth
/>
```

## 📐 Using Layout Components

### PageHeader
```tsx
import { PageHeader } from '../components/layout';

<PageHeader
  title="Page Title"
  subtitle="Page subtitle"
  showBackButton
  backUrl="/"
/>
```

### PageLayout
```tsx
import { PageLayout } from '../components/layout';

<PageLayout maxWidth="1400px" padding="md">
  {/* Page content */}
</PageLayout>
```

## 🎨 Using Theme Directly

```tsx
import { theme } from '../theme';

// In component styles
<div style={{
  color: theme.colors.primary.DEFAULT,
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.lg,
  boxShadow: theme.shadows.md,
  background: theme.gradients.primary,
}}>
  Content
</div>
```

## 🛠️ Style Utilities

```tsx
import { getColor, getSpacing, getRadius, mergeStyles } from '../utils/styles';

// Get theme values
const color = getColor('primary.DEFAULT');
const spacing = getSpacing('md');
const radius = getRadius('lg');

// Merge styles
const combinedStyle = mergeStyles(
  baseStyle,
  conditionalStyle,
  overrideStyle
);
```

## 📝 Best Practices

1. **Always use theme values** - Don't hardcode colors/spacing
2. **Use UI components** - Don't create custom buttons/inputs
3. **Keep components small** - Break down large components
4. **Use TypeScript** - Get autocomplete and type safety
5. **Follow naming** - Use consistent naming conventions

## 🔍 Finding Components

- **UI Components**: `frontend/src/components/ui/`
- **Layout Components**: `frontend/src/components/layout/`
- **Course Components**: `frontend/src/components/course/`
- **Dashboard Components**: `frontend/src/components/dashboard/`
- **Theme**: `frontend/src/theme/theme.ts`

## 🚀 Quick Updates

- **Change primary color**: Edit `theme.colors.primary.DEFAULT`
- **Change default spacing**: Edit `theme.spacing.md`
- **Change default font**: Edit `theme.typography.fontSize.base`
- **Change shadows**: Edit `theme.shadows.*`

All changes automatically apply to all components!

