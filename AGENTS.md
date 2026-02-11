# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Expo Router screens and route groups (`(tabs)`, `(auth)`, `chat/`, `item/`, `settings/`).
- `src/`: Core app code by concern: `components/`, `services/`, `store/` and `stores/`, `theme/`, `types/`, `utils/`.
- `functions/`: Firebase Cloud Functions (TypeScript) with its own `package.json` and build/deploy lifecycle.
- `assets/`: Static images and icons. `docs/` contains architecture, feature plans, and Firebase/encryption docs.
- Root config files (`app.json`, `firebase.json`, `firestore.rules`, `storage.rules`, `tailwind.config.js`, `eslint.config.js`) define runtime and tooling behavior.

## Build, Test, and Development Commands
- `npm start`: Start Expo dev server.
- `npm run android` / `npm run ios` / `npm run web`: Run platform targets.
- `npm run lint`: Run Expo ESLint checks (required before PR).
- `cd functions && npm run build`: Compile Cloud Functions to `functions/lib`.
- `cd functions && npm run serve`: Build and start Firebase emulators for functions.
- `cd functions && npm run deploy`: Deploy functions only.
- Encryption verification helpers: `npx ts-node scripts/getUserId.ts` and `npx ts-node scripts/verifyEncryption.ts <userId>`.

## Coding Style & Naming Conventions
- Language: TypeScript with `strict` mode enabled; prefer explicit types for service/store boundaries.
- Indentation: 2 spaces; keep files formatted consistently with existing code.
- Components/screens: `PascalCase` (`DreamCard.tsx`); hooks: `useX.ts`; stores/services/types: descriptive camelCase file names (`useBucketStore.ts`, `notificationHelpers.ts`).
- Use import alias `@/*` for project-root imports when it improves readability.

## Testing Guidelines
- There is no committed automated test suite yet. Treat `npm run lint` plus manual smoke tests on at least one target (`android`, `ios`, or `web`) as the baseline gate.
- For Firebase changes, validate rules/emulator behavior and run encryption verification scripts when touching privacy flows.
- When adding tests, colocate with feature code and use `*.test.ts` / `*.test.tsx` naming.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat: ...`, `docs: ...`, `fix: ...`.
- Keep commits focused and scoped to one change area.
- PRs should include: concise summary, linked issue (if any), testing notes (commands + platforms), and screenshots/video for UI changes.
- Call out any Firebase rule/function/config updates explicitly so reviewers can validate deployment impact.
