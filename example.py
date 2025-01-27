import os
from langchain_openai import ChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize browser with Chrome path for macOS (since you're on darwin)
browser = Browser(
    config=BrowserConfig(
        chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    )
)

async def main():
    # Initialize the agent with browser instance
    agent = Agent(
        task="Write a letter in Google docs to my pappa, John Doe, and ask him to buy me a new laptop. You'll need to sign in with my nik@versantus.co.uk details using Lastpass",
        llm=ChatOpenAI(model="gpt-4o"),
        browser=browser  # Pass the browser instance
    )
    
    try:
        # Run the agent and get results
        result = await agent.run()
        print(result)
        
        # Wait for user input before closing
        input('Press Enter to close...')
    finally:
        # Make sure to close the browser
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main()) 