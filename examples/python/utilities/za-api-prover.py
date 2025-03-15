import requests
import json
import argparse

class ZaAPIProver:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.endpoints = {
            "chat": "/chat",
            "tools": "/tools",
            "memory": "/memory",
            "resources": "/resources",
            "pay": "/pay"
        }
        
    def validate_chat(self):
        url = f"{self.base_url}{self.endpoints['chat']}"
        payload = {"messages": [{"role": "user", "content": "Hello SLOP!"}]}
        return self._send_request("POST", url, payload)

    def validate_tools(self):
        url = f"{self.base_url}{self.endpoints['tools']}"
        return self._send_request("GET", url)

    def validate_memory(self):
        store_url = f"{self.base_url}{self.endpoints['memory']}"
        get_url = f"{self.base_url}{self.endpoints['memory']}/zap_test"
        
        # Store a test value
        store_payload = {"key": "zap_test", "value": "hello world"}
        store_response = self._send_request("POST", store_url, store_payload)
        
        # Retrieve the stored value
        get_response = self._send_request("GET", get_url)
        
        return {"store_response": store_response, "get_response": get_response}

    def validate_resources(self):
        url = f"{self.base_url}{self.endpoints['resources']}"
        return self._send_request("GET", url)

    def validate_pay(self):
        url = f"{self.base_url}{self.endpoints['pay']}"
        payload = {"amount": 10}
        return self._send_request("POST", url, payload)

    def _send_request(self, method, url, payload=None):
        try:
            if method == "GET":
                response = requests.get(url)
            elif method == "POST":
                response = requests.post(url, json=payload)
            else:
                return {"error": "Unsupported method"}

            return {
                "status_code": response.status_code,
                "response": response.json() if response.content else {}
            }
        except Exception as e:
            return {"error": str(e)}

    def run_tests(self):
        results = {
            "chat": self.validate_chat(),
            "tools": self.validate_tools(),
            "memory": self.validate_memory(),
            "resources": self.validate_resources(),
            "pay": self.validate_pay()
        }
        return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Za API Prover (ZAP) - SLOP Validator")
    parser.add_argument("url", type=str, help="Base URL of the SLOP server")
    args = parser.parse_args()
    
    prover = ZaAPIProver(args.url)
    test_results = prover.run_tests()
    
    print(json.dumps(test_results, indent=2))
