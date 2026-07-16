import type { SourceAdapter, SourceDefinition } from "./types.js";

export class SourceRegistry {
  readonly #definitions = new Map<string, SourceDefinition>();
  readonly #adapters = new Map<string, SourceAdapter>();

  register(definition: SourceDefinition, adapter: SourceAdapter): void {
    if (this.#definitions.has(definition.key)) {
      throw new Error(`Source already registered: ${definition.key}`);
    }

    if (adapter.key !== definition.connectorKey) {
      throw new Error(
        `Adapter key ${adapter.key} does not match connector ${definition.connectorKey}`,
      );
    }

    this.#definitions.set(definition.key, definition);
    this.#adapters.set(definition.key, adapter);
  }

  get(sourceKey: string): {
    definition: SourceDefinition;
    adapter: SourceAdapter;
  } {
    const definition = this.#definitions.get(sourceKey);
    const adapter = this.#adapters.get(sourceKey);

    if (!definition || !adapter) {
      throw new Error(`Unknown source: ${sourceKey}`);
    }

    return { definition, adapter };
  }

  list(): SourceDefinition[] {
    return [...this.#definitions.values()];
  }
}
