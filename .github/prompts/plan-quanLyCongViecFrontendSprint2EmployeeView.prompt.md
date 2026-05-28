## Plan: Sprint 2 Frontend Employee + PWA Upgrade

TL;DR: Continue Sprint 2 by strengthening the employee-facing UI and adding PWA foundations in parallel. The recommended sequence is: stabilize the shared app shell and design tokens first, then add employee task/KPI routes and components with mocked or contract-driven data, then finish PWA offline/install support, and finally harden the experience with tests and build verification. This keeps the UI work shippable even if backend task/KPI endpoints or offline behavior need follow-up refinement.

**Steps**
1. Lock the sprint 2 frontend scope and UI structure.
   - Keep the employee area as the primary surface for the upgrade.
   - Treat task and KPI screens as new employee-facing routes, not separate app modes.
   - Preserve the current visual language from the existing employee layout and profile page so the sprint feels like a continuation rather than a redesign.
   - Decide which pieces must work with live API data immediately and which can start with mocked state plus clear loading/error/empty states.

2. Strengthen the shared app shell and visual system.
   - Reuse the current employee layout as the base shell for navigation, role badges, avatar, and session actions.
   - Expand global styling into a small design system for cards, panels, tables, badges, tabs, empty states, and mobile breakpoints.
   - Improve metadata, spacing, and typography so the app reads like a finished internal product on desktop and mobile.
   - Make sure the shell can support both task and KPI views without duplicating top-level layout code.

3. Build employee task UI first, then KPI UI on the same shell.
   - Create the task view hierarchy for list and kanban-style workflows.
   - Add the shared task interactions: search, filters, status changes, details drawer, and progress display.
   - Create KPI dashboard widgets after the task structure is stable, reusing the same panel, badge, and summary-card patterns.
   - Keep the UI responsive and usable on smaller screens, with stacked layouts where drag/drop or wide tables do not fit.

4. Wire frontend data flow and local state.
   - Implement the missing task and KPI hooks as thin data-access layers around the existing API client.
   - Add local UI state for filters, selected item, modal/drawer state, and optimistic updates where safe.
   - Define frontend types for task, KPI, comment, and status data so the UI and hooks share one contract.
   - Keep loading, error, and empty states explicit so the page does not collapse when data is missing or a request fails.

5. Add PWA foundations after the core employee screens are usable.
   - Finish manifest quality, installability metadata, and icon coverage.
   - Add service worker registration and a conservative caching strategy for shell assets and non-sensitive UI resources.
   - Provide an offline fallback experience that still shows the employee shell and a clear unavailable state for live data.
   - Keep auth-aware behavior in mind so cached assets do not expose session-sensitive information.

6. Harden and verify the sprint increment.
   - Add unit tests for hooks, shared UI components, and any state transitions that drive task/KPI interactions.
   - Add route-level or integration tests for the employee task and KPI screens, including loading, empty, and error cases.
   - Validate PWA behavior in browser devtools with offline mode, install prompt behavior, and cache refresh.
   - Finish with typecheck, test, and production build validation before closing the sprint slice.

**Relevant files**
- `d:\Schools\QLDA\code\frontend\src\app\layout.tsx` — root metadata and manifest wiring.
- `d:\Schools\QLDA\code\frontend\src\app\employee\layout.tsx` — current employee shell, navigation, avatar, and sign-out pattern to extend.
- `d:\Schools\QLDA\code\frontend\src\app\employee\profile\page.tsx` — reference for current employee UI patterns, form handling, and panel layout.
- `d:\Schools\QLDA\code\frontend\src\app\globals.css` — shared visual system, responsive spacing, and component primitives.
- `d:\Schools\QLDA\code\frontend\public\manifest.json` — PWA metadata, icons, and installability settings.
- `d:\Schools\QLDA\code\frontend\next.config.js` — build-time PWA or asset-related configuration if needed.

**Verification**
1. Run frontend type and test checks after the UI shell and feature routes are added.
2. Run a production build to confirm the employee views and PWA changes do not break Next.js output.
3. Manually smoke-test the employee task and KPI screens on desktop and mobile widths.
4. Validate offline behavior in browser devtools with the app shell loaded and API requests unavailable.
5. Confirm the installable PWA experience and manifest metadata render correctly in the browser.

**Decisions**
- Scope is frontend-first, but it assumes the task/KPI contract will align with the existing API client and will not wait on a full backend redesign.
- The plan keeps the existing employee layout and profile page as the visual reference instead of introducing a new design language.
- PWA work is included in Sprint 2, but only after the task/KPI UI shell is stable enough to benefit from offline support.
- If time gets tight, the fallback order is: complete the employee UI shell, then ship task/KPI screens, then finish the offline layer.

**TDD Test Cases**

