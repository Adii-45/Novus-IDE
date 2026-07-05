import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { z } from 'zod';
import { useImportProject } from '@/lib/queries';
import { toast } from '@/stores/toastStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ImportRepoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const importProject = useImportProject();

  const [repoUrl, setRepoUrl] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<{ repoUrl?: string; name?: string }>({});

  const deriveName = (url: string) =>
    url
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean)
      .pop() ?? '';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || deriveName(repoUrl);
    const urlOk = z.string().url().safeParse(repoUrl.trim());
    const next: typeof errors = {};
    if (!urlOk.success) next.repoUrl = 'Enter a valid repository URL (https://…)';
    if (!finalName) next.name = 'Give the project a name';
    setErrors(next);
    if (Object.keys(next).length) return;

    const project = await importProject.mutateAsync({ name: finalName, repoUrl: repoUrl.trim() });
    toast.success('Repository imported', `Cloned into "${project.name}".`);
    onClose();
    navigate(`/ide/${project.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Import a repository" description="Clone a public Git repository into a fresh workspace.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Repository URL"
          placeholder="https://github.com/user/repo.git"
          value={repoUrl}
          error={errors.repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          autoFocus
        />
        <Input
          label="Project name"
          placeholder={deriveName(repoUrl) || 'Derived from the URL if left empty'}
          value={name}
          error={errors.name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={importProject.isPending}>
            <GitBranch size={15} />
            Import
          </Button>
        </div>
      </form>
    </Modal>
  );
}
