import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// In-memory storage (replace with proper database in production)
const gameState = {
    players: new Map(),
    inventory: new Map(),
    transactions: new Map()
};

// Updated system prompt with stronger enforcement
const systemPrompt = `INSTRUCTIONS: YOUR RESPONSE MUST BE A SINGLE JSON OBJECT WITH NO ADDITIONAL TEXT, CODE FENCES, OR FORMATTING.

You are an immersive D&D-style Game Master. RESPOND ONLY WITH JSON.

COMMAND FORMAT:
Your response must be a JSON object with two properties:
1. "narrative": Your story text (ALWAYS end with a question to the player)
2. "commands": Array of command objects (ALWAYS include at least one dice roll for any game state change)

CORE PRINCIPLES:
1. EVERY response must end with a state change and / or a question to the player
2. EVERY game state change must be determined by a dice roll
3. The more favorable the outcome, the higher the roll needed
4. Critical successes (20) and failures (1) should have dramatic effects (e.g. a 20 should always be a good thing, a 1 should always be a bad thing - MAKE STATE CHANGES ACCORDINGLY)
5. Never ask the player to roll - YOU roll the dice automatically
6. If the player has an item, you should ask the user if they would like to equip it

DICE ROLL COMMANDS:
{
    "action": "ROLL_DICE",
    "sides": 20,
    "reason": "Determine Outcome",
    "difficulty": 15,
    "onSuccess": {
        "action": "ADD_ITEM",
        "item": "Hidden Key",
        "quantity": 1,
        "type": "quest",
        "rarity": "uncommon"
    },
    "onFailure": {
        "action": "MODIFY_STAT",
        "stat": "health",
        "value": -5
    }
}

OUTCOME TIERS (for D20 rolls):
1-5: Very Bad Outcome
6-10: Poor Outcome
11-15: Moderate Success
16-19: Great Success
20: Critical Success (extraordinary results)

Example response structure:
{
    "narrative": "As you explore the dark cave, you notice a glimmer of light reflecting off something in the corner. You approach carefully and see what appears to be a treasure chest, but it might be trapped. What would you like to do with the chest?",
    "commands": [
        {
            "action": "ROLL_DICE",
            "sides": 20,
            "reason": "Perception Check",
            "difficulty": 12
        }
    ]
}

Example combat response:
{
    "narrative": "The goblin snarls as it charges toward you with a rusty dagger. You ready your weapon as it approaches. How do you want to defend yourself?",
    "commands": [
        {
            "action": "COMBAT_ROLL",
            "targetAC": 12,
            "skill": "Swordsmanship",
            "damageDie": 6
        }
    ]
}

Example exploration response:
{
    "narrative": "The ancient door stands before you, covered in strange runes. As you examine it closely, you notice some of the symbols seem familiar. Would you like to try to decipher the runes or look for another way forward?",
    "commands": [
        {
            "action": "ROLL_DICE",
            "sides": 20,
            "reason": "Ancient Knowledge Check",
            "difficulty": 15,
            "onSuccess": {
                "action": "ADD_ITEM",
                "item": "Door Rune Translation",
                "quantity": 1,
                "type": "quest",
                "rarity": "uncommon"
            }
        }
    ]
}

Current game state:
${JSON.stringify(gameState, null, 2)}

COMMON GAME COMMANDS:
1. To add an item to player inventory:
{
    "action": "ADD_ITEM",
    "item": "Item Name",
    "quantity": 1,
    "type": "weapon/armor/consumable/quest",
    "rarity": "common/uncommon/rare/legendary"
}

IMPORTANT REMINDERS:
1. ALWAYS end your narrative with a question
2. ALWAYS include at least one dice roll for any game state change
3. Make outcomes proportional to the dice roll results
4. ALL responses must be valid JSON objects with "narrative" and "commands" properties
5. ALWAYS RETURN A JSON OBJECT READY TO BE PARSED WITH NO ADDITIONAL TEXT!
6. NEVER RESPOND WITH PLAIN TEXT - ONLY JSON OR THE SYSTEM WILL CRASH!
7. You can directly add items to player inventory with ADD_ITEM without needing player confirmation

CRITICAL: YOUR ENTIRE RESPONSE MUST BE A VALID JSON OBJECT. DO NOT ADD MARKDOWN CODE BLOCKS, EXPLANATIONS, OR ANY TEXT BEFORE OR AFTER THE JSON.

FINAL JSON OBJECT WITH NO ADDITIONAL TEXT:`;

