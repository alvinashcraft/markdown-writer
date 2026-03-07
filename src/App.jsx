import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  FluentProvider,
  createLightTheme,
  createDarkTheme,
  Button,
  Tooltip,
  Divider,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
} from '@fluentui/react-components';
import {
  FolderOpenRegular,
  SaveRegular,
  TextBoldRegular,
  TextItalicRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  LocalLanguageRegular,
} from '@fluentui/react-icons';
import Editor from './Editor';
import i18n, { SUPPORTED_LANGUAGES } from './i18n';
import './App.css';

const brandVariants = {
  10: '#001f3c',
  20: '#002d56',
  30: '#003b70',
  40: '#00498a',
  50: '#1058a0',
  60: '#2568b4',
  70: '#3880ca',
  80: '#4299e1',
  90: '#5aa8e8',
  100: '#72b7ef',
  110: '#8ac6f5',
  120: '#a2d5fa',
  130: '#bae3fe',
  140: '#d2f0ff',
  150: '#e5f6ff',
  160: '#f0faff',
};

const lightTheme = { ...createLightTheme(brandVariants) };
const darkTheme = { ...createDarkTheme(brandVariants) };

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

const DRAFT_KEY = 'md-writer-draft';
const isElectron = !!window.electronAPI;

function App() {
  const { t, i18n } = useTranslation();
  const [markdownText, setMarkdownText] = useState(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft && draft !== STARTER_MARKDOWN) return draft;
    return STARTER_MARKDOWN;
  });
  const [currentFilePath, setCurrentFilePath] = useState(null);
  const [savedContent, setSavedContent] = useState(STARTER_MARKDOWN);
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem('md-writer-theme') ||
      (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  });

  const editorRef = useRef(null);

  const platform = window.electronAPI?.platform ||
    (navigator.platform?.startsWith('Mac') ? 'darwin' : 'win32');
  const isMac = platform === 'darwin';

  useEffect(() => {
    document.documentElement.setAttribute('data-platform',
      isMac ? 'macos' : 'windows');
  }, [isMac]);

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    if (isElectron) window.electronAPI.setLanguage(lng);
  }, [i18n]);

  // Ref keeps latest state accessible to stable callbacks (avoids stale closures)
  const stateRef = useRef();
  stateRef.current = { markdownText, currentFilePath, savedContent };

  const hasUnsaved = markdownText !== savedContent;
  const fileName = currentFilePath ? currentFilePath.split(/[/\\]/).pop() : t('app.untitled');

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
    document.title = `${hasUnsaved ? '● ' : ''}${fileName} — ${t('app.title')}`;
  }, [hasUnsaved, fileName]);

  // --- Warn before closing with unsaved work (web only — Electron uses native dialog) ---
  useEffect(() => {
    if (isElectron) return;
    const handler = (e) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  // --- Debounced auto-save to localStorage ---
  useEffect(() => {
    if (markdownText === STARTER_MARKDOWN) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, markdownText);
    }, 500);
    return () => clearTimeout(timer);
  }, [markdownText]);

  // --- File operations (read from stateRef for current values) ---
  const handleNew = useCallback(() => {
    const { markdownText: text, savedContent: saved } = stateRef.current;
    if (text !== saved && !confirm(i18n.t('dialog.unsavedNew'))) return;
    setMarkdownText('');
    setSavedContent('');
    setCurrentFilePath(null);
    localStorage.removeItem(DRAFT_KEY);
  }, []);

  const handleOpen = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text, savedContent: saved } = stateRef.current;
    if (text !== saved && !confirm(i18n.t('dialog.unsavedOpen'))) return;
    const result = await window.electronAPI.openFile();
    if (result) {
      setMarkdownText(result.content);
      setSavedContent(result.content);
      setCurrentFilePath(result.filePath);
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text, currentFilePath: fp } = stateRef.current;
    const savePath = await window.electronAPI.saveFile({ content: text, filePath: fp });
    if (savePath) {
      setSavedContent(text);
      setCurrentFilePath(savePath);
      localStorage.removeItem(DRAFT_KEY);
      window.electronAPI.notifySaveComplete();
    }
  }, []);

  const handleSaveAs = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text } = stateRef.current;
    const savePath = await window.electronAPI.saveFile({ content: text, filePath: null });
    if (savePath) {
      setSavedContent(text);
      setCurrentFilePath(savePath);
      localStorage.removeItem(DRAFT_KEY);
      window.electronAPI.notifySaveComplete();
    }
  }, []);

  // --- Formatting helpers ---
  const applyFormat = useCallback((type) => {
    editorRef.current?.applyFormat(type);
  }, []);

  // --- Export operations ---
  const handleExportHtml = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text } = stateRef.current;
    const html = DOMPurify.sanitize(marked(text));
    await window.electronAPI.exportHtml({ html, title: fileName });
  }, [fileName]);

  const handleExportPdf = useCallback(async () => {
    if (!isElectron) return;
    const { markdownText: text } = stateRef.current;
    const html = DOMPurify.sanitize(marked(text));
    await window.electronAPI.exportPdf({ html, title: fileName });
  }, [fileName]);

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
      window.electronAPI.onMenuExportHtml(handleExportHtml),
      window.electronAPI.onMenuExportPdf(handleExportPdf),
      window.electronAPI.onMenuLanguage(changeLanguage),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [handleNew, handleOpen, handleSave, handleSaveAs, applyFormat, toggleTheme, handleExportHtml, handleExportPdf, changeLanguage]);

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

  const charCount = useMemo(() => markdownText.length, [markdownText]);

  const [selectionLength, setSelectionLength] = useState(0);

  const handleSelectionChange = useCallback(({ from, to }) => {
    setSelectionLength(to - from);
  }, []);

  return (
    <FluentProvider theme={theme === 'dark' ? darkTheme : lightTheme}>
      <div className="app">
        <header className="toolbar">
          <h1 className="toolbar-title">{t('app.title')}</h1>
          <div className="toolbar-actions">
            <Tooltip content={isElectron ? (isMac ? t('toolbar.openTooltipMac') : t('toolbar.openTooltip')) : t('toolbar.requiresDesktop')} relationship="label">
              <Button
                appearance="subtle"
                icon={<FolderOpenRegular />}
                onClick={handleOpen}
                disabled={!isElectron}
              >
                {t('toolbar.open')}
              </Button>
            </Tooltip>
            <Tooltip content={isElectron ? (isMac ? t('toolbar.saveTooltipMac') : t('toolbar.saveTooltip')) : t('toolbar.requiresDesktop')} relationship="label">
              <Button
                appearance="subtle"
                icon={<SaveRegular />}
                onClick={handleSave}
                disabled={!isElectron}
              >
                {t('toolbar.save')}
              </Button>
            </Tooltip>
            <Divider vertical style={{ height: '24px' }} />
            <Tooltip content={isMac ? t('toolbar.boldTooltipMac') : t('toolbar.boldTooltip')} relationship="label">
              <Button appearance="subtle" icon={<TextBoldRegular />} onClick={() => applyFormat('bold')} />
            </Tooltip>
            <Tooltip content={isMac ? t('toolbar.italicTooltipMac') : t('toolbar.italicTooltip')} relationship="label">
              <Button appearance="subtle" icon={<TextItalicRegular />} onClick={() => applyFormat('italic')} />
            </Tooltip>
            <Divider vertical style={{ height: '24px' }} />
            <Tooltip content={isMac ? t('toolbar.themeTooltipMac') : t('toolbar.themeTooltip')} relationship="label">
              <Button
                appearance="subtle"
                icon={theme === 'dark' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? t('toolbar.light') : t('toolbar.dark')}
              </Button>
            </Tooltip>
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Tooltip content={t('toolbar.language')} relationship="label">
                  <Button appearance="subtle" icon={<LocalLanguageRegular />}>
                    {SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label ?? 'English'}
                  </Button>
                </Tooltip>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <MenuItem
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                    >
                      {lang.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
        </header>

        <main className="editor-container">
          <section className="panel editor-panel">
            <div className="panel-header">{t('editor.panelHeader')}</div>
            <Editor
              ref={editorRef}
              value={markdownText}
              onChange={setMarkdownText}
              onSelectionChange={handleSelectionChange}
              darkMode={theme === 'dark'}
            />
          </section>

          <section className="panel preview-panel">
            <div className="panel-header">{t('editor.previewHeader')}</div>
            <div
              className="preview-content"
              role="document"
              aria-label={t('editor.previewHeader')}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </section>
        </main>

        <footer className="status-bar">
          <span className="status-file">{hasUnsaved ? '● ' : ''}{fileName}</span>
          <span className="status-info">
            {t('status.words', { count: wordCount })} · {t('status.chars', { count: charCount })}{selectionLength > 0 ? ` ${t('status.selected', { count: selectionLength })}` : ''}
          </span>
        </footer>
      </div>
    </FluentProvider>
  );
}

export default App;
