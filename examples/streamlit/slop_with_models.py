# slop_with_models.py
from flask import Flask, request, jsonify
from datetime import datetime
import os
from openai import OpenAI
import logging
from flask_swagger_ui import get_swaggerui_blueprint

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Swagger UI setup
SWAGGER_URL = "/openapi"  # URL for Swagger UI
API_URL = "/static/openapi.yaml"  # Path to the OpenAPI spec file
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL, API_URL, config={"app_name": "SLOP API"}
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

# Global model-to-client map and memory
MODEL_CLIENT_MAP = {}
memory = {}

# Load endpoints
ENDPOINTS = []
for i in range(1000):
    endpoint = os.getenv(f"MODEL_ENDPOINT_{i}")
    if endpoint:
        ENDPOINTS.append(
            {
                "name": f"endpoint_{i}",
                "base_url": endpoint,
                "api_key": os.getenv(f"MODEL_API_KEY_{i}", "not-needed"),
            }
        )


def initialize_model_map():
    MODEL_CLIENT_MAP.clear()
    logger.info("Initializing model map...")
    if not ENDPOINTS:
        logger.warning("No endpoints configured.")
        return
    for ep in ENDPOINTS:
        base_url = ep["base_url"]
        api_key = ep["api_key"]
        endpoint_name = ep["name"]
        logger.info(f"Querying endpoint: {endpoint_name} ({base_url})")
        client = OpenAI(base_url=base_url, api_key=api_key)
        try:
            response = client.models.list()
            model_list = response.data
            logger.debug(
                f"{endpoint_name} returned models: {[m.id for m in model_list]}"
            )
        except Exception as e:
            logger.error(f"Failed to list models for {endpoint_name}: {str(e)}")
            default_model = f"{endpoint_name}:default"
            MODEL_CLIENT_MAP[default_model] = client
            logger.info(f"Added fallback model '{default_model}'")
            continue
        for m in model_list:
            model_id = m.id
            if model_id:
                if model_id in MODEL_CLIENT_MAP:
                    logger.warning(f"Duplicate model ID '{model_id}' found.")
                else:
                    MODEL_CLIENT_MAP[model_id] = client
                    logger.info(f"Added model '{model_id}'")
            else:
                logger.warning(f"Encountered model with no ID from {endpoint_name}")
    logger.info(f"Loaded models: {list(MODEL_CLIENT_MAP.keys())}")


# SLOP components
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


# Endpoints
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    message = data["messages"][0]["content"] if data.get("messages") else "nothing"
    model_id = data.get("model") or (
        list(MODEL_CLIENT_MAP.keys())[0] if MODEL_CLIENT_MAP else None
    )
    if not model_id or model_id not in MODEL_CLIENT_MAP:
        logger.error(f"Invalid or missing model_id: {model_id}")
        return jsonify({"error": "Model not found"}), 404
    client = MODEL_CLIENT_MAP[model_id]
    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in data.get("messages", [])
            ]
            or [{"role": "user", "content": message}],
        )
        logger.debug(
            f"Chat response for model {model_id}: {response.choices[0].message.content}"
        )
        return (
            jsonify(
                {
                    "choices": [
                        {"message": {"content": response.choices[0].message.content}}
                    ]
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Chat error with model {model_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/models", methods=["GET"])
def list_models():
    models = list(MODEL_CLIENT_MAP.keys())
    logger.debug(f"Returning models: {models}")
    return jsonify({"models": models}), 200


@app.route("/tools", methods=["GET"])
def list_tools():
    return (
        jsonify(
            {
                "tools": [
                    {"id": k, "description": v["description"]} for k, v in tools.items()
                ]
            }
        ),
        200,
    )


@app.route("/tools/<tool_id>", methods=["POST"])
def use_tool(tool_id):
    if tool_id not in tools:
        return jsonify({"error": "Tool not found"}), 404
    data = request.json or {}
    if tool_id == "calculator" and "expression" not in data:
        return jsonify({"error": "Missing 'expression'"}), 400
    if tool_id == "greet" and "name" not in data:
        return jsonify({"error": "Missing 'name'"}), 400
    result = tools[tool_id]["execute"](data)
    return jsonify(result), 200


@app.route("/memory", methods=["POST"])
def store_memory():
    data = request.json
    memory[data["key"]] = data["value"]
    return jsonify({"status": "stored"}), 200


@app.route("/memory/<key>", methods=["GET"])
def get_memory(key):
    return jsonify({"value": memory.get(key)}), 200


@app.route("/memory", methods=["GET"])
def list_memory():
    return jsonify({"keys": list(memory.keys())}), 200


@app.route("/memory/<key>", methods=["DELETE"])
def delete_memory(key):
    if key not in memory:
        return jsonify({"error": "Key not found"}), 404
    del memory[key]
    return jsonify({"status": "deleted"}), 200


@app.route("/resources", methods=["GET"])
def list_resources():
    return jsonify({"resources": list(resources.values())}), 200


@app.route("/resources/<resource_id>", methods=["GET"])
def get_resource(resource_id):
    if resource_id not in resources:
        return jsonify({"error": "Resource not found"}), 404
    return jsonify(resources[resource_id]), 200


@app.route("/pay", methods=["POST"])
def pay():
    return (
        jsonify(
            {
                "transaction_id": f"tx_{int(datetime.now().timestamp())}",
                "status": "success",
            }
        ),
        200,
    )


if __name__ == "__main__":
    initialize_model_map()
    app.run(debug=True)
