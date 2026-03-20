# QuietMark — Product Requirements Document

## MVP Goal
A split-pane markdown editor where you type on the left and see live-formatted preview on the right, with a toolbar ready for future file operations.

## Core User Action
Type markdown text → see it rendered in real-time on the right panel.

## UI Components
- **Header/Toolbar** — App title + placeholder buttons for future Save/Open functionality
- **Editor Panel (left)** — Textarea for writing markdown
- **Preview Panel (right)** — Rendered HTML output
- **Split Container** — Flexbox layout for side-by-side panels

## State Requirements
- `markdownText: string` — stores the current markdown input from the textarea

## Data Requirements
- Starter markdown content (hardcoded string) to demonstrate features on load
- No external API calls
- No persistence in MVP (localStorage or file system deferred)

## Dependencies
- `marked` — lightweight markdown-to-HTML parser (~7kb, required for core functionality)

## Implementation Steps
1. **Install marked** — Add the markdown parser dependency
2. **Create layout** — Build split-pane structure with CSS flexbox (header/toolbar + two panels)
3. **Build editor** — Add textarea with `useState` to capture markdown input
4. **Add parser** — Use `marked` to convert markdown to HTML on each keystroke
5. **Render preview** — Display parsed HTML in the right panel using `dangerouslySetInnerHTML`
6. **Polish** — Add starter content, toolbar placeholder buttons, basic styling

## Success Criteria
- [ ] Split-pane layout displays correctly on desktop
- [ ] Typing in editor updates preview instantly
- [ ] Supports headers, bold, italic, links, lists, code blocks
- [ ] Toolbar visible with placeholder buttons (non-functional in MVP)
- [ ] Runs with `npm run dev`
- [ ] Builds with `npm run build`
- [ ] No console errors

## Out of Scope (for the original MVP — now shipped in v1.0+)
- ~~File save/load functionality (Electron integration)~~ ✅ Shipped
- ~~Syntax highlighting in the editor textarea~~ ✅ Shipped (CodeMirror 6)
- ~~Export to HTML/PDF~~ ✅ Shipped
- Mobile-responsive layout
- ~~Dark mode toggle~~ ✅ Shipped
- ~~localStorage persistence~~ ✅ Shipped
- ~~Word/character count~~ ✅ Shipped

## Future Electron Integration Notes
The toolbar is designed to accommodate:
- **Open** button — will use Electron's `dialog.showOpenDialog()` + `fs.readFile()`
- **Save** button — will use Electron's `dialog.showSaveDialog()` + `fs.writeFile()`
- No code changes needed to the React components themselves
