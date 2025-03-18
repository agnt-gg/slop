# 🔍 SLOP Endpoint Inspector

> **Discover, Test & Master Your SLOP APIs in Style!**

A tiny but powerful utility tool for inspecting, discovering, and testing SLOP (Simple Language Open Protocol) API endpoints with an intuitive interface.

<div align="center">
  <img src="https://github.com/agnt-gg/slop/blob/main/utilities/endpoint-inspector/SLOP-Endpoint-Inspector-2.PNG?raw=true" alt="SLOP Inspector" width="100%"/>
  <p><em>The SLOP Endpoint Inspection Tool</em></p>
</div>

## ✨ Overview

The SLOP Endpoint Inspector is a developer's best friend when working with SLOP APIs:

- 🔎 **Discover** and map all endpoints in any SLOP-compatible API
- 🧪 **Test** endpoint functionality and supported HTTP methods in real-time
- 🏆 **Identify** standard vs. non-standard SLOP endpoints at a glance
- 📚 **View** endpoint documentation with beautiful formatting
- 🚀 **Test** requests directly from the sleek interface

## ⚡ Quick Start

Get up and running in under a minute:

```bash
# Clone the repository
git clone https://github.com/agnt-gg/slop

# Navigate to the inspector directory
cd slop/utilities/endpoint-inspector

# Install dependencies
npm install

# Start the server
npm start

# Open in your browser
# http://localhost:4000
```

Then simply enter any SLOP API URL to start inspecting!

## 🌟 Features

- **Comprehensive Endpoint Discovery** 🕸️ - Automatically crawls and maps the entire API structure
- **Method Testing** 🧰 - Tests each endpoint with GET, POST, PUT, and DELETE methods
- **Standard Compliance** ✅ - Identifies which endpoints follow the standard SLOP protocol
- **Documentation Extraction** 📑 - Pulls available documentation from the /info endpoint
- **Interactive Interface** 💻 - Clean web UI for exploring and testing endpoints
- **Request Proxying** 🔄 - Built-in proxy to handle CORS issues when testing endpoints
- **Smart Filtering** 🔍 - Filter endpoints by standard/non-standard status and documentation availability

## 🚀 Installation

Get up and running in seconds:

1. Clone this repository:
```bash
git clone https://github.com/agnt-gg/slop
cd endpoint-inspector
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:4000
```

## 📋 Usage

Using the SLOP Inspector is as easy as 1-2-3:

1. 🌐 Enter the base URL of a SLOP API into the input field (e.g., `https://example-slop-api.com/`)
2. 🖱️ Click "Inspect" to start the crawling process
3. 🔍 View the discovered endpoints, organized by category
4. ✅ Filter results with the intuitive checkbox options:
   - Show all endpoints (including unconfirmed)
   - Show only standard endpoints
   - Show only documented endpoints
5. 📊 Expand endpoint details to see:
   - Supported HTTP methods with color coding
   - Example request payloads
   - Documentation (if available)
   - Test buttons for direct API testing

## 📝 Standard SLOP Endpoints

The inspector validates against the official SLOP specification, checking for standard endpoints:

| Category | Endpoints |
|----------|-----------|
| 💬 Chat | `/chat`, `/chat/:id` |
| 🛠️ Tools | `/tools`, `/tools/:tool_id` |
| 🧠 Memory | `/memory`, `/memory/:key`, `/memory/query` |
| 📚 Resources | `/resources`, `/resources/:id`, `/resources/search`, `/resources/prefix/:prefix` |
| 💰 Payment | `/pay`, `/pay/:id` |
| ℹ️ Info | `/info` |

## 🔌 API Reference

### Server Endpoints

- `GET /`: Serves the web client interface
- `GET /crawl?url=<api-url>`: Crawls the specified SLOP API and returns its structure
- `ALL /proxy/*`: Proxy for testing API requests to avoid CORS issues

## 🛠️ Development

The application consists of three main components:

| File | Purpose |
|------|---------|
| `server.js` | Express server that hosts the web application and API |
| `crawler.js` | Core logic for discovering and testing SLOP endpoints |
| `client.html` | Web interface for interacting with the tool |

## 📜 License

ISC

## 📦 Dependencies

- **Express.js**: Web server framework
- **Node-fetch**: For making HTTP requests
- **CORS**: Cross-Origin Resource Sharing middleware

---

<p align="center">
  Made with ❤️ for SLOP API developers
</p>
