/**
 * Bundle monaco-editor with Vite instead of the default CDN loader,
 * and register the web workers the language services need.
 */
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { ensureNovusTheme } from './monacoTheme';

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

loader.config({ monaco });
ensureNovusTheme(monaco);

// Sensible TS/JS defaults so JSX and modern syntax don't produce noise.
const compilerOptions: monaco.languages.typescript.CompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  allowJs: true,
  allowNonTsExtensions: true,
  esModuleInterop: true,
  skipLibCheck: true,
};
monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
// Imports of workspace-local modules can't be resolved in-browser — don't flag them.
const diagnosticsOptions = { noSemanticValidation: false, noSyntaxValidation: false, diagnosticCodesToIgnore: [2307, 2792] };
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(diagnosticsOptions);
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(diagnosticsOptions);

export { monaco };
