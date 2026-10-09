import { ActorNode, ContainerNode, DatabaseNode, ExternalNode, ModuleNode, SystemNode } from './C4Nodes'

export const c4NodeTypes = {
  system: SystemNode,
  container: ContainerNode,
  database: DatabaseNode,
  actor: ActorNode,
  external: ExternalNode,
  module: ModuleNode,
}
