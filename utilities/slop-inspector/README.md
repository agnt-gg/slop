# 🕵️‍♂️ SLOP Inspector

<div align="center">
  <img src="https://github.com/agnt-gg/slop/blob/main/utilities/slop-inspector/screenshot.PNG?raw=true" alt="SLOP Inspector" width="100%"/>
  <p><em>The Ultimate SLOP Debugging & Validation Tool</em></p>
</div>

## 🌟 Overview
SLOP Inspector is your secret weapon for debugging, validating, and analyzing SLOP (Simple Language Open Protocol) implementations! Think of it as your API's best friend - always watching, always helping, never judging (okay, maybe a little judging when you forget a required parameter).

## ✨ Super Cool Features

- 🔴 **Live Traffic Monitoring**: Watch API requests fly back and forth in real-time - it's like air traffic control for your data!
- ✅ **Endpoint Validation**: Is your SLOP implementation up to snuff? Find out before your users do!
- 🛠️ **Interactive API Debugger**: Build and send test requests with the satisfying click of a button
- 📊 **Performance Analysis**: Track those sweet, sweet response times and brag about your success rates
- 🔌 **WebSocket Magic**: Get updates faster than you can say "Why is my API returning a 500 error?"

## 🚀 Installation

```bash
# Clone the repository (or download like it's 1999)
git clone https://github.com/agnt-gg/slop/
cd slop/utilities/slop-inspector/server

# Install dependencies (grab a coffee, this might take a whole 10 seconds)
npm install
```

## 🏃‍♂️ Usage

### Starting the Inspector

```bash
# Basic usage (nothing fancy)
node server.js --monitor <your-slop-server-url>

# Example with custom port (for the port connoisseurs)
node server.js --monitor http://localhost:3000 --port 4000

# No http:// prefix? No problem! We'll add it for you because we're nice like that
node server.js --monitor localhost:3000
```

### Accessing the Dashboard

Once started, point your favorite browser to:

```
http://localhost:4000
```

## 🎮 Dashboard Features

### 🔍 Traffic Monitor
- See every API call with crystal clarity
- Filter by endpoint or status code (because who has time to scroll?)
- Examine request/response data like a digital detective
- Export logs for when your boss asks "what happened?"

### 🧪 SLOP Validation
- Test all required SLOP endpoints and feel that sweet, sweet validation:
  - `/chat`: Where the magic conversations happen
  - `/tools`: For when your AI needs to DO things
  - `/memory`: Because even AIs need to remember stuff
  - `/resources`: Static content that's anything but static in importance
  - `/pay`: Show me the money! 💰

### 🔧 API Debugger
- Craft custom requests like an API artisan
- Mess with payloads and see what breaks (we won't tell)
- Watch responses roll in faster than you can say "JSON"

## 🧙‍♂️ How It Works

SLOP Inspector works its magic by:

1. Starting a local web server faster than you can say "localhost"
2. Serving up a dashboard so pretty you might actually enjoy debugging
3. Testing your SLOP endpoints with the care of a helicopter parent
4. Monitoring traffic like a nosy neighbor (but in a helpful way)
5. Using WebSockets because polling is so 2010

## 📋 Standard SLOP Endpoints Supported

- **Chat** (`/chat`): Where AIs chat like there's no tomorrow
- **Tools** (`/tools`): When talking isn't enough and action is needed
- **Memory** (`/memory`): Because forgetting things is for humans, not APIs
- **Resources** (`/resources`): Static content that's dynamically useful
- **Pay** (`/pay`): Money makes the world go 'round, even in API land

## ⚙️ Requirements

- Node.js 14.16.0 or higher (we're not savages)
- An active SLOP server to monitor (otherwise we're just staring at an empty room)

## 📜 License

MIT (It's free! We're nice like that)

---

Created with ❤️ by the SLOP community for developers who prefer their debugging with a side of fun.

**Remember**: A happy developer is a productive developer, and nothing makes developers happier than a working API!
