const express = require("express");
const app = express();
app.use(express.json());

// Enable CORS for all origins
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  );
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Trivia game data
const triviaQuestions = [
  {
    question: "What is the capital of France?",
    answer: "paris",
    hint: "It's known as the City of Light.",
  },
  {
    question: "Which planet is known as the Red Planet?",
    answer: "mars",
    hint: "It's named after the Roman god of war.",
  },
  {
    question: "What is the largest mammal in the world?",
    answer: "blue whale",
    hint: "It lives in the ocean and can weigh up to 200 tons.",
  },
  {
    question: "Who painted the Mona Lisa?",
    answer: "leonardo da vinci",
    hint: "He was an Italian polymath from the Renaissance period.",
  },
  {
    question: "What is the chemical symbol for gold?",
    answer: "au",
    hint: "It comes from the Latin word 'aurum'.",
  },
];

// Game state
let currentGame = {
  active: false,
  currentQuestion: null,
  score: 0,
  askedQuestions: [],
  hintUsed: false,
};

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('slop.db');

// Initialize database tables
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS memory (key TEXT PRIMARY KEY, value TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS resources (id TEXT PRIMARY KEY, title TEXT, content TEXT, type TEXT, metadata TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, amount REAL, currency TEXT, description TEXT, status TEXT, created_at TEXT)");
});

// 1. CHAT ENDPOINT - SLOP compatible
app.post("/chat", (req, res) => {
  const message = req.body.messages?.[0]?.content || "";
  const lowerMessage = message.toLowerCase();

  // Response based on game state and message
  let response = "";

  // Trivia game commands
  if (
    lowerMessage.includes("start trivia") ||
    lowerMessage.includes("play trivia")
  ) {
    currentGame = {
      active: true,
      currentQuestion: null,
      score: 0,
      askedQuestions: [],
      hintUsed: false,
    };
    response =
      "Welcome to Trivia Challenge! I'll ask you questions and you try to answer them. Say 'next question' to begin!";
  } else if (
    currentGame.active &&
    (lowerMessage.includes("next question") ||
      lowerMessage.includes("new question"))
  ) {
    // Get a question that hasn't been asked yet
    const availableQuestions = triviaQuestions.filter(
      (q) => !currentGame.askedQuestions.includes(q.question),
    );

    if (availableQuestions.length === 0) {
      response = `Game over! Your final score is ${currentGame.score}/${triviaQuestions.length}. Say 'start trivia' to play again!`;
      currentGame.active = false;
    } else {
      currentGame.currentQuestion =
        availableQuestions[
          Math.floor(Math.random() * availableQuestions.length)
        ];
      currentGame.askedQuestions.push(currentGame.currentQuestion.question);
      currentGame.hintUsed = false;
      response = `Question: ${currentGame.currentQuestion.question} (Say 'hint' if you need help)`;
    }
  } else if (
    currentGame.active &&
    lowerMessage.includes("hint") &&
    currentGame.currentQuestion
  ) {
    currentGame.hintUsed = true;
    response = `Hint: ${currentGame.currentQuestion.hint}`;
  } else if (
    currentGame.active &&
    currentGame.currentQuestion &&
    lowerMessage.includes("skip")
  ) {
    response = `The answer was: ${currentGame.currentQuestion.answer}. Say 'next question' for another one!`;
    currentGame.currentQuestion = null;
  } else if (currentGame.active && currentGame.currentQuestion) {
    // Check if the answer is correct
    if (
      lowerMessage.includes(currentGame.currentQuestion.answer.toLowerCase())
    ) {
      currentGame.score += currentGame.hintUsed ? 0.5 : 1; // Half point if hint was used
      response = currentGame.hintUsed
        ? `Correct! You get half a point for using a hint. Your score is now ${currentGame.score}. Say 'next question' to continue!`
        : `Correct! Your score is now ${currentGame.score}. Say 'next question' to continue!`;
      currentGame.currentQuestion = null;
    } else {
      response =
        "Sorry, that's not correct. Try again, say 'hint' for a clue, or 'skip' to move on.";
    }
  } else if (
    lowerMessage.includes("stop trivia") ||
    lowerMessage.includes("end trivia")
  ) {
    response = `Game ended. Your final score was ${currentGame.score}. Thanks for playing!`;
    currentGame.active = false;
  }
  // Standard responses if not in game mode
  else if (lowerMessage.includes("hello")) {
    response =
      "Hello there! Want to play a trivia game? Say 'start trivia' to begin!";
  } else if (lowerMessage.includes("weather")) {
    response =
      "I don't have real-time weather data, but I hope it's sunny where you are!";
  } else if (lowerMessage.includes("name")) {
    response =
      "I'm a Trivia Bot. Nice to meet you! Say 'start trivia' to play a game.";
  } else {
    response = `You said: "${message}". Try saying 'start trivia' to play a fun trivia game!`;
  }

  res.json({ message: { role: "assistant", content: response } });
});

