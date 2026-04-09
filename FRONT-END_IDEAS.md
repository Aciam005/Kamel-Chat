# Kamel.Chat Front-End Feature Ideas

This document outlines 15 detailed front-end feature ideas for Kamel.Chat. These ideas aim to create a "dense and technical like an IDE with a playful twist" user experience, utilizing only front-end technologies (HTML, CSS, JavaScript, and `localStorage`) without requiring any backend modifications.

---

## 1. Customizable Syntax Highlighting Themes

**Problem Statement:**
Code blocks in the chat currently use a single, static syntax highlighting scheme. Developers are highly particular about their coding environments and often prefer specific color themes to reduce eye strain and improve readability.

**Proposed Solution:**
Introduce a local dropdown menu allowing users to select from popular syntax highlighting themes (e.g., Dracula, Monokai, Nord, Synthwave '84). The selected theme will be applied dynamically to all rendered code blocks.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Integrate a library like Highlight.js or Prism.js if not already present. Load multiple theme CSS files but disable all except the chosen one. Store the user's theme preference in `localStorage`.
- **Playful Twist:** Include a "Hacker Mode" theme (high-contrast green on black terminal style) and a "Neon Dreams" theme with glowing text effects.

**User Story:**
As a developer, I want to switch my code block theme to 'Dracula' so that it matches my local IDE and is easier on my eyes during late-night coding sessions.

---

## 2. Floating Command Palette (`Cmd+K` / `Ctrl+K`)

**Problem Statement:**
Navigating the UI with a mouse to clear the chat, change settings, or perform actions breaks the user's flow, especially for power users who prefer keyboard navigation.

**Proposed Solution:**
Implement a quick-access command palette that appears as an overlay when pressing `Cmd+K` (Mac) or `Ctrl+K` (Windows). It will offer a searchable list of front-end actions.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Add a global event listener for the keyboard shortcut. Create a modal overlay with an input field and a list of actions (e.g., "Toggle Dark Mode", "Focus Chat Input", "Scroll to Top", "Copy Last Code Block"). Use fuzzy matching for the search input.
- **Playful Twist:** The command palette is styled to look like an old-school green-screen terminal prompt, complete with a blinking block cursor.

**User Story:**
As a power user, I want to press `Cmd+K` and type "clear" to instantly wipe the current view without moving my hands from the keyboard.

---

## 3. Interactive Local Scratchpad (Side Panel)

**Problem Statement:**
Users often copy code from the AI, tweak it slightly, and need a place to temporarily hold it while they continue chatting, without wanting to open a completely separate application.

**Proposed Solution:**
Add a collapsible, resizable sidebar on the right side of the screen that acts as a local plain-text/code scratchpad.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`, `index.html`):** Add a `<textarea>` or a lightweight code editor instance (like CodeMirror) in a hidden side panel. Add a toggle button to open/close it. Save the contents of the scratchpad to `localStorage` on every `input` event so data persists across page reloads.
- **Playful Twist:** The scratchpad is styled like a physical sticky note but features monospaced fonts and a grid-line background.

**User Story:**
As a user, I want to copy a snippet the AI generated into a side panel, edit a variable name, and keep it visible while I ask the AI a follow-up question.

---

## 4. Code Block Action Toolbar & "Yoink!" Copy

**Problem Statement:**
Interacting with code blocks is limited. Users frequently need to copy code, but there's no feedback, and long lines often overflow awkwardly.

**Proposed Solution:**
Enhance every rendered code block with a dense, IDE-like top bar containing actionable buttons: "Copy", "Toggle Word Wrap", and "Send to Scratchpad".

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Modify the markdown renderer to inject a `<div>` toolbar above every `<pre><code>` block. The "Toggle Word Wrap" button will toggle a CSS class (`white-space: pre-wrap`) on the code block.
- **Playful Twist:** When clicking "Copy", the button transforms into a green checkmark, and a tiny animated text reading "Yoink!" floats up and fades away.

**User Story:**
As a user, I want to easily toggle word wrap on a long JSON payload so I can read it without scrolling horizontally, and then smoothly copy it to my clipboard.

---

## 5. Local Chat Search with Regex Support

**Problem Statement:**
Finding a specific variable name or command in a long, currently loaded chat history requires tedious manual scrolling and scanning.

**Proposed Solution:**
Add a robust front-end search bar that filters the currently loaded DOM messages in real-time. Power users can use regular expressions to find complex patterns.

**Technical Implementation Details:**
- **Frontend (`static/script.js`):** Add a search input field. On input, iterate through all rendered message elements. If the text matches the search query (falling back to regex matching if a toggle is active), highlight the matching text and keep the message visible; otherwise, dim or hide non-matching messages.
- **Playful Twist:** Search results highlight with a cool, retro pixelated glow effect instead of a standard yellow background.

**User Story:**
As a user, I want to search my current chat for `function.*\(.*\)` using Regex to quickly locate all the function definitions the AI has provided in this session.

---

## 6. Collapsible JSON & Code Blocks with Minimap

**Problem Statement:**
Massive JSON responses or very long code snippets take up too much vertical space, disrupting the flow of the conversation.

**Proposed Solution:**
Implement folding/collapsing functionality for code blocks (similar to VS Code). For very long blocks, display a small scrollable mini-map on the right edge.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Add a collapse/expand chevron (`>`) to the code block toolbar. When clicked, toggle the `max-height` of the block. For the minimap, render a scaled-down, un-interactable version of the code block text in a fixed-position absolute div next to the main block.
- **Playful Twist:** Collapsing a large code block plays a satisfying, snappy CSS animation, squeezing the code out of view.

**User Story:**
As a user, I want to collapse a 200-line JSON response after inspecting it so I can easily see the AI's concluding text below it.

---

## 7. Split-Pane View for Chat

**Problem Statement:**
Reading a long explanation from the AI at the top of a response while trying to write a new prompt referencing it at the bottom requires constant, frustrating scrolling up and down.

**Proposed Solution:**
Allow the user to drag a horizontal or vertical splitter to create two independent, scrollable views of the *same* chat history.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`, `index.html`):** Duplicate the main chat container view. Implement a draggable divider `<div>` that adjusts the `flex-basis` or `height/width` of the two containers based on mouse movement events (`mousedown`, `mousemove`, `mouseup`).
- **Playful Twist:** The grabber handle for the splitter features a subtle, industrial "warning tape" (yellow and black stripes) background pattern.

