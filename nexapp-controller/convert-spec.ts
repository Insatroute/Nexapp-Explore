/**
 * Swagger 2.0 -> OpenAPI 3.0.
 *
 * drf-yasg emits Swagger 2.0 and only Swagger 2.0. fumadocs-openapi reads OpenAPI
 * 3.x and only 3.x, so without this step the API reference cannot be generated at
 * all. Converting here — rather than switching the backend to drf-spectacular —
 * keeps the controller repo untouched and adds no runtime dependency to it.
 *
 * The conversion is deliberately narrow: it moves the structures fumadocs
 * actually reads (paths, operations, parameters, request bodies, responses,
 * definitions, security) and leaves everything else alone. Anything it does not
 * understand is passed through rather than dropped, so a spec feature this does
 * not handle shows up as an odd-looking page, never as a silently missing route.
 *
 * Run: npm run convert
 */
import { readFile, writeFile, access } from 'node:fs/promises';

const IN = './controller-swagger.json';
const OUT = './controller-openapi.json';

type Any = Record<string, any>;

const exists = (p: string) => access(p).then(() => true, () => false);

if (!(await exists(IN))) {
  console.error(
    `${IN} is missing. Dump it from the controller first:\n` +
      `    npm run spec\n` +
      `or, inside the running container:\n` +
      `    docker compose exec web python /code/scripts/dump-schema.py -o /code/swagger.json`,
  );
  process.exit(1);
}

const s = JSON.parse(await readFile(IN, 'utf8')) as Any;

if (s.openapi?.startsWith('3')) {
  await writeFile(OUT, JSON.stringify(s, null, 2));
  console.log('input is already OpenAPI 3 — copied through unchanged');
  process.exit(0);
}

/** `#/definitions/X` -> `#/components/schemas/X`, everywhere it appears. */
function reref(node: any): any {
  if (Array.isArray(node)) return node.map(reref);
  if (node && typeof node === 'object') {
    const out: Any = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = k === '$ref' && typeof v === 'string'
        ? v.replace('#/definitions/', '#/components/schemas/')
        : reref(v);
    }
    return out;
  }
  return node;
}

const BODYLESS = new Set(['get', 'head', 'delete', 'options', 'trace']);
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const out: Any = {
  openapi: '3.0.3',
  info: s.info ?? { title: 'API', version: '1.0.0' },
  servers: [{ url: (s.basePath as string) || '/' }],
  paths: {},
  components: { schemas: reref(s.definitions ?? {}) },
};
if (s.tags) out.tags = s.tags;

// Swagger 2 security definitions -> OpenAPI 3 security schemes.
if (s.securityDefinitions) {
  const schemes: Any = {};
  for (const [name, def] of Object.entries(s.securityDefinitions as Any)) {
    const d = def as Any;
    if (d.type === 'basic') schemes[name] = { type: 'http', scheme: 'basic' };
    else if (d.type === 'apiKey') schemes[name] = { type: 'apiKey', in: d.in, name: d.name };
    else schemes[name] = d;
  }
  out.components.securitySchemes = schemes;
  if (s.security) out.security = s.security;
}

let ops = 0;
for (const [route, item] of Object.entries((s.paths ?? {}) as Any)) {
  const src = item as Any;
  const dst: Any = {};

  // Path-level parameters apply to every operation under the path.
  if (Array.isArray(src.parameters)) {
    dst.parameters = src.parameters.filter((p: Any) => p.in !== 'body').map(convertParam);
  }

  for (const method of METHODS) {
    const op = src[method] as Any | undefined;
    if (!op) continue;
    ops++;

    const params = (op.parameters ?? []) as Any[];
    const body = params.find((p) => p.in === 'body');
    const form = params.filter((p) => p.in === 'formData');

    const o: Any = { ...op };
    delete o.parameters;
    delete o.consumes;
    delete o.produces;

    const rest = params.filter((p) => p.in !== 'body' && p.in !== 'formData');
    if (rest.length) o.parameters = rest.map(convertParam);

    // A body on GET/DELETE is not expressible in OpenAPI 3 and is almost always a
    // spec bug; drop it rather than emit an invalid document.
    if (body && !BODYLESS.has(method)) {
      const types = (op.consumes as string[]) ?? (s.consumes as string[]) ?? ['application/json'];
      o.requestBody = {
        required: body.required ?? false,
        ...(body.description ? { description: body.description } : {}),
        content: Object.fromEntries(types.map((t) => [t, { schema: reref(body.schema ?? {}) }])),
      };
    } else if (form.length && !BODYLESS.has(method)) {
      const props: Any = {};
      const required: string[] = [];
      for (const f of form) {
        const { name, required: req, in: _in, ...rest2 } = f;
        props[name] = reref(rest2);
        if (req) required.push(name);
      }
      const ct = (op.consumes as string[])?.[0] ?? 'multipart/form-data';
      o.requestBody = {
        content: { [ct]: { schema: { type: 'object', properties: props, ...(required.length ? { required } : {}) } } },
      };
    }

    // Swagger 2 responses carry `schema`; OpenAPI 3 wraps it in `content`.
    const produces = (op.produces as string[]) ?? (s.produces as string[]) ?? ['application/json'];
    const responses: Any = {};
    for (const [code, r] of Object.entries((op.responses ?? {}) as Any)) {
      const rr = r as Any;
      const nr: Any = { description: rr.description ?? '' };
      if (rr.schema) {
        nr.content = Object.fromEntries(produces.map((t) => [t, { schema: reref(rr.schema) }]));
      }
      if (rr.headers) nr.headers = reref(rr.headers);
      responses[code] = nr;
    }
    o.responses = Object.keys(responses).length ? responses : { 200: { description: 'OK' } };

    dst[method] = reref(o);
  }
  out.paths[route] = dst;
}

function convertParam(p: Any): Any {
  const { name, in: loc, description, required, ...rest } = p;
  const schema: Any = {};
  for (const k of ['type', 'format', 'items', 'enum', 'default', 'minimum', 'maximum', 'pattern']) {
    if (k in rest) schema[k] = rest[k];
  }
  return {
    name,
    in: loc === 'path' ? 'path' : loc,
    ...(description ? { description } : {}),
    ...(loc === 'path' ? { required: true } : required ? { required: true } : {}),
    schema: reref(Object.keys(schema).length ? schema : { type: 'string' }),
  };
}

await writeFile(OUT, JSON.stringify(out, null, 2));
console.log(
  `converted Swagger ${s.swagger} -> OpenAPI 3.0.3: ` +
    `${Object.keys(out.paths).length} paths, ${ops} operations, ` +
    `${Object.keys(out.components.schemas).length} schemas -> ${OUT}`,
);
