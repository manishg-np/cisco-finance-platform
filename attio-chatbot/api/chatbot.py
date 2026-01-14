from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
import json

# ==============================================================================
# Flask App Initialization
# ==============================================================================
# When deploying to a serverless environment, the web server (like Gunicorn)
# will look for a callable named 'app'.
app = Flask(__name__)

# Enable CORS for local development to allow the frontend to call the backend.
CORS(app)

# ==============================================================================
# Configuration
# ==============================================================================
# It's best practice to load sensitive keys from environment variables.
# In Cloudflare, these would be set as "secrets" in the dashboard.
ATTIO_API_KEY = os.environ.get("ATTIO_API_KEY", "YOUR_ATTIO_API_KEY_PLACEHOLDER")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "YOUR_LLM_API_KEY_PLACEHOLDER")

# The base URL for the Attio API.
ATTIO_API_URL = "https://api.attio.com/v2"

# The endpoint for the LLM. This is a placeholder for Google's Gemini API.
LLM_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={LLM_API_KEY}"

# ==============================================================================
# Attio API Helper Functions
# ==============================================================================
def search_attio_objects(query_string):
    """
    A placeholder function to search for objects (e.g., people, companies) in Attio.
    This is a simplified example. A real implementation would be more robust.
    """
    headers = {
        "Authorization": f"Bearer {ATTIO_API_KEY}",
        "Content-Type": "application/json"
    }
    # This example assumes a simple search endpoint. You'll need to adapt this
    # to the actual capabilities of the Attio API, for example, by querying
    # a specific object and filtering results.
    search_payload = {
        "query": query_string
        # This payload is hypothetical. You will need to construct a real one
        # based on Attio's API documentation for searching or filtering.
    }
    # For this example, let's assume we are querying a list of all People.
    # A real-world scenario might involve more complex logic to decide which object to query.
    response = requests.post(f"{ATTIO_API_URL}/objects/people/query", headers=headers, json={"data": {}})
    
    if response.status_code == 200:
        # We are returning the raw data here. You might want to process it
        # to extract only the most relevant information.
        return response.json()
    else:
        # Basic error handling
        print(f"Error fetching data from Attio: {response.status_code} {response.text}")
        return None

def get_inactive_deals():
    """
    Fetches deals that are considered "inactive" to be included in the digest.
    
    This is a placeholder and makes assumptions about the Attio API.
    You will need to replace this with a real query based on your Attio setup.
    
    Assumptions:
    - There is a "Deals" object in Attio.
    - Deals have a "Last Activity" timestamp attribute.
    - Deals have a "Deal Value" attribute.
    """
    from datetime import datetime, timedelta, timezone

    headers = {
        "Authorization": f"Bearer {ATTIO_API_KEY}",
        "Content-Type": "application/json"
    }

    # Calculate the timestamp for 7 days ago in the required format (ISO 8601 with Z)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat().replace('+00:00', 'Z')

    # This is a HYPOTHETICAL query. You MUST adapt it to your Attio data model
    # and the Attio API's filtering capabilities.
    query_payload = {
        "filter": {
            "and": [
                {
                    # Assumption: An attribute for "last modified" or "last activity"
                    "attribute": "last_activity_timestamp",
                    "operator": "lt", # "less than"
                    "value": seven_days_ago
                },
                {
                    # Optional: Filter for deals that are still open
                    "attribute": "status",
                    "operator": "not_in",
                    "value": ["Closed Won", "Closed Lost"]
                }
            ]
        }
    }

    # You need to replace 'deals' with the actual ID of your "Deals" object in Attio.
    response = requests.post(f"{ATTIO_API_URL}/objects/deals/query", headers=headers, json={"data": query_payload})

    if response.status_code == 200:
        return response.json().get('data', [])
    else:
        print(f"Error fetching inactive deals from Attio: {response.status_code} {response.text}")
        return []