**User Story:**
As a user, I want to split my view so I can keep a complex architecture diagram from an older message visible in the top pane while I type my next question in the bottom pane.

---

## 8. Prompt History "Ring" (Up/Down Arrows)

**Problem Statement:**
Users frequently want to re-send a prompt they typed 5 minutes ago, or fix a typo in their previous prompt without re-typing the whole thing.

**Proposed Solution:**
Implement a terminal-like history for the text input area. Pressing the Up and Down arrow keys will cycle through previously sent prompts.

**Technical Implementation Details:**
- **Frontend (`static/script.js`):** Maintain an array `promptHistory` in memory (or `sessionStorage`). Listen for `keydown` events on the chat input. If the input is empty or the cursor is at the beginning/end, intercept the `ArrowUp` and `ArrowDown` keys to populate the input with strings from the array.
- **Playful Twist:** When cycling and reaching the very end or beginning of the history, the input box performs a slight physical "bump" CSS animation to indicate there are no more entries.

**User Story:**
As a user, I want to hit the Up arrow, fix a misspelled variable name in my last prompt, and hit Enter to re-send it instantly.

---

## 9. Message Token Heuristic & "Fuel Gauge"

**Problem Statement:**
Users have no idea how large their prompt is until they send it. Sometimes they paste massive files without realizing it will be a heavy payload.

**Proposed Solution:**
Provide a front-end heuristic estimator for the prompt size, displayed as a visual "fuel gauge" or progress bar directly below the input field.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Add an `input` event listener to the textarea. Calculate a rough token estimate (e.g., `text.length / 4`). Map this value to the width of a progress bar element.
- **Playful Twist:** The gauge starts green, turns yellow as it fills, and turns red with a flashing "WARNING: CHONKY PROMPT" badge if it exceeds a certain threshold.

**User Story:**
As a user, I want to see a visual indicator of my prompt size so I can realize I've pasted too much code and decide to truncate it before sending.

---

## 10. Zen Focus Mode

**Problem Statement:**
The UI can feel cluttered with sidebars, headers, and multiple chat bubbles when a user just wants to concentrate on reading a long, complex code block provided by the AI.

**Proposed Solution:**
Add a "Zen Mode" toggle that hides all extraneous UI elements, centering and expanding the currently viewed chat.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Create a CSS class `.zen-mode` for the body tag. When active, this class sets `display: none` on the sidebar, header, and input area, and sets `max-width: 100%` on the chat container.
- **Playful Twist:** Entering Zen mode triggers a CSS transition that dims the background to near-black, like a movie theater, applying a subtle "spotlight" radial gradient effect behind the text.

