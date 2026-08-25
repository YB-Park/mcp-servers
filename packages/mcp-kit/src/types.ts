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

export interface ContentAnnotations {
  audience?: readonly ('user' | 'assistant')[];
  priority?: number;
  lastModified?: string;
}

export interface ContentMeta {
  meta?: Readonly<Record<string, unknown>>;
  annotations?: ContentAnnotations;
}

export interface TextContent extends ContentMeta {
  type: 'text';
  text: string;
}

export interface ImageContent extends ContentMeta {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface AudioContent extends ContentMeta {
  type: 'audio';
  data: string;
  mimeType: string;
}

export interface IconDefinition {
  src: string;
  mimeType?: string;
  sizes?: readonly string[];
  theme?: 'light' | 'dark';
}

export type EmbeddedResourceContents =
  | {
      uri: string;
      text: string;
      mimeType?: string;
      meta?: Readonly<Record<string, unknown>>;
    }
  | {
      uri: string;
      blob: string;
      mimeType?: string;
      meta?: Readonly<Record<string, unknown>>;
    };

export interface EmbeddedResourceContent extends ContentMeta {
  type: 'resource';
  resource: EmbeddedResourceContents;
}

export interface ResourceLinkContent extends ContentMeta {
  type: 'resource_link';
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
  size?: number;
  icons?: readonly IconDefinition[];
}

export type ToolContent =
  | TextContent
  | ImageContent
  | AudioContent
  | EmbeddedResourceContent
  | ResourceLinkContent;

// MCP uses the same core ContentBlock union for prompt messages and tool results.
export type PromptContent = ToolContent;

export interface PromptMessage {
  role: 'user' | 'assistant';
  content: PromptContent;
}

type ToolResultBase<TStructuredContent> = {
  structuredContent?: TStructuredContent;
  isError?: boolean;
};

export type ToolExecutionResult<TStructuredContent = unknown> = ToolResultBase<TStructuredContent> & (
  | {
      text: string;
      content?: readonly ToolContent[];
    }
  | {
      text?: string;
      content: readonly ToolContent[];
    }
);

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

export type ResourceContent = EmbeddedResourceContents;

export type ResourceReadResult =
  | {
      text: string;
      mimeType?: string;
      meta?: Readonly<Record<string, unknown>>;
    }
  | {
      blob: string;
      mimeType?: string;
      meta?: Readonly<Record<string, unknown>>;
    }
  | {
      contents: readonly ResourceContent[];
    };

export interface ResourceDefinition {
  kind: 'resource';
  name: string;
  uri: string;
  title: string;
  description?: string;
  mimeType?: string;
  read(context: ExecutionContext): Promise<ResourceReadResult> | ResourceReadResult;
}

export type PromptRenderResult =
  | { text: string }
  | { messages: readonly PromptMessage[] };

interface PromptDefinitionBase {
  kind: 'prompt';
  name: string;
  title: string;
  description: string;
}

export interface PromptDefinitionWithoutArgs extends PromptDefinitionBase {
  argsSchema?: never;
  render(context: ExecutionContext): Promise<PromptRenderResult> | PromptRenderResult;
}

export interface PromptDefinitionWithArgs<TArgsSchema extends ObjectSchema = ObjectSchema>
  extends PromptDefinitionBase {
  argsSchema: TArgsSchema;
  render(
    args: ObjectSchemaOutput<TArgsSchema>,
    context: ExecutionContext,
  ): Promise<PromptRenderResult> | PromptRenderResult;
}

export type PromptDefinition<TArgsSchema extends ObjectSchema = ObjectSchema> =
  | PromptDefinitionWithoutArgs
  | PromptDefinitionWithArgs<TArgsSchema>;

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
