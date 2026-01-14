# Attio Chatbot (Local Development)

This project is a functional chatbot application that can answer questions about your data stored in Attio. It is built with a Python/Flask backend and a plain HTML/CSS/JavaScript frontend, and has been configured for easy local development on a Windows machine.

This application also includes a feature to send a weekly email digest of inactive deals.

## Project Structure
```
.
├── api/
│   └── chatbot.py      # The Python Flask backend logic for the chatbot and digest.
├── public/
│   ├── index.html      # The main chat interface.
│   ├── style.css       # Styles for the chat interface.
│   └── script.js       # Frontend logic to communicate with the backend.
└── requirements.txt    # Python dependencies for the backend.
```

## Local Development Setup

### Step 1: Set Environment Variables

The backend needs API keys and configuration for Attio, an LLM, and your email server.

Open Command Prompt (cmd.exe) and use the `setx` command for each variable. **Restart your terminal after running these commands for them to take effect.**

```cmd
:: Attio and LLM Keys
setx ATTIO_API_KEY "YOUR_ATTIO_API_KEY_PLACEHOLDER"
setx LLM_API_KEY "YOUR_LLM_API_KEY_PLACEHOLDER"

:: Email Digest SMTP Configuration
setx SMTP_HOST "YOUR_SMTP_HOST"
setx SMTP_PORT "587"
setx SMTP_USER "YOUR_SMTP_USERNAME"
setx SMTP_PASSWORD "YOUR_SMTP_PASSWORD"
setx SENDER_EMAIL "your_email@example.com"
setx RECIPIENT_EMAIL "manishg@nextphase.ai"

:: Digest Security Token (a random, secret string you create)
setx DIGEST_SECRET_TOKEN "your_secret_random_string"
```

### Step 2: Install Dependencies and Run Backend

It is highly recommended to use a virtual environment to manage project dependencies.

```cmd
:: Navigate to the project directory
cd attio-chatbot

:: Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate

:: Install the required Python packages
pip install -r requirements.txt

:: Run the Flask backend server
python api\chatbot.py
```

Leave this terminal running. The Python backend is now running and listening on `http://127.0.0.1:5000`.

### Step 3: Run the Frontend

Open a **second terminal** and run the following commands:

```cmd
:: Navigate to the project directory
cd attio-chatbot

:: Activate the same virtual environment
.venv\Scripts\activate

:: Start a simple web server from the 'public' directory
python -m http.server -d public 8080
```

### Step 4: Use the Chatbot

Open your web browser and navigate to: **http://127.0.0.1:8080**

## Weekly Email Digest Feature

This application includes an API endpoint to generate and send an email digest of "deals to focus on".

### How to Trigger the Digest Manually

You can send a test digest using a tool like `curl` from your command line. Make sure you replace `your_secret_random_string` with the actual secret token you set in your environment variables.

```cmd
curl -X POST http://127.0.0.1:5000/api/send-digest -H "Authorization: Bearer your_secret_random_string"
```

If successful, this will send an email to the configured recipient.

### How to Automate the Digest

To send this digest weekly, you need to set up a scheduled task to run the `curl` command above.

- **On Windows:** You can use the **Task Scheduler**.
- **On macOS or Linux:** You can use a **cron job**.

For example, a cron job to run this every Monday at 8:00 AM would look like this:
```cron
0 8 * * 1 curl -X POST http://127.0.0.1:5000/api/send-digest -H "Authorization: Bearer your_secret_random_string"
```
