import { OpenAI } from "openai";
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Memory storage
const memory = {};

// ======= SIMPLE AGENT SYSTEM =======

// Router Agent - decides which specialized agent to use
async function routerAgent(query) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a router that categorizes queries and selects the best specialized agent to handle them." },
      { role: "user", content: `Classify this query and select ONE agent: "${query}"` }
    ],
    functions: [{
      name: "route_query",
      description: "Route the query to the appropriate agent",
      parameters: {
        type: "object",
        properties: {
          agent: {
            type: "string",
            enum: ["researcher", "creative", "technical", "summarizer"],
            description: "The agent best suited to handle this query"
          },
          reason: {
            type: "string",
            description: "Brief reason for this routing decision"
          }
        },
        required: ["agent", "reason"]
      }
    }],
    function_call: { name: "route_query" }
  });
  
  const args = JSON.parse(completion.choices[0].message.function_call.arguments);
  console.log(`🔀 Routing to: ${args.agent} (${args.reason})`);
  return args;
}

// Create agent factory
const createAgent = (role, temperature = 0.7) => async (query) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: role },
      { role: "user", content: query }
    ],
    temperature
  });
  return completion.choices[0].message.content;
};

// Specialized Agents
const agents = {
  researcher: createAgent("You are a research agent providing factual information with sources.", 0.3),
  creative: createAgent("You are a creative agent generating imaginative content.", 0.9),
  technical: createAgent("You are a technical agent providing precise, detailed explanations.", 0.2),
  summarizer: createAgent("You are a summarization agent that creates concise summaries.", 0.3)
};

// ======= SLOP API IMPLEMENTATION =======

// 1. CHAT endpoint - main entry point
app.post('/chat', async (req, res) => {
  try {
    const { messages, pattern } = req.body;
    const userQuery = messages[0].content;
    let response;

    if (pattern) {
      switch (pattern) {
        case 'sequential':
          // Research → Summarize pattern
          const research = await agents.researcher(userQuery);
          response = await agents.summarizer(research);
          break;

        case 'parallel':
          // Get multiple perspectives simultaneously
          const [researchView, creativeView] = await Promise.all([
            agents.researcher(userQuery),
            agents.creative(userQuery)
          ]);
          response = `Research perspective:\n${researchView}\n\nCreative perspective:\n${creativeView}`;
          break;

        case 'branching':
          // Use router to select best agent
          const route = await routerAgent(userQuery);
          response = await agents[route.agent](userQuery);
          break;

        default:
          // Default to router behavior
          const defaultRoute = await routerAgent(userQuery);
          response = await agents[defaultRoute.agent](userQuery);
      }
    } else {
      // Default to router behavior
      const route = await routerAgent(userQuery);
      response = await agents[route.agent](userQuery);
    }

    // Store in memory
    const sessionId = `session_${Date.now()}`;
    memory[sessionId] = {
      query: userQuery,
      pattern: pattern || 'router',
      response
    };

    res.json({
      message: {
        role: "assistant",
        content: response,
        metadata: {
          session_id: sessionId,
          pattern: pattern || 'router'
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. TOOLS endpoint
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      { id: "researcher", description: "Finds factual information" },
      { id: "creative", description: "Generates imaginative content" },
      { id: "technical", description: "Provides technical explanations" },
      { id: "summarizer", description: "Creates concise summaries" }
    ],
    patterns: [
      { id: "sequential", description: "Research then summarize" },
      { id: "parallel", description: "Multiple perspectives at once" },
      { id: "branching", description: "Route to best agent (default)" }
    ]
  });
});

// 3. MEMORY endpoints
app.post('/memory', (req, res) => {
  const { key, value } = req.body;
  memory[key] = value;
  res.json({ status: 'stored' });
});

app.get('/memory/:key', (req, res) => {
  const { key } = req.params;
  res.json({ value: memory[key] || null });
});

// 4. RESOURCES endpoint
app.get('/resources', (req, res) => {
  res.json({
    patterns: {
      sequential: "Chain agents: Research → Summarize",
      parallel: "Multiple agents work simultaneously",
      branching: "Route to specialized agents"
    },
    examples: {
      sequential: {
        description: "Research a topic and create a summary",
        request: {
          messages: [{ content: "Explain quantum computing" }],
          pattern: "sequential"
        }
      },
      parallel: {
        description: "Get multiple perspectives on a topic",
        request: {
          messages: [{ content: "Benefits of meditation" }],
          pattern: "parallel"
        }
      },
      branching: {
        description: "Route to the most appropriate agent",
        request: {
          messages: [{ content: "How do I write a React component?" }],
          pattern: "branching"
        }
      }
    }
  });
});

// 5. PAY endpoint (simple mock)
app.post('/pay', (req, res) => {
  const { amount } = req.body;
  const txId = `tx_${Date.now()}`;
  memory[txId] = { amount, status: 'completed' };
  res.json({ transaction_id: txId });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 SLOP Multi-Agent API running on port ${PORT}`);
});

/* Example usage:

1. Basic query (uses router):
curl -X POST http://localhost:3000/chat \
-H "Content-Type: application/json" \
-d '{
  "messages": [{ "content": "What are black holes?" }]
}'

2. Sequential pattern:
curl -X POST http://localhost:3000/chat \
-H "Content-Type: application/json" \
-d '{
  "messages": [{ "content": "Explain quantum computing" }],
  "pattern": "sequential"
}'

3. Parallel pattern:
curl -X POST http://localhost:3000/chat \
-H "Content-Type: application/json" \
-d '{
  "messages": [{ "content": "Benefits of meditation" }],
  "pattern": "parallel"
}'

4. Store in memory:
curl -X POST http://localhost:3000/memory \
-H "Content-Type: application/json" \
-d '{
  "key": "test",
  "value": "hello world"
}'

5. Get from memory:
curl -X GET http://localhost:3000/memory/test

6. List tools:
curl -X GET http://localhost:3000/tools

7. Get resources:
curl -X GET http://localhost:3000/resources

8. Process payment:
curl -X POST http://localhost:3000/pay \
-H "Content-Type: application/json" \
-d '{
  "amount": 10
}'
*/