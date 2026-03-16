import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
  highlightSpecialChars,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { oneDark, oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { searchKeymap } from '@codemirror/search';

const lightBase = EditorView.theme({
  '&': { height: '100%', fontSize: '0.9rem' },
  '.cm-scroller': {
    fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '1rem 0' },
  '.cm-gutters': { border: 'none' },
});

const darkBase = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '0.9rem' },
    '.cm-scroller': {
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '1rem 0' },
    '.cm-gutters': { border: 'none' },
  },
  { dark: true }
);

const Editor = forwardRef(function Editor(
  { value, onChange, onSelectionChange, darkMode },
  ref
) {
  const containerRef = useRef(null);
  const viewRef = useRef(null);
  const themeCompartment = useRef(new Compartment());

  // Keep stable refs to callbacks so we don't recreate the editor when they change
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Expose imperative handle for formatting and focus
  useImperativeHandle(ref, () => ({
    applyFormat(type) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const wrapper = type === 'bold' ? '**' : '*';
      const insertion = selected || type;
      const replacement = wrapper + insertion + wrapper;

      view.dispatch({
        changes: { from, to, insert: replacement },
        selection: {
          anchor: from + wrapper.length,
          head: from + wrapper.length + insertion.length,
        },
      });
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  // Build theme extensions based on darkMode
  function getThemeExtensions(dark) {
    return dark
      ? [oneDark, darkBase, syntaxHighlighting(oneDarkHighlightStyle)]
      : [lightBase, syntaxHighlighting(defaultHighlightStyle)];
  }

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        highlightSpecialChars(),
        history(),
        cmPlaceholder('Type your markdown here...'),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        themeCompartment.current.of(getThemeExtensions(darkMode)),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const { from, to } = update.state.selection.main;
            onSelectionChangeRef.current({ from, to });
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure theme when darkMode changes
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: themeCompartment.current.reconfigure(
        getThemeExtensions(darkMode)
      ),
    });
  }, [darkMode]);

  // Sync external value changes (e.g. file open, new file)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (value !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />;
});

export default Editor;
