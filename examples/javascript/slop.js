// JavaScript implementation of the SLOP pattern
import express from 'express';
import axios from 'axios';
import cors from 'cors';

// Available tools and resources
const tools = {
  calculator: {
    id: 'calculator',
    description: 'Basic math. Takes an expression as input in format {"expression": "<expression>"}',
    parameters: {
      expression: {
        type: 'string',
        description: 'Mathematical expression to evaluate'
      }
    },
    execute: params => ({ result: eval(params.expression) })
  },
  greet: {
    id: 'greet',
    description: 'Says hello. Takes a name as input in format {"name": "<name>"}',
    parameters: {
      name: {
        type: 'string',
        description: 'Name to greet'
      }
    },
    execute: params => ({ result: `Hello, ${params.name}!` })
  }
};

const resources = {
  hello: { id: 'hello', content: 'Hello, SLOP!' }
};

// Setup server
const app = express();

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      /^http:\/\/localhost(:[0-9]+)?$/,
      /^https:\/\/localhost(:[0-9]+)?$/,
      /^http:\/\/127\.0\.0\.1(:[0-9]+)?$/,
      /^https:\/\/127\.0\.0\.1(:[0-9]+)?$/
    ];
    const allowed = allowedOrigins.some(pattern => pattern.test(origin));
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// In-memory storage
const memory = new Map();

// In-memory chat storage
const chats = new Map();

// In-memory payment storage
const payments = new Map();

