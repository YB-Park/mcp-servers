import type {
  ObjectSchema,
  PromptDefinition,
  ResourceDefinition,
  ServerDefinition,
  ServerInput,
  ToolDefinition,
} from './types.js';

const SERVER_ID = /^[a-z][a-z0-9-]*$/;
const CAPABILITY_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

function assertUnique(kind: string, names: readonly string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      throw new Error(`Duplicate ${kind} name: ${name}`);
    }
    seen.add(name);
  }
}

export function defineTool<TInputSchema extends ObjectSchema>(
  definition: ToolDefinition<TInputSchema>,
): ToolDefinition<TInputSchema> {
  if (!CAPABILITY_NAME.test(definition.name)) {
    throw new Error(`Invalid tool name: ${definition.name}`);
  }
  if (!definition.title.trim() || !definition.description.trim()) {
    throw new Error(`Tool ${definition.name} requires title and description`);
  }
  return Object.freeze({ ...definition });
}

export function defineResource(definition: ResourceDefinition): ResourceDefinition {
  if (!CAPABILITY_NAME.test(definition.name)) {
    throw new Error(`Invalid resource name: ${definition.name}`);
  }
  new URL(definition.uri);
  return Object.freeze({ ...definition });
}

export function definePrompt<TArgsSchema extends ObjectSchema>(
  definition: PromptDefinition<TArgsSchema>,
): PromptDefinition<TArgsSchema> {
  if (!CAPABILITY_NAME.test(definition.name)) {
    throw new Error(`Invalid prompt name: ${definition.name}`);
  }
  return Object.freeze({ ...definition });
}

export function defineServer(input: ServerInput): ServerDefinition {
  const { manifest } = input;
  if (!SERVER_ID.test(manifest.id)) {
    throw new Error(`Invalid server id: ${manifest.id}; expected lowercase kebab-case`);
  }
  if (!manifest.title.trim() || !manifest.version.trim() || !manifest.description.trim()) {
    throw new Error(`Server ${manifest.id} requires title, version, and description`);
  }

  const tools = Object.freeze([...(input.tools ?? [])]);
  const resources = Object.freeze([...(input.resources ?? [])]);
  const prompts = Object.freeze([...(input.prompts ?? [])]);
  assertUnique('tool', tools.map(item => item.name));
  assertUnique('resource', resources.map(item => item.name));
  assertUnique('prompt', prompts.map(item => item.name));

  return Object.freeze({
    manifest: Object.freeze({ ...manifest }),
    ...(input.instructions ? { instructions: input.instructions } : {}),
    tools,
    resources,
    prompts,
  });
}
