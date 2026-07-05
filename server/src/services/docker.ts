import Docker from 'dockerode';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { workspaceDir } from '../utils/paths.js';
import { ensureWorkspace } from './workspace.js';
import type { IProject } from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';

const docker = new Docker(); // default socket: /var/run/docker.sock

let dockerAvailable: boolean | null = null;

export async function isDockerAvailable(): Promise<boolean> {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    await docker.ping();
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
    logger.warn('Docker is not available — terminals will fall back to local shells');
  }
  return dockerAvailable;
}

export interface ContainerStatus {
  state: 'none' | 'created' | 'running' | 'paused' | 'exited' | 'dead' | 'restarting';
  containerId?: string;
  previewPort?: number;
  startedAt?: string;
}

/** Ports we map from every project container out to the host. */
const PREVIEW_PORTS = [3000, 5173, 8000, 8080];

function containerName(projectId: string) {
  return `novus-ws-${projectId}`;
}

export async function getContainerStatus(project: IProject): Promise<ContainerStatus> {
  if (!(await isDockerAvailable())) return { state: 'none' };
  if (!project.containerId) return { state: 'none' };
  try {
    const info = await docker.getContainer(project.containerId).inspect();
    return {
      state: info.State.Status as ContainerStatus['state'],
      containerId: project.containerId,
      previewPort: project.previewPort,
      startedAt: info.State.StartedAt,
    };
  } catch {
    return { state: 'none' };
  }
}

/**
 * Create (if needed) and start the project's container. The workspace
 * directory is bind-mounted at /workspace; common dev-server ports are
 * published to dynamically-assigned host ports.
 */
export async function startContainer(project: IProject): Promise<ContainerStatus> {
  if (!(await isDockerAvailable())) throw ApiError.unavailable('Docker is not available on this host');
  const projectId = String(project._id);
  await ensureWorkspace(projectId);

  // Reuse an existing container when possible.
  if (project.containerId) {
    try {
      const container = docker.getContainer(project.containerId);
      const info = await container.inspect();
      if (info.State.Status !== 'running') await container.start();
      return getContainerStatus(project);
    } catch {
      project.containerId = undefined; // stale reference → recreate
    }
  }

  // Remove any orphan with our name (e.g. after a DB wipe).
  try {
    const orphan = docker.getContainer(containerName(projectId));
    await orphan.remove({ force: true });
  } catch {
    // no orphan
  }

  const exposedPorts: Record<string, object> = {};
  const portBindings: Record<string, Array<{ HostPort: string }>> = {};
  for (const port of PREVIEW_PORTS) {
    exposedPorts[`${port}/tcp`] = {};
    portBindings[`${port}/tcp`] = [{ HostPort: '' }]; // '' → Docker assigns a free host port
  }

  const container = await docker.createContainer({
    name: containerName(projectId),
    Image: config.docker.runtimeImage,
    Labels: { 'novuside.project': projectId },
    WorkingDir: '/workspace',
    Tty: true,
    ExposedPorts: exposedPorts,
    HostConfig: {
      Binds: [`${workspaceDir(projectId)}:/workspace`],
      PortBindings: portBindings,
      Memory: config.docker.memoryMb * 1024 * 1024,
      NanoCpus: Math.round(config.docker.cpus * 1e9),
      RestartPolicy: { Name: 'unless-stopped' },
    },
  });
  await container.start();

  const info = await container.inspect();
  // Preview URL points at the first mapped port (3000); the client can
  // switch between mapped ports.
  const bindings = info.NetworkSettings.Ports;
  const hostPorts: Record<number, number> = {};
  for (const port of PREVIEW_PORTS) {
    const mapped = bindings[`${port}/tcp`]?.[0]?.HostPort;
    if (mapped) hostPorts[port] = Number(mapped);
  }

  project.containerId = container.id;
  project.previewPort = hostPorts[5173] || hostPorts[3000];
  project.portMap = Object.fromEntries(Object.entries(hostPorts).map(([k, v]) => [String(k), v]));
  project.markModified('portMap');
  await project.save();

  return {
    state: 'running',
    containerId: container.id,
    previewPort: project.previewPort,
    startedAt: info.State.StartedAt,
  };
}

export async function stopContainer(project: IProject) {
  if (!project.containerId) return;
  try {
    await docker.getContainer(project.containerId).stop({ t: 3 });
  } catch {
    // already stopped / gone
  }
}

export async function restartContainer(project: IProject): Promise<ContainerStatus> {
  if (!project.containerId) return startContainer(project);
  try {
    await docker.getContainer(project.containerId).restart({ t: 3 });
    return getContainerStatus(project);
  } catch {
    return startContainer(project);
  }
}

export async function destroyContainer(project: IProject) {
  if (!project.containerId) return;
  try {
    await docker.getContainer(project.containerId).remove({ force: true });
  } catch {
    // gone already
  }
  project.containerId = undefined;
  project.previewPort = undefined;
  await project.save().catch(() => undefined);
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
}

export async function getContainerStats(project: IProject): Promise<ContainerStats | null> {
  if (!project.containerId || !(await isDockerAvailable())) return null;
  try {
    const stats = (await docker.getContainer(project.containerId).stats({ stream: false })) as {
      cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus?: number };
      precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number };
      memory_stats: { usage?: number; limit?: number; stats?: { inactive_file?: number } };
    };
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const sysDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpus = stats.cpu_stats.online_cpus || 1;
    const cpuPercent = sysDelta > 0 ? (cpuDelta / sysDelta) * cpus * 100 : 0;
    const memUsage = (stats.memory_stats.usage || 0) - (stats.memory_stats.stats?.inactive_file || 0);
    return {
      cpuPercent: Math.round(cpuPercent * 10) / 10,
      memoryUsedMb: Math.round(memUsage / 1048576),
      memoryLimitMb: Math.round((stats.memory_stats.limit || 0) / 1048576),
    };
  } catch {
    return null;
  }
}

export async function getContainerLogs(project: IProject, tail = 200): Promise<string> {
  if (!project.containerId) return '';
  try {
    const buf = (await docker.getContainer(project.containerId).logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: false,
    })) as Buffer;
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

export function getPortMap(project: IProject): Record<string, number> {
  return project.portMap || {};
}
