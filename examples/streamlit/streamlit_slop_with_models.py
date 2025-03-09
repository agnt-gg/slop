# streamlit_slop_with_models.py
import streamlit as st
import requests

BASE_URL = "http://localhost:5000"


def main():
    st.title("SLOP Streamlit with Dynamic Models")
    page = st.sidebar.selectbox(
        "Choose a feature", ["Chat", "Tools", "Memory", "Resources", "Pay"]
    )

    if page == "Chat":
        chat_interface()
    elif page == "Tools":
        tools_interface()
    elif page == "Memory":
        memory_interface()
    elif page == "Resources":
        resources_interface()
    elif page == "Pay":
        pay_interface()


def chat_interface():
    st.header("Chat")

    # Fetch available models
    try:
        models = requests.get(f"{BASE_URL}/models").json()["models"]
    except Exception as e:
        st.error(f"Could not fetch models: {str(e)}")
        models = []

    selected_model = st.selectbox(
        "Select Model", models if models else ["No models available"]
    )
    message = st.text_area("Enter your message")

    if st.button("Send") and models:
        try:
            response = requests.post(
                f"{BASE_URL}/chat",
                json={"messages": [{"content": message}], "model": selected_model},
            ).json()
            st.write("Response:")
            st.write(response["choices"][0]["message"]["content"])
        except Exception as e:
            st.error(f"Error: {str(e)}")


def tools_interface():
    st.header("Tools")
    tools = requests.get(f"{BASE_URL}/tools").json()["tools"]
    tool_id = st.selectbox("Select a tool", [t["id"] for t in tools])

    if tool_id == "calculator":
        expression = st.text_input("Enter expression (e.g., 2 + 2)")
        if st.button("Calculate"):
            response = requests.post(
                f"{BASE_URL}/tools/{tool_id}", json={"expression": expression}
            ).json()
            st.write(f"Result: {response['result']}")

    elif tool_id == "greet":
        name = st.text_input("Enter name")
        if st.button("Greet"):
            response = requests.post(
                f"{BASE_URL}/tools/{tool_id}", json={"name": name}
            ).json()
            st.write(response["result"])


def memory_interface():
    st.header("Memory")
    action = st.radio("Action", ["Store", "Retrieve"])

    if action == "Store":
        key = st.text_input("Key")
        value = st.text_input("Value")
        if st.button("Store"):
            requests.post(f"{BASE_URL}/memory", json={"key": key, "value": value})
            st.success("Stored successfully!")

    else:
        key = st.text_input("Key to retrieve")
        if st.button("Retrieve"):
            response = requests.get(f"{BASE_URL}/memory/{key}").json()
            st.write(f"Value: {response['value']}")


def resources_interface():
    st.header("Resources")
    resources = requests.get(f"{BASE_URL}/resources").json()["resources"]
    resource_id = st.selectbox("Select resource", [r["id"] for r in resources])
    if st.button("Get Resource"):
        response = requests.get(f"{BASE_URL}/resources/{resource_id}").json()
        st.write(response.get("content", response))


def pay_interface():
    st.header("Pay")
    amount = st.number_input("Amount", min_value=0.0, step=0.01)
    if st.button("Pay"):
        response = requests.post(f"{BASE_URL}/pay", json={"amount": amount}).json()
        st.write(f"Transaction ID: {response['transaction_id']}")
        st.write(f"Status: {response['status']}")


if __name__ == "__main__":
    main()
