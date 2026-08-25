import type {
  ContentAnnotations,
  ContentMeta,
  EmbeddedResourceContents,
  ExecutionContext,
  IdentityContext,
  PromptContent,
  PromptDefinition,
  PromptDefinitionWithArgs,
  PromptRenderResult,
  ResourceContent,
  ServerDefinition,
  ToolContent,
} from '@mcp-platform/mcp-kit';
import { McpServer } from '@modelcontextprotocol/server';

const anonymousIdentity: IdentityContext = Object.freeze({ claims: Object.freeze({}) });

export interface RuntimeRequestContext {
  identity?: IdentityContext;
}

function executionContext(definition: ServerDefinition, request: RuntimeRequestContext): ExecutionContext {
  return {
    serverId: definition.manifest.id,
    identity: request.identity ?? anonymousIdentity,
  };
}

function annotations(value: ContentAnnotations | undefined) {
  if (!value) return {};
  return {
    annotations: {
      ...(value.audience ? { audience: [...value.audience] } : {}),
      ...(value.priority !== undefined ? { priority: value.priority } : {}),
      ...(value.lastModified ? { lastModified: value.lastModified } : {}),
    },
  };
}

function metadata(value: ContentMeta) {
  return {
    ...(value.meta ? { _meta: { ...value.meta } } : {}),
    ...annotations(value.annotations),
  };
}

function embeddedResource(resource: EmbeddedResourceContents) {
  return 'text' in resource
    ? {
        uri: resource.uri,
        text: resource.text,
        ...(resource.mimeType ? { mimeType: resource.mimeType } : {}),
        ...(resource.meta ? { _meta: { ...resource.meta } } : {}),
      }
    : {
        uri: resource.uri,
        blob: resource.blob,
        ...(resource.mimeType ? { mimeType: resource.mimeType } : {}),
        ...(resource.meta ? { _meta: { ...resource.meta } } : {}),
      };
}

function toolContent(content: ToolContent) {
  switch (content.type) {
    case 'text':
      return {
        type: 'text' as const,
        text: content.text,
        ...metadata(content),
      };
    case 'image':
      return {
        type: 'image' as const,
        data: content.data,
        mimeType: content.mimeType,
        ...metadata(content),
      };
    case 'audio':
      return {
        type: 'audio' as const,
        data: content.data,
        mimeType: content.mimeType,
        ...metadata(content),
      };
    case 'resource':
      return {
        type: 'resource' as const,
        resource: embeddedResource(content.resource),
        ...metadata(content),
      };
    case 'resource_link':
      return {
        type: 'resource_link' as const,
        uri: content.uri,
        name: content.name,
        ...(content.title ? { title: content.title } : {}),
        ...(content.description ? { description: content.description } : {}),
        ...(content.mimeType ? { mimeType: content.mimeType } : {}),
        ...(content.size !== undefined ? { size: content.size } : {}),
        ...(content.icons
          ? {
              icons: content.icons.map(icon => ({
                src: icon.src,
                ...(icon.mimeType ? { mimeType: icon.mimeType } : {}),
                ...(icon.sizes ? { sizes: [...icon.sizes] } : {}),
                ...(icon.theme ? { theme: icon.theme } : {}),
              })),
            }
          : {}),
        ...metadata(content),
      };
  }
}

function promptContent(content: PromptContent) {
  switch (content.type) {
    case 'text':
      return {
        type: 'text' as const,
        text: content.text,
        ...metadata(content),
      };
    case 'image':
      return {
        type: 'image' as const,
        data: content.data,
        mimeType: content.mimeType,
        ...metadata(content),
      };
    case 'audio':
      return {
        type: 'audio' as const,
        data: content.data,
        mimeType: content.mimeType,
        ...metadata(content),
      };
    case 'resource':
      return {
        type: 'resource' as const,
        resource: embeddedResource(content.resource),
        ...metadata(content),
      };
  }
}

