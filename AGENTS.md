# Akasha - Agent Coding Guidelines

This is a TypeScript React flashcard application with Tauri desktop support.

## Build & Development Commands

```bash
# Development server
npm start

# Production build
npm run build

# Preview production build
npm run serve

# Linting & Formatting (Biome)
npm run lint          # Check linting
npm run format        # Auto-fix issues

# Type checking
npm run lint:type     # Run tsc --noEmit

# Tauri desktop
npm run tauri dev     # Run Tauri dev mode
npm run tauri build   # Build desktop app

# Internationalization
npm run extract       # Extract i18n strings
```

**Package Manager:** pnpm (v9.15.3)

## Code Style Guidelines

### Biome (Linter & Formatter)

This project uses **Biome** instead of ESLint + Prettier.

- **Indentation:** 2 spaces
- **Line endings:** Unix-style (LF)
- **Trailing commas:** ES5 style
- **Import organization:** Auto-organized on save
- **JSON files:** Ignored by linter/formatter

### TypeScript Conventions

- **Strict mode:** Enabled
- **Target:** ES5
- **Unused variables:** Error (enforced)
- **Path alias:** `@/` maps to `src/`
- **Types:** Use explicit types for function parameters and return values

### React Conventions

- **Components:** Function components with explicit props interfaces
- **Hooks:** Must be at top level (enforced by Biome)
- **File naming:** PascalCase for components (e.g., `DeckView.tsx`)
- **CSS Modules:** Use `*.module.css` with camelCase class names

### Import Style

```typescript
// External libraries first (organized by Biome)
import React from "react";
import { Box } from "@mantine/core";

// Internal imports using path alias
import { useDeck } from "@/logic/deck/hooks/useDeck";
import type { Card } from "@/logic/card/card";
```

### Naming Conventions

- **Components:** PascalCase (e.g., `DeckView`, `Stat`)
- **Hooks:** camelCase with `use` prefix (e.g., `useDeck`, `useCardsOf`)
- **Types/Interfaces:** PascalCase (e.g., `CardSkeleton`, `NoteType`)
- **Functions:** camelCase (e.g., `getDeck`, `updateCard`)
- **Constants:** camelCase or UPPER_SNAKE_CASE for true constants
- **Files:** camelCase for utilities, PascalCase for components

### Error Handling

- Use TypeScript strict mode for compile-time safety
- Non-null assertions (`!`) are allowed (configured in Biome)
- Explicit `any` types are allowed when necessary

### Project Structure

```
src/
  app/           # Page-level view components
  components/    # Shared reusable UI components
  logic/         # Business logic, data layer
    card/        # Card-related operations
    deck/        # Deck-related operations
    note/        # Note-related operations
    settings/    # App settings
  types/         # Global TypeScript declarations
  lib/           # Utility functions
  i18n/          # Internationalization
  style/         # Global styles & CSS modules
```

### Key Patterns

1. **Custom Hooks:** Encapsulate data logic in `logic/*/hooks/use*.ts`
2. **Database:** Uses Dexie.js with hooks for reactive queries
3. **UI Library:** Mantine components with CSS modules for custom styling
4. **State:** React hooks + Dexie reactive hooks (no Redux/Zustand)

### Pre-commit Checklist

Before committing, always run:

```bash
npm run lint       # Biome lint check
npm run lint:type  # TypeScript type check
```

## Technologies

- **Framework:** React 18 + TypeScript 5
- **Build:** Vite 5
- **Desktop:** Tauri v2 (Rust)
- **UI:** Mantine v7
- **Database:** Dexie.js (IndexedDB)
- **State:** React hooks + Dexie reactive hooks
- **i18n:** i18next
- **Lint/Format:** Biome v1.8.3
