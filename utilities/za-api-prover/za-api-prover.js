import axios from 'axios';

class ZaAPIProver {
    constructor(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.endpoints = {
            chat: '/chat',
            tools: '/tools',
            memory: '/memory',
            resources: '/resources',
            pay: '/pay'
        };
    }

    async validateChat() {
        const url = `${this.baseUrl}${this.endpoints.chat}`;
        const payload = { messages: [{ role: "user", content: "Hello SLOP!" }] };
        return this._sendRequest('POST', url, payload);
    }

    async validateTools() {
        const url = `${this.baseUrl}${this.endpoints.tools}`;
        return this._sendRequest('GET', url);
    }

    async validateMemory() {
        const storeUrl = `${this.baseUrl}${this.endpoints.memory}`;
        const getUrl = `${this.baseUrl}${this.endpoints.memory}/zap_test`;
        
        const storePayload = { key: "zap_test", value: "hello world" };
        const storeResponse = await this._sendRequest('POST', storeUrl, storePayload);
        const getResponse = await this._sendRequest('GET', getUrl);
        
        return { storeResponse, getResponse };
    }

    async validateResources() {
        const url = `${this.baseUrl}${this.endpoints.resources}`;
        return this._sendRequest('GET', url);
    }

    async validatePay() {
        const url = `${this.baseUrl}${this.endpoints.pay}`;
        const payload = { amount: 10 };
        return this._sendRequest('POST', url, payload);
    }

    async _sendRequest(method, url, payload = null) {
        try {
            const response = await axios({ method, url, data: payload });
            return {
                statusCode: response.status,
                response: response.data
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async runTests() {
        return {
            chat: await this.validateChat(),
            tools: await this.validateTools(),
            memory: await this.validateMemory(),
            resources: await this.validateResources(),
            pay: await this.validatePay()
        };
    }
}

if (require.main === module) {
    const baseUrl = process.argv[2];
    if (!baseUrl) {
        console.error("Usage: node zap_slop_validator.js <SLOP_SERVER_URL>");
        process.exit(1);
    }

    const prover = new ZaAPIProver(baseUrl);
    prover.runTests().then(results => {
        console.log(JSON.stringify(results, null, 2));
    });
}
