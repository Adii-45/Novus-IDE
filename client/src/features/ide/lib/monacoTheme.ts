import type * as monaco from 'monaco-editor';

/** NovusIDE's Monaco theme — tuned to the app's #070B16 / #0E1525 palette. */
export const novusDarkTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5D6A8A', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818CF8' },
    { token: 'string', foreground: '7DD3A7' },
    { token: 'number', foreground: 'F0A87A' },
    { token: 'regexp', foreground: 'F0A87A' },
    { token: 'type', foreground: '60A5FA' },
    { token: 'type.identifier', foreground: '60A5FA' },
    { token: 'identifier', foreground: 'D6DDF0' },
    { token: 'function', foreground: '93C5FD' },
    { token: 'delimiter', foreground: '8B96B5' },
    { token: 'tag', foreground: '818CF8' },
    { token: 'attribute.name', foreground: '93C5FD' },
    { token: 'attribute.value', foreground: '7DD3A7' },
    { token: 'variable', foreground: 'D6DDF0' },
    { token: 'constant', foreground: 'F0A87A' },
  ],
  colors: {
    'editor.background': '#0A101F',
    'editor.foreground': '#D6DDF0',
    'editor.lineHighlightBackground': '#101a3020',
    'editor.lineHighlightBorder': '#00000000',
    'editorLineNumber.foreground': '#3D4763',
    'editorLineNumber.activeForeground': '#8B96B5',
    'editorCursor.foreground': '#60A5FA',
    'editor.selectionBackground': '#2549803f',
    'editor.inactiveSelectionBackground': '#25498026',
    'editorIndentGuide.background1': '#1a2337',
    'editorIndentGuide.activeBackground1': '#2c3a5c',
    'editorWhitespace.foreground': '#1a2337',
    'editorBracketMatch.background': '#25498040',
    'editorBracketMatch.border': '#3B82F660',
    'editorWidget.background': '#0E1525',
    'editorWidget.border': '#1c2740',
    'editorSuggestWidget.background': '#0E1525',
    'editorSuggestWidget.border': '#1c2740',
    'editorSuggestWidget.selectedBackground': '#18223A',
    'editorHoverWidget.background': '#0E1525',
    'editorHoverWidget.border': '#1c2740',
    'input.background': '#131C30',
    'input.border': '#1c2740',
    'dropdown.background': '#0E1525',
    'list.hoverBackground': '#131C30',
    'list.activeSelectionBackground': '#18223A',
    'scrollbarSlider.background': '#1c274080',
    'scrollbarSlider.hoverBackground': '#2c3a5c99',
    'scrollbarSlider.activeBackground': '#2c3a5ccc',
    'minimap.background': '#0A101F',
    'editorGutter.background': '#0A101F',
    'diffEditor.insertedTextBackground': '#10B98118',
    'diffEditor.removedTextBackground': '#EF444418',
    'editorOverviewRuler.border': '#00000000',
  },
};

let registered = false;

export function ensureNovusTheme(m: typeof monaco) {
  if (registered) return;
  m.editor.defineTheme('novus-dark', novusDarkTheme);
  registered = true;
}
