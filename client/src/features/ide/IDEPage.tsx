import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TerminalSquare } from 'lucide-react';
import { useProject } from '@/lib/queries';
import { useIdeStore } from '@/stores/ideStore';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { LogoMark } from '@/components/ui/Logo';
import { CollabProvider } from './collab/CollabProvider';
import { useContainer } from './lib/useContainer';
import { TopBar } from './chrome/TopBar';
import { StatusBar } from './chrome/StatusBar';
import { ActivityBar } from './chrome/ActivityBar';
import { EditorArea } from './editor/EditorArea';
import { ExplorerPanel } from './panels/ExplorerPanel';
import { SearchPanel } from './panels/SearchPanel';
import { GitPanel } from './panels/GitPanel';
import { ChatPanel } from './panels/ChatPanel';
import { TerminalDock } from './dock/TerminalDock';
import { PreviewPanel } from './preview/PreviewPanel';
import { CommandPalette } from './CommandPalette';
import type { Project } from '@/types';

function ResizeHandle({ direction = 'horizontal' }: { direction?: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={
        direction === 'horizontal'
          ? 'w-[3px] bg-transparent hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary/60 transition-colors'
          : 'h-[3px] bg-transparent hover:bg-primary/40 data-[resize-handle-state=drag]:bg-primary/60 transition-colors'
      }
    />
  );
}

function IDEWorkbench({ project }: { project: Project }) {
  const projectId = project.id;
  const readOnly = project.role === 'viewer';
  const container = useContainer(projectId);
  const { sidebarVisible, sidebarPanel, dockVisible, previewVisible } = useIdeStore();

  // Auto-start the container on first open (editors only, when Docker is up).
  useEffect(() => {
    if (readOnly || container.loading || !container.status) return;
    if (container.status.dockerAvailable && container.status.state !== 'running' && !container.start.isPending) {
      container.start.mutate();
    }
    // Run once when status first resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container.loading]);

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      <TopBar project={project} container={container} readOnly={readOnly} />
      <div className="flex-1 flex min-h-0">
        <ActivityBar />
        <PanelGroup direction="horizontal" autoSaveId={`novus-ide-h-${projectId}`}>
          {sidebarVisible && (
            <>
              <Panel defaultSize={17} minSize={12} maxSize={32} order={1} id="sidebar" className="bg-surface">
                {sidebarPanel === 'explorer' && <ExplorerPanel projectId={projectId} readOnly={readOnly} />}
                {sidebarPanel === 'search' && <SearchPanel projectId={projectId} />}
                {sidebarPanel === 'git' && <GitPanel projectId={projectId} readOnly={readOnly} />}
                {sidebarPanel === 'chat' && <ChatPanel project={project} readOnly={readOnly} />}
              </Panel>
              <ResizeHandle />
            </>
          )}
          <Panel order={2} id="main" minSize={30}>
            <PanelGroup direction="vertical" autoSaveId={`novus-ide-v-${projectId}`}>
              <Panel order={1} id="editor-row" minSize={25}>
                <PanelGroup direction="horizontal">
                  <Panel order={1} id="editor" minSize={25}>
                    <EditorArea projectId={projectId} readOnly={readOnly} />
                  </Panel>
                  {previewVisible && (
                    <>
                      <ResizeHandle />
                      <Panel order={2} id="preview" defaultSize={42} minSize={20}>
                        <PreviewPanel status={container.status} />
                      </Panel>
                    </>
                  )}
                </PanelGroup>
              </Panel>
              {dockVisible && (
                <>
                  <ResizeHandle direction="vertical" />
                  <Panel order={2} id="dock" defaultSize={30} minSize={12} maxSize={70}>
                    <TerminalDock projectId={projectId} readOnly={readOnly} containerRunning={container.running} />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
      {!dockVisible && (
        <button
          onClick={() => useIdeStore.getState().toggleDock()}
          className="absolute bottom-8 right-4 z-20 h-8 px-3 rounded-xl2 bg-surface-overlay border border-line-strong text-[12px] text-ink-dim hover:text-ink shadow-soft flex items-center gap-2 transition-colors"
        >
          <TerminalSquare size={13} />
          Terminal
        </button>
      )}
      <StatusBar projectId={projectId} container={container} />
      <CommandPalette projectId={projectId} />
    </div>
  );
}

export default function IDEPage() {
  const { projectId = '' } = useParams();
  const { data: project, isLoading, isError } = useProject(projectId);
  const reset = useIdeStore((s) => s.reset);

  // Fresh layout/tabs whenever a different project is opened.
  useEffect(() => {
    reset();
    return () => reset();
  }, [projectId, reset]);

  if (isLoading) {
    return (
      <div className="h-screen grid place-items-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <LogoMark className="h-10 w-10" />
          <div className="flex items-center gap-2 text-[13px] text-ink-dim">
            <Spinner className="h-4 w-4" />
            Opening workspace…
          </div>
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="h-screen grid place-items-center bg-bg">
        <div className="text-center">
          <LogoMark className="h-10 w-10 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-ink">Project not found</h1>
          <p className="mt-1.5 text-sm text-ink-dim">It may have been deleted, or you don&apos;t have access.</p>
          <Link to="/dashboard" className="inline-block mt-5">
            <Button variant="secondary">Back to dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CollabProvider projectId={projectId}>
      <IDEWorkbench project={project} />
    </CollabProvider>
  );
}
