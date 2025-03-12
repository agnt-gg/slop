import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { PdfReader } from 'pdfreader';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(express.json());

// Simple file content cache
const fileContentCache = {};

// Add these near the top where other cache declarations are
const fileHashCache = new Map(); // Cache for file hashes
const pdfTextCache = new Map();  // Cache for extracted PDF text
const MAX_CACHE_SIZE = 100;      // Maximum number of items to keep in cache

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Accept more file types
    const allowedTypes = [
      'application/pdf', 
      'text/plain', 
      'text/markdown',
      'text/csv',
      'text/html',
      'text/javascript',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/octet-stream',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

// Helper to compute file hash for caching
function computeFileHash(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

// Helper to trim text to a word limit
function trimToWordLimit(text, wordLimit) {
  const words = text.split(/\s+/);
  if (words.length <= wordLimit) return text;
  return words.slice(0, wordLimit).join(' ') + '... [Content truncated due to length]';
}

// Add this function to manage cache size
function trimCache(cache) {
  if (cache.size > MAX_CACHE_SIZE) {
    const keysIterator = cache.keys();
    const deleteCount = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < deleteCount; i++) {
      cache.delete(keysIterator.next().value);
    }
  }
}

// Update the extractTextFromFile function
async function extractTextFromFile(file) {
  const { originalname, path: filePath, mimetype, size } = file;
  const fileBuffer = fs.readFileSync(filePath);
  
  // Generate hash once and cache it
  let fileHash = fileHashCache.get(filePath);
  if (!fileHash) {
    fileHash = computeFileHash(fileBuffer);
    fileHashCache.set(filePath, fileHash);
    trimCache(fileHashCache);
  }
  
  // Check PDF cache first
  if (pdfTextCache.has(fileHash)) {
    console.log(`Using cached PDF content for ${originalname}`);
    return pdfTextCache.get(fileHash);
  }
  
  let extractedText = '';
  
  try {
    if (mimetype.startsWith('image/')) {
      extractedText = `[This is an image file: ${originalname}]`;
    } else {
      switch (mimetype) {
        case 'application/pdf':
          try {
            // First check if we have it in cache
            if (pdfTextCache.has(fileHash)) {
              extractedText = pdfTextCache.get(fileHash);
              console.log(`PDF cache hit for ${originalname}`);
            } else {
              console.log(`PDF cache miss for ${originalname}, extracting text...`);
              extractedText = await getRawTextFromPDFBuffer(fileBuffer);
              
              // Cache the extracted text with size limit (e.g., 1MB)
              if (extractedText.length < 1024 * 1024) {
                pdfTextCache.set(fileHash, extractedText);
                trimCache(pdfTextCache);
                console.log(`Cached PDF content for ${originalname}`);
              }
            }
          } catch (pdfError) {
            console.error(`Error extracting text from PDF ${originalname}:`, pdfError);
            extractedText = `[Error extracting text from PDF: ${originalname}]`;
          }
          break;
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          try {
            extractedText = await getRawTextFromDocxBuffer(fileBuffer);
          } catch (docxError) {
            console.error(`Error extracting text from DOCX ${originalname}:`, docxError);
            extractedText = `[Error extracting text from DOCX: ${originalname}]`;
          }
          break;
          
        case 'text/plain':
        case 'text/csv':
        case 'text/html':
        case 'text/javascript':
        case 'text/markdown':
        case 'application/octet-stream':
          extractedText = fileBuffer.toString('utf-8');
          break;
          
        default:
          extractedText = `[Unsupported file type: ${mimetype}]`;
      }
    }
    
    return extractedText;
    
  } catch (error) {
    console.error(`Error extracting text from ${originalname}:`, error);
    return `[Error extracting text from file: ${originalname}]`;
  } finally {
    // Clean up the file from disk after processing
    try {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temporary file: ${filePath}`);
    } catch (cleanupError) {
      console.error(`Error cleaning up file ${filePath}:`, cleanupError);
    }
  }
}

// Add these utility functions right after the imports and before the app setup
async function getRawTextFromPDFBuffer(pdfBuffer) {
  try {
    return new Promise((resolve, reject) => {
      let textContent = '';
      new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
        if (err) {
          reject(err);
        } else if (item && item.text) {
          textContent += item.text + ' ';
        } else if (!item) {
          // End of PDF file
          resolve(textContent);
        }
      });
    });
  } catch (error) {
    console.error('Error reading PDF file:', error);
    throw error;
  }
}

async function getRawTextFromDocxBuffer(docxBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  } catch (error) {
    console.error('Error reading docx file:', error);
    throw error;
  }
}

// Add this function near the top with other utility functions
async function shouldIncludeResource(message, resourceId) {
  if (!resourceId || !resources[resourceId]) return false;
  
  const resourceCheckPrompt = `Given the user's message: "${message}"
and the fact that they have selected a document titled "${resources[resourceId].title}",
determine if the message is likely asking about or referring to the document's content.
Reply with just "true" or "false".

Example "true" cases:
- "What does the document say about X?"
- "Summarize this"
- "Can you explain the part about X?"
- "What's mentioned in the file?"

Example "false" cases:
- "How are you?"
- "What's the weather like?"
- "Tell me a joke"
- General questions not related to documents`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // You might want to use a smaller/faster model here
      messages: [
        { role: "system", content: "You are a classifier that responds with only 'true' or 'false'." },
        { role: "user", content: resourceCheckPrompt }
      ],
      temperature: 0.1, // Low temperature for more consistent results
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content.toLowerCase().trim();
    return response === 'true';
  } catch (error) {
    console.error('Error in resource check:', error);
    return true; // Default to including resource if check fails
  }
}

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Read slop.txt for resource_1
let slopContent = "This is an example resource doc for SLOP. The SLOP spec defines 5 endpoints: /chat, /tools, /memory, /resources, and /pay.";
try {
  const slopPath = path.join(process.cwd(), 'slop.txt');
  if (fs.existsSync(slopPath)) {
    slopContent = fs.readFileSync(slopPath, 'utf8');
    console.log('Successfully loaded slop.txt content for resource_1');
  } else {
    console.log('slop.txt not found, using default content for resource_1');
  }
} catch (error) {
  console.error('Error reading slop.txt:', error);
}

// Simple in-memory "resources" store
const resources = {
  "resource_1": {
    id: "resource_1",
    title: "Simple SLOP Reference",
    content: slopContent
  }
};

// Simple in-memory conversation store
const conversations = {};
let lastConversationId = null; // Track the most recent conversation

// GET /resources - Return all available resources
app.get('/resources', (req, res) => {
  res.json({ resources: Object.values(resources) });
});

// GET /resources/:id - Return a specific resource
app.get('/resources/:id', (req, res) => {
  const resource = resources[req.params.id];
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.json(resource);
});

// POST /resources/upload - Enhanced file upload with multiple file support
app.post('/resources/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedResources = [];
    
    // Process each uploaded file
    for (const file of req.files) {
      console.log(`\n\n==== PROCESSING UPLOADED FILE ====`);
      console.log(`File name: ${file.originalname}`);
      console.log(`File type: ${file.mimetype}`);
      console.log(`File size: ${(file.size / 1024).toFixed(2)} KB`);
      
      // Generate a unique resource ID
      const resourceId = `resource_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Extract content from the file
      console.log(`Extracting content from file...`);
      const content = await extractTextFromFile(file);
      console.log(`Extracted content length: ${content.length} characters`);
      console.log(`Content preview: ${content.substring(0, 300)}...`);
      
      // Trim content if it's too long
      const trimmedContent = trimToWordLimit(content, 8000); // Limiting to 8000 words
      console.log(`Trimmed content length: ${trimmedContent.length} characters`);
      
      // Create a new resource
      resources[resourceId] = {
        id: resourceId,
        title: file.originalname,
        content: trimmedContent,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      };
      
      console.log(`Created new resource: ${resourceId} from file: ${file.originalname}`);
      console.log(`==== END PROCESSING UPLOADED FILE ====\n\n`);
      
      uploadedResources.push(resources[resourceId]);
    }
    
    res.json({ 
      success: true, 
      resources: uploadedResources,
      message: `${uploadedResources.length} file(s) uploaded and resources created successfully` 
    });
    
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /chat - Enhanced main endpoint with access to resources, tools and memory
app.post('/chat', async (req, res) => {
  try {
    const { messages, resource_id, use_tools, conversation_id } = req.body;
    
    // Use provided ID, or last conversation ID, or create new one
    const conversationId = conversation_id || lastConversationId || `conv_${Date.now()}`;
    lastConversationId = conversationId; // Update the last used conversation
    
    if (!conversations[conversationId]) {
      conversations[conversationId] = [];
      console.log(`Created new conversation: ${conversationId}`);
    } else {
      console.log(`Using existing conversation: ${conversationId} with ${conversations[conversationId].length} messages`);
    }
    
    // Get existing conversation history
    const conversationHistory = conversations[conversationId];
    
    // Add the new user message to history (only if it's not already there)
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'user') {
        // Check if this message is already in the history to avoid duplicates
        const isDuplicate = conversationHistory.some(
          msg => msg.role === 'user' && msg.content === latestMessage.content
        );
        
        if (!isDuplicate) {
          conversationHistory.push(latestMessage);
          console.log(`Added user message to history: ${latestMessage.content}`);
        }
      }
    }

    // Build context with resources - Modified section
    let resourceContext = '';
    let includeResource = false;
    
    if (resource_id && messages && messages.length > 0) {
      // Check if we should include the resource
      includeResource = await shouldIncludeResource(
        messages[messages.length - 1].content,
        resource_id
      );
      
      if (includeResource) {
        resourceContext = `Resource: ${resources[resource_id].title}\n${resources[resource_id].content}\n\n`;
        console.log(`\n\n==== RESOURCE CONTENT BEING SENT TO AI ====`);
        console.log(`Resource ID: ${resource_id}`);
        console.log(`Resource Title: ${resources[resource_id].title}`);
        console.log(`Content Length: ${resources[resource_id].content.length} characters`);
        console.log(`First 500 chars: ${resources[resource_id].content.substring(0, 500)}...`);
        console.log(`==== END RESOURCE CONTENT PREVIEW ====\n\n`);
      } else {
        console.log(`Skipping resource content as query doesn't seem to need it`);
        resourceContext = "Note: You have access to documents but this query doesn't seem to need them.\n";
      }
    } else {
      resourceContext = "Available resources:\n";
      Object.values(resources).forEach(resource => {
        resourceContext += `- ${resource.title} (ID: ${resource.id})\n`;
      });
    }

    // Build system prompt with resources and tool availability
    const systemPrompt = `You are a helpful assistant${includeResource ? ' with access to the following resource:' : ''}.
${resourceContext}
${use_tools ? "You can use tools to help answer the query if needed." : ""}
Answer user queries thoughtfully based on this information.
IMPORTANT: When users ask about things they've previously mentioned in this conversation, 
use that information to provide personalized responses.`;

    console.log(`\n\n==== SYSTEM PROMPT BEING SENT TO AI ====`);
    console.log(systemPrompt.substring(0, 1000) + (systemPrompt.length > 1000 ? '...' : ''));
    console.log(`==== END SYSTEM PROMPT PREVIEW (${systemPrompt.length} characters total) ====\n\n`);

    console.log(`\n\nFull conversation history (${conversationHistory.length} messages):\n\n`, 
      JSON.stringify(conversationHistory));

    // Send to OpenAI with full conversation history
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log(`AI response: ${aiResponse}`);
    
    // Format the response for consistency (remove excess whitespace/newlines)
    const formattedResponse = aiResponse.trim();
    
    // Add AI response to conversation history
    conversationHistory.push({ role: "assistant", content: formattedResponse });
    
    // Return AI response with additional context
    res.json({ 
      message: { role: "assistant", content: formattedResponse },
      available_resources: Object.keys(resources),
      tools_available: use_tools,
      conversation_id: conversationId,
      message_count: conversationHistory.length
    });
  } catch (err) {
    console.error("Error in chat endpoint:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /chat/stream - Streaming version of the chat endpoint
app.post('/chat/stream', async (req, res) => {
  try {
    const { messages, resource_id, use_tools, conversation_id } = req.body;
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // Important for Nginx
    res.setHeader('Transfer-Encoding', 'chunked');
    
    // Disable response buffering
    res.flushHeaders();
    
    // Use provided ID, or last conversation ID, or create new one
    const conversationId = conversation_id || lastConversationId || `conv_${Date.now()}`;
    lastConversationId = conversationId; // Update the last used conversation
    
    if (!conversations[conversationId]) {
      conversations[conversationId] = [];
      console.log(`Created new conversation: ${conversationId}`);
    } else {
      console.log(`Using existing conversation: ${conversationId} with ${conversations[conversationId].length} messages`);
    }
    
    // Get existing conversation history
    const conversationHistory = conversations[conversationId];
    
    // Add the new user message to history (only if it's not already there)
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage.role === 'user') {
        // Check if this message is already in the history to avoid duplicates
        const isDuplicate = conversationHistory.some(
          msg => msg.role === 'user' && msg.content === latestMessage.content
        );
        
        if (!isDuplicate) {
          conversationHistory.push(latestMessage);
          console.log(`Added user message to history: ${latestMessage.content}`);
        }
      }
    }

    // Build context with resources - Modified section
    let resourceContext = '';
    let includeResource = false;
    
    if (resource_id && messages && messages.length > 0) {
      // Check if we should include the resource
      includeResource = await shouldIncludeResource(
        messages[messages.length - 1].content,
        resource_id
      );
      
      if (includeResource) {
        resourceContext = `Resource: ${resources[resource_id].title}\n${resources[resource_id].content}\n\n`;
        console.log(`\n\n==== RESOURCE CONTENT BEING SENT TO AI (STREAM) ====`);
        console.log(`Resource ID: ${resource_id}`);
        console.log(`Resource Title: ${resources[resource_id].title}`);
        console.log(`Content Length: ${resources[resource_id].content.length} characters`);
        console.log(`First 500 chars: ${resources[resource_id].content.substring(0, 500)}...`);
        console.log(`==== END RESOURCE CONTENT PREVIEW ====\n\n`);
      } else {
        console.log(`Skipping resource content as query doesn't seem to need it`);
        resourceContext = "Note: You have access to documents but this query doesn't seem to need them.\n";
      }
    } else {
      resourceContext = "Available resources:\n";
      Object.values(resources).forEach(resource => {
        resourceContext += `- ${resource.title} (ID: ${resource.id})\n`;
      });
    }

    // Build system prompt with resources and tool availability
    const systemPrompt = `You are a helpful assistant${includeResource ? ' with access to the following resource:' : ''}.
${resourceContext}
${use_tools ? "You can use tools to help answer the query if needed." : ""}
Answer user queries thoughtfully based on this information.
IMPORTANT: When users ask about things they've previously mentioned in this conversation, 
use that information to provide personalized responses.`;

    console.log(`\n\n==== SYSTEM PROMPT BEING SENT TO AI (STREAM) ====`);
    console.log(systemPrompt.substring(0, 1000) + (systemPrompt.length > 1000 ? '...' : ''));
    console.log(`==== END SYSTEM PROMPT PREVIEW (${systemPrompt.length} characters total) ====\n\n`);

    console.log(`\n\nFull conversation history (${conversationHistory.length} messages):\n\n`, 
      JSON.stringify(conversationHistory));

    // Send a message to inform the client we're starting
    res.write(`data: ${JSON.stringify({ event: 'start' })}\n\n`);

    // Create a full response string to store the complete response
    let fullResponse = '';

    try {
      // Stream the response from OpenAI
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory
        ],
        temperature: 0.7,
        stream: true,
        max_tokens: 4000
      });

      // Process each chunk as it arrives
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // Send each content chunk to the client
          res.write(`data: ${JSON.stringify({ event: 'content', content })}\n\n`);
        }
      }

      // Add the complete response to conversation history
      conversationHistory.push({ role: "assistant", content: fullResponse });
      
    } catch (streamError) {
      console.error("Error streaming from OpenAI:", streamError);
      res.write(`data: ${JSON.stringify({ event: 'error', error: streamError.message })}\n\n`);
    }
    
    // Send a message to inform the client we're done
    res.write(`data: ${JSON.stringify({ 
      event: 'end',
      conversation_id: conversationId,
      message_count: conversationHistory.length
    })}\n\n`);
    
    // End the response
    res.end();
    
  } catch (err) {
    console.error("Error in streaming chat endpoint:", err);
    // Send error to client if we can
    try {
      res.write(`data: ${JSON.stringify({ event: 'error', error: err.message })}\n\n`);
      res.end();
    } catch (e) {
      console.error("Could not send error to client:", e);
    }
  }
});

