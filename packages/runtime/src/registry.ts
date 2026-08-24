import type { ServerDefinition } from '@mcp-platform/mcp-kit';

export class ServerRegistry {
  readonly #servers: ReadonlyMap<string, ServerDefinition>;

  constructor(definitions: readonly ServerDefinition[]) {
    const entries = new Map<string, ServerDefinition>();
    for (const definition of definitions) {
      const id = definition.manifest.id;
      if (entries.has(id)) {
        throw new Error(`Duplicate server id: ${id}`);
      }
      entries.set(id, definition);
    }
    this.#servers = entries;
  }

  get(id: string): ServerDefinition | undefined {
    return this.#servers.get(id);
  }

  list(): readonly ServerDefinition[] {
    return [...this.#servers.values()];
  }
}
