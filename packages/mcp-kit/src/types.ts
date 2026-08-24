import type * as z from 'zod/v4';

export type ObjectSchema = z.ZodType<Record<string, unknown>>;
export type ObjectSchemaOutput<TSchema extends ObjectSchema> = z.output<TSchema>;

export interface IdentityContext {
  subject?: string;
  actor?: string;
  claims: Readonly<Record<string, unknown>>;
  delegation?: Readonly<Record<string, unknown>>;
}

export interface ExecutionContext {
  serverId: string;
  identity: IdentityContext;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolExecutionResult {
  text: string;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ToolDefinition<TInputSchema extends ObjectSchema = ObjectSchema> {
  kind: 'tool';
  name: string;
  title: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema?: ObjectSchema;
  annotations?: ToolAnnotations;
  run(
    input: ObjectSchemaOutput<TInputSchema>,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> | ToolExecutionResult;
}

export interface ResourceReadResult {
  text: string;
  mimeType?: string;
}

export interface ResourceDefinition {
  kind: 'resource';
  name: string;
  uri: string;
  title: string;
  description?: string;
  mimeType?: string;
  read(context: ExecutionContext): Promise<ResourceReadResult> | ResourceReadResult;
}

export interface PromptRenderResult {
  text: string;
}

export interface PromptDefinition<TArgsSchema extends ObjectSchema = ObjectSchema> {
  kind: 'prompt';
  name: string;
  title: string;
  description: string;
  argsSchema: TArgsSchema;
  render(
    args: ObjectSchemaOutput<TArgsSchema>,
    context: ExecutionContext,
  ): Promise<PromptRenderResult> | PromptRenderResult;
}

export interface ServerManifest {
  id: string;
  title: string;
  version: string;
  description: string;
  owner?: string;
  tags?: readonly string[];
  visibility?: 'internal' | 'private' | 'public';
  authPolicy?: string;
}

export interface ServerDefinition {
  manifest: ServerManifest;
  instructions?: string;
  tools: readonly ToolDefinition[];
  resources: readonly ResourceDefinition[];
  prompts: readonly PromptDefinition[];
}

export interface ServerInput {
  manifest: ServerManifest;
  instructions?: string;
  tools?: readonly ToolDefinition[];
  resources?: readonly ResourceDefinition[];
  prompts?: readonly PromptDefinition[];
}
