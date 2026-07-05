import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { ActivityItem, AppNotification, Project, TemplateInfo } from '@/types';

// ---------------------------------------------------------------- projects

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}`)).data,
    enabled: Boolean(projectId),
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get<TemplateInfo[]>('/projects/templates')).data,
    staleTime: Infinity,
  });
}

function invalidateProjects(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['projects'] });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; template?: string }) =>
      (await api.post<Project>('/projects', input)).data,
    onSuccess: () => invalidateProjects(qc),
    onError: (err) => toast.error('Could not create project', apiErrorMessage(err)),
  });
}

export function useImportProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; repoUrl: string }) =>
      (await api.post<Project>('/projects/import', input)).data,
    onSuccess: () => invalidateProjects(qc),
    onError: (err) => toast.error('Import failed', apiErrorMessage(err)),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name?: string; description?: string; archived?: boolean }) =>
      (await api.patch<Project>(`/projects/${projectId}`, input)).data,
    onSuccess: (data) => {
      qc.setQueryData(['project', projectId], data);
      invalidateProjects(qc);
    },
    onError: (err) => toast.error('Update failed', apiErrorMessage(err)),
  });
}

/** Optimistic star/pin toggle shared by cards and menus. */
export function useToggleProjectFlag(kind: 'star' | 'pin') {
  const qc = useQueryClient();
  const field = kind === 'star' ? 'starred' : 'pinned';
  return useMutation({
    mutationFn: async (projectId: string) => (await api.post(`/projects/${projectId}/${kind}`)).data,
    onMutate: async (projectId) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const prev = qc.getQueryData<Project[]>(['projects']);
      qc.setQueryData<Project[]>(['projects'], (old) =>
        old?.map((p) => (p.id === projectId ? { ...p, [field]: !p[field] } : p))
      );
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects'], ctx.prev);
      toast.error('Action failed', apiErrorMessage(err));
    },
    onSettled: () => invalidateProjects(qc),
  });
}

export function useDuplicateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => (await api.post<Project>(`/projects/${projectId}/duplicate`)).data,
    onSuccess: (p) => {
      invalidateProjects(qc);
      toast.success('Project duplicated', `"${p.name}" is ready.`);
    },
    onError: (err) => toast.error('Duplicate failed', apiErrorMessage(err)),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => (await api.delete(`/projects/${projectId}`)).data,
    onSuccess: () => invalidateProjects(qc),
    onError: (err) => toast.error('Delete failed', apiErrorMessage(err)),
  });
}

// ----------------------------------------------------------- notifications

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<{ unread: number; items: AppNotification[] }>('/notifications')).data,
    enabled,
    refetchInterval: 60_000,
  });
}

// ---------------------------------------------------------------- activity

export function useActivity() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: async () => (await api.get<ActivityItem[]>('/activity')).data,
  });
}
