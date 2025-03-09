# streamlit_slop_with_models.py
import streamlit as st
import requests

BASE_URL = "http://localhost:5000"


def main():
    st.title("SLOP Streamlit with Dynamic Models")
    st.markdown("[Explore API Documentation](/openapi/)", unsafe_allow_html=True)
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

    try:
        response = requests.get(f"{BASE_URL}/models", timeout=5)
        response.raise_for_status()
        models = response.json()["models"]
    except requests.RequestException as e:
        st.warning(f"Could not fetch models: {str(e)}")
        models = []

    selected_model = st.selectbox(
        "Select Model", models if models else ["No models available"]
    )

    if "chat_history" not in st.session_state:
        st.session_state.chat_history = []

    for entry in st.session_state.chat_history:
        st.write(f"**User**: {entry['user']}")
        st.write(f"**Assistant**: {entry['assistant']}")

    with st.form(key="chat_form", clear_on_submit=True):
        message = st.text_area("Enter your message", height=100, key="chat_input")
        submit_button = st.form_submit_button(label="Submit", type="primary")

        st.markdown(
            """
            <script>
            const textarea = document.querySelector('textarea');
            textarea.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    document.querySelector('button[type="submit"]').click();
                }
            });
            </script>
        """,
            unsafe_allow_html=True,
        )

        if submit_button and message and models:
            try:
                response = requests.post(
                    f"{BASE_URL}/chat",
                    json={
                        "messages": [{"role": "user", "content": message}],
                        "model": selected_model,
                    },
                    timeout=5,
                )
                response.raise_for_status()
                assistant_response = response.json()["choices"][0]["message"]["content"]
                st.session_state.chat_history.append(
                    {"user": message, "assistant": assistant_response}
                )
                st.rerun()
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")


def tools_interface():
    st.header("Tools")
    try:
        response = requests.get(f"{BASE_URL}/tools", timeout=5)
        response.raise_for_status()
        tools = response.json()["tools"]
    except requests.RequestException as e:
        st.warning(f"Could not fetch tools: {str(e)}")
        tools = []

    if not tools:
        st.write("No tools available.")
        return

    tool_id = st.selectbox("Select a tool", [t["id"] for t in tools])

    if tool_id == "calculator":
        expression = st.text_input("Enter expression (e.g., 2 + 2)")
        if st.button("Calculate"):
            try:
                response = requests.post(
                    f"{BASE_URL}/tools/{tool_id}",
                    json={"expression": expression},
                    timeout=5,
                )
                response.raise_for_status()
                st.write(f"Result: {response.json()['result']}")
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")

    elif tool_id == "greet":
        name = st.text_input("Enter name")
        if st.button("Greet"):
            try:
                response = requests.post(
                    f"{BASE_URL}/tools/{tool_id}", json={"name": name}, timeout=5
                )
                response.raise_for_status()
                st.write(response.json()["result"])
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")


def memory_interface():
    st.header("Memory")
    action = st.radio("Action", ["Store", "Retrieve", "List", "Delete"])

    if action == "Store":
        key = st.text_input("Key")
        value = st.text_input("Value")
        if st.button("Store"):
            try:
                response = requests.post(
                    f"{BASE_URL}/memory", json={"key": key, "value": value}, timeout=5
                )
                response.raise_for_status()
                st.success("Stored successfully!")
                list_response = requests.get(f"{BASE_URL}/memory", timeout=5)
                list_response.raise_for_status()
                keys = list_response.json()["keys"]
                st.write("Current Memory Keys:", ", ".join(keys) if keys else "None")
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")

    elif action == "Retrieve":
        key = st.text_input("Key to retrieve")
        if st.button("Retrieve"):
            try:
                response = requests.get(f"{BASE_URL}/memory/{key}", timeout=5)
                response.raise_for_status()
                value = response.json()["value"]
                st.write(f"Value: {value if value is not None else 'Not found'}")
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")

    elif action == "List":
        if st.button("List All Keys"):
            try:
                response = requests.get(f"{BASE_URL}/memory", timeout=5)
                response.raise_for_status()
                keys = response.json()["keys"]
                st.write("Memory Keys:", ", ".join(keys) if keys else "None")
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")

    elif action == "Delete":
        key = st.text_input("Key to delete")
        if st.button("Delete"):
            try:
                response = requests.delete(f"{BASE_URL}/memory/{key}", timeout=5)
                response.raise_for_status()
                st.success("Deleted successfully!")
                list_response = requests.get(f"{BASE_URL}/memory", timeout=5)
                list_response.raise_for_status()
                keys = list_response.json()["keys"]
                st.write("Current Memory Keys:", ", ".join(keys) if keys else "None")
            except requests.RequestException as e:
                st.error(f"Error: {str(e)}")


def resources_interface():
    st.header("Resources")
    try:
        response = requests.get(f"{BASE_URL}/resources", timeout=5)
        response.raise_for_status()
        resources = response.json()["resources"]
    except requests.RequestException as e:
        st.warning(f"Could not fetch resources: {str(e)}")
        resources = []

    if not resources:
        st.write("No resources available.")
        return

    resource_id = st.selectbox("Select resource", [r["id"] for r in resources])
    if st.button("Get Resource"):
        try:
            response = requests.get(f"{BASE_URL}/resources/{resource_id}", timeout=5)
            response.raise_for_status()
            st.write(response.json().get("content", response.json()))
        except requests.RequestException as e:
            st.error(f"Error: {str(e)}")


def pay_interface():
    st.header("Pay")
    amount = st.number_input("Amount", min_value=0.0, step=0.01)
    if st.button("Pay"):
        try:
            response = requests.post(
                f"{BASE_URL}/pay", json={"amount": amount}, timeout=5
            )
            response.raise_for_status()
            st.write(f"Transaction ID: {response.json()['transaction_id']}")
            st.write(f"Status: {response.json()['status']}")
        except requests.RequestException as e:
            st.error(f"Error: {str(e)}")


if __name__ == "__main__":
    main()