// CHAT
// - `POST /chat` - Send messages to AI
// - `POST /chat` - Create or continue a thread (with thread_id)
// - `GET /chat/:id` - Get a specific chat
// - `GET /chat` - List recent chats
app.post('/chat', (req, res) => {
  const chatId = 'chat_' + Date.now();
  const message = req.body.messages?.[0]?.content || 'nothing';
  const chatData = {
    id: chatId,
    messages: [
      { role: 'user', content: message },
      { role: 'assistant', content: `You said: ${message}` }
    ],
    created_at: new Date().toISOString()
  };
  chats.set(chatId, chatData);
  res.json({
    id: chatId,
    message: {
      role: 'assistant',
      content: `You said: ${message}`
    }
  });
});
app.post('/chat/:id', (req, res) => {
  const chatId = req.params.id;
  const message = req.body.messages?.[0]?.content || 'nothing';
  const chatData = chats.get(chatId) || {
    id: chatId,
    messages: [],
    created_at: new Date().toISOString()
  };
  chatData.messages.push(
    { role: 'user', content: message },
    { role: 'assistant', content: `You said: ${message}` }
  );
  chats.set(chatId, chatData);
  res.json({
    message: {
      role: 'assistant',
      content: `You said: ${message}`
    }
  });
});
app.get('/chat/:id', (req, res) => {
  const chatId = req.params.id;
  const chat = chats.get(chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  res.json(chat);
});
app.get('/chat', (req, res) => {
  const chatList = Array.from(chats.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);
  res.json({ chats: chatList });
});

// TOOLS
// - `GET /tools` - List available tools
// - `POST /tools/:tool_id` - Use a specific tool
// - `GET /tools/:tool_id` - Get tool details
app.get('/tools', (_, res) => res.json({ tools: Object.values(tools) }));
app.post('/tools/:id', (req, res) => {
  const tool = tools[req.params.id];
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  res.json(tool.execute(req.body));
});
app.get('/tools/:id', (req, res) => {
  const tool = tools[req.params.id];
  if (!tool) return res.status(404).json({ error: 'Tool not found' });
  res.json(tool);
});

// MEMORY
// - `POST /memory` - Store a key-value pair
// - `GET /memory/:key` - Get value by key
// - `GET /memory` - List all keys
// - `DELETE /memory/:key` - Delete a key-value pair
app.post('/memory', (req, res) => {
  const { key, value } = req.body;
  memory.set(key, value);
  res.json({ status: 'stored' });
});
app.get('/memory/:key', (req, res) => {
  const value = memory.get(req.params.key);
  if (value === undefined) {
    return res.status(404).json({ error: 'Key not found' });
  }
  res.json({ value });
});
app.get('/memory', (req, res) => {
  const keys = Array.from(memory.keys());
  res.json({ keys });
});
app.delete('/memory/:key', (req, res) => {
  const key = req.params.key;
  if (!memory.has(key)) {
    return res.status(404).json({ error: 'Key not found' });
  }
  memory.delete(key);
  res.json({ status: 'deleted' });
});

// RESOURCES
// - `GET /resources` - List available resources
// - `GET /resources/:id` - Get a specific resource
app.get('/resources', (_, res) => res.json({ resources: Object.values(resources) }));
app.get('/resources/:id', (req, res) => {
  const resource = resources[req.params.id];
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  res.json(resource);
});

// PAY
// - `POST /pay` - Create a payment
// - `GET /pay/:id` - Get payment status
app.post('/pay', (req, res) => {
  const transactionId = 'tx_' + Date.now();
  const paymentData = {
    transaction_id: transactionId,
    amount: req.body.amount || 0,
    status: 'success',
    created_at: new Date().toISOString()
  };
  payments.set(transactionId, paymentData);
  res.json(paymentData);
});
app.get('/pay/:id', (req, res) => {
  const transactionId = req.params.id;
  const payment = payments.get(transactionId);
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  res.json(payment);
});

// Root endpoint
app.get('/', (_, res) => {
  res.send(`
    <h1>Hello SLOP - a sample SLOP Server</h1>
    <p>Available endpoints:</p>
    <ul>
      <li><a href="/chat">/chat</a></li>
      <li><a href="/tools">/tools</a></li>
      <li><a href="/memory">/memory</a></li>
      <li><a href="/resources">/resources</a></li>
      <li><a href="/pay">/pay</a></li>
    </ul>
    <p>For more information, visit the <a href="https://github.com/agnt-gg/slop">SLOP repository</a> and check the <a href="https://github.com/agnt-gg/slop/blob/main/slop-spec.txt">SLOP spec</a>.</p>
  `);
});


// Start server and run tests
app.listen(3000, async () => {
  console.log('✨ SLOP running on http://localhost:3000\n');
  
  const api = axios.create({ baseURL: 'http://localhost:3000' });
  
  try {
    // Test chat
    console.log('📝 Testing chat...');
    const chat = await api.post('/chat', {
      messages: [{ content: 'Hello SLOP!' }]
    });
    console.log(chat.data.message.content, '\n');
    
    // Test get chat
    const chatId = chat.data.id;
    const chatGet = await api.get(`/chat/${chatId}`);
    console.log('Retrieved chat:', chatGet.data.id);
    
    // Test list chats
    const chats = await api.get('/chat');
    console.log('Recent chats count:', chats.data.chats.length, '\n');

    // Test tools
    console.log('🔧 Testing tools...');
    const calc = await api.post('/tools/calculator', {
      expression: '2 + 2'
    });
    console.log('2 + 2 =', calc.data.result);

    const greet = await api.post('/tools/greet', {
      name: 'SLOP'
    });
    console.log(greet.data.result, '\n');
    
    // Test get tool details
    const toolDetails = await api.get('/tools/calculator');
    console.log('Tool details:', toolDetails.data.description, '\n');

    // Test memory
    console.log('💾 Testing memory...');
    await api.post('/memory', {
      key: 'test',
      value: 'hello world'
    });
    const memory = await api.get('/memory/test');
    console.log('Stored value:', memory.data.value);
    
    // Test list memory keys
    const keys = await api.get('/memory');
    console.log('Memory keys:', keys.data.keys);
    
    // Test delete memory
    await api.delete('/memory/test');
    console.log('Deleted memory key: test\n');

    // Test resources
    console.log('📚 Testing resources...');
    const hello = await api.get('/resources/hello');
    console.log('Resource content:', hello.data.content, '\n');

    // Test pay
    console.log('💰 Testing pay...');
    const pay = await api.post('/pay', {
      amount: 10
    });
    console.log('Transaction:', pay.data.transaction_id);
    
    // Test get payment
    const paymentStatus = await api.get(`/pay/${pay.data.transaction_id}`);
    console.log('Payment status:', paymentStatus.data.status, '\n');

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
});