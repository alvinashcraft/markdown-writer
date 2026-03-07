import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './App.css';

const STARTER_MARKDOWN = `# Welcome to Markdown Writer

Start typing to see your **markdown** rendered in *real-time*!

## Features
- Live preview as you type
- Supports all basic markdown syntax
- Clean, distraction-free interface

### Code Example
\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

### Links
[Visit GitHub](https://github.com)

> This is a blockquote. Great for highlighting important text!

---

Happy writing! ✍️
`;

const isElectron = !!window.electronAPI;

function App() {
  const [markdownText, setMarkdownText] = useState(STARTER_MARKDOWN);
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [savedContent, setSavedContent] = useState(STARTER_MARKDOWN);
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem('md-writer-theme') ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  });

  const editorRef = useRef(null);

  // Ref keeps latest state accessible to stable callbacks (avoids stale closures)
  const stateRef = useRef();
  stateRef.current = { markdownText, currentFilePath, savedContent };

  const hasUnsaved = markdownText !== savedContent;
  const fileName = currentFilePath ? currentFilePath.split(/[/\\]/).pop() : 'Untitled';

  const previewHtml = useMemo(
    () => DOMPurify.sanitize(marked(markdownText)),
    [markdownText]
  );

  // --- Theme ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('md-writer-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  // --- Window title ---
  useEffect(() => {
    document.title = `${hasUnsaved ? '● ' : ''}${fileName} — Markdown Writer`;
  }, [hasUnsaved, fileName]);

  // --- Warn before closing with unsaved work ---
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // --- File operations (read from stateRef for current values) ---
  const handleNew = useCallback(() => {
    const { markdownText: text, savedContent: saved } = stateRef.current;
    if (text !== saved && !confirm('You have unsaved changes. Create a new document?')) return;
    setMarkdownText('');
    setSavedContent('');
    setCurrentFilePath(null);
  }, []);

  const handleOpen = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text, savedContent: saved } = stateRef.current;
    if (text !== saved && !confirm('You have unsaved changes. Open a different file?')) return;
    const result = await window.electronAPI.openFile();
    if (result) {
      setMarkdownText(result.content);
      setSavedContent(result.content);
      setCurrentFilePath(result.filePath);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text, currentFilePath: fp } = stateRef.current;
    const savePath = await window.electronAPI.saveFile({ content: text, filePath: fp });
    if (savePath) {
      setSavedContent(text);
      setCurrentFilePath(savePath);
    }
  }, []);

  const handleSaveAs = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text } = stateRef.current;
    const savePath = await window.electronAPI.saveFile({ content: text, filePath: null });
    if (savePath) {
      setSavedContent(text);
      setCurrentFilePath(savePath);
    }
  }, []);

  // --- Formatting helpers ---
  const applyFormat = useCallback((type) => {
    const textarea = editorRef.current;
    if (!textarea) return;
    const { markdownText: text } = stateRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = text.substring(start, end);
    const wrapper = type === 'bold' ? '**' : '*';
    const insertion = selected || type;
    const newText = text.substring(0, start) + wrapper + insertion + wrapper + text.substring(end);

    setMarkdownText(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const innerStart = start + wrapper.length;
      textarea.selectionStart = innerStart;
      textarea.selectionEnd = innerStart + insertion.length;
    });
  }, []);

  // --- Electron menu listeners (registered once, callbacks read stateRef) ---
  useEffect(() => {
    if (!isElectron) return;
    const cleanups = [
      window.electronAPI.onMenuNew(handleNew),
      window.electronAPI.onMenuOpen(handleOpen),
      window.electronAPI.onMenuSave(handleSave),
      window.electronAPI.onMenuSaveAs(handleSaveAs),
      window.electronAPI.onMenuFormat(applyFormat),
      window.electronAPI.onMenuToggleTheme(toggleTheme),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [handleNew, handleOpen, handleSave, handleSaveAs, applyFormat, toggleTheme]);

  // --- Keyboard shortcuts (web fallback — Electron uses menu accelerators) ---
  useEffect(() => {
    if (isElectron) return;
    const handleKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'b') { e.preventDefault(); applyFormat('bold'); }
      else if (e.key === 'i') { e.preventDefault(); applyFormat('italic'); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [applyFormat]);

  const wordCount = useMemo(
    () => markdownText.split(/\s+/).filter(Boolean).length,
    [markdownText]
  );

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar-title">Markdown Writer</h1>
        <div className="toolbar-actions">
          <button
            className="toolbar-btn"
            onClick={handleOpen}
            disabled={!isElectron}
            title={isElectron ? 'Open file (Ctrl+O)' : 'Requires desktop app'}
          >
            📂 Open
          </button>
          <button
            className="toolbar-btn"
            onClick={handleSave}
            disabled={!isElectron}
            title={isElectron ? 'Save file (Ctrl+S)' : 'Requires desktop app'}
          >
            💾 Save
          </button>
          <span className="toolbar-divider" />
          <button className="toolbar-btn" onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)">
            <em>I</em>
          </button>
          <span className="toolbar-divider" />
          <button className="toolbar-btn" onClick={toggleTheme} title="Toggle dark mode (Ctrl+Shift+D)">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main className="editor-container">
        <section className="panel editor-panel">
          <div className="panel-header">Editor</div>
          <textarea
            ref={editorRef}
            className="editor-textarea"
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            placeholder="Type your markdown here..."
            aria-label="Markdown editor"
          />
        </section>

        <section className="panel preview-panel">
          <div className="panel-header">Preview</div>
          <div
            className="preview-content"
            role="document"
            aria-label="Markdown preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </section>
      </main>

      <footer className="status-bar">
        <span className="status-file">{hasUnsaved ? '● ' : ''}{fileName}</span>
        <span className="status-info">{wordCount} words</span>
      </footer>
    </div>
  );
}

export default App;
