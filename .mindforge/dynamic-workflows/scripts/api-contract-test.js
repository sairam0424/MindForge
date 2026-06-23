export const meta = {
  name: 'api-contract-test',
  description: 'Writer/Reviewer pattern: spec reader vs implementation reader → contract violation report',
  whenToUse: 'When validating that an API implementation matches its OpenAPI/GraphQL/Protobuf spec',
  phases: [
    { title: 'ReadSpec', detail: 'Parse the API specification (OpenAPI/GraphQL/Protobuf/docs)' },
    { title: 'ReadImpl', detail: 'Read the actual implementation in a fresh context' },
    { title: 'Diff', detail: 'Cross-reference spec contracts vs implementation' },
    { title: 'Report', detail: 'Violation report with severity and fix instructions' },
  ],
};

export default async function run({ agent, parallel, pipeline, phase, log, args, budget }) {
  const SPEC_SCHEMA = {
    type: 'object',
    properties: {
      apiName: { type: 'string' },
      endpoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            path: { type: 'string' },
            requestSchema: { type: 'string' },
            responseSchema: { type: 'string' },
            authRequired: { type: 'boolean' },
            errorCodes: { type: 'array', items: { type: 'string' } },
          },
          required: ['method', 'path', 'responseSchema'],
        },
      },
    },
    required: ['apiName', 'endpoints'],
  };

  const IMPL_SCHEMA = {
    type: 'object',
    properties: {
      implementedEndpoints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            method: { type: 'string' },
            path: { type: 'string' },
            actualRequestHandling: { type: 'string' },
            actualResponseShape: { type: 'string' },
            authImplemented: { type: 'boolean' },
          },
          required: ['method', 'path', 'actualResponseShape'],
        },
      },
    },
    required: ['implementedEndpoints'],
  };

  const VIOLATION_SCHEMA = {
    type: 'object',
    properties: {
      violations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            endpoint: { type: 'string' },
            severity: { type: 'string', enum: ['breaking', 'non-breaking', 'warning'] },
            type: { type: 'string' },
            specSays: { type: 'string' },
            implDoes: { type: 'string' },
            fix: { type: 'string' },
          },
          required: ['endpoint', 'severity', 'type', 'specSays', 'implDoes', 'fix'],
        },
      },
      summary: { type: 'string' },
      breakingCount: { type: 'number' },
      compatible: { type: 'boolean' },
    },
    required: ['violations', 'summary', 'breakingCount', 'compatible'],
  };

  const target = args || 'current API (provide spec file path and implementation path as args)';

  phase('ReadSpec');
  log(`Reading API spec from: ${target}`);
  const spec = await agent(
    `Read and extract the complete API contract from the spec file(s) in: "${target}". Look for OpenAPI/Swagger YAML, GraphQL schema files, Protobuf files, or API documentation. Extract every endpoint with its method, path, request/response schema, auth requirements, and error codes.`,
    { schema: SPEC_SCHEMA, label: 'read-spec' }
  );
  if (!spec) { log('Warning: agent returned null for spec, skipping'); return { target, error: 'agent-null' }; }
  log(`Spec: ${spec.apiName} — ${spec.endpoints.length} endpoints`);

  phase('ReadImpl');
  const impl = await agent(
    `Read the actual API IMPLEMENTATION in: "${target}". Look for route handlers, controllers, resolvers, or gRPC handlers. For each endpoint extract the actual request handling logic, response shape being returned, and whether auth is checked. Do NOT read the spec — only the implementation code.`,
    { schema: IMPL_SCHEMA, label: 'read-impl' }
  );
  if (!impl) { log('Warning: agent returned null for impl, skipping'); return { target, error: 'agent-null' }; }
  log(`Implementation: ${impl.implementedEndpoints.length} endpoints found`);

  phase('Diff');
  const specText = spec.endpoints.map(e => `${e.method} ${e.path}: response=${e.responseSchema}, auth=${e.authRequired}, errors=${(e.errorCodes || []).join(',')}`).join('\n');
  const implText = impl.implementedEndpoints.map(e => `${e.method} ${e.path}: response=${e.actualResponseShape}, auth=${e.authImplemented}`).join('\n');

  phase('Report');
  const report = await agent(
    `Compare the API specification against the implementation and identify contract violations.\n\nSPEC:\n${specText}\n\nIMPLEMENTATION:\n${implText}\n\nFor each violation: classify as breaking (response shape/auth differs) or non-breaking (extra fields, missing optional), state what the spec says vs what the impl does, and provide the exact fix.`,
    { schema: VIOLATION_SCHEMA, label: 'violations' }
  );
  if (!report) { return { target, spec, impl, error: 'report-agent-null' }; }

  return { target, spec, impl, report };
}
