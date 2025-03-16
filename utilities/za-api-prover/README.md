# Za API Prover (ZAP) - SLOP Validator 🚀

## 🌟 Overview

ZAP is a programmatic API status checker designed to validate SLOP server implementations. It automatically tests each required endpoint against protocol specifications, providing a straightforward way to:

- Verify your SLOP server is functioning correctly
- Confirm API responses match expected formats 
- Identify compliance issues with the SLOP protocol
- Monitor API health with structured reporting

The validator works by making real HTTP requests to your SLOP server and analyzing the responses, eliminating manual testing and ensuring consistent validation across implementations.

## 🌟 Features

✅ Validates core SLOP endpoints:

- **/chat** - Tests message exchange
- **/tools** - Lists available tools
- **/memory** - Stores and retrieves data
- **/resources** - Checks resource availability
- **/pay** - Simulates transactions

🔄 Sends real API requests to verify responses.  
📊 Generates structured JSON reports.

## Installation

### Python Version

```bash
pip install requests
python zap_slop_validator.py http://localhost:3000
```

### JavaScript Version

```bash
npm install axios
node zap_slop_validator.js http://localhost:3000
```

## Usage

Run the validator with your SLOP server's base URL:

```bash
python zap_slop_validator.py http://your-slop-server.com
```

OR

```bash
node zap_slop_validator.js http://your-slop-server.com
```

## Example Output

```json
{
  "chat": {"statusCode": 200, "response": {"message": {"content": "Hello!"}}},
  "tools": {"statusCode": 200, "response": {"tools": [{"id": "greet", "description": "Says hello"}]}},
  "memory": {"storeResponse": {"statusCode": 200}, "getResponse": {"statusCode": 200, "response": {"value": "hello world"}}},
  "resources": {"statusCode": 200, "response": {"resources": [{"id": "doc1", "title": "Example Document"}]}},
  "pay": {"statusCode": 200, "response": {"transaction_id": "tx_123456"}}
}
```

## License

This project is open-source and free to use under the MIT License.