# AI Browser Control Demo

A demonstration of AI-powered browser automation using browser-use. This demo shows how AI agents can control web browsers to perform tasks like writing documents and conducting research.

## Prerequisites

- Python 3.8 or higher
- Google Chrome browser installed
- An OpenAI API key

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
1. Close all Chrome instances before running the demo
2. Ensure you have a stable internet connection
3. Make sure you have sufficient OpenAI API credits

### Start the Presentation

For Windows:
    python presentation.py

For macOS/Linux:
    python3 presentation.py

## File Structure

- presentation.py - Main presentation script with Versantus branding
- example.py - First demo (Google Docs letter writing)
- example3.py - Second demo (Research and report writing)
- requirements.txt - Python dependencies
- .env - Environment variables (create this file)

## Credits

Created by Versantus
Using browser-use - Enable AI to control your browser
