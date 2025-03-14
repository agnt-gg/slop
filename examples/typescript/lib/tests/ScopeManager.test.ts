/**
 * @module tests/scope-manager.test.ts
 * @description Tests for the enhanced ScopeManager implementation
 * @author {SLOP-TS} P. Hughes <https://github.com/phughesmcr>
 * @license MIT
 */

import { assertEquals } from "jsr:@std/assert";
import { ScopeManager } from "../Scope.ts";
import { ScopePattern } from "../../slop.ts";

Deno.test("ScopeManager - Direct matching", () => {
  const scopeManager = new ScopeManager();
  const scopes = "chat.read,tools.calculator.execute";

  // Direct matches should work
  assertEquals(
    scopeManager.checkPermission("chat.read" as ScopePattern, scopes),
    true,
    "Direct scope match for chat.read should be true",
  );

  assertEquals(
    scopeManager.checkPermission(
      "tools.calculator.execute" as ScopePattern,
      scopes,
    ),
    true,
    "Direct scope match for tools.calculator.execute should be true",
  );

  // Non-matches should fail
  assertEquals(
    scopeManager.checkPermission("chat.write" as ScopePattern, scopes),
    false,
    "Non-matching scope chat.write should be false",
  );
});

Deno.test("ScopeManager - Wildcard permissions", () => {
  const scopeManager = new ScopeManager();
  const scopes = "chat.*,tools.safe.*";

  // Top-level wildcards should grant all permissions under that resource
  assertEquals(
    scopeManager.checkPermission("chat.read" as ScopePattern, scopes),
    true,
    "chat.* should grant chat.read",
  );

  assertEquals(
    scopeManager.checkPermission("chat.write" as ScopePattern, scopes),
    true,
    "chat.* should grant chat.write",
  );

  assertEquals(
    scopeManager.checkPermission("chat.abc123.read" as ScopePattern, scopes),
    true,
    "chat.* should grant chat.abc123.read",
  );

  // Safe tools should NOT be accessible with tools.safe.* directly in validateScope
  // Note: This is explicitly false here because tools.safe.* doesn't automatically grant
  // tools.calculator.execute - the SlopServer class needs to check if calculator is in
  // the safeTools list first
  assertEquals(
    scopeManager.checkPermission(
      "tools.calculator.execute" as ScopePattern,
      scopes,
    ),
    false,
    "tools.safe.* should not directly grant tools.calculator.execute in validateScope",
  );
});

Deno.test("ScopeManager - Hierarchical permissions", () => {
  const scopeManager = new ScopeManager();
  const scopes = "tools.calculator.*,chat.abc123.*";

  // Resource-specific wildcards should grant all permissions for that resource
  assertEquals(
    scopeManager.checkPermission(
      "tools.calculator.execute" as ScopePattern,
      scopes,
    ),
    true,
    "tools.calculator.* should grant tools.calculator.execute",
  );

  assertEquals(
    scopeManager.checkPermission("tools.calculator.read" as ScopePattern, scopes),
    true,
    "tools.calculator.* should grant tools.calculator.read",
  );

  assertEquals(
    scopeManager.checkPermission("chat.abc123.read" as ScopePattern, scopes),
    true,
    "chat.abc123.* should grant chat.abc123.read",
  );

  // But not for other resources
  assertEquals(
    scopeManager.checkPermission("tools.weather.execute" as ScopePattern, scopes),
    false,
    "tools.calculator.* should not grant tools.weather.execute",
  );
});

Deno.test("ScopeManager - Global permission hierarchies", () => {
  const scopeManager = new ScopeManager();
  const scopes = "chat.read,memory.write";

  // Global permissions should apply to specific resources
  assertEquals(
    scopeManager.checkPermission("chat.abc123.read" as ScopePattern, scopes),
    true,
    "chat.read should grant chat.abc123.read",
  );

  assertEquals(
    scopeManager.checkPermission(
      "memory.user_settings.write" as ScopePattern,
      scopes,
    ),
    true,
    "memory.write should grant memory.user_settings.write",
  );

  // But not for different permissions
  assertEquals(
    scopeManager.checkPermission("chat.abc123.write" as ScopePattern, scopes),
    false,
    "chat.read should not grant chat.abc123.write",
  );
});

Deno.test("ScopeManager - Tool-specific safety checks", () => {
  const scopeManager = new ScopeManager();

  // Test tool scope checking
  // Note: Using tools.specific.execute only, not tools.safe.*
  // since we want to test tool-specific permissions
  const safeScope = "tools.specific.execute";

  // We're not using tools.safe.* in our scope, so this should be false
  assertEquals(
    scopeManager.checkToolScope(safeScope, "calculator"),
    false,
    "No permission for calculator without tools.safe.* or tools.calculator.execute",
  );

  assertEquals(
    scopeManager.checkToolScope(safeScope, "specific"),
    true,
    "tools.specific.execute should grant access to the specific tool",
  );

  // In scope-manager.ts, the checkToolScope method doesn't know which tools are actually safe
  // It just checks permissions syntactically, so this will return true if we have tools.safe.*
  // The SlopServer class handles the additional check of whether a tool is in the safeTools list
  assertEquals(
    scopeManager.checkToolScope(safeScope, "dangerous"),
    false,
    "Neither scope should grant access to dangerous tool",
  );
});