// 2. TOOLS ENDPOINT - SLOP compatible
app.get("/tools", (req, res) => {
  res.json({
    tools: [
      {
        id: "trivia",
        description: "Play a trivia game with questions on various subjects",
      },
      {
        id: "hint",
        description: "Get a hint for the current question in the trivia game",
      },
      {
        id: "score",
        description: "Check your current score in the trivia game",
      },
    ],
  });
});

// Tool execution endpoint
app.post("/tools/:tool_id", (req, res) => {
  const toolId = req.params.tool_id;

  // Ensure req.body is initialized even if no JSON body is sent
  req.body = req.body || {};

  switch (toolId) {
    case "trivia":
      if (!currentGame.active) {
        currentGame = {
          active: true,
          currentQuestion: null,
          score: 0,
          askedQuestions: [],
          hintUsed: false,
        };
        res.json({
          result: "Trivia game started! Say 'next question' to begin.",
        });
      } else {
        res.json({
          result:
            "You're already in a trivia game! Say 'next question' for a new question or 'end trivia' to stop.",
        });
      }
      break;

    case "hint":
      if (currentGame.active && currentGame.currentQuestion) {
        currentGame.hintUsed = true;
        res.json({ result: `Hint: ${currentGame.currentQuestion.hint}` });
      } else {
        res.json({
          result:
            "No active question to give a hint for. Start a game with 'start trivia' first!",
        });
      }
      break;

    case "score":
      if (currentGame.active) {
        res.json({
          result: `Your current score is ${currentGame.score}. You've answered ${currentGame.askedQuestions.length} questions.`,
        });
      } else {
        res.json({
          result: "No active game. Start a new game with 'start trivia'!",
        });
      }
      break;

    default:
      res.status(404).json({ error: "Tool not found" });
  }
});

// 3. MEMORY ENDPOINT - SLOP compatible
app.post("/memory", (req, res) => {
  const { key, value } = req.body;
  if (key && value !== undefined) {
    db.run("INSERT OR REPLACE INTO memory (key, value) VALUES (?, ?)", [key, JSON.stringify(value)], (err) => {
      if (err) {
        res.status(500).json({ error: "Failed to store value" });
      } else {
        res.json({ status: "stored" });
      }
    });
  } else {
    res.status(400).json({ error: "Both key and value are required" });
  }
});

app.get("/memory/:key", (req, res) => {
  const { key } = req.params;
  db.get("SELECT value FROM memory WHERE key = ?", [key], (err, row) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
    } else if (!row) {
      res.status(404).json({ error: "Key not found" });
    } else {
      res.json({ value: JSON.parse(row.value) });
    }
  });
});

app.get("/memory", (req, res) => {
  db.all("SELECT key FROM memory", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
    } else {
      const keys = rows.map(row => ({
        key: row.key,
        created_at: new Date().toISOString()
      }));
      res.json({ keys });
    }
  });
});

// 4. RESOURCES ENDPOINT - SLOP compatible
app.get("/resources", (req, res) => {
  // Get static resources
  const staticResources = [
    {
      id: "trivia-questions",
      title: "Available Trivia Questions",
      type: "collection",
    },
    {
      id: "commands",
      title: "Trivia Game Commands",
      type: "guide",
    },
  ];

  // Get dynamic resources from SQLite
  db.all("SELECT id, title, type FROM resources", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    
    const dynamicResources = rows.map(row => ({
      id: row.id,
      title: row.title,
      type: row.type || "custom"
    }));

    res.json({
      resources: [...staticResources, ...dynamicResources],
    });
  });
});

