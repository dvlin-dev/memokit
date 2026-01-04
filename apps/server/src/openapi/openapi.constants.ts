/**
 * OpenAPI and Scalar configuration constants
 */

export const SCALAR_CONFIG = {
  REFERENCE_PATH: '/api-reference',
  OPENAPI_JSON_PATH: '/openapi.json',
  THEME: 'default',
  DEFAULT_HTTP_CLIENT: { targetKey: 'node', clientKey: 'fetch' },
  HIDDEN_CLIENTS: { c: true, clojure: true, objc: true, ocaml: true, r: true },
} as const;

export const AUTH_CONFIG = {
  preferredSecurityScheme: 'apiKey',
  securitySchemes: {
    apiKey: { name: 'X-API-Key', in: 'header' as const, value: '' },
  },
} as const;
