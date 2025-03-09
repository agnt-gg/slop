# Makefile

# Variables
PYTHON = python3
FLASK_APP = slop_with_models.py
STREAMLIT_APP = streamlit_slop_with_models.py
VARS_FILE = vars.sh

# Default target
.PHONY: all
all: setup

# Setup virtual environment and install dependencies (optional)
.PHONY: setup
setup:
	$(PYTHON) -m venv venv
	./venv/bin/pip install --upgrade pip
	./venv/bin/pip install -r requirements.txt

# Run Flask server with environment variables
.PHONY: slop-flask
slop-flask:
	source $(VARS_FILE) && $(PYTHON) $(FLASK_APP)

# Run Streamlit app
.PHONY: slop-streamlit
slop-streamlit:
	./venv/bin/streamlit run $(STREAMLIT_APP)

# Clean up virtual environment
.PHONY: clean
clean:
	rm -rf venv
