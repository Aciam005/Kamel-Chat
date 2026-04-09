# Proposal: Frontend Design Revamp - Modern Minimalism

## Overview
This document outlines a proposal for a complete revamp of the frontend UI design. We propose shifting from the previous conceptual "glassmorphism" aesthetic to a **Modern Minimalism** style, heavily inspired by industry-standard conversational AI interfaces (e.g., ChatGPT).

This new direction prioritizes clarity, readability, and a distraction-free user experience. It relies on flat design, neutral and high-contrast color schemes (with dedicated Light and Dark modes), subtle borders, and a highly structured, content-focused layout.

---

## 1. Layout Structure
The structural layout will move to a classic, widely-adopted conversational interface model to reduce cognitive load and provide an immediately familiar user experience.

- **Sidebar (Left):**
  - A collapsible, fixed-width sidebar spanning the full height of the viewport.
  - Used for navigation, managing chat history (past conversations), and user settings.
  - Features a slightly contrasting background color compared to the main chat area to create depth without relying on shadows or transparency.
- **Main Chat Area (Center/Right):**
  - A clean, distraction-free reading environment.
  - **Message Thread:** Centered within the main area, constrained to a maximum width (e.g., `768px` or `800px`) for optimal reading ergonomics, even on ultra-wide displays.
  - **Input Area:** Pinned to the bottom center of the main chat area. It will float slightly above the bottom edge with a subtle border and background color, keeping the focus entirely on the text being typed.

---

## 2. Color Palette
The color palette will abandon warm, playful hues and transparency in favor of solid, neutral tones that support both Light and Dark modes seamlessly.

### Light Mode
- **Background (Main):** Pure White (`#FFFFFF`) or very light gray (`#F9F9F9`).
- **Background (Sidebar):** Very light gray (`#F9F9F9` or `#F0F0F0`).
- **Text (Primary):** Near black (`#0D0D0D` or `#1A1A1A`).
- **Text (Secondary/Muted):** Medium gray (`#6B6B6B`).
- **Borders/Dividers:** Soft gray (`#E5E5E5`).
- **Accent/Action:** A subdued, professional color (e.g., a muted blue or classic black/gray for primary buttons) rather than overly vibrant gradients.

### Dark Mode
- **Background (Main):** Deep dark gray (`#212121` or `#343541`).
- **Background (Sidebar):** Slightly darker gray (`#171717` or `#202123`).
- **Text (Primary):** Off-white (`#ECECEC` or `#D1D5DB`).
- **Text (Secondary/Muted):** Muted gray (`#9CA3AF`).
- **Borders/Dividers:** Dark gray (`#4B5563` or `#4D4D4F`).
- **Accent/Action:** White or a very subtle, high-contrast tint.

---

## 3. Typography
Typography will be updated to be highly legible, clean, and utilitarian.

- **Font Family:** A modern, highly readable sans-serif system font stack. For example: `Inter`, `Roboto`, `Helvetica Neue`, or system default (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont`).
- **Font Weights:** Primarily Regular (`400`) for body text, Medium (`500`) for secondary headers or UI labels, and Semi-Bold (`600`) for primary headers.
- **Line Height:** Relaxed line height (e.g., `1.6` or `1.75`) in the chat bubbles to ensure long blocks of text and code are easy to read.
- **Monospace Font:** A crisp monospace font (e.g., `Fira Code`, `JetBrains Mono`, or `ui-monospace`) for code snippets, with clear syntax highlighting.

---

## 4. Component Styling
Components will move away from rounded, playful shapes and blurred backgrounds. They will embrace sharp or slightly rounded corners, flat colors, and minimal ornamentation.

### Buttons
- **Shape:** Rectangular with subtle border radius (e.g., `4px` to `6px`).
- **Style:** Flat. Primary buttons will use a solid background color with contrasting text. Secondary/Icon buttons will be ghost buttons (transparent background) that gain a subtle hover state background (e.g., a light gray in light mode).
- **Animations:** Minimal. Fast, subtle color transitions on hover/active states without bouncing or scaling effects.

### Inputs
- **Chat Input Box:**
  - A prominent, multi-line capable text area.
  - Border radius slightly larger than standard buttons (e.g., `8px` to `12px`) to distinguish it as a major interactive zone.
  - Subtle 1px solid border (`#E5E5E5` in light mode) or a very soft, faint drop-shadow (e.g., `box-shadow: 0 0 15px rgba(0,0,0,0.1)`) against the main background to elevate it slightly without being overly dramatic.
  - Flat background color, matching or slightly contrasting with the main background.
- **Focus States:** Clear, high-contrast focus rings (e.g., a 2px solid outline) to maintain high accessibility standards.

### Message Bubbles
- **Elimination of Traditional "Bubbles":** Instead of highly distinct, colorful bubbles pointing to the left/right, messages will be presented as flat, full-width rows or subtle blocks within the centered container.
- **User Messages:** Might feature a very subtle background tint (e.g., `#F9F9F9` in light mode) or simply be aligned slightly differently, but without aggressive bubble styling.
- **AI/System Messages:** Completely flat, blending seamlessly with the main background color.
- **Avatars:** Small, square or circular avatars (e.g., `28px` or `32px`) aligned to the left of the message content to visually anchor who is speaking.
