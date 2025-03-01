# AI Browser Control Demo

A demonstration of AI-powered browser automation using browser-use. This demo shows how AI agents can control web browsers to perform tasks like writing documents and conducting research.

## Electron App

This project also includes an Electron desktop application that allows you to run the browser automation locally or connect to a remote backend.

### Prerequisites for Electron App

- Node.js 14 or higher
- npm 6 or higher
- The following global npm packages:
  - cross-env
  - wait-on

Install the required global packages:
```bash
npm install -g cross-env wait-on
```

### Running the Electron App

1. Install Python dependencies first:
```bash
pip install -r requirements.txt
playwright install
```

2. Navigate to the react-cli-ui directory:
```bash
cd react-cli-ui
```

3. Install Node.js dependencies:
```bash
npm install
```

4. Run the app in development mode:
```bash
npm run electron-dev
```

### Building the Electron App

To create distributable packages:
```bash
npm run electron-build
```

This will create packages in the `dist` directory for your current platform.

### Electron App Features

- Run browser automation locally or connect to a remote backend
- Select Chrome executable path using a file browser
- Configure remote backend URL
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

- Python 3.8 or higher
- Google Chrome browser installed
- An OpenAI API key (for OpenAI-based CLI)
- Ollama installed and running locally (optional, only for Ollama-based CLI)

## Installation

### 1. Clone the Repository

Clone this repository and navigate to the directory:
    git clone https://github.com/versantus/browseruse.git
    cd browseruse

### 2. Set Up Python Environment

For Windows:
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt
    playwright install

For macOS/Linux:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    playwright install

### 3. Configure Environment Variables

Create a .env file in the project root and add your OpenAI API key:
    OPENAI_API_KEY=your-api-key-here

## Running the Demo

### Important: Before Running
1. Ensure you have a stable internet connection
2. Make sure you have sufficient OpenAI API credits

### Start the Presentation

For Windows:
    python presentation.py

For macOS/Linux:
    python3 presentation.py

### Using the CLI Tool

#### OpenAI-based CLI

The `cli.py` script provides a command-line interface for running web research using OpenAI models:

```bash
# Basic usage (launches a new browser instance)
python cli.py "Research prompt or query"

# Run with visible browser
python cli.py --no-headless "Research prompt or query"

# Connect to an existing browser instance
python cli.py --connect-existing --chrome-path "/path/to/chrome" "Research prompt"
```

#### Ollama-based CLIs

There are three Ollama-based CLI scripts available:

1. **Browser-based Ollama CLI** (`cli_ollama.py`):
   This script attempts to use the standard Agent class with Ollama, but may have compatibility issues:

   ```bash
   # Basic usage (launches a new browser instance with default llama2 model)
   python cli_ollama.py "Research prompt or query"

   # Specify a different Ollama model
   python cli_ollama.py --model mistral "Research prompt or query"

   # Specify a custom Ollama server URL
   python cli_ollama.py --base-url "http://192.168.1.100:11434" "Research prompt"

   # Run with visible browser
   python cli_ollama.py --no-headless "Research prompt or query"
   ```

   **Note:** This version may have compatibility issues with certain Ollama models.

2. **Direct Browser-based Ollama CLI** (`cli_ollama_direct.py`):
   This script uses a custom simplified agent implementation that works directly with Ollama and controls the browser:

   ```bash
   # Basic usage (launches a new browser instance with default llama2 model)
   python cli_ollama_direct.py "Research prompt or query"

   # Specify a different Ollama model
   python cli_ollama_direct.py --model mistral "Research prompt or query"

   # Specify a custom Ollama server URL
   python cli_ollama_direct.py --base-url "http://192.168.1.100:11434" "Research prompt"

   # Run with visible browser
   python cli_ollama_direct.py --no-headless "Research prompt or query"
   ```

   **Note:** This version is more reliable but has a simpler agent implementation.

3. **Simple Ollama CLI** (`simple_cli_ollama.py`):
   This script provides a basic CLI that uses Ollama directly without browser automation:

   ```bash
   # Basic usage (uses default llama2 model)
   python simple_cli_ollama.py "What is the capital of France?"

   # Specify a different Ollama model
   python simple_cli_ollama.py --model mistral "What is the capital of France?"

   # Specify a custom Ollama server URL
   python simple_cli_ollama.py --base-url "http://192.168.1.100:11434" "What is the capital of France?"
   ```

**Prerequisites for Ollama CLIs:**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Start the Ollama service locally
3. Pull your desired model (e.g., `ollama pull llama2`)

**Note:** Both Ollama CLIs use direct HTTP requests to the Ollama API and do not require the langchain-ollama package.

#### Connecting to Existing Browser

You can connect to an existing Chrome browser instead of launching a new one:

1. **Using Chrome Path** (recommended for most users):
   ```bash
   # macOS
   python cli.py --connect-existing --chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "Research prompt"
   
   # Windows
   python cli.py --connect-existing --chrome-path "C:\Program Files\Google\Chrome\Application\chrome.exe" "Research prompt"
   ```
   
   When using this option, the tool will:
   - Automatically start Chrome with remote debugging enabled on port 9222
   - Create a separate user data directory to avoid conflicts with your main profile
   - Connect to this Chrome instance for the research task

2. **Using WebSocket URL** (for advanced users):
   If you've already started Chrome with remote debugging:
   ```bash
   python cli.py --connect-existing --wss-url "ws://localhost:9222/devtools/browser/[id]" "Research prompt"
   ```
   
   You can find the WebSocket ID by visiting `http://localhost:9222/json/version` in your browser.

3. **Using CDP URL** (for advanced users):
   If you've already started Chrome with remote debugging:
   ```bash
   python cli.py --connect-existing --cdp-url "http://localhost:9222/json/version" "Research prompt"
   ```

#### Advanced Options

```bash
# Enable browser security features (disabled by default)
python cli.py --enable-security "Research prompt"

# Pass extra arguments to Chrome
python cli.py --chromium-arg="--disable-web-security" --chromium-arg="--user-data-dir=./ChromeProfile" "Research prompt"

# Use a proxy
python cli.py --proxy "http://user:pass@host:port" "Research prompt"
```

## File Structure

- presentation.py - Main presentation script with Versantus branding
- example.py - First demo (Google Docs letter writing)
- example3.py - Second demo (Research and report writing)
- cli.py - Command-line interface for web research using OpenAI
- cli_ollama.py - Command-line interface for web research using Ollama with browser automation
- cli_ollama_direct.py - Direct browser-based CLI using Ollama with a simplified agent implementation
- simple_cli_ollama.py - Simple command-line interface for using Ollama directly without browser automation
- inspect_browser.py - Utility to inspect browser configuration options
- test_ollama.py - Test script for Ollama API connectivity
- requirements.txt - Python dependencies
- .env - Environment variables (create this file)

## Credits

Created by Versantus
Using browser-use - Enable AI to control your browser
