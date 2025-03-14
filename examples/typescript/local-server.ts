#!/usr/bin/env -S deno run -allow-net

/**
 * @module SLOP-TS STANDALONE SERVER
 * @description A standalone Typescript server implementation of the SLOP pattern
 * @author {SLOP-TS} P. Hughes <https://github.com/phughesmcr>
 * @author {SLOP} agnt-gg <https://github.com/agnt-gg>
 * @see https://github.com/agnt-gg/slop
 * @version 0.0.1
 * @license MIT
 * @requires Deno
 *
 * For the SLOP specification, see `./slop.ts`
 *
 * @arg --hostname "<string>" The hostname to listen on (default: localhost)
 * @arg --port <number> The port to listen on (default: 31337)
 * @arg --timeout <number> The timeout in seconds (default: 0)
 */

import { SlopManager } from "./lib/SlopManager.ts";
import type { Resource, Tool } from "./slop.ts";

const exampleTools: Record<string, Tool> = {
  calculator: {
    id: "calculator",
    description: "Performs mathematical calculations",
    example: "Calculate 2 + 2",
    parameters: {
      expression: {
        type: "string",
        description: "The mathematical expression to evaluate (e.g., '2 + 2', '5 * 10')",
      },
    },
    execute: (params: Record<string, unknown>) => {
      // Type check the expression parameter
      const expression = params["expression"];
      if (typeof expression !== "string") {
        throw new Error("Expression must be a string");
      }
      // Safely evaluate the expression (in a real implementation, this would use a safer evaluation method)
      try {
        const result = Function('"use strict";return (' + expression + ")")();
        return { result };
      } catch {
        return { error: "Invalid expression" };
      }
    },
  },
  weather: {
    id: "weather",
    description: "Gets simulated weather information",
    example: "What's the weather in New York?",
    parameters: {
      location: {
        type: "string",
        description: "The location to get weather for (e.g., 'New York', 'London')",
      },
    },
    execute: (params: Record<string, unknown>) => {
      const location = params["location"];
      if (typeof location !== "string") {
        throw new Error("Location must be a string");
      }
      const conditions = ["sunny", "cloudy", "rainy", "snowy"];
      const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
      const randomTemp = Math.floor(Math.random() * 30) + 5; // 5 to 35 degrees

      return {
        result: {
          location,
          condition: randomCondition,
          temperature: randomTemp,
          units: "celsius",
        },
      };
    },
  },
};

const exampleResources: Record<string, Resource> = {
  "mars-101": {
    id: "mars-101",
    type: "article",
    content:
      "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System.",
  },
  "solar-system": {
    id: "solar-system",
    type: "article",
    content:
      "The Solar System consists of the Sun and the objects that orbit it, either directly or indirectly.",
  },
};

/**
 * Parse command line arguments with proper type handling
 * @param name The name of the argument (without --)
 * @param defaultValue The default value to use if the argument is not provided
 * @param args The array of command line arguments
 * @returns The parsed value with the same type as defaultValue (string or number)
 */
function parseArg(
  name: string,
  defaultValue: string,
  args: string[],
): string;
function parseArg(
  name: string,
  defaultValue: number,
  args: string[],
): number;
function parseArg(
  name: string,
  defaultValue: string | number,
  args: string[],
): string | number {
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && index < args.length - 1) {
    const argValue = args[index + 1];
    if (typeof defaultValue === "number") {
      const parsedValue = parseInt(argValue ?? "", 10);
      return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
    } else {
      return argValue ?? defaultValue;
    }
  }
  return defaultValue;
}

/**
 * Create and start the SLOP server
 * @returns A server instance and a shutdown function
 */
export function createServer(hostname: string, port: number): {
  server: ReturnType<typeof Deno.serve>;
  shutdown: () => Promise<void>;
} {
  // Create and configure the SLOP server
  const slopManager = new SlopManager();

  // Register example tools
  for (const tool of Object.values(exampleTools)) {
    slopManager.tools.registerTool(tool as Tool);
  }

  // Register example resources
  for (const resource of Object.values(exampleResources)) {
    slopManager.resources.registerResource(resource as Resource, {
      source: "system",
      last_updated: new Date().toISOString(),
    });
  }

  // Use the integrated handler from SlopServer which automatically detects
  // HTTP requests, SSE streams, and WebSocket connections
  const controller = new AbortController();
  const signal = controller.signal;

  // Start the server
  const server = Deno.serve({ hostname, port, signal }, (req) => slopManager.handler(req));

  console.log(`Listening on http://${hostname}:${port}/`);

  return {
    server,
    shutdown: () => {
      controller.abort();
      return server.finished;
    },
  };
}

// If the file is run directly, start the server
if (import.meta.main) {
  try {
    // Parse command line arguments
    const args = Deno.args;
    const hostname = parseArg("hostname", "localhost", args);
    const port = parseArg("port", 31337, args);
    const timeout = parseArg("timeout", 0, args);

    // Create and start the server
    const { server, shutdown } = createServer(hostname, port);
    console.log(`✨ SLOP server running on http://${hostname}:${port}\n`);
    console.log(`Available endpoints:`);
    // chat endpoints
    console.log(`- POST /chat - Send messages to AI`);
    console.log(`- POST /chat/stream - Stream responses (SSE)`);
    console.log(`- POST /chat/ws - Stream responses (WebSocket)`);
    console.log(`- GET /chat/:id - Get a specific chat`);
    console.log(`- GET /chat/thread_:id - Get all messages in a thread`);
    console.log(`- GET /chat - List recent chats`);
    console.log(`- GET /chat?type=threads - List all threads`);
    // tools endpoints
    console.log(`- GET /tools - List available tools`);
    console.log(`- GET /tools/:tool_id - Get tool details`);
    console.log(`- POST /tools/:tool_id - Use a specific tool`);
    // memory endpoints
    console.log(`- POST /memory - Store a key-value pair`);
    console.log(`- GET /memory/:key - Get value by key`);
    console.log(`- GET /memory - List all keys`);
    console.log(`- PUT /memory/:key - Update existing value`);
    console.log(`- DELETE /memory/:key - Delete a key-value pair`);
    console.log(`- POST /memory/query - Search with semantic query`);
    // resources endpoints
    console.log(`- GET /resources - List available resources`);
    console.log(`- GET /resources/:id - Get a specific resource`);
    console.log(`- GET /resources/search?q=query - Search resources`);
    // pay endpoints
    console.log(`- POST /pay - Create a payment`);
    console.log(`- GET /pay/:id - Get payment status`);

    // Set up signal handlers for graceful shutdown
    const handleSignal = async () => {
      console.log("Shutting down server...");
      await shutdown();
      console.log(`✨ SLOP server closed on http://${hostname}:${port}`);
      Deno.exit(0);
    };

    // Handle SIGINT (Ctrl+C) and SIGBREAK (Ctrl+Break)
    Deno.addSignalListener("SIGINT", handleSignal);
    Deno.addSignalListener("SIGBREAK", handleSignal);

    // If timeout is specified, shut down after the timeout
    if (timeout > 0) {
      console.log(`Server will automatically shut down after ${timeout} seconds`);
      setTimeout(async () => {
        console.log(`Timeout of ${timeout} seconds reached, shutting down...`);
        await shutdown();
        console.log(`✨ SLOP server closed on http://${hostname}:${port}`);
        Deno.exit(0);
      }, timeout * 1000);
    }

    // Wait for the server to finish (will only happen if shutdown is called)
    await server.finished;
  } catch (error) {
    console.error("Server runtime error:", error);
    Deno.exit(1);
  }
}
