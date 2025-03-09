# slop_with_models.py
from flask import Flask, request
from datetime import datetime
import os
from openai import OpenAI
import logging
from flask_openapi3 import OpenAPI, Info, Tag
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# OpenAPI configuration
info = Info(
    title="SLOP API",
    version="1.0.0",
    description="A SLOP pattern implementation with dynamic model endpoints",
)
app = OpenAPI(__name__, info=info)

# Tags for organization
chat_tag = Tag(name="Chat", description="Chat with AI models")
tools_tag = Tag(name="Tools", description="Utility tools")
memory_tag = Tag(name="Memory", description="Key-value storage")
resources_tag = Tag(name="Resources", description="Static content")
pay_tag = Tag(name="Pay", description="Payment simulation")
models_tag = Tag(name="Models", description="List available models")


# Pydantic request models
class ChatRequest(BaseModel):
    messages: list[dict]  # e.g., [{"content": "Hello"}]
    model: str | None = None  # Optional model ID


class ToolRequest(BaseModel):
    expression: str | None = None  # For calculator
    name: str | None = None  # For greet


class MemoryStoreRequest(BaseModel):
    key: str
    value: str


class PayRequest(BaseModel):
    amount: float


# Pydantic response models
class ChatResponse(BaseModel):
    choices: list[dict]


class ErrorResponse(BaseModel):
    error: str


class ModelsResponse(BaseModel):
    models: list[str]


class ToolsResponse(BaseModel):
    tools: list[dict]


class ToolResponse(BaseModel):
    result: str | int


class MemoryStoreResponse(BaseModel):
    status: str


class MemoryGetResponse(BaseModel):
    value: str | None


class ResourcesResponse(BaseModel):
    resources: list[dict]


class ResourceResponse(BaseModel):
    id: str
    content: str


class PayResponse(BaseModel):
    transaction_id: str
    status: str


# Global model-to-client map
MODEL_CLIENT_MAP = {}

# Load endpoints from environment variables, tolerating gaps
ENDPOINTS = []
for i in range(1000):  # Check MODEL_ENDPOINT_0 to MODEL_ENDPOINT_999
    endpoint = os.getenv(f"MODEL_ENDPOINT_{i}")
    if endpoint:
        ENDPOINTS.append(
            {
                "name": f"endpoint_{i}",
                "base_url": endpoint,
                "api_key": os.getenv(f"MODEL_API_KEY_{i}", "not-needed"),
            }
        )


# Initialize model map by querying endpoints
def initialize_model_map():
    MODEL_CLIENT_MAP.clear()
    logger.info("Initializing model map...")

    if not ENDPOINTS:
        logger.warning("No endpoints configured in environment variables.")
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
            logger.info(f"Added fallback model '{default_model}' for {endpoint_name}")
            continue

        for m in model_list:
            model_id = m.id
            if model_id:
                if model_id in MODEL_CLIENT_MAP:
                    logger.warning(
                        f"Duplicate model ID '{model_id}' found; keeping first instance."
                    )
                else:
                    MODEL_CLIENT_MAP[model_id] = client
                    logger.info(f"Added model '{model_id}' from {endpoint_name}")
            else:
                logger.warning(f"Encountered model with no ID from {endpoint_name}")

    logger.info(f"Loaded models: {list(MODEL_CLIENT_MAP.keys())}")
    if not MODEL_CLIENT_MAP:
        logger.warning("No models were successfully loaded.")


# Existing SLOP components
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


