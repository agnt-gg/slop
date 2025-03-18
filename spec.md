# RFC Specification for Simple Language Open Protocol (SLOP)
Version: 1.0.0
Status: Draft
Date: 2025-03-08

## Abstract

This document specifies the Simple Language Open Protocol (SLOP), a minimal HTTP-based protocol for AI agent interoperability. There are exactly six core endpoints with standard request/response formats. Nothing more. The spec is intentionally minimal to maximize adoption and implementation speed while ensuring interoperability.

## 1. Introduction

### 1.1 Purpose

SLOP establishes a common "handshake" pattern for AI systems. We define only what's necessary for interoperability. Everything else is left to the implementer.

### 1.2 Design Philosophy

Three principles:

1. **Simplicity Over Complexity**: HTTP requests. JSON responses. That's it.
2. **Concrete Over Abstract**: Examples with actual code, not just theory.
3. **Zero-Cost When Unused**: Implement only what you need. No overhead.

## 2. Terminology

"MUST", "SHOULD", and other key terms follow [RFC2119](https://www.ietf.org/rfc/rfc2119.txt).

- **Agent**: System that processes requests and generates responses.
- **Endpoint**: URL path for interaction.
- **Thread**: Sequence of related messages.
- **Tool**: Function that an agent provides.
- **Resource**: Data or knowledge available to agents.

## 3. Conformance Requirements

You are SLOP-compliant if you:

1. Implement ANY ONE of the six core endpoints
2. Follow the general JSON formats as shown in examples
3. Return error responses as specified
4. Use standard HTTP status codes correctly
5. Provide an `/info` endpoint that describes your implemented endpoints

That's it. No hidden requirements. Just broad recommendations.

### 3.1 Endpoint Implementation Table

| Endpoint | Required? | Core Function |
|----------|-----------|--------------|
| `/chat`  | Optional  | Text-based message exchange |
| `/tools` | Optional  | Function discovery and execution |
| `/memory` | Optional | Key-value data persistence |
| `/resources` | Optional | Content and file management |
| `/pay` | Optional | Payment processing |
| `/info` | Optional | API self-documentation |

### 3.2 Implementation Notes

- Each endpoint is completely optional - implement only what your service needs
- The `/info` endpoint is valuable for discovery but not required
- When implementing a subset of endpoints, including the `/info` endpoint helps clients understand your service's capabilities
- A SLOP-compliant server can be as minimal as implementing just one endpoint correctly

Remember that SLOP's design principle is "Zero-Cost When Unused" - there's no penalty for only implementing what you need.

## 4. Core Endpoints

SLOP has exactly six endpoints. Implementation must match example request/response formats precisely for the endpoints you choose to implement.

### 4.1 Chat Endpoint

#### 4.1.1 POST /chat

```
REQUEST:
POST /chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "Hello world"}
  ],
  "thread_id": "thread_12345"  // Optional
}

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": {
    "role": "assistant",
    "content": "Hello! How can I help you today?"
  },
  "thread_id": "thread_12345"
}
```

#### 4.1.2 GET /chat/:id

```
REQUEST:
GET /chat/chat_123
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "chat_123",
  "messages": [
    {"role": "user", "content": "Hello world"},
    {"role": "assistant", "content": "Hello! How can I help you today?"}
  ],
  "created_at": "2023-05-15T10:30:00Z"
}
```

#### 4.1.3 GET /chat/thread_:id

```
REQUEST:
GET /chat/thread_12345
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "thread_id": "thread_12345",
  "messages": [
    {
      "id": "msg_001",
      "role": "user", 
      "content": "Hello world",
      "created_at": "2023-05-15T10:30:00Z"
    },
    {
      "id": "msg_002",
      "role": "assistant", 
      "content": "Hello! How can I help you today?",
      "created_at": "2023-05-15T10:30:05Z"
    }
  ],
  "created_at": "2023-05-15T10:30:00Z"
}
```

### 4.2 Tools Endpoint

#### 4.2.1 GET /tools

```
REQUEST:
GET /tools
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "tools": [
    {
      "id": "calculator",
      "description": "Performs mathematical calculations",
      "parameters": {
        "expression": {
          "type": "string",
          "description": "Mathematical expression to evaluate"
        }
      }
    }
  ]
}
```

#### 4.2.2 POST /tools/:tool_id

```
REQUEST:
POST /tools/calculator
Content-Type: application/json

{
  "expression": "2 + 2"
}

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": 4
}
```

### 4.3 Memory Endpoint

#### 4.3.1 POST /memory

```
REQUEST:
POST /memory
Content-Type: application/json

{
  "key": "user_preference",
  "value": {
    "theme": "dark"
  }
}

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "stored"
}
```

#### 4.3.2 GET /memory/:key

```
REQUEST:
GET /memory/user_preference
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "key": "user_preference",
  "value": {
    "theme": "dark"
  },
  "created_at": "2023-05-15T10:30:00Z"
}
```

#### 4.3.3 PUT /memory/:key

```
REQUEST:
PUT /memory/user_preference
Content-Type: application/json

{
  "value": {
    "theme": "light"
  }
}

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "updated",
  "previous_value": {
    "theme": "dark"
  }
}
```

#### 4.3.4 DELETE /memory/:key

```
REQUEST:
DELETE /memory/user_preference

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "deleted"
}
```

### 4.4 Resources Endpoint

#### 4.4.1 GET /resources

```
REQUEST:
GET /resources
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "resources": [
    {
      "id": "weather-api",
      "title": "Weather API Documentation",
      "type": "document"
    }
  ]
}
```

#### 4.4.2 GET /resources/:id

```
REQUEST:
GET /resources/weather-api
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "weather-api",
  "title": "Weather API Documentation",
  "content": "The Weather API provides current weather data...",
  "type": "document",
  "created_at": "2023-05-15T10:30:00Z"
}
```

### 4.5 Pay Endpoint

#### 4.5.1 POST /pay

```
REQUEST:
POST /pay
Content-Type: application/json

{
  "amount": 5.00,
  "currency": "USD",
  "description": "API usage"
}

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "transaction_id": "tx_987654",
  "status": "success",
  "created_at": "2023-05-15T10:30:00Z"
}
```

#### 4.5.2 GET /pay/:id

```
REQUEST:
GET /pay/tx_987654
Accept: application/json

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "transaction_id": "tx_987654",
  "amount": 5.00,
  "currency": "USD",
  "description": "API usage",
  "status": "success",
  "created_at": "2023-05-15T10:30:00Z"
}
```

### 4.6 Info Endpoint

#### 4.6.1 GET /info

```
REQUEST:
GET /info

RESPONSE:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "name": "Example SLOP Server",
  "version": "1.0.0",
  "description": "A SLOP-compliant AI assistant API",
  "endpoints": [
    {
      "path": "/chat",
      "methods": ["GET", "POST"],
      "description": "Chat with the AI assistant"
    },
    {
      "path": "/tools",
      "methods": ["GET"],
      "description": "List available tools"
    }
  ],
  "creator": {
    "name": "SLOP Community",
    "website": "https://slop.ai",
    "email": "hello@slop.ai"
  },
  "links": {
    "documentation": "https://slop.ai/docs",
    "github": "https://github.com/agnt-gg/slop"
  },
  "capabilities": {
    "streaming": true,
    "websockets": true,
    "models": ["default-model"]
  }
}
```

## 5. Error Handling

All errors MUST use standard HTTP status codes with consistent JSON responses.

```
EXAMPLE ERROR RESPONSE:
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "invalid_request",
    "message": "Missing required field: messages",
    "status": 400
  }
}
```

Status codes:
- `400`: Bad request - client error
- `401`: Authentication required
- `403`: Permission denied
- `404`: Not found
- `429`: Rate limit exceeded
- `500`: Server error

## 6. Connection Types

### 6.1 HTTP/REST

Standard request/response for most operations.

### 6.2 SSE for Streaming

Append `/stream` to endpoints for Server-Sent Events streaming:

```
REQUEST:
GET /chat/stream
Accept: text/event-stream

RESPONSE:
HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"content": "Hello"}
data: {"content": " world"}
data: [DONE]
```

### 6.3 WebSockets

Append `/ws` to endpoints for WebSocket connections:

```
ws://example.com/chat/ws
```

## 7. Authentication and Security

### 7.1 Bearer Token Authentication

```
Authorization: Bearer <token>
```

### 7.2 Scope Control

```
X-SLOP-Scope: chat.read,tools.execute
```

Common scopes:
- `chat.read`: Read chat messages
- `chat.write`: Send chat messages
- `tools.*`: Access all tools
- `memory.user.*`: Full user memory access

### 7.3 Security Requirements

- HTTPS always
- Input validation against schemas
- Output sanitization
- Rate limiting

## 8. Minimal Reference Implementations

### 8.1 Node.js Example (50 lines)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Memory storage
const memory = new Map();

// CHAT endpoint
app.post('/chat', (req, res) => {
  const message = req.body.messages?.[0]?.content || '';
  res.json({
    message: {
      role: 'assistant',
      content: `You said: ${message}`
    },
    thread_id: req.body.thread_id
  });
});

// TOOLS endpoint
app.get('/tools', (_, res) => res.json({
  tools: [{id: 'echo', description: 'Echoes input'}]
}));
app.post('/tools/:id', (req, res) => {
  if (req.params.id === 'echo') {
    return res.json({result: req.body.text});
  }
  res.status(404).json({error: {code: 'not_found'}});
});

// MEMORY endpoint
app.post('/memory', (req, res) => {
  memory.set(req.body.key, req.body.value);
  res.json({status: 'stored'});
});
app.get('/memory/:key', (req, res) => {
  res.json({value: memory.get(req.params.key)});
});

app.listen(3000);
```

### 8.2 Python Example (50 lines)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)
memory = {}

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('messages', [{}])[0].get('content', '')
    return jsonify({
        'message': {
            'role': 'assistant',
            'content': f'You said: {message}'
        },
        'thread_id': data.get('thread_id')
    })

@app.route('/tools', methods=['GET'])
def list_tools():
    return jsonify({'tools': [{'id': 'echo', 'description': 'Echoes input'}]})

@app.route('/tools/<tool_id>', methods=['POST'])
def use_tool(tool_id):
    if tool_id == 'echo':
        return jsonify({'result': request.json.get('text', '')})
    return jsonify({'error': {'code': 'not_found'}}), 404

@app.route('/memory', methods=['POST'])
def store_memory():
    data = request.json
    memory[data['key']] = data['value']
    return jsonify({'status': 'stored'})

@app.route('/memory/<key>', methods=['GET'])
def get_memory(key):
    return jsonify({'value': memory.get(key)})

if __name__ == '__main__':
    app.run(port=3000)
```

## 9. Integration Patterns

### 9.1 Sequential

Agent A → Agent B → Agent C, with each output feeding into the next input.

### 9.2 Parallel

Multiple agents process the same input simultaneously with results combined later.

### 9.3 Branching

A router agent directs requests to specialized agents based on content analysis.

## 10. References

- [RFC2119: Key Words](https://www.ietf.org/rfc/rfc2119.txt)
- [RFC9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC8259: JSON Format](https://www.rfc-editor.org/rfc/rfc8259.html)
- [Server-Sent Events Standard](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [RFC6455: WebSockets](https://www.rfc-editor.org/rfc/rfc6455.html)

## 11. Acknowledgments

SLOP is MIT-licensed and maintained by the community. Contributions welcome at [GitHub](https://github.com/agnt-gg/slop).
