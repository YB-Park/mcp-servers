import type { ExecutionContext, IdentityContext, ServerDefinition } from '@mcp-platform/mcp-kit';
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
        let structuredContent = result.structuredContent;

        if (tool.outputSchema && structuredContent) {
          const parsed = await tool.outputSchema.safeParseAsync(structuredContent);
          if (!parsed.success) {
            throw new Error(`Tool ${tool.name} returned structured content that does not match its output schema`);
          }
          structuredContent = parsed.data;
        }

        return {
          content: [{ type: 'text' as const, text: result.text }],
          ...(structuredContent ? { structuredContent } : {}),
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
        return {
          contents: [
            {
              uri: uri.href,
              text: result.text,
              ...(result.mimeType ?? resource.mimeType ? { mimeType: result.mimeType ?? resource.mimeType } : {}),
            },
          ],
        };
      },
    );
  }

  for (const prompt of definition.prompts) {
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title,
        description: prompt.description,
        argsSchema: prompt.argsSchema,
      },
      async args => {
        const rendered = await prompt.render(args as Record<string, unknown>, context);
        return {
          messages: [
            {
              role: 'user' as const,
              content: { type: 'text' as const, text: rendered.text },
            },
          ],
        };
      },
    );
  }

  return server;
}
