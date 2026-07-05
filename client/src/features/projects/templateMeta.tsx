import type { ReactNode } from 'react';
import { FileCode2, Hexagon, Server, Atom, Layers, FileTerminal } from 'lucide-react';

/** Icon + accent color per project template id (matches server TEMPLATES). */
export const templateMeta: Record<string, { icon: ReactNode; color: string }> = {
  blank: { icon: <FileCode2 size={18} />, color: '#9AA5C0' },
  node: { icon: <Hexagon size={18} />, color: '#84CC16' },
  express: { icon: <Server size={18} />, color: '#FACC15' },
  'react-vite': { icon: <Atom size={18} />, color: '#22D3EE' },
  nextjs: { icon: <Layers size={18} />, color: '#E6EAF4' },
  python: { icon: <FileTerminal size={18} />, color: '#3B82F6' },
};

export function getTemplateMeta(id: string) {
  return templateMeta[id] ?? templateMeta.blank;
}
