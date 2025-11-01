# Design Guidelines: Real-Time Chat Application with Moderation System

## Design Approach
**Selected Approach: Design System - Discord/Slack-Inspired Chat Interface**

This chat application requires a functional, utility-focused design optimized for real-time communication and administrative control. Drawing inspiration from Discord and Slack's proven patterns while adding sophisticated animations and modern polish.

**Key Design Principles:**
- Clarity and readability for extended chat sessions
- Immediate visual feedback for all interactions
- Clear separation between user roles and message states
- Smooth, purposeful animations that enhance usability

## Typography System
**Primary Font:** Inter or System UI Stack  
**Secondary Font:** JetBrains Mono (for timestamps, system messages)

**Type Scale:**
- Display (Admin Panel Headers): 2xl, font-bold (24px)
- Headings (Section Titles): xl, font-semibold (20px)
- Body (Messages, Controls): base, font-normal (16px)
- Small (Timestamps, Metadata): sm, font-medium (14px)
- Tiny (Status Indicators): xs, font-normal (12px)

**Message Typography Hierarchy:**
- Username: font-semibold, text-sm
- Message Content: font-normal, text-base, leading-relaxed
- Timestamp: font-normal, text-xs, opacity-70
- Event Messages: font-medium, text-sm, letter-spacing-wide

## Layout System
**Spacing Primitives:** Use Tailwind units of 2, 3, 4, 6, 8, 12

**Core Layout Structure:**

**Login Screen:**
- Centered card layout: max-w-md, mx-auto
- Vertical centering: min-h-screen, flex items-center
- Card padding: p-8
- Form spacing: space-y-6
- Input fields: h-12, px-4
- Login button: h-12, w-full

**Main Chat Interface (3-Column Layout):**

*Left Sidebar (Users & Status): w-64, fixed height*
- User list container: p-4, space-y-2
- User cards: p-3, rounded-lg
- Status indicators: w-2, h-2, rounded-full
- Section spacing: mb-6

*Center Panel (Messages): flex-1, flex flex-col*
- Header bar: h-16, px-6, border-b
- Messages container: flex-1, overflow-y-auto, p-6, space-y-4
- Input area: h-20, px-6, border-t
- Message bubbles: max-w-3xl, p-4, rounded-xl

*Right Panel (Gnoir Admin - Conditional): w-80*
- Panel header: p-4, border-b
- Control sections: p-4, space-y-6
- Pending messages queue: space-y-3
- Action buttons grid: grid-cols-2, gap-3

**Mobile Responsive (< 768px):**
- Single column: Stack all panels vertically
- Full width cards: w-full
- Collapsible admin panel: Slide-in drawer
- Reduced padding: p-4 instead of p-6

## Component Library

**Authentication Components:**
- Elevated card with subtle shadow
- Logo/title area: mb-8, text-center
- Role selector: Space-y-3, each role as clickable card
- Password input: mt-4, with toggle visibility icon
- Submit button: mt-6, full width, h-12

**Message Components:**

*Standard Message:*
- Container: p-4, rounded-xl, mb-3
- Avatar placeholder: w-10, h-10, rounded-full
- Content wrapper: ml-3, flex-1
- Metadata row: flex, items-baseline, gap-2
- Message text: mt-1, leading-relaxed, word-wrap

*Pending Message (User View):*
- Semi-transparent overlay
- "Pending approval" badge: text-xs, px-2, py-1, rounded-full
- Pulsing animation on badge

*Event/Notification Message:*
- Full-width banner style
- Centered text with icon
- Elevated appearance: py-3, px-6
- Border accent on left: border-l-4

**Admin Panel Components:**

*Pending Message Card:*
- Compact card: p-3, rounded-lg, border
- Message preview: truncate after 2 lines
- Action buttons row: mt-3, flex, gap-2
- Approve/Reject buttons: flex-1, h-10

*Control Section:*
- Section header: text-sm, font-semibold, mb-3, uppercase, tracking-wide
- Toggle switches: w-full, h-12, flex, items-center, justify-between
- Number inputs (cooldown, timer): w-full, h-10, px-3

**Timer Display (All Users):**
- Floating card: fixed, top-4, right-4, z-50
- Countdown: text-2xl, font-mono, font-bold
- Progress ring animation around timer
- Dismiss for current session option

**Input Components:**
- Message Input Bar: flex, items-center, gap-3, px-6, h-20
- Text area: flex-1, resize-none, rounded-lg, px-4, py-3, max-h-24
- Send button: w-12, h-12, rounded-full
- Form Controls: h-12, px-4, rounded-lg, w-full, border

## Animation Specifications

**Message Entrance:**
- Slide up + fade in: 300ms ease-out
- Stagger delay: 50ms between consecutive messages

**Admin Actions:**
- Approve: Slide right + fade out (200ms)
- Reject: Shake animation (150ms) then fade out (200ms)
- Success feedback: Scale pulse (120ms) on action button

**State Transitions:**
- Mute applied: Red overlay fade-in (300ms)
- Chat disabled: Opacity reduction (200ms) + blur effect
- Timer warning (<5 min): Pulsing glow (800ms repeat)

**Interactive Feedback:**
- Button press: Scale down to 0.97 (100ms)
- Hover: Subtle lift (150ms ease-out)
- Focus: Ring appearance (150ms)
- Toggle switch: Slide animation (200ms ease-in-out)

## Accessibility & Polish

**Visual Hierarchy:**
- Clear z-index layering: Messages (0), Panels (10), Modals (50), Toasts (100)
- Consistent elevation: Subtle shadows for depth
- Spacing rhythm maintains 4px base unit throughout

**Responsive Breakpoints:**
- Mobile: < 768px (single column, drawer panels)
- Tablet: 768px - 1024px (two columns)
- Desktop: > 1024px (three columns with admin panel)

**Focus Management:**
- Visible focus rings on all interactive elements
- Keyboard navigation for message history
- Tab order: Login → Message input → Admin controls