// Create a separate endpoint to receive stream parameters via GET
app.get('/chat/stream', (req, res) => {
  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Important for Nginx
  
  // Send a message to inform the client that a POST request is needed
  res.write(`data: ${JSON.stringify({ 
    event: 'error', 
    error: 'Please use POST /chat/stream with your message and parameters in the body'
  })}\n\n`);
  
  res.end();
});

// Add a debug endpoint to check conversations
app.get('/debug/conversations/:id?', (req, res) => {
  const { id } = req.params;
  
  if (id) {
    // Return specific conversation
    if (conversations[id]) {
      res.json({ conversation_id: id, messages: conversations[id] });
    } else {
      res.status(404).json({ error: "Conversation not found" });
    }
  } else {
    // Return list of all conversation IDs
    res.json({ 
      conversation_count: Object.keys(conversations).length,
      conversation_ids: Object.keys(conversations)
    });
  }
});

// Update memory endpoint to actually do something
app.post('/memory', (req, res) => {
  const { conversation_id, operation } = req.body;
  
  if (operation === 'clear' && conversation_id && conversations[conversation_id]) {
    // Clear specific conversation
    conversations[conversation_id] = [];
    res.json({ status: "cleared", conversation_id });
  } 
  else if (operation === 'get' && conversation_id && conversations[conversation_id]) {
    // Retrieve specific conversation
    res.json({ 
      status: "retrieved", 
      conversation_id,
      messages: conversations[conversation_id]
    });
  }
  else {
    res.json({ status: "no operation performed" });
  }
});

// Minimal endpoints for SLOP compliance:

// POST /tools (dummy)
app.post('/tools', (req, res) => {
  res.json({ result: "Tool used (dummy response)." });
});

// POST /pay (dummy)
app.post('/pay', (req, res) => {
  res.json({ transaction_id: `tx_${Date.now()}`, status: "success" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Simple SLOP chatbot running on port ${PORT}`);
  console.log(`Open your browser to http://localhost:${PORT}/client to access the SLOP client`);
});

// Serve the client
app.get('/client', (req, res) => {
  res.sendFile(process.cwd() + '/../SLOP-CLIENT/index.html');
});

// Add a cleanup function for the caches
function clearOldCaches() {
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(() => {
    fileHashCache.clear();
    pdfTextCache.clear();
    console.log('Cleared PDF and file hash caches');
  }, ONE_HOUR);
}

// Call this after your app is initialized
clearOldCaches();
