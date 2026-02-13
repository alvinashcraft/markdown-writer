import { useState } from 'react';
import { marked } from 'marked';
import './App.css';

// Starter content to demonstrate markdown features
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

function App() {
  const [markdownText, setMarkdownText] = useState(STARTER_MARKDOWN);

  // Parse markdown to HTML
  const getPreviewHtml = () => {
    return { __html: marked(markdownText) };
  };

  return (
    <div className="app">
      {/* Toolbar - placeholder for future Electron file operations */}
      <header className="toolbar">
        <h1 className="toolbar-title">Markdown Writer</h1>
        <div className="toolbar-actions">
          <button className="toolbar-btn" disabled title="Coming soon">
            📂 Open
          </button>
          <button className="toolbar-btn" disabled title="Coming soon">
            💾 Save
          </button>
        </div>
      </header>

      {/* Split pane container */}
      <main className="editor-container">
        {/* Editor panel */}
        <section className="panel editor-panel">
          <div className="panel-header">Editor</div>
          <textarea
            className="editor-textarea"
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            placeholder="Type your markdown here..."
          />
        </section>

        {/* Preview panel */}
        <section className="panel preview-panel">
          <div className="panel-header">Preview</div>
          <div
            className="preview-content"
            dangerouslySetInnerHTML={getPreviewHtml()}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
