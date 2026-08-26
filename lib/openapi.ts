import { createOpenAPI } from 'fumadocs-openapi/server';

// openapi.json is produced by the platform itself, not written by hand:
//   backend $ go run ./cmd/openapi-dump -o <here>/openapi.json
// That command walks the live chi router, so the reference below can never
// drift from the routes the API actually serves.
export const openapi = createOpenAPI({
  input: ['./openapi.docs.json'],
});
