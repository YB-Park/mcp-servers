import type * as z from 'zod/v4';

export type Schema = z.ZodType<unknown>;
export type ObjectSchema = z.ZodType<Record<string, unknown>>;
export type SchemaOutput<TSchema extends Schema> = z.output<TSchema>;
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

export interface ToolExecutionResult<TStructuredContent = unknown> {
  text: string;
  structuredContent?: TStructuredContent;
  isError?: boolean;
}

export interface ToolDefinition<
  TInputSchema extends ObjectSchema = ObjectSchema,
  TOutputSchema extends Schema | undefined = Schema | undefined,
> {
  kind: 'tool';
  name: string;
  title: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema?: TOutputSchema;
  annotations?: ToolAnnotations;
  run(
    input: ObjectSchemaOutput<TInputSchema>,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult<TOutputSchema extends Schema ? SchemaOutput<TOutputSchema> : unknown>>
    | ToolExecutionResult<TOutputSchema extends Schema ? SchemaOutput<TOutputSchema> : unknown>;
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
