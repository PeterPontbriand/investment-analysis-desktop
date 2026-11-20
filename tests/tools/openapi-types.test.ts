import { describe, expect, it } from 'vitest';
import {
  withRequestDefaultsOptional,
  type Description,
} from '../../tools/openapi-types.ts';

// D261: a default on an optional property of a request body schema is removed
// in the tool's copy, so the property is generated as optional; anything a
// response also reaches is left to openapi-typescript, or refused.
const body = (name: string) => ({
  requestBody: {
    content: {
      'application/json': { schema: { $ref: `#/components/schemas/${name}` } },
    },
  },
});
const response = (name: string) => ({
  responses: {
    '200': {
      content: {
        'application/json': {
          schema: { $ref: `#/components/schemas/${name}` },
        },
      },
    },
  },
});

describe('withRequestDefaultsOptional', () => {
  it('removes the default of a non-required property and keeps a required one', () => {
    const description: Description = {
      paths: { '/a': { post: body('Request') } },
      components: {
        schemas: {
          Request: {
            type: 'object',
            required: ['kept'],
            properties: {
              kept: { type: 'integer', default: 1 },
              dropped: { type: 'integer', default: 2 },
              plain: { type: 'string' },
            },
          },
        },
      },
    };
    const result = withRequestDefaultsOptional(description);
    expect(result.components?.schemas?.Request).toEqual({
      type: 'object',
      required: ['kept'],
      properties: {
        kept: { type: 'integer', default: 1 },
        dropped: { type: 'integer' },
        plain: { type: 'string' },
      },
    });
    // The input is not changed.
    expect(JSON.stringify(description)).toContain('"default":2');
  });

  it('rewrites a schema reached through a reference, and objects written inside one', () => {
    const result = withRequestDefaultsOptional({
      paths: { '/a': { post: body('Outer') } },
      components: {
        schemas: {
          Outer: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: '#/components/schemas/Inner' },
              },
              inline: {
                type: 'object',
                properties: { flag: { type: 'boolean', default: false } },
              },
            },
          },
          Inner: {
            type: 'object',
            properties: { count: { type: 'integer', default: 3 } },
          },
        },
      },
    });
    const schemas = result.components?.schemas ?? {};
    expect(JSON.stringify(schemas.Inner)).not.toContain('default');
    expect(JSON.stringify(schemas.Outer)).not.toContain('default');
  });

  it('leaves a schema that only a response reaches unchanged', () => {
    const description: Description = {
      paths: { '/a': { get: response('Document') } },
      components: {
        schemas: {
          Document: {
            type: 'object',
            properties: { version: { type: 'integer', default: 1 } },
          },
        },
      },
    };
    expect(withRequestDefaultsOptional(description)).toEqual(description);
  });

  it('fails, naming the schema, when a request body and a response share it and it has such a default', () => {
    const description: Description = {
      paths: { '/a': { post: { ...body('Shared'), ...response('Shared') } } },
      components: {
        schemas: {
          Shared: {
            type: 'object',
            properties: { value: { type: 'integer', default: 1 } },
          },
        },
      },
    };
    expect(() => withRequestDefaultsOptional(description)).toThrow(
      /The schema Shared .*request-only rule cannot apply/,
    );
  });

  it('accepts a shared schema that has no such default', () => {
    const description: Description = {
      paths: { '/a': { post: { ...body('Shared'), ...response('Shared') } } },
      components: {
        schemas: {
          Shared: {
            type: 'object',
            properties: { value: { type: 'integer' } },
          },
        },
      },
    };
    expect(withRequestDefaultsOptional(description)).toEqual(description);
  });
});
