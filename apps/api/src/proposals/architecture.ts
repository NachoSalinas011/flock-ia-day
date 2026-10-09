export const CONTAINER_KINDS = [
  'WEB',
  'MOBILE',
  'API',
  'WORKER',
  'DATABASE',
] as const;
export type ContainerKind = (typeof CONTAINER_KINDS)[number];

export interface ArchitectureActor {
  key: string;
  name: string;
  description: string;
  /** container keys the actor interacts with */
  uses: string[];
}

export interface ArchitectureContainer {
  key: string;
  name: string;
  technology: string;
  kind: ContainerKind;
  description: string;
  /** container keys this container calls */
  calls: string[];
}

export interface ArchitectureExternalSystem {
  key: string;
  name: string;
  description: string;
}

/** C4 level 2 view; modules are placed inside containers via ProposalModule.containerKey. */
export interface Architecture {
  actors: ArchitectureActor[];
  containers: ArchitectureContainer[];
  externalSystems: ArchitectureExternalSystem[];
  /** true when it was derived from the modules because the model did not provide one */
  inferred: boolean;
}

export interface ModulePlacement {
  name: string;
  containerKey: string | null;
  integrations: string[];
  dependsOn: string[];
}

interface ModuleHoursLike {
  name: string;
  estimatedHours: { FRONTEND: number; BACKEND: number };
}

export const toKey = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

/** Default web + API + DB layout, used when no architecture is available. */
export function inferArchitecture(): Architecture {
  return {
    actors: [
      {
        key: 'usuario',
        name: 'Usuario',
        description: 'Usuarios del sistema',
        uses: ['web'],
      },
    ],
    containers: [
      {
        key: 'web',
        name: 'Aplicación web',
        technology: 'React',
        kind: 'WEB',
        description: 'Interfaz de usuario',
        calls: ['api'],
      },
      {
        key: 'api',
        name: 'API',
        technology: 'NestJS',
        kind: 'API',
        description: 'Lógica de negocio',
        calls: ['db'],
      },
      {
        key: 'db',
        name: 'Base de datos',
        technology: 'PostgreSQL',
        kind: 'DATABASE',
        description: 'Persistencia',
        calls: [],
      },
    ],
    externalSystems: [],
    inferred: true,
  };
}

/** Mostly-frontend modules go to the first WEB container, the rest to the first API one. */
export function inferContainerKey(
  module: ModuleHoursLike,
  architecture: Architecture,
): string | null {
  const byKind = (kinds: ContainerKind[]) =>
    architecture.containers.find((c) => kinds.includes(c.kind))?.key ?? null;
  const frontendHeavy =
    module.estimatedHours.FRONTEND > module.estimatedHours.BACKEND;
  return frontendHeavy
    ? (byKind(['WEB', 'MOBILE']) ?? byKind(['API']))
    : (byKind(['API', 'WORKER']) ?? byKind(['WEB']));
}

/**
 * Cleans the model's architecture: unique keys, only references to known
 * containers/systems/modules, every module placed in some container.
 */
export function normalizeArchitecture(
  raw: Omit<Architecture, 'inferred'> | null | undefined,
  modules: (ModuleHoursLike & Omit<ModulePlacement, 'name'>)[],
): { architecture: Architecture; placements: ModulePlacement[] } {
  const architecture: Architecture =
    raw && raw.containers.length > 0
      ? { ...dedupe(raw), inferred: false }
      : inferArchitecture();

  architecture.actors = withoutSystemActors(architecture);
  const containerKeys = new Set(architecture.containers.map((c) => c.key));
  const systemKeys = new Set(architecture.externalSystems.map((s) => s.key));
  architecture.actors.forEach((a) => {
    a.uses = a.uses.map(toKey).filter((k) => containerKeys.has(k));
  });
  architecture.containers.forEach((c) => {
    c.calls = c.calls
      .map(toKey)
      .filter((k) => containerKeys.has(k) && k !== c.key);
  });

  const moduleNames = new Map(modules.map((m) => [toKey(m.name), m.name]));
  const placements = modules.map((module) => {
    const key = module.containerKey ? toKey(module.containerKey) : null;
    return {
      name: module.name,
      containerKey:
        key && containerKeys.has(key)
          ? key
          : inferContainerKey(module, architecture),
      integrations: [...new Set(module.integrations.map(toKey))].filter((k) =>
        systemKeys.has(k),
      ),
      dependsOn: [
        ...new Set(
          module.dependsOn
            .map((name) => moduleNames.get(toKey(name)))
            .filter((name): name is string => !!name && name !== module.name),
        ),
      ],
    };
  });
  return {
    architecture,
    placements: rebalance(placements, modules, architecture),
  };
}

/**
 * Models tend to drop every module into the API. When one container holds 80%+
 * of the modules and there are other app containers, place them by hours instead.
 */
function rebalance(
  placements: ModulePlacement[],
  modules: ModuleHoursLike[],
  architecture: Architecture,
): ModulePlacement[] {
  const appContainers = architecture.containers.filter(
    (c) => c.kind !== 'DATABASE',
  );
  if (appContainers.length < 2 || placements.length < 3) return placements;
  const counts = new Map<string | null, number>();
  placements.forEach((p) =>
    counts.set(p.containerKey, (counts.get(p.containerKey) ?? 0) + 1),
  );
  const crowded = Math.max(...counts.values()) / placements.length >= 0.8;
  if (!crowded) return placements;
  return placements.map((placement, i) => ({
    ...placement,
    containerKey: inferContainerKey(modules[i], architecture),
  }));
}

function dedupe(raw: Omit<Architecture, 'inferred'>) {
  const unique = <T extends { key: string }>(items: T[]) => {
    const seen = new Set<string>();
    return items
      .map((item) => ({ ...item, key: toKey(item.key || (item as any).name) }))
      .filter((item) => !seen.has(item.key) && seen.add(item.key));
  };
  return {
    actors: unique(raw.actors),
    containers: unique(raw.containers),
    externalSystems: unique(raw.externalSystems),
  };
}

/** Models sometimes list third-party systems as actors: actors must be people. */
export function withoutSystemActors(
  architecture: Pick<Architecture, 'actors' | 'externalSystems'>,
): ArchitectureActor[] {
  const normalize = (s: string) => toKey(s).replace(/-/g, '');
  const systems = architecture.externalSystems.flatMap((s) => [
    normalize(s.key),
    normalize(s.name),
  ]);
  return architecture.actors.filter((actor) => {
    const key = normalize(actor.key);
    const name = normalize(actor.name);
    return !systems.some(
      (system) =>
        system === key ||
        system === name ||
        system.includes(name) ||
        name.includes(system),
    );
  });
}
