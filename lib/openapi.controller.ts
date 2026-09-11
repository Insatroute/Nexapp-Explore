import { createOpenAPI } from 'fumadocs-openapi/server';

// controller-openapi.docs.json is produced from the controller itself:
//   npm run controller:spec      drf-yasg walks the live URLConf -> controller-swagger.json
//   npm run controller:convert   Swagger 2.0 -> OpenAPI 3.0
// Kept separate from the SDWAN Lite spec so one product's schema can be
// refreshed without touching the other's.
export const openapiController = createOpenAPI({
  input: ['./controller-openapi.docs.json'],
});
