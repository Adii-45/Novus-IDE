/** Map a file path to a Monaco language id + display label + accent color. */

const byExtension: Record<string, { lang: string; label: string; color: string }> = {
  ts: { lang: 'typescript', label: 'TypeScript', color: '#3B82F6' },
  tsx: { lang: 'typescript', label: 'TypeScript JSX', color: '#3B82F6' },
  js: { lang: 'javascript', label: 'JavaScript', color: '#FACC15' },
  jsx: { lang: 'javascript', label: 'JavaScript JSX', color: '#FACC15' },
  mjs: { lang: 'javascript', label: 'JavaScript', color: '#FACC15' },
  cjs: { lang: 'javascript', label: 'JavaScript', color: '#FACC15' },
  json: { lang: 'json', label: 'JSON', color: '#84CC16' },
  html: { lang: 'html', label: 'HTML', color: '#F97316' },
  htm: { lang: 'html', label: 'HTML', color: '#F97316' },
  css: { lang: 'css', label: 'CSS', color: '#22D3EE' },
  scss: { lang: 'scss', label: 'SCSS', color: '#EC4899' },
  less: { lang: 'less', label: 'Less', color: '#6366F1' },
  md: { lang: 'markdown', label: 'Markdown', color: '#9AA5C0' },
  mdx: { lang: 'markdown', label: 'MDX', color: '#9AA5C0' },
  py: { lang: 'python', label: 'Python', color: '#3B82F6' },
  rb: { lang: 'ruby', label: 'Ruby', color: '#EF4444' },
  go: { lang: 'go', label: 'Go', color: '#22D3EE' },
  rs: { lang: 'rust', label: 'Rust', color: '#F97316' },
  java: { lang: 'java', label: 'Java', color: '#F97316' },
  c: { lang: 'c', label: 'C', color: '#6366F1' },
  h: { lang: 'c', label: 'C header', color: '#6366F1' },
  cpp: { lang: 'cpp', label: 'C++', color: '#6366F1' },
  hpp: { lang: 'cpp', label: 'C++ header', color: '#6366F1' },
  cs: { lang: 'csharp', label: 'C#', color: '#8B5CF6' },
  php: { lang: 'php', label: 'PHP', color: '#8B5CF6' },
  sh: { lang: 'shell', label: 'Shell', color: '#84CC16' },
  bash: { lang: 'shell', label: 'Shell', color: '#84CC16' },
  zsh: { lang: 'shell', label: 'Shell', color: '#84CC16' },
  yml: { lang: 'yaml', label: 'YAML', color: '#EC4899' },
  yaml: { lang: 'yaml', label: 'YAML', color: '#EC4899' },
  toml: { lang: 'ini', label: 'TOML', color: '#9AA5C0' },
  ini: { lang: 'ini', label: 'INI', color: '#9AA5C0' },
  xml: { lang: 'xml', label: 'XML', color: '#F97316' },
  svg: { lang: 'xml', label: 'SVG', color: '#F59E0B' },
  sql: { lang: 'sql', label: 'SQL', color: '#22D3EE' },
  graphql: { lang: 'graphql', label: 'GraphQL', color: '#EC4899' },
  dockerfile: { lang: 'dockerfile', label: 'Dockerfile', color: '#3B82F6' },
  env: { lang: 'ini', label: 'Env', color: '#9AA5C0' },
  txt: { lang: 'plaintext', label: 'Plain text', color: '#9AA5C0' },
  vue: { lang: 'html', label: 'Vue', color: '#10B981' },
  svelte: { lang: 'html', label: 'Svelte', color: '#F97316' },
};

const byName: Record<string, { lang: string; label: string; color: string }> = {
  dockerfile: byExtension.dockerfile,
  makefile: { lang: 'plaintext', label: 'Makefile', color: '#9AA5C0' },
  '.gitignore': { lang: 'ini', label: 'Git ignore', color: '#F97316' },
  '.env': byExtension.env,
  'package.json': { lang: 'json', label: 'npm manifest', color: '#EF4444' },
};

export function fileMeta(path: string) {
  const name = path.split('/').pop() ?? path;
  const lower = name.toLowerCase();
  if (byName[lower]) return byName[lower];
  const ext = lower.includes('.') ? lower.split('.').pop()! : '';
  return byExtension[ext] ?? { lang: 'plaintext', label: 'Plain text', color: '#9AA5C0' };
}

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif']);

export function isImagePath(path: string) {
  const ext = path.toLowerCase().split('.').pop() ?? '';
  return IMAGE_EXT.has(ext);
}
