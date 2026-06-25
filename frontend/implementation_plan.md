# SplitBuddy Premium Mobile Redesign Plan

This plan details a comprehensive architectural and styling overhaul of the SplitBuddy application to deliver a premium, native-app-like mobile experience. The redesign goes beyond simple media queries, fundamentally restructuring the UI for smaller screens while preserving the existing dark glassmorphism aesthetic.

## User Review Required

> [!IMPORTANT]
> **Modal Full-Screen Behavior:** The plan proposes making all modals (Add Expense, Edit Group, etc.) take up the *entire screen* on mobile (100vh, 100vw, 0 border radius), hiding the background completely, with a fixed header and a fixed button area at the bottom. This is standard for native apps. Please confirm this behavior is desired.

> [!WARNING]
> **Dashboard Single Column:** The plan will stack the Dashboard statistic cards (Net Balance, Receive, Pay, Total Spend) into a single vertical column on mobile as requested. This will make the dashboard vertically longer. Is this strictly preferred over a compact 2x2 grid?

## Proposed Changes

### Global Architecture & CSS

#### [MODIFY] `frontend/src/SplitBuddy.jsx` (CSS Section)

1.  **Typography Scaling:** Implement responsive typography using `clamp()` and structured media queries to ensure headings (20-24px), titles (16-18px), body (14-15px), and captions (12px) scale perfectly across devices.
2.  **Touch Targets:** Enforce a minimum height of `48px` for all interactive elements (buttons, inputs, dropdowns) globally on screens `< 768px`.
3.  **Safe Areas (Notch Support):** Integrate `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` into the top bar, bottom navigation, and full-screen modals to prevent content from hiding under device notches or home indicators.
4.  **Animations:** Add active touch feedback (`:active` states with scaling) and ensure smooth transitions for accordions and modals.

### Navigation

#### [MODIFY] `frontend/src/SplitBuddy.jsx` (Navigation Components)

1.  **Bottom Navigation Bar (`.mob-nav`):** Redesign the bottom bar with heavy glassmorphism (`backdrop-filter: blur(20px)`), prominent icons, and a glowing effect for the active tab (matching the brand colors).
2.  **Top Bar (`.topbar`):** Simplify the mobile top bar to exclusively show: the Logo (left), Notifications icon (right), and a compact Add Expense button (if applicable to the view).

### Layout Overhauls (Mobile Breakpoints `< 768px`)

#### [MODIFY] `frontend/src/SplitBuddy.jsx` (Views & Components)

1.  **Dashboard:**
    *   Stack `.stat-grid` into a single column (`grid-template-columns: 1fr`).
    *   Make Recent Activity items more compact (tighter padding, smaller fonts).
    *   Ensure the Expense chart spans 100% width without overflow.
2.  **Group Detail:**
    *   Redesign the group header to be dense (Name, Member Avatars, Total Expense, Edit Button tightly packed).
    *   Convert Pending Payments into vertical accordion cards.
    *   Ensure the Transparent/Optimized toggle is a full-width segmented control.
    *   Redesign member summaries into collapsible vertical cards.
3.  **Expense Cards (`.expense-item`):**
    *   Restructure the layout: Icon (left), Title & Date (stacked middle), Amount & Paid By (stacked right).
    *   Ensure expand/edit buttons are easily tappable within the expanded accordion view.
4.  **Forms & Modals:**
    *   **Full-Screen Modals:** On mobile, `.modal` will become `width: 100vw; height: 100vh; border-radius: 0; top: 0; left: 0; position: fixed; display: flex; flex-direction: column;`.
    *   **Fixed Actions:** Move "Save" and "Cancel" buttons to a fixed bar at the bottom of the screen (`padding-bottom: env(safe-area-inset-bottom)`).
    *   **Horizontal Scroll:** Implement `overflow-x: auto; white-space: nowrap;` for category selection chips in the Add Expense modal.
    *   **Inputs:** Set all inputs to `100%` width with large touch targets.
5.  **Settlement Page:**
    *   Redesign settlement instructions into discrete, vertical cards (e.g., "You pay Ankush", "₹250", with "Settle" buttons immediately below).
6.  **Utilities & Reports:**
    *   Force `.utilities-grid` and `.reports-grid` to `grid-template-columns: 1fr`.
    *   Convert report data tables into stacked card layouts (key-value pairs) to eliminate horizontal scrolling.

## Verification Plan

### Manual Verification
- Resize the browser window through all specified breakpoints (320px to 1024px) using Chrome DevTools Device Mode.
- Verify no horizontal scrolling exists on any page (`overflow-x: hidden` check).
- Click every button and input to ensure they meet the 48px touch target requirement.
- Open every modal (Add Expense, Add Group, etc.) to confirm full-screen behavior on mobile.
- Verify the Bottom Navigation Bar renders correctly and respects simulated safe areas.
- Ensure the premium dark glassmorphism aesthetic is maintained without visual breakage.
