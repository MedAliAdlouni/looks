# Frontend Architecture

This frontend has been refactored for modularity, readability, and easy UI updates.

## 📁 Project Structure

```
frontend/src/
├── theme/              # Design system and theme configuration
│   ├── theme.ts       # Central theme configuration (UPDATE COLORS/STYLES HERE)
│   └── index.ts
├── components/
│   ├── ui/            # Reusable UI components (Button, Input, Card, etc.)
│   ├── layout/        # Layout components (PageHeader, PageLayout)
│   ├── course/        # Course-specific components
│   └── dashboard/     # Dashboard-specific components
├── pages/             # Page components
├── utils/             # Utility functions (styles, helpers)
├── api/               # API client
├── context/           # React contexts
└── types/             # TypeScript types
```

## 🎨 Updating the UI

### Changing Colors

Edit `frontend/src/theme/theme.ts`:

```typescript
export const theme = {
  colors: {
    primary: {
      DEFAULT: '#667eea',  // Change this to update primary color
      // ... other shades
    },
    // ... other colors
  },
  // ...
}
```

All components automatically use these colors!

### Changing Spacing

Update spacing values in `theme.ts`:

```typescript
spacing: {
  xs: '0.25rem',    // Change these values
  sm: '0.5rem',
  // ...
}
```

### Changing Typography

Update font sizes, weights, etc. in `theme.ts`:

```typescript
typography: {
  fontSize: {
    base: '1rem',  // Change default font size
    // ...
  },
  // ...
}
```

## 🧩 Component Usage

### Button

```tsx
import { Button } from '../components/ui';

<Button variant="primary" size="md" isLoading={false}>
  Click Me
</Button>
```

### Input

```tsx
import { Input } from '../components/ui';

<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

### Card

```tsx
import { Card } from '../components/ui';

<Card padding="lg" hover>
  Content here
</Card>
```

### Tabs

```tsx
import { Tabs } from '../components/ui';

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1', badge: 5 },
    { id: 'tab2', label: 'Tab 2' },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

## 🔧 Key Features

1. **Centralized Theme**: All styling comes from one place
2. **Reusable Components**: DRY principle - write once, use everywhere
3. **Type Safety**: Full TypeScript support
4. **Easy Updates**: Change theme.ts to update entire UI
5. **Modular Structure**: Easy to find and modify components

## 📝 Best Practices

1. **Always use theme values**: Don't hardcode colors/spacing
   ```tsx
   // ❌ Bad
   style={{ color: '#667eea', padding: '16px' }}
   
   // ✅ Good
   style={{ color: theme.colors.primary.DEFAULT, padding: theme.spacing.md }}
   ```

2. **Use UI components**: Don't create custom buttons/inputs
   ```tsx
   // ❌ Bad
   <button style={{...}}>Click</button>
   
   // ✅ Good
   <Button variant="primary">Click</Button>
   ```

3. **Break down large components**: Keep components focused and small
4. **Use layout components**: PageHeader, PageLayout for consistency

## 🚀 Adding New Components

1. Create component in appropriate folder (`ui/`, `layout/`, etc.)
2. Use theme values for styling
3. Export from `index.ts` for easy imports
4. Document props with TypeScript interfaces

## 🎯 Quick UI Updates

- **Change primary color**: Edit `theme.colors.primary.DEFAULT`
- **Change border radius**: Edit `theme.borderRadius.*`
- **Change shadows**: Edit `theme.shadows.*`
- **Change fonts**: Edit `theme.typography.*`

All changes propagate automatically to all components!