// POST /resources - Create or update a resource
app.post("/resources", (req, res) => {
  const { id, title, content, type, metadata } = req.body;

  if (!id || !title || !content) {
    return res
      .status(400)
      .json({ error: "id, title, and content are required" });
  }

  const resource = {
    id,
    title,
    content,
    type: type || "custom",
    metadata: JSON.stringify(metadata || {
      created_at: new Date().toISOString(),
    })
  };

  db.run("INSERT OR REPLACE INTO resources (id, title, content, type, metadata) VALUES (?, ?, ?, ?, ?)",
    [resource.id, resource.title, resource.content, resource.type, resource.metadata],
    (err) => {
      if (err) {
        res.status(500).json({ error: "Failed to store resource" });
      } else {
        res.status(201).json(resource);
      }
    }
  );
});

// Simple search for resources
app.get("/resources/search", (req, res) => {
  const query = req.query.q?.toLowerCase() || "";
  
  // Search static resources
  const staticSearchResults = [
    {
      id: "trivia-questions",
      title: "Available Trivia Questions",
      type: "collection",
      content: `There are ${triviaQuestions.length} questions available`,
    },
    {
      id: "commands",
      title: "Trivia Game Commands",
      type: "guide",
      content: "Available commands: 'start trivia', 'next question', 'hint', 'skip', 'end trivia'",
    }
  ].filter(resource => 
    resource.id.toLowerCase().includes(query) ||
    resource.title.toLowerCase().includes(query) ||
    resource.content.toLowerCase().includes(query)
  ).map(resource => ({
    ...resource,
    score: 0.9
  }));

  // Search database resources
  db.all(
    "SELECT * FROM resources WHERE LOWER(id) LIKE ? OR LOWER(title) LIKE ? OR LOWER(content) LIKE ?",
    [`%${query}%`, `%${query}%`, `%${query}%`],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      const dbResources = rows.map(row => ({
        ...row,
        score: 0.8
      }));

      res.json({ 
        results: [...staticSearchResults, ...dbResources]
      });
    }
  );
});

// Get Specific Resource
app.get("/resources/:id(*)", (req, res) => {
  const resourceId = req.params.id;

  // Check static resources first
  const staticResource = (() => {
    switch (resourceId) {
      case "trivia-questions":
        return {
          id: "trivia-questions",
          title: "Available Trivia Questions",
          content: `There are ${triviaQuestions.length} questions available covering topics like geography, science, art, and more.`,
          metadata: {
            count: triviaQuestions.length,
            last_updated: new Date().toISOString(),
          },
        };
      case "rick":
        return {
          id: "rick",
          title: "Special Resource",
          content: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          metadata: {
            type: "video",
            last_updated: new Date().toISOString(),
          },
        };
      case "commands":
        return {
          id: "commands",
          title: "Trivia Game Commands",
          content:
            "Available commands: 'start trivia', 'next question', 'hint', 'skip', 'end trivia'",
          metadata: {
            command_count: 5,
            last_updated: new Date().toISOString(),
          },
        };
      default:
        return null;
    }
  })();

  if (staticResource) {
    return res.json(staticResource);
  }

  // Handle prefix-based retrievals and wildcard matches
  const searchPattern = resourceId.endsWith("/*") ? 
    resourceId.slice(0, -2) + "%" : 
    resourceId + "%";
    
  db.all("SELECT * FROM resources WHERE id = ? OR id LIKE ?", 
    [resourceId, searchPattern],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }
      if (rows.length > 0) {
        // Parse metadata back to object
        const resources = rows.map(row => ({
          ...row,
          metadata: JSON.parse(row.metadata)
        }));
        return res.json(resources.length === 1 ? resources[0] : resources);
      } else {
        return res.status(404).json({ error: "Resource not found" });
      }
    }
  );
  return;

  res.status(404).json({ error: "Resource not found" });
});