// SLOP Chat Endpoint
app.post('/chat', async (req, res) => {
    const { player_id, messages, gameState } = req.body;
    
    const formattedMessages = messages.map(msg => ({
        ...msg,
        role: msg.role === 'gm' ? 'assistant' : 
              ['system', 'assistant', 'user', 'function', 'tool', 'developer'].includes(msg.role) ? 
              msg.role : 'system'
    }));

    let attempts = 0;
    const maxAttempts = 3;
    let parsedResponse = null;
    let lastError = null;

    while (attempts < maxAttempts && !parsedResponse) {
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                temperature: 0.5,
                messages: [
                    { role: "system", content: systemPrompt },
                    ...formattedMessages
                ]
            });

            const responseText = completion.choices[0].message.content;
            console.log('Raw AI response:', responseText);

            // Extract JSON from response
            const match = responseText.match(/\{[\s\S]*\}/);
            if (!match) throw new Error("No JSON found in response");

            parsedResponse = JSON.parse(match[0]);

            // Validate required properties
            if (!parsedResponse.narrative || !parsedResponse.commands) {
                throw new Error("JSON missing required properties");
            }

        } catch (error) {
            lastError = error;
            attempts++;
            console.error(`Attempt ${attempts} failed:`, error.message);
        }
    }

    if (parsedResponse) {
        res.json({
            success: true,
            response: parsedResponse
        });
    } else {
        res.status(500).json({
            success: false,
            error: "Failed to process chat after multiple attempts",
            details: lastError.message
        });
    }
});

// SLOP Tools Endpoint
app.post('/tools/:tool_id', (req, res) => {
    const { tool_id } = req.params;
    const { player_id, parameters } = req.body;

    // Simple tool processing logic
    const toolResults = {
        'alchemy_table': () => ({
            result: `Created potion using: ${parameters.ingredients.join(', ')}`
        }),
        'combat': () => ({
            result: `Performed ${parameters.move} attack!`
        })
    };

    if (toolResults[tool_id]) {
        res.json(toolResults[tool_id]());
    } else {
        res.status(404).json({ error: "Tool not found" });
    }
});

// SLOP Memory Endpoints
app.post('/memory', (req, res) => {
    const { key, value } = req.body;
    gameState.inventory.set(key, value);
    res.json({ status: "stored" });
});

app.get('/memory/:key', (req, res) => {
    const { key } = req.params;
    const value = gameState.inventory.get(key);
    
    if (value) {
        res.json({ key, value });
    } else {
        res.status(404).json({ 
            error: "Data not found", 
            message: "No saved game state found for this player. A new game will be started."
        });
    }
});

// SLOP Resources Endpoint
app.get('/resources', (req, res) => {
    res.json({
        resources: [
            { id: "world_map", title: "World Map", content: "A map of the fantasy realm" },
            { id: "quest_guide", title: "Quest Guide", content: "Current available quests" }
        ]
    });
});

// SLOP Pay Endpoint
app.post('/pay', (req, res) => {
    const { player_id, amount, currency, description } = req.body;
    const transaction_id = uuidv4();
    
    gameState.transactions.set(transaction_id, {
        player_id,
        amount,
        currency,
        description,
        timestamp: new Date()
    });

    res.json({
        transaction_id,
        status: "success"
    });
});

// New endpoints for game mechanics
app.post('/game/use-item', (req, res) => {
    const { player_id, item_id } = req.body;
    // Add item usage logic here
    res.json({ status: "success", message: "Item used successfully" });
});

app.post('/game/skill-progress', (req, res) => {
    const { player_id, skill_name, exp_gained } = req.body;
    // Add skill progression logic here
    res.json({ status: "success", message: "Skill experience added" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`AI Quest server running on port ${PORT}`);
});