1. Employee shell and navigation
   - As a staff user, I want to see the employee shell with my role, name, avatar, and logout action, so that I know I am in the correct workspace.
   - Test: renders the correct role label for staff, manager, and CEO sessions.
   - Test: shows the user full name when auth state is available.
   - Test: keeps the profile link visible and navigates to the employee profile page.
   - Test: logout clears the session and does not leave stale protected UI visible.

2. Profile page baseline regression
   - As a staff user, I want my profile data to load correctly, so that I can verify the existing employee flow still works after Sprint 2 changes.
   - Test: shows the loading state before API data resolves.
   - Test: renders full name, email, phone, and avatar after a successful fetch.
   - Test: shows a friendly error when profile loading fails.
   - Test: rejects invalid Vietnam phone formats and does not call the update API.
   - Test: updates phone and avatar successfully when the inputs are valid.
   - Test: surfaces backend error text for failed updates.

3. Task hook contract
   - As an employee, I want task data to load through a reusable hook, so that the task UI can stay thin and predictable.
   - Test: fetches the current user's tasks from the API client.
   - Test: applies status, priority, search, and deadline filters to the request or local state, depending on implementation.
   - Test: exposes a loading flag while the request is in flight.
   - Test: exposes an error state when the API rejects.
   - Test: keeps the selected task in sync with local UI state.
   - Test: supports optimistic task status changes and rolls back on failure.

4. KPI hook contract
   - As an employee, I want KPI data to load through a dedicated hook, so that the KPI dashboard can render summaries and drill-downs consistently.
   - Test: fetches KPI summary and breakdown data from the API client.
   - Test: exposes loading, error, and empty states separately.
   - Test: updates local KPI selection without mutating unrelated state.
   - Test: tolerates partial payloads from the backend without crashing the UI.

5. Task list page
   - As an employee, I want a list view of my tasks, so that I can scan deadlines and status quickly.
   - Test: renders a table or list with title, assignee, priority, deadline, progress, and status.
   - Test: shows an empty state when no tasks exist.
   - Test: sorts by deadline and priority correctly.
   - Test: highlights overdue tasks in a distinct visual state.
   - Test: opens the task detail drawer when a row is clicked.
   - Test: keeps the page usable on mobile widths by stacking or collapsing noncritical columns.

6. Kanban board page
   - As an employee, I want a kanban board, so that I can move tasks between workflow states visually.
   - Test: renders Todo, In Progress, and Done columns with counts.
   - Test: displays cards in the correct column based on task status.
   - Test: updates the UI when a task is dragged between columns.
   - Test: rejects invalid transitions and shows a visible error.
   - Test: opens the task drawer when a card is clicked.
   - Test: remains functional when drag and drop is unavailable, using a fallback action.

7. Task detail drawer
   - As an employee, I want task details in a drawer, so that I can inspect and update a task without leaving the board.
   - Test: shows title, description, assignees, attachments, comments, and progress.
   - Test: loads comments in order and renders timestamps.
   - Test: allows adding a comment and updates the thread immediately after success.
   - Test: auto-transitions a task to In Progress after the first comment if that rule is enabled.
   - Test: blocks comment submission when the input is empty.
   - Test: surfaces attachment upload validation errors.

8. Filter and search toolbar
   - As an employee, I want search and filters, so that I can narrow tasks quickly.
   - Test: debounces search input before applying the query.
   - Test: filters by status, priority, and deadline range.
   - Test: combines multiple filters without losing previous selections.
   - Test: preserves filter state across navigation or reload when intended.
   - Test: clears filters back to the default state.

9. PWA foundation
   - As an employee, I want the app to behave as an installable PWA, so that I can keep using it in a desktop or mobile workspace.
   - Test: renders the correct manifest metadata and app name.
   - Test: registers a service worker only in the browser environment.
   - Test: serves the app shell from cache after the first successful load.
   - Test: shows a clear offline fallback state when API data is unavailable.
   - Test: avoids caching sensitive auth/session payloads.
   - Test: keeps static assets available after a refresh while offline.

10. Verification and regression
   - As a team, we want the Sprint 2 slice to stay stable, so that new UI and PWA work do not regress existing employee flows.
   - Test: frontend typecheck passes after the new hooks and components are added.
   - Test: the existing auth and profile tests still pass unchanged.
   - Test: new task and KPI component tests cover success, loading, empty, and error states.
   - Test: offline and installability flows are covered by E2E or browser automation where feasible.

**Further Considerations**
1. If you want the sprint to stay strictly UI-only, the task/KPI routes can start with mocked data and contract tests before any backend coupling.
2. If you want a stronger PWA release, we can add an offline status banner and cached read-only task/KPI views before adding write actions.
3. If the team prefers smaller deliverables, the sprint can be split into two slices: employee task/KPI UI first, PWA offline support second.