# ==============================================================================
# LLM Helper Function
# ==============================================================================
def get_llm_response(question, context_data):
    """
    Gets a response from the LLM based on the user's question and retrieved context.
    This is an example for Google's Gemini API.
    """
    prompt = f"""
    Based on the following data from Attio, please answer the user's question.
    If the data is insufficient to answer the question, say that you couldn't find the information.

    Context Data:
    {json.dumps(context_data, indent=2)}

    User's Question:
    {question}
    """

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(LLM_API_URL, headers=headers, json=payload)
    
    if response.status_code == 200:
        try:
            data = response.json()
            # Navigating the Gemini API response structure
            return data['candidates'][0]['content']['parts'][0]['text']
        except (KeyError, IndexError) as e:
            return f"Error processing LLM response: {e}"
    else:
        return f"Error from LLM API: {response.status_code} {response.text}"

# ==============================================================================
# Email Digest Functions
# ==============================================================================
def send_digest_email(inactive_deals):
    """
    Composes and sends the weekly digest email.
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    # Load SMTP configuration from environment variables
    SMTP_HOST = os.environ.get("SMTP_HOST", "YOUR_SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
    SMTP_USER = os.environ.get("SMTP_USER", "YOUR_SMTP_USER")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "YOUR_SMTP_PASSWORD")
    SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "sender@example.com")
    RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL", "manishg@nextphase.ai")

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your Weekly Attio Digest: Deals to Focus On"
    message["From"] = SENDER_EMAIL
    message["To"] = RECIPIENT_EMAIL

    # Create the HTML content for the email
    html = """
    <html>
    <body>
        <h2>Here are the deals that have been inactive for over 7 days:</h2>
        <table border="1" cellpadding="5" cellspacing="0">
            <tr>
                <th>Deal Name</th>
                <th>Value</th>
            </tr>
    """
    if not inactive_deals:
        html += '<tr><td colspan="2">No inactive deals found. Great job!</td></tr>'
    else:
        for deal in inactive_deals:
            # You must adapt these keys to your actual Attio data structure
            deal_name = deal.get('name', 'N/A')
            deal_value = deal.get('deal_value', {}).get('value', 'N/A')
            html += f"<tr><td>{deal_name}</td><td>{deal_value}</td></tr>"
    
    html += """
        </table>
        <p>This is an automated report from the Attio Chatbot.</p>
    </body>
    </html>
    """

    message.attach(MIMEText(html, "html"))

    try:
        # Connect to the SMTP server and send the email
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()  # Secure the connection
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SENDER_EMAIL, RECIPIENT_EMAIL, message.as_string())
        server.quit()
        print(f"Digest email successfully sent to {RECIPIENT_EMAIL}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

# ==============================================================================
# API Routes
# ==============================================================================
@app.route('/api/chatbot', methods=['POST'])
def chatbot_handler():
    """
    The main API endpoint for the chatbot.
    """
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({"error": "Question not provided"}), 400

    question = data['question']

    # 1. Search Attio for relevant context.
    context_data = search_attio_objects(question)

    if context_data is None:
        return jsonify({"answer": "Sorry, I had trouble connecting to Attio."})

    # 2. Pass the question and context to the LLM to get a natural language answer.
    answer = get_llm_response(question, context_data)

    # 3. Return the answer to the frontend.
    return jsonify({"answer": answer})

@app.route('/api/send-digest', methods=['POST'])
def digest_handler():
    """
    An endpoint to trigger the sending of the weekly digest.
    This should be called by a scheduler (e.g., a cron job).
    For security, it requires a secret token to be passed in the headers.
    """
    # Simple token-based security
    auth_header = request.headers.get('Authorization')
    expected_token = f"Bearer {os.environ.get('DIGEST_SECRET_TOKEN', 'DEFAULT_SECRET')}"

    if not auth_header or auth_header != expected_token:
        return jsonify({"error": "Unauthorized"}), 401

    # 1. Fetch the inactive deals from Attio.
    inactive_deals = get_inactive_deals()

    # 2. Send the digest email.
    success = send_digest_email(inactive_deals)

    if success:
        return jsonify({"status": "Digest sent successfully."})
    else:
        return jsonify({"error": "Failed to send digest."}), 500

# ==============================================================================
# Local Development Entrypoint
# ==============================================================================
if __name__ == '__main__':
    # This block allows you to run the Flask app locally for testing.
    # The command would be `python api/chatbot.py`.
    # It won't be used when deployed to a serverless environment.
    app.run(port=5000, debug=True)

