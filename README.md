
# Markdown Writer

A split-pane markdown editor built with React + Vite. Type on the left, see live-formatted preview on the right.

## Quickstart

**Option A — Codespaces**  
1. Open this repo in GitHub and click **Code → Codespaces → Create codespace**.  
2. The dev container installs Node and runs `npm install` automatically.  
3. Run `npm run dev` to start the dev server.

**Option B — Local**  
1. Install **Node.js 18+**.  
2. `npm install`  
3. `npm run dev`

Then open the URL shown in your terminal.

## Structure

```
.
├── .devcontainer/
│   └── devcontainer.json
├── .github/
│   ├── agents/                      # Custom Copilot agents
│   │   ├── idea-generator.agent.md  # @idea-generator
│   │   ├── mvp-kickoff.agent.md     # @mvp-kickoff
│   │   └── mvp-builder.agent.md     # Implementation reference
│   ├── prompts/                     # Slash command prompts
│   │   ├── install.prompt.md        # /install
│   │   ├── ideate.prompt.md         # /ideate
│   │   ├── prd.prompt.md            # /prd
│   │   ├── build.prompt.md          # /build
│   │   ├── start.prompt.md          # /start
│   │   ├── export.prompt.md         # /export
│   │   └── mvp-kickoff.prompt.md    # /mvp-kickoff (legacy)
│   └── copilot-instructions.md      # Workspace instructions
├── src/
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
├── .editorconfig
└── README.md
```

## Express Version

This repo includes **custom Copilot agents** and **slash command prompts** that guide you through a structured workflow from ideation to implementation. The workflow helps you build a one-hour MVP with minimal friction.

### 🎯 Complete Workflow (6 Steps) (Using Slash Commands)

The easiest way to get started is using slash commands. Type `/` in chat to see available commands:

#### Step 0: Setup (First Time Only)
If you're running locally (not in Codespaces), install dependencies first:

```
/install
```

#### Step 1: Ideate (`/ideate`)
Brainstorm and discover compelling MVP ideas through guided conversation.

```
/ideate
```

The command will:
- Launch the `@idea-generator` agent
- Ask about your interests, skill level, and goals
- Generate 3-5 concrete, feasible ideas across different categories
- Help you refine and choose the best idea
- Hand off to planning with a clear one-sentence goal

#### Step 2: Create PRD (`/prd`)
Create a detailed implementation plan with a PRD document.

```
/prd
```

The command will:
- Launch the `@mvp-kickoff` agent
- Confirm the MVP goal and scope (~1 hour feasibility)
- Identify the ONE core user action
- Break down UI components, state, and data requirements
- Propose 3-5 clear implementation steps
- Generate a `PRD.md` file after your confirmation

#### Step 3: Build MVP (`/build`)
Build the MVP following the PRD steps.

```
/build
```

The command will:
- Launch the `@agent` with pre-configured editing tools
- Read PRD.md to understand requirements
- Implement the code step-by-step in `src/App.jsx`
- Run `npm run dev` to test
- Verify everything works with no console errors

#### Step 4: Start Server (`/start`)
Launch the development server to test your MVP.

```
/start
```

The command will:
- Run `npm run dev` in the terminal
- Wait for the server to start
- Provide the local URL (typically `http://localhost:5173`)
- Confirm the server is ready

#### Step 5: Export Your Work (`/export`)
Download your MVP workspace as a ZIP file.

```
/export
```

The command will guide you through:
- Opening the Command Palette
- Using "Codespaces: Download Current Workspace"
- Saving the ZIP file with all your work
- What's included and next steps for deployment

### 🔧 Alternative: Using Agents Directly

You can also invoke agents directly if you prefer more control:

**Ideation:**
```
@idea-generator I want to build something fun for my portfolio
```

**Planning:**
```
@mvp-kickoff Build a Speed Reader app where users paste text and read words one-at-a-time
```

**Implementation:**
```
@agent Implement the MVP plan from PRD.md
```

Or use inline chat (`Ctrl+I`) directly in `src/App.jsx` to build step-by-step.

### 🚀 Quick Commands

**Workflow Commands:**
```bash
/install     # Install dependencies (first time only)
/ideate      # Brainstorm MVP ideas
/prd         # Create implementation plan
/build       # Implement the code
/start       # Start the dev server
/export      # Download or push to your GitHub repo
```

**Manual NPM Commands:**
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs on `http://localhost:5173` by default.

### 📁 Customization Files

**Slash Command Prompts** (`.github/prompts/`):
- `/install` → `install.prompt.md` - Install dependencies
- `/ideate` → `ideate.prompt.md` - Launch idea generator
- `/prd` → `prd.prompt.md` - Create implementation plan
- `/build` → `build.prompt.md` - Implement the MVP
- `/start` → `start.prompt.md` - Start dev server
- `/export` → `export.prompt.md` - Download or push to GitHub
- `/mvp-kickoff` → `mvp-kickoff.prompt.md` - Alternative planning prompt

**Custom Agents** (`.github/agents/`):
- `@idea-generator` → `idea-generator.agent.md` - Brainstorm MVP ideas
- `@mvp-kickoff` → `mvp-kickoff.agent.md` - Plan and create PRD
- `mvp-builder.agent.md` - Implementation guidelines (reference)

### 💡 Tips for Using the Workflow

- **Start with `/ideate`** if you need help choosing what to build
- **Use slash commands** for the simplest experience with pre-configured tools
- **Follow the sequence**: `/ideate` → `/prd` → `/build`
- **Be specific**: The more context you provide, the better the results
- **Iterate**: Don't hesitate to ask follow-up questions or refine ideas
- **Use handoffs**: Agents provide handoff buttons to seamlessly transition between phases
- **Keep scope minimal**: The workflow is designed to keep your MVP achievable in ~1 hour

## Copilot Instructions

This repo also includes **custom Copilot instructions** in `.github/copilot-instructions.md` that provide:

- **Scope guardrails** — Keep it minimal, one clear user action
- **Tech preferences** — Plain React + Vite, avoid heavy frameworks
- **Build flow guidance** — 5-step structured approach
- **Quality standards** — Works locally, builds cleanly, no console errors

The instructions work automatically in the background to guide all Copilot interactions in this workspace.

## Tips

- **Start with `/ideate`** if you need help choosing what to build
- **Use slash commands** for everything - no need to touch the terminal!
- **Complete workflow**: `/install` (first time) → `/ideate` → `/prd` → `/build` → `/start` → `/export`
- **Working in Codespaces?** Use `/export` to download or push to your personal GitHub repo
- Delete anything you don't need. Keep it **lean**.
- Aim for a **single, clear MVP** first (one page, one core action).
- If you need routing later, add it (e.g., `react-router-dom`) *after* your MVP works. If you want to submit your project to be aggregated, you need to use HashRouter.
- See the Prompt to Prototype Challenge Submission Repo at [https://aka.ms/skillupai/ptp/submissions/repo](https://aka.ms/skillupai/ptp/submissions/repo) to learn more.

## Quick Example

```bash
# In VS Code Chat (no terminal needed!):
/install                   # First time: install dependencies
/ideate                    # Brainstorm ideas → choose "Speed Reader"
/prd                       # Create PRD.md with implementation plan
/build                     # Implement the code
/start                     # Start dev server → get URL
# Open URL in browser → Test your MVP!
/export                    # Download ZIP or push to your GitHub repo
``` 

## License

MIT
