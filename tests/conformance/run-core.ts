import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { startMcpHost } from '@mcp-platform/host';
import { conformanceFixtureServer } from './fixture.js';

const packageJson = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
) as { devDependencies?: Record<string, string> };
const CONFORMANCE_VERSION = packageJson.devDependencies?.['@modelcontextprotocol/conformance'];
const SPEC_VERSION = '2026-07-28';

if (!CONFORMANCE_VERSION) {
  throw new Error('@modelcontextprotocol/conformance must be pinned in root devDependencies');
}

const scenarios = [
  'tools-list',
  'tools-call-simple-text',
  'tools-call-image',
  'tools-call-audio',
  'tools-call-embedded-resource',
  'tools-call-mixed-content',
  'tools-call-error',
  'resources-list',
  'resources-read-text',
  'resources-read-binary',
  'sep-2164-resource-not-found',
  'prompts-list',
  'prompts-get-simple',
  'prompts-get-with-args',
  'prompts-get-embedded-resource',
  'prompts-get-with-image',
  'server-sse-multiple-streams',
  'dns-rebinding-protection',
  'caching',
  'http-header-validation',
] as const;

function runScenario(url: string, scenario: string, outputDir: string): Promise<number> {
  const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const args = [
    'exec',
    'conformance',
    'server',
    '--url',
    url,
    '--scenario',
    scenario,
    '--spec-version',
    SPEC_VERSION,
    '--output-dir',
    outputDir,
    '--verbose',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: 'inherit',
      env: process.env,
    });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
}

const outputRoot = path.resolve('conformance-results/core');
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const running = await startMcpHost({
  servers: [conformanceFixtureServer],
  bindHost: '127.0.0.1',
  port: 0,
});

const endpoint = `${running.baseUrl}/mcp/conformance`;
const failures: string[] = [];

try {
  console.log(`MCP conformance core gate: ${CONFORMANCE_VERSION} / ${SPEC_VERSION}`);
  console.log(`Fixture endpoint: ${endpoint}`);

  for (const scenario of scenarios) {
    console.log(`\n=== conformance core: ${scenario} ===`);
    const code = await runScenario(endpoint, scenario, path.join(outputRoot, scenario));
    if (code !== 0) {
      failures.push(scenario);
    }
  }
} finally {
  await running.close();
}

if (failures.length) {
  console.error(`\nConformance core failures (${failures.length}): ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`\nConformance core gate passed (${scenarios.length}/${scenarios.length} scenarios).`);
}
