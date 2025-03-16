# 🐍 SLOP Python Example

<p align="left">
  <img src="https://img.shields.io/badge/SLOP-Python-blue?style=for-the-badge" alt="SLOP Python">
  <img src="https://img.shields.io/badge/Simplicity-100%25-brightgreen?style=for-the-badge" alt="Simplicity 100%">
</p>

A clean, minimal implementation of the [SLOP](https://github.com/agnt-gg/slop) pattern in Python. Simple, powerful, and ready to use in minutes.

## 🔍 What is SLOP?

SLOP (Simple Lightweight Open Protocol) is a standardized pattern for AI applications. This example shows how easily it can be implemented in Python.

## ⚡ Quick Start

```bash
# Clone the repo
git clone https://github.com/agnt-gg/slop
cd slop/python

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run it
python slop.py
```

## 🔌 API Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| **🗣️ CHAT** | Talk to AI | `POST /chat` with `{"messages": [{"content": "Hello SLOP!"}]}` |
| **🛠️ TOOLS** | Use tools | `GET /tools` or `POST /tools/calculator` with `{"expression": "2 + 2"}` |
| **💾 MEMORY** | Store data | `POST /memory` with `{"key": "test", "value": "hello"}` |
| **📚 RESOURCES** | Get knowledge | `GET /resources` or `GET /resources/hello` |
| **💰 PAY** | Handle payments | `POST /pay` with `{"amount": 10}` |

### Detailed Examples

```python
# CHAT - Talk to AI
POST /chat
{
  "messages": [{ "content": "Hello SLOP!" }]
}

# TOOLS - Use tools
GET /tools
POST /tools/calculator { "expression": "2 + 2" }
POST /tools/greet { "name": "SLOP" }

# MEMORY - Store data
POST /memory { "key": "test", "value": "hello" }
GET /memory/test

# RESOURCES - Get knowledge
GET /resources
GET /resources/hello

# PAY - Handle payments
POST /pay { "amount": 10 }
```

## 📂 Project Structure

This implementation is intentionally minimal:

- `slop.py` - The entire implementation ✨
- `requirements.txt` - Dependencies

That's it. Just two files.

## 📦 Dependencies

- `flask` - For clean API routing
- `requests` - For testing endpoints

## 🧪 Try It

After starting the server, it automatically runs tests for all endpoints:

```bash
python slop.py

# Output:
✨ SLOP running on http://localhost:5000
🚀 Running tests...

📝 Testing chat...
You said: Hello SLOP!

🔧 Testing tools...
2 + 2 = 4
Hello, SLOP!

💾 Testing memory...
Stored value: hello world

📚 Testing resources...
Resource content: Hello, SLOP!

💰 Testing pay...
Transaction: tx_1234567890

✅ All tests passed!
```

## 🌐 Learn More

Check out the [main SLOP repository](https://github.com/agnt-gg/slop) for:
- 📋 Full specification
- 🌍 Examples in other languages
- 🧠 Core concepts
- ✅ Best practices

**Remember:** SLOP is just a pattern - this simple implementation shows how elegantly it works in Python!

---

<p align="center">
  <i>Built with ❤️ for the AI developer community</i>
</p>