export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  language: string;
  /** Command hint surfaced in the UI after creation. */
  devCommand?: string;
  /** Port the dev server listens on inside the container. */
  previewPort?: number;
}

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'An empty workspace. Bring your own stack.',
    language: 'plaintext',
  },
  {
    id: 'node',
    name: 'Node.js',
    description: 'Minimal Node.js starter with a ready-to-run entry point.',
    language: 'javascript',
    devCommand: 'node index.js',
  },
  {
    id: 'express',
    name: 'Express API',
    description: 'REST API skeleton with routing and JSON middleware.',
    language: 'javascript',
    devCommand: 'npm install && npm run dev',
    previewPort: 3000,
  },
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'React 18 with Vite dev server and hot module replacement.',
    language: 'typescript',
    devCommand: 'npm install && npm run dev',
    previewPort: 5173,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'Next.js app-router starter for full-stack React.',
    language: 'typescript',
    devCommand: 'npm install && npm run dev',
    previewPort: 3000,
  },
  {
    id: 'python',
    name: 'Python',
    description: 'Python 3 starter with a main module and requirements file.',
    language: 'python',
    devCommand: 'python3 main.py',
  },
];