# API Endpoints with OpenAPI specs
@app.post(
    "/chat",
    tags=[chat_tag],
    summary="Send a message to an AI model",
    responses={"200": ChatResponse, "404": ErrorResponse, "500": ErrorResponse},
)
def chat(body: ChatRequest):
    """Send a message to a specified model."""
    message = body.messages[0].get("content", "nothing") if body.messages else "nothing"
    model_id = body.model or (
        list(MODEL_CLIENT_MAP.keys())[0] if MODEL_CLIENT_MAP else None
    )

    if not model_id or model_id not in MODEL_CLIENT_MAP:
        logger.error(f"Invalid or missing model_id: {model_id}")
        return ErrorResponse(error="Model not found or no models available").dict(), 404

    client = MODEL_CLIENT_MAP[model_id]
    try:
        response = client.chat.completions.create(
            model=model_id, messages=[{"role": "user", "content": message}]
        )
        logger.debug(
            f"Chat response for model {model_id}: {response.choices[0].message.content}"
        )
        return (
            ChatResponse(
                choices=[{"message": {"content": response.choices[0].message.content}}]
            ).dict(),
            200,
        )
    except Exception as e:
        logger.error(f"Chat error with model {model_id}: {str(e)}")
        return ErrorResponse(error=str(e)).dict(), 500


@app.get(
    "/models",
    tags=[models_tag],
    summary="List available models",
    responses={"200": ModelsResponse},
)
def list_models():
    """Retrieve the list of available model IDs."""
    models = list(MODEL_CLIENT_MAP.keys())
    logger.debug(f"Returning models: {models}")
    return ModelsResponse(models=models).dict(), 200


@app.get(
    "/tools",
    tags=[tools_tag],
    summary="List available tools",
    responses={"200": ToolsResponse},
)
def list_tools():
    """Retrieve the list of available tools."""
    return ToolsResponse(tools=list(tools.values())).dict(), 200


@app.post(
    "/tools/<tool_id>",
    tags=[tools_tag],
    summary="Use a specific tool",
    responses={"200": ToolResponse, "404": ErrorResponse},
)
def use_tool(tool_id: str, body: ToolRequest):
    """Execute a tool with given parameters."""
    if tool_id not in tools:
        return ErrorResponse(error="Tool not found").dict(), 404

    # Validate input based on tool_id
    params = body.dict(exclude_unset=True)  # Only include fields that were set
    if tool_id == "calculator" and "expression" not in params:
        return ErrorResponse(error="Missing 'expression' for calculator").dict(), 400
    if tool_id == "greet" and "name" not in params:
        return ErrorResponse(error="Missing 'name' for greet").dict(), 400

    result = tools[tool_id]["execute"](params)
    return ToolResponse(**result).dict(), 200


@app.post(
    "/memory",
    tags=[memory_tag],
    summary="Store a key-value pair",
    responses={"200": MemoryStoreResponse},
)
def store_memory(body: MemoryStoreRequest):
    """Store a value under a key in memory."""
    memory[body.key] = body.value
    return MemoryStoreResponse(status="stored").dict(), 200


@app.get(
    "/memory/<key>",
    tags=[memory_tag],
    summary="Retrieve a value by key",
    responses={"200": MemoryGetResponse},
)
def get_memory(key: str):
    """Get a stored value by its key."""
    return MemoryGetResponse(value=memory.get(key)).dict(), 200


@app.get(
    "/resources",
    tags=[resources_tag],
    summary="List available resources",
    responses={"200": ResourcesResponse},
)
def list_resources():
    """Retrieve the list of available resources."""
    return ResourcesResponse(resources=list(resources.values())).dict(), 200


@app.get(
    "/resources/<resource_id>",
    tags=[resources_tag],
    summary="Get a specific resource",
    responses={"200": ResourceResponse, "404": ErrorResponse},
)
def get_resource(resource_id: str):
    """Retrieve a specific resource by ID."""
    if resource_id not in resources:
        return ErrorResponse(error="Resource not found").dict(), 404
    return ResourceResponse(**resources[resource_id]).dict(), 200


@app.post(
    "/pay", tags=[pay_tag], summary="Simulate a payment", responses={"200": PayResponse}
)
def pay(body: PayRequest):
    """Simulate a payment transaction."""
    return (
        PayResponse(
            transaction_id=f"tx_{int(datetime.now().timestamp())}", status="success"
        ).dict(),
        200,
    )


if __name__ == "__main__":
    initialize_model_map()
    app.run(debug=True)
