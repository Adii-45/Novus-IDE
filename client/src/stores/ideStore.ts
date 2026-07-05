import { create } from 'zustand';

export type SidebarPanel = 'explorer' | 'search' | 'git' | 'chat';
export type DockTab = 'terminal' | 'problems' | 'output';

interface IdeState {
  // layout
  sidebarPanel: SidebarPanel;
  sidebarVisible: boolean;
  dockVisible: boolean;
  dockTab: DockTab;
  previewVisible: boolean;
  paletteOpen: false | 'commands' | 'files';

  // editor
  openTabs: string[];
  activePath: string | null;
  /** paths with local edits not yet flushed to disk by the server */
  dirty: Set<string>;

  // terminal
  terminalIds: string[];
  activeTerminalId: string | null;

  setSidebarPanel: (panel: SidebarPanel) => void;
  toggleSidebar: () => void;
  toggleDock: () => void;
  setDockTab: (tab: DockTab) => void;
  togglePreview: () => void;
  setPalette: (mode: false | 'commands' | 'files') => void;

  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  closeOtherTabs: (path: string) => void;
  setActivePath: (path: string | null) => void;
  markDirty: (path: string) => void;
  clearDirty: (path: string) => void;
  /** rename/delete support: rewrite tab paths */
  remapPath: (from: string, to: string | null) => void;

  addTerminal: () => string;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;

  reset: () => void;
}

let terminalSeq = 1;

const initial = {
  sidebarPanel: 'explorer' as SidebarPanel,
  sidebarVisible: true,
  dockVisible: true,
  dockTab: 'terminal' as DockTab,
  previewVisible: false,
  paletteOpen: false as const,
  openTabs: [] as string[],
  activePath: null as string | null,
  dirty: new Set<string>(),
  terminalIds: ['term-1'],
  activeTerminalId: 'term-1',
};

export const useIdeStore = create<IdeState>((set, get) => ({
  ...initial,

  setSidebarPanel: (panel) =>
    set((s) => ({
      sidebarPanel: panel,
      sidebarVisible: s.sidebarPanel === panel ? !s.sidebarVisible : true,
    })),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  toggleDock: () => set((s) => ({ dockVisible: !s.dockVisible })),
  setDockTab: (tab) => set({ dockTab: tab, dockVisible: true }),
  togglePreview: () => set((s) => ({ previewVisible: !s.previewVisible })),
  setPalette: (mode) => set({ paletteOpen: mode }),

  openFile: (path) =>
    set((s) => ({
      openTabs: s.openTabs.includes(path) ? s.openTabs : [...s.openTabs, path],
      activePath: path,
    })),
  closeTab: (path) =>
    set((s) => {
      const openTabs = s.openTabs.filter((p) => p !== path);
      let activePath = s.activePath;
      if (activePath === path) {
        const idx = s.openTabs.indexOf(path);
        activePath = openTabs[Math.min(idx, openTabs.length - 1)] ?? null;
      }
      return { openTabs, activePath };
    }),
  closeOtherTabs: (path) => set({ openTabs: [path], activePath: path }),
  setActivePath: (path) => set({ activePath: path }),
  markDirty: (path) =>
    set((s) => {
      if (s.dirty.has(path)) return s;
      const dirty = new Set(s.dirty);
      dirty.add(path);
      return { dirty };
    }),
  clearDirty: (path) =>
    set((s) => {
      if (!s.dirty.has(path)) return s;
      const dirty = new Set(s.dirty);
      dirty.delete(path);
      return { dirty };
    }),
  remapPath: (from, to) =>
    set((s) => {
      const map = (p: string) => {
        if (p === from || p.startsWith(`${from}/`)) {
          return to === null ? null : to + p.slice(from.length);
        }
        return p;
      };
      const openTabs = s.openTabs.map(map).filter((p): p is string => p !== null);
      const active = s.activePath ? map(s.activePath) : null;
      return { openTabs, activePath: active && openTabs.includes(active) ? active : (openTabs[0] ?? null) };
    }),

  addTerminal: () => {
    const id = `term-${++terminalSeq}-${Date.now().toString(36)}`;
    set((s) => ({ terminalIds: [...s.terminalIds, id], activeTerminalId: id, dockVisible: true, dockTab: 'terminal' }));
    return id;
  },
  removeTerminal: (id) =>
    set((s) => {
      const terminalIds = s.terminalIds.filter((t) => t !== id);
      return {
        terminalIds,
        activeTerminalId: s.activeTerminalId === id ? (terminalIds[terminalIds.length - 1] ?? null) : s.activeTerminalId,
      };
    }),
  setActiveTerminal: (id) => set({ activeTerminalId: id }),

  reset: () => {
    terminalSeq = 1;
    set({ ...initial, dirty: new Set(), terminalIds: ['term-1'], activeTerminalId: 'term-1' });
    void get;
  },
}));