// Update a resource
app.put("/resources/:id(*)", (req, res) => {
  const resourceId = req.params.id;
  const { title, content, type, metadata } = req.body;

  // Check if it's a static resource
  if (["trivia-questions", "commands", "rick"].includes(resourceId)) {
    return res.status(403).json({ error: "Cannot modify static resources" });
  }

  // First get the existing resource
  db.get("SELECT * FROM resources WHERE id = ?", [resourceId], (err, existingResource) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (!existingResource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    // Parse existing metadata
    const existingMetadata = JSON.parse(existingResource.metadata || "{}");
    
    // Prepare updated resource
    const updatedResource = {
      title: title || existingResource.title,
      content: content || existingResource.content,
      type: type || existingResource.type,
      metadata: JSON.stringify({
        ...existingMetadata,
        ...metadata,
        updated_at: new Date().toISOString()
      })
    };

    // Update in database
    db.run(
      "UPDATE resources SET title = ?, content = ?, type = ?, metadata = ? WHERE id = ?",
      [updatedResource.title, updatedResource.content, updatedResource.type, updatedResource.metadata, resourceId],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: "Failed to update resource" });
        }
        res.json({
          id: resourceId,
          ...updatedResource,
          metadata: JSON.parse(updatedResource.metadata)
        });
      }
    );
  });
});

// 5. PAY ENDPOINT - SLOP compatible (mock implementation)
app.post("/pay", (req, res) => {
  // Simple mock implementation
  const transactionId = `tx_${Date.now()}`;

  // Store transaction in memory
  memory.set(transactionId, {
    amount: req.body.amount || 0,
    currency: req.body.currency || "USD",
    description: req.body.description || "Trivia game usage",
    status: "success",
    created_at: new Date().toISOString(),
  });

  res.json({
    transaction_id: transactionId,
    status: "success",
    receipt_url: `https://api.example.com/receipts/${transactionId}`,
  });
});

app.get("/pay/:id", (req, res) => {
  const { id } = req.params;

  if (memory.has(id)) {
    const transaction = memory.get(id);
    res.json({
      transaction_id: id,
      ...transaction,
    });
  } else {
    res.status(404).json({ error: "Transaction not found" });
  }
});

