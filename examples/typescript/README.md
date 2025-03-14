# SLOP-TS (WIP)

An implementation of the [SLOP](https://github.com/agnt-gg/slop) pattern.

- `slop.ts` is pure TS and can be used in any Typescript project (Node, Deno, Bun, etc.)
- `lib/SlopManager.ts` exposes a `SlopManager` class which can be used to build your own SLOP tools.
- `local-client.ts` is an example client. This requires Deno.
- `local-server.ts` is an example server. This requires Deno.

## Quick Start

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh
# or `brew install deno`, or `npm install -g deno`

# Clone the repo
git clone https://github.com/agnt-gg/slop
cd slop/examples/typescript

# Start the server
deno task start:server

# Start the client (for example purposes)
deno task start:client

# Hostname and port can be supplied too:
deno task start:server --hostname "127.0.0.1" --port 31337
deno task start:client --hostname "localhost" --port 1234
```

## Developing

```typescript
import type * as SLOP from "./slop.ts";
import { SlopManager } from "./lib/SlopManager.ts";

// or:
// Run `deno add jsr:@phughesmcr/slop`
// import type * as SLOP from "@phughesmcr/slop";
// import { SlopManager } from "@phughesmcr/slop/server";

const slopManager = new SlopManager();

/**
 * Under the hood SlopManager handles:
 * - HTTP requests
 * - SSE streams
 * - WebSocket connection
 */
Deno.serve((req) => slopManager.handler(req));

// You can manipulate the server directly too, e.g.:
slopManager.memory.clear();
```

## Dependencies

| Files | Dependencies |
| --- | --- |
| `slop.ts` &amp; `SlopManager`| None |
| Local examples | Deno |
| Tests | [Deno's standard library](https://jsr.io/@std/) |

## Learn More

Check out the [main SLOP repository](https://github.com/agnt-gg/slop) for:

- Full specification
- Other language examples
- Core concepts
- Best practices

Remember: SLOP is just a pattern.
