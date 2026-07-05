import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCreateProject, useTemplates } from '@/lib/queries';
import { toast } from '@/stores/toastStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/misc';
import { getTemplateMeta } from './templateMeta';

export function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: templates } = useTemplates();
  const create = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [template, setTemplate] = useState('react-vite');
  const [nameError, setNameError] = useState<string>();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Give your project a name');
      return;
    }
    setNameError(undefined);
    const project = await create.mutateAsync({ name: name.trim(), description: description.trim(), template });
    toast.success('Project created', `"${project.name}" is ready to open.`);
    onClose();
    navigate(`/ide/${project.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New project" description="Pick a template — it scaffolds straight into your container." className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Input
          label="Project name"
          placeholder="my-next-big-thing"
          value={name}
          error={nameError}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div>
          <p className="text-[13px] font-medium text-ink-dim mb-2">Template</p>
          {!templates ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] rounded-xl2" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Project template">
              {templates.map((t) => {
                const meta = getTemplateMeta(t.id);
                const selected = template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTemplate(t.id)}
                    className={cn(
                      'relative flex items-start gap-3 p-3 rounded-xl2 border text-left transition-all duration-150',
                      selected
                        ? 'border-primary/60 bg-primary-soft/50'
                        : 'border-line-strong bg-surface-raised hover:border-line-strong hover:bg-surface-overlay'
                    )}
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: meta.color }}>
                      {meta.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{t.name}</span>
                      <span className="block text-[11px] text-ink-faint mt-0.5 leading-snug">{t.description}</span>
                    </span>
                    {selected && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Textarea
          label="Description (optional)"
          placeholder="What are you building?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          className="min-h-[64px]"
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  );
}
