# slop_with_models.py
from flask import Flask, request, jsonify
from datetime import datetime
import os
from openai import OpenAI

app = Flask(__name__)

# Global model-to-client map
MODEL_CLIENT_MAP = {}

# Load endpoints from environment variables with default API key
ENDPOINTS = []
for i in range(1000):  # Support MODEL_ENDPOINT_0 to MODEL_ENDPOINT_999
    endpoint = os.getenv(f"MODEL_ENDPOINT_{i}")
    if endpoint:
        ENDPOINTS.append(
            {
                "name": f"endpoint_{i}",
                "base_url": endpoint,
                "api_key": os.getenv(f"MODEL_API_KEY_{i}", "not-needed"),
            }
        )
    else:
        continue


# Initialize model map by querying endpoints
def initialize_model_map():
    MODEL_CLIENT_MAP.clear()
    print("Initializing model map...")

    for ep in ENDPOINTS:
        base_url = ep["base_url"]
        api_key = ep["api_key"]
        endpoint_name = ep["name"]

        # Create a dedicated client for this endpoint
        client = OpenAI(base_url=base_url, api_key=api_key)

        # Attempt to list the models from this endpoint
        try:
            response = client.models.list()
            model_list = response.data  # List of Model objects
            print(f"[DEBUG] {endpoint_name} => {[m.id for m in model_list]}")
        except Exception as e:
            print(f"[WARN] Could not list models for endpoint '{endpoint_name}': {e}")
            continue

        # Map each model to its client
        for m in model_list:
            model_id = m.id
            if model_id and model_id not in MODEL_CLIENT_MAP:
                MODEL_CLIENT_MAP[model_id] = client

    print("Loaded models:")
    print(list(MODEL_CLIENT_MAP.keys()))


# Existing SLOP components (abridged)
tools = {
    "calculator": {
        "id": "calculator",
        "description": "Basic math",
        "execute": lambda params: {"result": eval(params["expression"])},
    },
    "greet": {
        "id": "greet",
        "description": "Says hello",
        "execute": lambda params: {"result": f"Hello, {params['name']}!"},
    },
}
resources = {"hello": {"id": "hello", "content": "Hello, SLOP!"}}
memory = {}


# CHAT endpoint using OpenAI client
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("messages", [{}])[0].get("content", "nothing")
    model_id = data.get(
        "model", list(MODEL_CLIENT_MAP.keys())[0]
    )  # Default to first model

    if model_id not in MODEL_CLIENT_MAP:
        return jsonify({"error": "Model not found"}), 404

    client = MODEL_CLIENT_MAP[model_id]
    try:
        response = client.chat.completions.create(
            model=model_id, messages=[{"role": "user", "content": message}]
        )
        return jsonify(
            {"choices": [{"message": {"content": response.choices[0].message.content}}]}
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# List available models
@app.route("/models", methods=["GET"])
def list_models():
    return jsonify({"models": list(MODEL_CLIENT_MAP.keys())})


# Other SLOP endpoints (unchanged from previous example)
@app.route("/tools", methods=["GET"])
def list_tools():
    return jsonify({"tools": list(tools.values())})


@app.route("/tools/<tool_id>", methods=["POST"])
def use_tool(tool_id):
    if tool_id not in tools:
        return jsonify({"error": "Tool not found"}), 404
    return jsonify(tools[tool_id]["execute"](request.json))


@app.route("/memory", methods=["POST"])
def store_memory():
    data = request.json
    memory[data["key"]] = data["value"]
    return jsonify({"status": "stored"})


@app.route("/memory/<key>", methods=["GET"])
def get_memory(key):
    return jsonify({"value": memory.get(key)})


@app.route("/resources", methods=["GET"])
def list_resources():
    return jsonify({"resources": list(resources.values())})


@app.route("/resources/<resource_id>", methods=["GET"])
def get_resource(resource_id):
    if resource_id not in resources:
        return jsonify({"error": "Resource not found"}), 404
    return jsonify(resources[resource_id])


@app.route("/pay", methods=["POST"])
def pay():
    return jsonify(
        {"transaction_id": f"tx_{int(datetime.now().timestamp())}", "status": "success"}
    )


if __name__ == "__main__":
    # Initialize models on startup
    initialize_model_map()
    app.run(debug=True)
