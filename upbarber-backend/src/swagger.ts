import { OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

const registry = new OpenAPIRegistry();

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  const paths: Record<string, unknown> = {};
  const resources = [
    "auth",
    "barbershop",
    "users",
    "barbers",
    "clients",
    "services",
    "service-packages",
    "appointments",
    "subscription-plans",
    "subscriptions",
    "subscription-payments",
    "products",
    "stock",
    "orders",
    "financial",
    "reports",
    "whatsapp",
    "notifications",
    "saas/plans"
  ];

  for (const resource of resources) {
    paths[`/api/v1/${resource}`] = {
      get: {
        tags: [resource],
        summary: `Lista/consulta ${resource}`,
        responses: { "200": { description: "OK" } }
      },
      post: {
        tags: [resource],
        summary: `Cria ${resource}`,
        responses: { "201": { description: "Created" } }
      }
    };
    paths[`/api/v1/${resource}/{id}`] = {
      get: { tags: [resource], summary: `Detalha ${resource}`, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      put: { tags: [resource], summary: `Atualiza ${resource}`, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" } } },
      delete: { tags: [resource], summary: `Remove/inativa ${resource}`, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "204": { description: "No Content" } } }
    };
  }

  return {
    ...generator.generateDocument({
      openapi: "3.0.0",
      info: { title: "UpBarber SaaS API", version: "1.0.0" },
      servers: [{ url: "/api/v1" }],
      security: [{ bearerAuth: [] }]
    } as any),
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    },
    paths
  };
}