function promptMessages(rendered: PromptRenderResult) {
  return 'messages' in rendered
    ? rendered.messages.map(message => ({
        role: message.role,
        content: promptContent(message.content),
      }))
    : [
        {
          role: 'user' as const,
          content: { type: 'text' as const, text: rendered.text },
        },
      ];
}

function resourceContent(content: ResourceContent, fallbackMimeType?: string) {
  return 'text' in content
    ? {
        uri: content.uri,
        text: content.text,
        ...(content.mimeType ?? fallbackMimeType ? { mimeType: content.mimeType ?? fallbackMimeType } : {}),
        ...(content.meta ? { _meta: { ...content.meta } } : {}),
      }
    : {
        uri: content.uri,
        blob: content.blob,
        ...(content.mimeType ?? fallbackMimeType ? { mimeType: content.mimeType ?? fallbackMimeType } : {}),
        ...(content.meta ? { _meta: { ...content.meta } } : {}),
      };
}

function promptHasArgs(prompt: PromptDefinition): prompt is PromptDefinitionWithArgs {
  return prompt.argsSchema !== undefined;
}

export function createSdkServer(
  definition: ServerDefinition,
  request: RuntimeRequestContext = {},
): McpServer {
  const server = new McpServer(
    {
      name: definition.manifest.id,
      title: definition.manifest.title,
      version: definition.manifest.version,
    },
    definition.instructions ? { instructions: definition.instructions } : undefined,
  );

  const context = executionContext(definition, request);

  for (const tool of definition.tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        ...(tool.outputSchema ? { outputSchema: tool.outputSchema } : {}),
        ...(tool.annotations ? { annotations: tool.annotations } : {}),
      },
      async input => {
        const result = await tool.run(input as Record<string, unknown>, context);
        let structuredContent: unknown = result.structuredContent;

        if (tool.outputSchema && structuredContent !== undefined) {
          const parsed = await tool.outputSchema.safeParseAsync(structuredContent);
          if (!parsed.success) {
            throw new Error(`Tool ${tool.name} returned structured content that does not match its output schema`);
          }
          structuredContent = parsed.data;
        }

        const content = [
          ...(result.text !== undefined ? [{ type: 'text' as const, text: result.text }] : []),
          ...(result.content ?? []).map(toolContent),
        ];

        return {
          content,
          ...(structuredContent !== undefined ? { structuredContent } : {}),
          ...(result.isError ? { isError: true } : {}),
        };
      },
    );
  }

  for (const resource of definition.resources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        ...(resource.description ? { description: resource.description } : {}),
        ...(resource.mimeType ? { mimeType: resource.mimeType } : {}),
      },
      async uri => {
        const result = await resource.read(context);
        const contents = 'contents' in result
          ? result.contents.map(content => resourceContent(content, resource.mimeType))
          : 'text' in result
            ? [
                resourceContent(
                  {
                    uri: uri.href,
                    text: result.text,
                    ...(result.mimeType ? { mimeType: result.mimeType } : {}),
                    ...(result.meta ? { meta: result.meta } : {}),
                  },
                  resource.mimeType,
                ),
              ]
            : [
                resourceContent(
                  {
                    uri: uri.href,
                    blob: result.blob,
                    ...(result.mimeType ? { mimeType: result.mimeType } : {}),
                    ...(result.meta ? { meta: result.meta } : {}),
                  },
                  resource.mimeType,
                ),
              ];

        return { contents };
      },
    );
  }

  for (const prompt of definition.prompts) {
    const config = {
      title: prompt.title,
      description: prompt.description,
    };

    if (promptHasArgs(prompt)) {
      server.registerPrompt(
        prompt.name,
        {
          ...config,
          argsSchema: prompt.argsSchema,
        },
        async args => ({
          messages: promptMessages(await prompt.render(args as Record<string, unknown>, context)),
        }),
      );
    } else {
      server.registerPrompt(
        prompt.name,
        config,
        async () => ({
          messages: promptMessages(await prompt.render(context)),
        }),
      );
    }
  }

  return server;
}
