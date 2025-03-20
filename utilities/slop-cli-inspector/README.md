# 🔮 SLOP CLI Inspector

A sleek command-line tool for testing and interacting with SLOP API endpoints.

## ✨ Features

- Interactive CLI interface for exploring SLOP API
- Test all standard SLOP endpoints:
  - `/chat` - Communicate with AI
  - `/tools` - Access and use API tools
  - `/memory` - Store and retrieve data
  - `/resources` - Manage knowledge resources and files
  - `/pay` - Test payment endpoints
  - `/info` - View server metadata

## 📋 Requirements

- Node.js 14.x or higher
- npm or yarn package manager

## 🚀 Installation

```bash
# Clone the repository or download the files
# Navigate to the directory

# Install dependencies
npm install

# Make the CLI executable (Unix/macOS)
chmod +x slop-cli.js
```

## 🎮 Usage

Start the CLI tool:

```bash
node slop-cli.js
```

### Getting Started

1. When prompted, enter the base URL of your SLOP API server
2. Navigate the menu by entering the number corresponding to your desired endpoint
3. Follow the prompts to interact with each endpoint

### Example Session

```
🔮 SLOP CLI Tester 🔮
===================
Enter SLOP API base URL: http://localhost:3000

Available SLOP endpoints:
1. /chat - Chat with AI
2. /tools - Use AI tools
3. /memory - Store and retrieve data
4. /resources - Access knowledge and files
5. /pay - Handle payments
6. /info - Server metadata
7. Change base URL
8. Exit
```

## 💡 Tips

- For endpoints that require JSON input, format your JSON properly
- Use the "Change base URL" option to switch between different SLOP servers
- Review the detailed response output to debug your API implementation

## 🔍 Troubleshooting

- If you get connection errors, verify your base URL is correct
- For JSON parsing errors, check that your input is valid JSON format
- If you receive unexpected responses, compare them with the SLOP API specification

## 🧩 Contributing

Found a bug or want to add a feature? Contributions are welcome!

## 📜 License

MIT
