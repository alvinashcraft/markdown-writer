---
description: Download your MVP workspace as a ZIP file
tools: []
---

# Export Your MVP

Help the user download their completed MVP from Codespaces.

## Download Your Workspace

Guide the user through these simple steps:

1. **Open the Command Palette:**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)

2. **Find the Download Command:**
   - Type "Download" in the search box
   - Select **"Codespaces: Download Current Workspace"**

3. **Save the ZIP file:**
   - Your browser will download a ZIP file containing your entire project
   - Save it to your desired location

## What's Included in the Download

The ZIP file contains all your work:
- `src/App.jsx` - Your MVP code
- `PRD.md` - Your product requirements document (if created)
- `package.json` - Dependencies
- `.github/agents/` - Custom agents (reusable for future projects!)
- `.github/prompts/` - Slash commands (reusable for future projects!)
- All configuration files

## After Downloading

Once you have the ZIP file, you can:

1. **Extract and work locally:**
   - Unzip the file on your computer
   - Open the folder in VS Code
   - Run `npm install` then `npm run dev`

2. **Deploy your MVP:**
   - Deploy to Vercel, Netlify, or GitHub Pages
   - Share the live URL with others

3. **Reuse the workflow:**
   - The custom agents and prompts work in any project!
   - Copy the `.github/agents/` and `.github/prompts/` folders to your next project
   - Use the same workflow: `/ideate` → `/prd` → `/build` → `/start`

4. **Continue building:**
   - Add new features to your MVP
   - Polish the design
   - Add tests and documentation

Congratulations on completing your MVP! 🎉
