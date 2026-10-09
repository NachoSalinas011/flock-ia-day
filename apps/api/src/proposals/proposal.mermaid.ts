import { ProposalResponseDto } from './dto/proposal-response.dto';

const alias = (key: string) => key.replace(/[^a-zA-Z0-9_]/g, '_');
const text = (s: string) => s.replace(/"/g, "'").replace(/\s+/g, ' ').trim();

/** C4 level 2 (containers) with the identified modules as components inside them. */
export function renderC4Mermaid(
  systemName: string,
  p: ProposalResponseDto,
): string {
  const { actors, containers, externalSystems } = p.architecture;
  const moduleAlias = new Map(p.modules.map((m, i) => [m.id, `m${i + 1}`]));
  const lines = [
    'C4Container',
    `title ${text(systemName)} — C4 nivel 2 (v${p.version})`,
    '',
    ...actors.map(
      (a) =>
        `Person(${alias(a.key)}, "${text(a.name)}", "${text(a.description)}")`,
    ),
    '',
    `System_Boundary(sistema, "${text(systemName)}") {`,
  ];

  for (const container of containers) {
    const modules = p.modules.filter((m) => m.containerKey === container.key);
    const id = alias(container.key);
    if (container.kind === 'DATABASE') {
      lines.push(
        `  ContainerDb(${id}, "${text(container.name)}", "${text(container.technology)}", "${text(container.description)}")`,
      );
    } else if (modules.length === 0) {
      lines.push(
        `  Container(${id}, "${text(container.name)}", "${text(container.technology)}", "${text(container.description)}")`,
      );
    } else {
      lines.push(
        `  Container_Boundary(${id}, "${text(container.name)} [${text(container.technology)}]") {`,
      );
      for (const module of modules) {
        lines.push(
          `    Component(${moduleAlias.get(module.id)}, "${text(module.name)}", "${module.totalHours} h", "${text(module.description)}")`,
        );
      }
      lines.push('  }');
    }
  }
  lines.push('}', '');

  lines.push(
    ...externalSystems.map(
      (s) =>
        `System_Ext(${alias(s.key)}, "${text(s.name)}", "${text(s.description)}")`,
    ),
    '',
  );

  for (const actor of actors) {
    for (const target of actor.uses) {
      lines.push(`Rel(${alias(actor.key)}, ${alias(target)}, "Usa")`);
    }
  }
  for (const container of containers) {
    for (const target of container.calls) {
      lines.push(`Rel(${alias(container.key)}, ${alias(target)}, "Llama")`);
    }
  }
  for (const module of p.modules) {
    for (const system of module.integrations) {
      lines.push(
        `Rel(${moduleAlias.get(module.id)}, ${alias(system)}, "Integra")`,
      );
    }
  }
  return lines.join('\n');
}
