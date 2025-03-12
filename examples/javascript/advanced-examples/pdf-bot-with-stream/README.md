# 🚀 SLOP: Advanced Streaming AI Chat Platform
> A sophisticated, resource-aware AI chat interface with dynamic memory management and intelligent document handling

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT-brightgreen)
![Streaming](https://img.shields.io/badge/Streaming-SSE-orange)
![Memory](https://img.shields.io/badge/Memory-Dynamic-purple)

## 🛠️ Quick Installation

### Prerequisites
- Node.js >= 16.0.0
- NPM or Yarn
- OpenAI API key

### Installation Steps

1. **Clone and Install Dependencies**
```bash
# Clone the repository (or download)
git clone https://github.com/agnt-gg/slop
cd examples/javascript/pdf-bot-with-stream

# Install server dependencies
cd server
npm install

# Optional: If you need DOCX support
npm install mammoth

# Create environment file
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

2. **Start the Server**
```bash
npm start
# Server will start on http://localhost:3000
```

3. **Access the Client**
- Open your browser to `http://localhost:3000/client`
- Or serve the client folder separately using any static file server

### Dependencies Overview

#### Server Dependencies
```json
{
  "dependencies": {
    "crypto-js": "^4.2.0",
    "dotenv": "^16.4.7",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.86.2",
    "pdfreader": "^3.0.7"
  },
  "optionalDependencies": {
    "mammoth": "^1.9.0"
  }
}
```

#### Client Dependencies (CDN)
- Showdown (Markdown parsing)
- KaTeX (LaTeX rendering)
- League Spartan font

### Environment Variables
```env
OPENAI_API_KEY=your_api_key_here
PORT=3000 # Optional, defaults to 3000
```

### Docker Support (Optional)
```bash
# Build the image
docker build -t slop-pdf-bot .

# Run the container
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key_here slop-pdf-bot
```

---

## ✨ SLOP Bot Features

#### - Modern User Interface
#### - Real-time Streaming
#### - Rich Markdown Support
#### - LaTeX Math Integration
#### - Dynamic File Management
#### - Chat Interface
#### - Controls & Settings

### 🔧 Technical Features
- **Frontend Architecture**
  - Pure vanilla JavaScript
  - No framework dependencies
  - Server-Sent Events (SSE)
  - Async/await patterns
  - Error boundary handling
  - Memory management
  - Event delegation
  - Resource caching

### 🛡️ Reliability Features
- **Robust Error Handling**
  - Connection loss recovery
  - Retry mechanisms
  - Timeout handling
  - Graceful fallbacks
  - Clear error messages
  - Debug information
  - State recovery

### 📱 Responsive Design
- **Cross-Platform Support**
  - Mobile-first approach
  - Tablet optimization
  - Desktop enhancement
  - Touch-friendly controls
  - Flexible layouts
  - Dynamic sizing
  - Orientation support

---

## 🔧 Configuration

### Server Configuration
- Maximum file size: 50MB
- Cache size: 100 items
- Cache cleanup interval: 1 hour
- Supported file types: PDF, DOCX, TXT, MD, CSV, HTML, JS, Images

### Client Configuration
- Streaming toggle
- Resource selection
- Chat history management
- LaTeX rendering options

## 🌟 Key Endpoints

- `/chat` - Main chat endpoint
- `/chat/stream` - Streaming chat endpoint
- `/resources` - Resource management
- `/resources/upload` - File upload endpoint
- `/memory` - Conversation memory management
- `/tools` - Tool integration (extensible)
- `/pay` - Payment integration (placeholder)

## 💡 Usage Examples

### Upload and Query Documents
```javascript
// Upload a PDF
const formData = new FormData();
formData.append('files', pdfFile);
await fetch('/resources/upload', { method: 'POST', body: formData });

// Chat about the document
const response = await fetch('/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Summarize the PDF' }],
    resource_id: 'resource_123'
  })
});
```

### LaTeX Math Support
```markdown
Inline math: \(E = mc^2\)
Display math: \[\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}\]
```

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📜 License

MIT License - feel free to use this in your own projects!

## 🙏 Acknowledgments

- OpenAI for the GPT API
- KaTeX for LaTeX rendering
- Showdown for Markdown processing
- Express.js team
- PDF and DOCX processing libraries

---

## 🌐 API Endpoints

### Chat Endpoints

#### POST `/chat`
Regular chat endpoint for non-streaming responses.

```javascript
// Request
{
  "messages": [{ "role": "user", "content": "Analyze this document" }],
  "resource_id": "resource_123",  // Optional
  "use_tools": true,             // Optional
  "conversation_id": "conv_456"   // Optional
}

// Response
{
  "message": {
    "role": "assistant",
    "content": "Analysis response..."
  },
  "available_resources": ["resource_123", "resource_456"],
  "tools_available": true,
  "conversation_id": "conv_456",
  "message_count": 5
}
```

#### POST `/chat/stream`
Streaming chat endpoint using Server-Sent Events (SSE).

```javascript
// Request (same format as /chat)
{
  "messages": [{ "role": "user", "content": "Analyze this document" }],
  "resource_id": "resource_123",
  "use_tools": true,
  "conversation_id": "conv_456"
}

// SSE Response Events
data: {"event": "start"}
data: {"event": "content", "content": "Analysis"}
data: {"event": "content", "content": " in progress..."}
data: {"event": "end", "conversation_id": "conv_456", "message_count": 6}
```

### Resource Management

#### GET `/resources`
List all available resources.

```javascript
// Response
{
  "resources": [
    {
      "id": "resource_123",
      "title": "Annual Report.pdf",
      "fileType": "application/pdf",
      "fileSize": 1048576,
      "uploadedAt": "2024-03-15T12:00:00Z"
    }
  ]
}
```

#### GET `/resources/:id`
Get specific resource details.

```javascript
// Response
{
  "id": "resource_123",
  "title": "Annual Report.pdf",
  "content": "Document content...",
  "fileType": "application/pdf",
  "fileSize": 1048576,
  "uploadedAt": "2024-03-15T12:00:00Z"
}
```

#### POST `/resources/upload`
Upload multiple files (up to 5 files, 50MB each).

```javascript
// Multipart form data
files: [File1, File2, ...]

// Response
{
  "success": true,
  "resources": [
    {
      "id": "resource_789",
      "title": "New Document.pdf",
      "fileType": "application/pdf",
      "fileSize": 1048576,
      "uploadedAt": "2024-03-15T12:00:00Z"
    }
  ],
  "message": "2 file(s) uploaded and resources created successfully"
}
```

### Memory Management

#### POST `/memory`
Manage conversation memory.

```javascript
// Request - Clear memory
{
  "conversation_id": "conv_456",
  "operation": "clear"
}

// Request - Get memory
{
  "conversation_id": "conv_456",
  "operation": "get"
}

// Response
{
  "status": "cleared",
  "conversation_id": "conv_456"
}
```

#### GET `/debug/conversations/:id?`
Debug endpoint for conversation inspection.

```javascript
// Response (specific conversation)
{
  "conversation_id": "conv_456",
  "messages": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi there!" }
  ]
}

// Response (all conversations)
{
  "conversation_count": 2,
  "conversation_ids": ["conv_456", "conv_789"]
}
```

## 💡 Usage Examples

### Complete Chat Flow

```javascript
// 1. Upload documents
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('files', docxFile);

const uploadResponse = await fetch('/resources/upload', {
  method: 'POST',
  body: formData
});
const { resources } = await uploadResponse.json();

// 2. Regular chat about documents
const chatResponse = await fetch('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ 
      role: 'user', 
      content: 'Compare these documents and summarize key differences' 
    }],
    resource_id: resources[0].id
  })
});
const { message } = await chatResponse.json();
```

### Streaming Chat with Error Handling

```javascript
const streamChat = async (message) => {
  const response = await fetch('/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      use_tools: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const events = chunk.split('\n\n');
      
      for (const event of events) {
        if (!event.trim()) continue;
        const data = JSON.parse(event.replace('data: ', ''));
        
        switch (data.event) {
          case 'start':
            console.log('Stream started');
            break;
          case 'content':
            updateUI(data.content);
            break;
          case 'end':
            console.log('Stream ended');
            break;
          case 'error':
            handleError(data.error);
            break;
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
  }
};
```

### Resource Management

```javascript
// List all resources
const resources = await fetch('/resources').then(r => r.json());

// Get specific resource
const resource = await fetch('/resources/resource_123').then(r => r.json());

// Clear conversation memory
await fetch('/memory', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversation_id: 'conv_456',
    operation: 'clear'
  })
});
```

### Advanced File Upload with Progress

```javascript
const uploadWithProgress = async (files) => {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('files', file);
  });

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = (event) => {
    const percent = (event.loaded / event.total) * 100;
    updateProgressBar(percent);
  };

  return new Promise((resolve, reject) => {
    xhr.onload = () => resolve(JSON.parse(xhr.response));
    xhr.onerror = () => reject(xhr.statusText);
    xhr.open('POST', '/resources/upload');
    xhr.send(formData);
  });
};
```

## 🔧 Configuration Options

```javascript
// Server configuration
const config = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB
  MAX_FILES: 5,
  CACHE_SIZE: 100,
  CACHE_CLEANUP_INTERVAL: 60 * 60 * 1000,  // 1 hour
  SUPPORTED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'text/javascript',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
};
```

## 🔍 Debugging

```javascript
// Get all conversations
const debug = await fetch('/debug/conversations').then(r => r.json());

// Inspect specific conversation
const conv = await fetch('/debug/conversations/conv_456').then(r => r.json());
```

## 🚨 Error Handling

The API uses standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 413: Payload Too Large
- 500: Server Error

Error responses include detailed messages:
```javascript
{
  "error": "File size exceeds maximum limit of 50MB",
  "code": "FILE_TOO_LARGE"
}
```
Built with 🔥 passion and ☕ coffee by SLOPPY developers who love clean code