// 6. INFO ENDPOINT - SLOP server information
app.get("/info", (req, res) => {
  res.json({
    name: "Trivia Game API",
    scope: "trivia-api",
    description: "An API for a trivia game following SLOP principles.",
    url: "http://localhost:3000",
    version: "1.0.0",
    endpoints: [
      {
        path: "/chat",
        method: "POST",
        description:
          "Handles user interactions in a trivia-style chatbot. Supports trivia game commands like 'start trivia', 'next question', 'hint', 'skip', and 'end trivia'.",
        request_format: {
          messages: [
            {
              role: "user",
              content: "Your message here",
            },
          ],
        },
        response_format: {
          message: {
            role: "assistant",
            content: "Response from the bot",
          },
        },
      },
      {
        path: "/tools",
        method: "GET",
        description:
          "Lists available tools in the API for interacting with the trivia game.",
        response_format: {
          tools: [
            {
              id: "trivia",
              description:
                "Play a trivia game with questions on various subjects",
            },
            {
              id: "hint",
              description:
                "Get a hint for the current question in the trivia game",
            },
            {
              id: "score",
              description: "Check your current score in the trivia game",
            },
          ],
        },
      },
      {
        path: "/tools/trivia",
        method: "POST",
        description:
          "Starts a new trivia game or returns status of current game.",
        request_format: {},
        response_format: {
          result: "Trivia game started! Say 'next question' to begin.",
        },
      },
      {
        path: "/tools/hint",
        method: "POST",
        description: "Provides a hint for the current active trivia question.",
        request_format: {},
        response_format: {
          result: "Hint: It's named after the Roman god of war.",
        },
      },
      {
        path: "/tools/score",
        method: "POST",
        description:
          "Returns the current score and progress in the active trivia game.",
        request_format: {},
        response_format: {
          result: "Your current score is 2.5. You've answered 3 questions.",
        },
      },
      {
        path: "/memory",
        method: "GET",
        description:
          "Lists all stored memory keys with their creation timestamps.",
        response_format: {
          keys: [
            {
              key: "user_score",
              created_at: "2024-03-18T12:00:00Z",
            },
          ],
        },
      },
      {
        path: "/memory",
        method: "POST",
        description: "Stores a value in memory with the specified key.",
        request_format: {
          key: "user_preference",
          value: "science topics",
        },
        response_format: {
          status: "stored",
        },
      },
      {
        path: "/memory/:key",
        method: "GET",
        description: "Retrieves a stored memory value for the specified key.",
        request_params: {
          key: "String - The key to retrieve from memory",
        },
        response_format: {
          value: "42",
        },
      },
      {
        path: "/resources",
        method: "GET",
        description:
          "Lists all available resources in the API including collections and guides.",
        response_format: {
          resources: [
            {
              id: "trivia-questions",
              title: "Available Trivia Questions",
              type: "collection",
            },
            {
              id: "commands",
              title: "Trivia Game Commands",
              type: "guide",
            },
          ],
        },
      },
      {
        path: "/resources/:id",
        method: "GET",
        description:
          "Retrieves detailed information about a specific resource by ID.",
        request_params: {
          id: "String - Resource identifier (e.g., 'trivia-questions', 'commands', 'rick')",
        },
        response_format: {
          id: "trivia-questions",
          title: "Available Trivia Questions",
          content:
            "There are 5 questions available covering topics like geography, science, art, and more.",
          metadata: {
            count: 5,
            last_updated: "2024-03-18T12:00:00Z",
          },
        },
      },
      {
        path: "/resources/search",
        method: "GET",
        description: "Searches for resources matching the query string.",
        request_query: {
          q: "String - Search query (e.g., 'trivia', 'command')",
        },
        response_format: {
          results: [
            {
              id: "trivia-questions",
              title: "Available Trivia Questions",
              type: "collection",
              score: 0.95,
            },
          ],
        },
      },
      {
        path: "/resources/:id",
        method: "PUT",
        description: "Updates an existing resource by ID.",
        request_params: {
          id: "String - Resource identifier",
        },
        request_format: {
          title: "Updated Resource Title",
          content: "Updated content",
          type: "custom",
          metadata: {
            key: "value",
          },
        },
        response_format: {
          id: "resource-id",
          title: "Updated Resource Title",
          content: "Updated content",
          type: "custom",
          metadata: {
            key: "value",
            updated_at: "2024-03-18T12:00:00Z",
          },
        },
      },
      {
        path: "/resources/:id/*",
        method: "GET",
        description:
          "Retrieves resources using prefix matching for nested scopes.",
        request_params: {
          id: "String - Resource prefix (e.g., 'folder/*')",
        },
        response_format: {
          id: "folder/resource",
          title: "Resource Title",
          content: "Resource content",
          type: "custom",
          metadata: {},
        },
      },
      {
        path: "/pay",
        method: "POST",
        description:
          "Creates a mock payment transaction for trivia game usage.",
        request_format: {
          amount: 10,
          currency: "USD",
          description: "Trivia game usage",
        },
        response_format: {
          transaction_id: "tx_123456789",
          status: "success",
          receipt_url: "http://localhost:3000/receipts/tx_123456789",
        },
      },
      {
        path: "/pay/:id",
        method: "GET",
        description: "Retrieves information about a past payment transaction.",
        request_params: {
          id: "String - Transaction ID (e.g., 'tx_123456789')",
        },
        response_format: {
          transaction_id: "tx_123456789",
          amount: 10,
          currency: "USD",
          description: "Trivia game usage",
          status: "success",
          created_at: "2024-03-18T12:00:00Z",
        },
      },
      {
        path: "/info",
        method: "GET",
        description:
          "Provides comprehensive documentation about this SLOP-compatible API.",
        response_format: {
          name: "Trivia Game API",
          scope: "trivia-api",
          description: "An API for a trivia game following SLOP principles.",
          url: "http://localhost:3000",
          version: "1.0.0",
          endpoints: [
            {
              path: "/endpoint",
              method: "METHOD",
              description: "Description...",
              // Additional endpoint properties
            },
          ],
        },
      },
    ],
  });
});

// Start the server
app.listen(3000, "0.0.0.0", () => console.log("✨ SLOP running on port 3000"));
