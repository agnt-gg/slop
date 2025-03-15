import http from 'http';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket, { WebSocketServer } from 'ws';

// Get the directory name using fileURLToPath for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SLOPInspector {
    constructor(targetUrl, port = 4000) {
        // Ensure targetUrl ends without a trailing slash
        this.targetUrl = targetUrl ? targetUrl.replace(/\/$/, '') : '';
        this.port = port;
        this.endpoints = {
            chat: '/chat',
            tools: '/tools',
            memory: '/memory',
            resources: '/resources',
            pay: '/pay'
        };
        this.trafficLogs = [];
        this.validationResults = null;
        this.clients = new Set();
        
        // Log the target URL for debugging
        console.log(`Initialized with target URL: ${this.targetUrl}`);
    }

    // ZAP Validation Methods (from existing za-api-prover)
    async validateChat() {
        const url = `${this.targetUrl}${this.endpoints.chat}`;
        console.log(`Validating chat endpoint: ${url}`);
        const payload = { messages: [{ role: "user", content: "Hello SLOP!" }] };
        return this._sendRequest('POST', url, payload);
    }

    async validateTools() {
        // Changed to match server implementation
        const url = `${this.targetUrl}/tools/alchemy_table`;
        console.log(`Validating tools endpoint: ${url}`);
        const payload = { player_id: "test_player", parameters: { ingredients: ["herb", "crystal"] } };
        return this._sendRequest('POST', url, payload);
    }

    async validateMemory() {
        const storeUrl = `${this.targetUrl}${this.endpoints.memory}`;
        const getUrl = `${this.targetUrl}${this.endpoints.memory}/zap_test`;
        
        console.log(`Validating memory endpoints: ${storeUrl} and ${getUrl}`);
        
        const storePayload = { key: "zap_test", value: "hello world" };
        const storeResponse = await this._sendRequest('POST', storeUrl, storePayload);
        const getResponse = await this._sendRequest('GET', getUrl);
        
        return { storeResponse, getResponse };
    }

    async validateResources() {
        const url = `${this.targetUrl}${this.endpoints.resources}`;
        console.log(`Validating resources endpoint: ${url}`);
        return this._sendRequest('GET', url);
    }

    async validatePay() {
        const url = `${this.targetUrl}${this.endpoints.pay}`;
        console.log(`Validating pay endpoint: ${url}`);
        const payload = { player_id: "test_player", amount: 10, currency: "gold", description: "Test transaction" };
        return this._sendRequest('POST', url, payload);
    }

    async _sendRequest(method, url, payload = null) {
        // Validate URL to prevent "undefined" URLs
        if (!url || url.includes('undefined')) {
            console.error(`Invalid URL detected: "${url}". Check if targetUrl is properly set.`);
            return { error: `Invalid URL: ${url}` };
        }
        
        const startTime = Date.now();
        let response, error;
        
        try {
            console.log(`Sending ${method} request to: ${url}`);
            if (payload) {
                console.log(`With payload:`, payload);
            }
            
            response = await axios({ method, url, data: payload });
            
            // Log this request for traffic monitoring
            this.logTraffic({
                timestamp: new Date().toISOString(),
                method,
                url,
                payload,
                statusCode: response.status,
                response: response.data,
                responseTime: Date.now() - startTime
            });
            
            return {
                statusCode: response.status,
                response: response.data,
                responseTime: Date.now() - startTime
            };
        } catch (err) {
            // Log failed requests too
            this.logTraffic({
                timestamp: new Date().toISOString(),
                method,
                url,
                payload,
                error: err.message,
                responseTime: Date.now() - startTime
            });
            
            return { error: err.message };
        }
    }

    async runValidation() {
        const results = {
            chat: await this.validateChat(),
            tools: await this.validateTools(),
            memory: await this.validateMemory(),
            resources: await this.validateResources(),
            pay: await this.validatePay()
        };
        
        this.validationResults = results;
        this.broadcastToClients({ type: 'validationResults', data: results });
        return results;
    }

    // Traffic Monitoring Methods (STA)
    logTraffic(logEntry) {
        this.trafficLogs.push(logEntry);
        // Keep only latest 500 entries to prevent memory issues
        if (this.trafficLogs.length > 500) {
            this.trafficLogs.shift();
        }
        
        // Broadcast to connected clients
        this.broadcastToClients({ type: 'newTraffic', data: logEntry });
    }

    getTrafficLogs(filters = {}) {
        let filteredLogs = [...this.trafficLogs];
        
        if (filters.endpoint) {
            filteredLogs = filteredLogs.filter(log => log.url.includes(filters.endpoint));
        }
        
        if (filters.statusCode) {
            filteredLogs = filteredLogs.filter(log => log.statusCode === filters.statusCode);
        }
        
        if (filters.timeRange) {
            // Implement time range filtering
        }
        
        return filteredLogs;
    }

    // API Debugging Methods
    async replayRequest(requestData) {
        const { method, url, payload } = requestData;
        return this._sendRequest(method, url, payload);
    }

    // Server methods
    startServer() {
        // Create HTTP server for serving the HTML dashboard
        const server = http.createServer((req, res) => {
            if (req.url === '/') {
                // Serve the HTML dashboard
                fs.readFile(path.join(__dirname, '../client/client.html'), (err, data) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Error loading dashboard');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                });
            } else if (req.url === '/api/validation-results') {
                // API endpoint to get validation results
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.validationResults || {}));
            } else if (req.url === '/api/traffic-logs') {
                // API endpoint to get traffic logs
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getTrafficLogs()));
            } else if (req.url === '/api/run-validation' && req.method === 'POST') {
                // API endpoint to trigger validation
                this.runValidation().then(results => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(results));
                });
            } else if (req.url === '/api/replay-request' && req.method === 'POST') {
                // API endpoint to replay a request
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    const requestData = JSON.parse(body);
                    this.replayRequest(requestData).then(result => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(result));
                    });
                });
            } else {
                res.writeHead(404);
                res.end('Not found');
            }
        });

        // Add WebSocket server for real-time updates
        const wss = new WebSocketServer({ server });
        
        wss.on('connection', (ws) => {
            // Add new client to the set
            this.clients.add(ws);
            
            // Send initial data
            ws.send(JSON.stringify({ 
                type: 'initialData', 
                data: {
                    trafficLogs: this.trafficLogs,
                    validationResults: this.validationResults,
                    targetUrl: this.targetUrl
                }
            }));
            
            ws.on('close', () => {
                this.clients.delete(ws);
            });
            
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    if (data.type === 'runValidation') {
                        this.runValidation();
                    } else if (data.type === 'replayRequest') {
                        this.replayRequest(data.requestData);
                    }
                } catch (err) {
                    console.error('Error processing WebSocket message:', err);
                }
            });
        });
        
        server.listen(this.port, () => {
            console.log(`SLOP Inspector running at http://localhost:${this.port}`);
            console.log(`Monitoring SLOP server at: ${this.targetUrl}`);
        });
    }
    
    broadcastToClients(data) {
        const message = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }
}

// CLI entry point
const args = process.argv.slice(2);
const flags = {};

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
        const flag = args[i].slice(2);
        flags[flag] = args[i + 1] || true;
        if (typeof flags[flag] !== 'boolean') {
            i++;
        }
    }
}

if (flags.monitor) {
    const port = flags.port ? parseInt(flags.port) : 4000;
    
    // Validate the target URL format
    let targetUrl = flags.monitor;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `http://${targetUrl}`;
        console.log(`No protocol specified, using: ${targetUrl}`);
    }
    
    const inspector = new SLOPInspector(targetUrl, port);
    inspector.startServer();
    
    console.log(`SLOP Inspector running at http://localhost:${port}`);
    console.log(`Monitoring SLOP server at: ${targetUrl}`);
    
    // Run initial validation
    inspector.runValidation();
} else {
    console.log("Usage: node slop-inspector.js --monitor <SLOP_SERVER_URL> [--port <PORT>]");
    console.log("Example: node slop-inspector.js --monitor localhost:3000 --port 4000");
}

export default SLOPInspector;