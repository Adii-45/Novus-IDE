import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { ContainerStats, ContainerStatus } from '@/types';

export function useContainer(projectId: string) {
  const qc = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ['container-status', projectId],
    queryFn: async () => (await api.get<ContainerStatus>(`/projects/${projectId}/container/status`)).data,
    refetchInterval: 8000,
  });

  const running = statusQuery.data?.state === 'running';

  const statsQuery = useQuery({
    queryKey: ['container-stats', projectId],
    queryFn: async () => (await api.get<ContainerStats>(`/projects/${projectId}/container/stats`)).data,
    enabled: running,
    refetchInterval: 5000,
    retry: false,
  });

  const act = (action: 'start' | 'stop' | 'restart') =>
    useMutation({
      mutationFn: async () => (await api.post<ContainerStatus>(`/projects/${projectId}/container/${action}`)).data,
      onSuccess: (data) => {
        qc.setQueryData(['container-status', projectId], data);
        qc.invalidateQueries({ queryKey: ['container-status', projectId] });
      },
      onError: (err) => toast.error(`Container ${action} failed`, apiErrorMessage(err)),
    });

  /* eslint-disable react-hooks/rules-of-hooks */
  const start = act('start');
  const stop = act('stop');
  const restart = act('restart');
  /* eslint-enable react-hooks/rules-of-hooks */

  return {
    status: statusQuery.data,
    stats: statsQuery.data,
    running,
    loading: statusQuery.isLoading,
    start,
    stop,
    restart,
  };
}

export type ContainerControls = ReturnType<typeof useContainer>;
