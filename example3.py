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
        task="Research the US 2024 election results using BBC news."
        + " Close any other browser tabs before you start. Then write a Google docs report about it. . Write as if it was written by Nik Roberts, our US correspondent. Use quotes from the BBC news article, but make the rest of the text distinct. Add placeholder images and infographics. The article should be around 1000 words." 
         + "After writing the doc, use File > email to send it to nik@versantus.co.uk with a simple summary.",
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
