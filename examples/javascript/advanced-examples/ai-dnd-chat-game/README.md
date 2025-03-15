# 🐉 AI Quest: The D&D Chat Adventure

![AI Quest Banner](https://via.placeholder.com/800x200/0a0a0a/ffffff?text=AI+Quest:+D%26D+Chat+Adventure)

> *"Roll for initiative! Your AI Dungeon Master awaits..."*

## 🧙‍♂️ What is AI Quest?

AI Quest is an immersive, text-based D&D-style adventure game powered by AI! Your digital Dungeon Master uses the latest in large language model technology to create dynamic, responsive storytelling that adapts to your choices and dice rolls.

Built using the [SLOP protocol](https://github.com/agentprotocol/SLOP) (Simple Language Open Protocol), this project demonstrates how AI can be used to create engaging interactive experiences with minimal complexity.

## ✨ Features

- 🎲 **Real-time dice rolls** that determine your fate
- 🗡️ **Dynamic inventory system** to track your equipment and treasures
- 📜 **Persistent game state** so your adventure continues where you left off
- 🧠 **Adaptive storytelling** that responds to your decisions
- 🎭 **Rich character development** with stats, skills, and progression
- 🏰 **Endless adventure possibilities** limited only by your imagination

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- An OpenAI API key

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/ai-dnd-chat-game.git
cd ai-dnd-chat-game
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Create a `.env` file in the server directory:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

4. Start the server:
```bash
npm start
```

5. Open the client:
   - Simply open `client/index.html` in your web browser
   - Or serve it using a local web server of your choice

## 🎮 How to Play

1. **Start Your Adventure**: Open the game in your browser and begin your quest!
2. **Make Choices**: Respond to the AI Dungeon Master's prompts with your decisions.
3. **Roll the Dice**: The system automatically rolls dice to determine outcomes.
4. **Manage Your Character**: Keep track of your inventory, stats, and skills as you progress.
5. **Explore the World**: Discover new locations, characters, and quests as you adventure.

## 🧩 Game Mechanics

### Dice Rolls
- **D20 System**: Most actions are determined by a 20-sided die roll
- **Outcome Tiers**:
  - 1: Critical Failure (something terrible happens)
  - 2-5: Very Bad Outcome
  - 6-10: Poor Outcome
  - 11-15: Moderate Success
  - 16-19: Great Success
  - 20: Critical Success (extraordinary results)

### Character Stats
- Track health, mana, strength, dexterity, and more
- Stats influence your ability to succeed at different types of challenges

### Inventory System
- Collect weapons, armor, potions, and quest items
- Equipment affects your character's capabilities in combat and exploration

## 🏗️ Technical Architecture

AI Quest is built using the SLOP protocol, which provides a simple, standardized way for AI applications to communicate.

### Backend (Server)
- **Express.js** server implementing SLOP endpoints
- **OpenAI API** integration for the AI Dungeon Master
- In-memory game state management (could be extended to use a database)

### Frontend (Client)
- Simple HTML/CSS/JavaScript client
- Real-time interface updates with dice animations
- Character sheet and inventory management

### SLOP Endpoints Used
- `/chat` - Main interaction with the AI Dungeon Master
- `/tools` - Game mechanics like combat resolution
- `/memory` - Saving and loading game state
- `/resources` - Game assets and information

## 🛠️ Customization

Want to create your own adventure or modify the game? Here are some things you can customize:

- **System Prompt**: Edit the AI instructions in `server.js` to change the game style
- **UI Theme**: Modify the CSS in `index.html` to create your own look and feel
- **Game Mechanics**: Adjust dice rolls, stats, and items to balance gameplay

## 📚 SLOP Protocol

This project implements the [SLOP protocol](https://github.com/agentprotocol/SLOP) (Simple Language Open Protocol) - a standardized way for AI services to communicate through simple HTTP endpoints. 

SLOP makes AI integration as easy as:
- Regular HTTP requests with JSON data
- Standardized endpoints for different AI capabilities
- No complex libraries or frameworks required

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Built with [SLOP](https://github.com/agentprotocol/SLOP) by AGNT.gg
- Powered by OpenAI's GPT models
- Inspired by classic tabletop role-playing games

---

*"The adventure awaits! Will you answer the call?"* 