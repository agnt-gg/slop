# SLOP Streamlit Example

Streamlit-based SLOP example with dynamic model endpoints. It explains the purpose, setup, usage, and structure in a clear and concise way.

This is a Python implementation of the [SLOP pattern](https://github.com/agnt-gg/slop) using Flask as a backend server and Streamlit as a frontend interface. It dynamically discovers and utilizes language models from OpenAI-compatible endpoints (e.g., vLLM, Ollama, etc.) specified via environment variables.

## Features

- **Chat**: Send messages to dynamically discovered AI models.
- **Tools**: Use simple tools like a calculator and greeter.
- **Memory**: Store and retrieve key-value pairs.
- **Resources**: Access predefined static content.
- **Pay**: Simulate a payment transaction.

## Prerequisites

- Python 3.8+
- A terminal to run commands
- Optional: Access to OpenAI-compatible model endpoints (e.g., `https://hermes.ai.unturf.com/v1`)

## Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/agnt-gg/slop
   cd slop/examples/streamlit
   ```

2. **Set Up Virtual Environment**:

   ```bash
   make setup
   ```
   This creates a virtual environment (`venv`) and installs dependencies from `requirements.txt`.

3. **Configure Model Endpoints**:
   Edit `vars.sh` to specify your model endpoints:

   ```bash
   # vars.sh
   export MODEL_ENDPOINT_0=https://hermes.ai.unturf.com/v1
   export MODEL_ENDPOINT_1=https://node2.naptha.ai/inference
   export MODEL_ENDPOINT_2=https://node3.naptha.ai/inference
   ```
   - Gaps in numbering (e.g., skipping `MODEL_ENDPOINT_1`) are supported.
   - API keys are optional; defaults to `"not-needed"` if unset (e.g., `export MODEL_API_KEY_0=your-key`).

## Usage

1. **Run the Flask Server**:
   Open a terminal and start the backend:

   ```bash
   make slop-flask
   ```
   - This sources `vars.sh` and runs `slop_with_models.py` on `http://localhost:31337`.
   - Logs will show model discovery (e.g., `Loaded models: [model1, endpoint_7:default]`).

2. **Run the Streamlit App**:
   Open a second terminal and start the frontend:

   ```bash
   make slop-streamlit
   ```
   - Opens in your browser at `http://localhost:8501`.
   - Displays a UI with Chat, Tools, Memory, Resources, and Pay sections.

3. **Interact**:
   - **Chat**: Select a model from the dropdown and send a message.
   - **Tools**: Use the calculator or greeter.
   - **Memory**: Store/retrieve values.
   - **Resources**: View static content.
   - **Pay**: Simulate a transaction.

4. **Clean Up** (optional):

   ```bash
   make clean
   ```
   Removes the virtual environment.

## Files

- **`slop_with_models.py`**: Flask server implementing the SLOP pattern with dynamic model discovery.
- **`streamlit_slop_with_models.py`**: Streamlit frontend for user interaction.
- **`Makefile`**: Simplifies ``make setup`` and running with ``make slop-flask`` and ``make slop-streamlit``.
- **`vars.sh`**: Environment variables for model endpoints. Feel free to start with ``vars.sh.sample``!
- **`requirements.txt`**: Dependencies

## How It Works

1. **Model Discovery**:
   - The Flask server scans `MODEL_ENDPOINT_0` to `MODEL_ENDPOINT_999` from `vars.sh`.
   - Queries each endpoint’s `/v1/models` using the OpenAI client.
   - Maps model IDs to their respective clients

2. **API Endpoints**:
   - `/models`: Returns the list of discovered models.
   - `/chat`: Handles chat completions with the selected model.
   - `/tools`, `/memory`, `/resources`, `/pay`: Implement SLOP pattern features.

3. **Frontend**:
   - Streamlit fetches the model list from `/models` and provides a dropdown.
   - Sends requests to Flask for chat and other functionalities.

## Troubleshooting

- **No Models in Dropdown**:
  - Check Flask logs (`make slop-flask`) for errors (e.g., `Failed to list models for endpoint_X`).
  - Test endpoints with `curl <endpoint>/v1/models` to ensure they’re OpenAI-compatible.
- **Server Not Responding**:
  - Ensure Flask is running (`make slop-flask`) before starting Streamlit.
- **Environment Variables**:
  - Verify `vars.sh` is correct and sourced (`source vars.sh; echo $MODEL_ENDPOINT_0`).

## Dependencies

Listed in `requirements.txt`:
- `flask`: Backend server
- `streamlit`: Frontend UI
- `openai`: Client for model endpoints
- `requests`: HTTP requests in Streamlit

## Learn More

- [SLOP Specification](https://github.com/agnt-gg/slop)

This example demonstrates a flexible, extensible SLOP implementation with a modern UI. Contributions and feedback are welcome!

---

This is research into the genesis of of the future https://slop.unturf.com/

The code in this example is Public Domain.