**User Story:**
As a user, I want to hit a hotkey to enter Zen Mode so I can carefully read a complex 50-line Python script without any visual distractions.

---

## 11. Local Message "Bookmarks" Sidebar

**Problem Statement:**
Important explanations or perfectly generated code snippets get lost deep within long conversation histories, making them hard to find later.

**Proposed Solution:**
Allow users to "star" or bookmark specific messages. These bookmarks are collected in a dedicated local sidebar tab for quick navigation.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Inject a "Star" icon button on each message. Clicking it saves the message's DOM ID and a snippet of its text to a `bookmarks` array in `localStorage`. Render this array in a left-side panel. Clicking a bookmark uses `scrollIntoView()` to jump to that message.
- **Playful Twist:** The bookmark icons are shaped like retro 8-bit floppy disks.

**User Story:**
As a user, I want to bookmark the AI's explanation of a complex regex pattern so I can easily jump back to it tomorrow from the bookmarks sidebar.

---

## 12. Markdown Outline / Minimap (Table of Contents)

**Problem Statement:**
Extremely long AI responses containing multiple headings (H1, H2, H3) are difficult to navigate and consume at a glance.

**Proposed Solution:**
Automatically generate a sticky, clickable Table of Contents (Outline) next to large AI responses based on their markdown headings.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** After a message finishes rendering, parse the DOM of that message for `<h1>` through `<h6>` tags. Dynamically construct an outline `<ul>` and render it in a sticky `<div>` floating to the right of the message. Add smooth scrolling anchors to the links.
- **Playful Twist:** The outline is styled visually like a dense, collapsible IDE folder tree structure (`├─`, `└─` characters).

**User Story:**
As a user, I want to look at the auto-generated outline of a long tutorial the AI generated so I can skip straight to the "Deployment" section.

---

## 13. "Blame" View for Message Provenance

**Problem Statement:**
In a conversation with many edited branches, it becomes confusing to remember exactly *what prompt* resulted in the specific AI response you are currently reading.

**Proposed Solution:**
Add a toggle that reveals a small, inline "provenance" annotation next to AI responses, showing a truncated version of the user prompt that generated it.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Add a "Toggle Blame" button. When active, use the front-end state (which knows the parent-child relationship of messages) to find the parent user message. Inject a small `<aside>` element next to the AI message displaying "Generated from: '[truncated text]'".
- **Playful Twist:** Hovering over the blame text displays a tooltip shaped like a comic-book thought bubble, visually connecting the AI response back to the user's input.

**User Story:**
As a user, I want to toggle the blame view so I can quickly confirm whether a specific code output was generated by my prompt asking for a `for` loop or my prompt asking for a `while` loop.

---

## 14. Custom Keybindings Manager (Local)

**Problem Statement:**
Power users have deeply ingrained muscle memory from their favorite IDEs and want to map Kamel.Chat actions to their preferred shortcuts.

**Proposed Solution:**
Provide a settings modal where users can remap front-end actions to custom keyboard shortcuts, storing the map locally.

**Technical Implementation Details:**
- **Frontend (`static/script.js`, `style.css`):** Create a modal UI with inputs for various actions (e.g., "Focus Input", "Open Command Palette"). Capture the `keydown` event on the input to record the combination (e.g., `Shift + Ctrl + F`). Store the mapping object in `localStorage`. Create a central keyboard event listener that checks this map.
- **Playful Twist:** Trying to bind a combination that is already used by the browser (like `Ctrl+T`) or another action triggers a fun, flashing "ACCESS DENIED" warning in a terminal font.

**User Story:**
As a Vim user, I want to map the shortcut to focus the chat input to a custom combination so I never have to touch the mouse.

---

## 15. CRT "Hacker Cinema" Mode (Visual Polish)

**Problem Statement:**
The standard flat web interface can feel clinical. Sometimes users want an immersive, nostalgic, or "cyberpunk" aesthetic while working.

**Proposed Solution:**
Add an optional visual toggle that completely overhauls the CSS to look like an old CRT monitor.

**Technical Implementation Details:**
- **Frontend (`style.css`, `static/script.js`):** Create a `.crt-mode` class for the body. This class applies CSS animations for a subtle screen flicker, a semi-transparent overlay image for scanlines, slight chromatic aberration (text shadows), and a slight curve to the screen edges using CSS transforms. Text streaming gets a very slight random delay to mimic slow baud rates.
- **Playful Twist:** The toggle for this is hidden in the Command Palette as a secret "Execute Hacker Cinema" command.

**User Story:**
As a user, I want to turn on CRT mode late at night while debugging to feel like a hacker from a 90s movie.