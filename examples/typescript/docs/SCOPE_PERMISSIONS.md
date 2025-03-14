# SLOP Enhanced Scope Permission System

The SLOP (Simple Language Open Protocol) framework includes a powerful and flexible permission system based on scopes. This document explains how the enhanced scope system works, including wildcard support and permission hierarchies.

## Basic Concepts

- **Scopes** are strings that define permissions in a hierarchical format
- Format: `resource.identifier.permission`
- Provided in the `X-SLOP-SCOPE` header as a comma-separated list
- Example: `chat.read,tools.calculator.execute,memory.user_preferences.write`

## Resource Types

The SLOP pattern defines five core resource types:

1. **chat** - Messaging and conversation management
2. **tools** - External functionality and integrations
3. **memory** - Key-value storage
4. **resources** - Knowledge and data resources
5. **pay** - Payment processing

## Permission Types

Each resource supports specific permission types:

| Resource Type | Available Permissions |
|---------------|------------------------|
| chat          | read, write            |
| tools         | execute, read, list    |
| memory        | read, write            |
| resources     | read, list             |
| pay           | execute, read          |

## Wildcard Support

The enhanced scope system supports wildcards at different levels:

1. **Top-level wildcards**: `resource.*`
   - Grants all permissions for that resource type
   - Example: `chat.*` grants full access to all chat operations

2. **Resource-specific wildcards**: `resource.identifier.*`
   - Grants all permissions for a specific resource
   - Example: `chat.thread_123.*` grants full access to a specific thread

## Permission Hierarchies

The scope system supports permission inheritance:

1. **Global type permissions**
   - Example: `chat.read` grants read access to all chats
   - This means you don't need to specify `chat.123.read`, `chat.456.read`, etc.

2. **Resource-specific permissions**
   - Example: `tools.calculator.execute` grants execute permission only for the calculator tool

## Special Tools.Safe System

For tools, there's a special "safe" category:

1. **Safe tool designation**
   - Tools can be marked as "safe" to indicate they're low-risk
   - Access can be granted via: `tools.safe.*` or `tools.safe.toolname`

2. **Access paths for tools**
   - A tool can be accessed with any of these permissions:
     - `tools.*` (full access to all tools)
     - `tools.toolname.execute` (specific permission)
     - `tools.safe.*` (if the tool is marked as safe)
     - `tools.safe.toolname` (specific safe tool)

## Usage Examples

Here are some common patterns:

```bash
# Minimal scope for basic read-only access
chat.read,tools.safe.*,memory..read,resources.list.read

# Full access to everything
chat.*,tools.*,memory.*,resources.*,pay.*

# Access to specific resources
chat.thread_abc.read,tools.calculator.execute,memory.user_preferences.write
```

## Handling a Tool Named "Safe"

The enhanced scope system handles tools with potentially conflicting names:

- If a tool is named "safe", it's treated as any other tool ID
- `tools.safe.execute` grants permission to execute the "safe" tool
- `tools.safe.*` grants permission to all tools marked as safe (category)

The system distinguishes between these cases by context and hierarchy.

## Testing Scopes

You can run the scope tests to see examples of how different permissions work:

```bash
deno test lib/tests/ScopeManager.test.ts
```
