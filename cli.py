#!/usr/bin/env python3
import os
import asyncio
import argparse
from typing import List, Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig

# Load environment variables
load_dotenv()

async def run_research(
    prompt: str, 
    headless: bool = True, 
    disable_security: bool = True,
    extra_chromium_args: List[str] = None,
    chrome_path: str = None, 
    wss_url: str = None, 
    cdp_url: str = None,
    proxy: str = None,
    connect_existing: bool = False,
    embedded_browser: bool = False
):
    """
    Run research with the given prompt and browser configuration.
    
    Args:
        prompt: The research prompt/query
        headless: Whether to run browser in headless mode
        disable_security: Whether to disable browser security features
        extra_chromium_args: Extra arguments to pass to the browser
        chrome_path: Path to Chrome executable to connect to your normal browser
        wss_url: WebSocket URL to connect to an existing browser
        cdp_url: CDP URL to connect to an existing browser
        proxy: Proxy settings in format "http://user:pass@host:port"
        connect_existing: Whether to connect to an existing browser
    """
    # Prepare extra chromium args
    chromium_args = extra_chromium_args or []
    
    # If connecting to existing browser, add necessary flags
    if connect_existing:
        # Make sure we're not trying to launch a new browser
        if chrome_path and not any([arg.startswith('--remote-debugging-port') for arg in chromium_args]):
            print("Starting Chrome with remote debugging enabled...")
            import subprocess
            import time
            
            # Start Chrome with remote debugging if not already running with it
            debug_port = "9222"
            
            # Add the remote debugging port to the command
            chrome_args = [
                chrome_path,
                f"--remote-debugging-port={debug_port}",
                "--no-first-run",
                "--no-default-browser-check",
                "--user-data-dir=./ChromeUserData"  # Use a separate user data directory
            ]
            
            # Start Chrome process
            try:
                subprocess.Popen(chrome_args)
                print(f"Chrome started with remote debugging on port {debug_port}")
                time.sleep(2)  # Give Chrome time to start
                
                # Set the CDP URL to connect to this instance
                cdp_url = f"http://localhost:{debug_port}/json/version"
                chrome_path = None  # Don't use chrome_path anymore since we're using CDP
            except Exception as e:
                print(f"Error starting Chrome: {e}")
    
    # If embedded browser is enabled, ensure we're using the right configuration
    if embedded_browser:
        # Force headless to False when using embedded browser
        headless = False
        
        # Make sure we have the remote debugging port set
        if not any([arg.startswith('--remote-debugging-port=') for arg in chromium_args]):
            chromium_args.append('--remote-debugging-port=9222')
        
        # Add other necessary flags for embedding
        if not any([arg == '--no-sandbox' for arg in chromium_args]):
            chromium_args.append('--no-sandbox')
            
        print("Running in embedded browser mode with args:", chromium_args)
    
    # Initialize browser with configurable options
    config = BrowserConfig(
        headless=headless,
        disable_security=disable_security,
        extra_chromium_args=chromium_args,
        chrome_instance_path=chrome_path,
        wss_url=wss_url,
        cdp_url=cdp_url,
        proxy={"server": proxy} if proxy else None
    )
    
    browser = Browser(config=config)
    
    try:
        # Initialize the agent with browser instance
        agent = Agent(
            task=prompt,
            llm=ChatOpenAI(model="gpt-4o"),
            browser=browser
        )
        
        # Run the agent and get results
        result = await agent.run()
        print("\n=== Research Results ===\n")
        
        # Extract only the final text message from the result
        if isinstance(result, dict):
            # Try to extract the final message from the result
            if 'final_text' in result:
                print(result['final_text'])
            elif 'message' in result:
                print(result['message'])
            elif 'text' in result:
                print(result['text'])
            elif 'content' in result:
                print(result['content'])
            else:
                # If we can't find a text field, print the entire result
                print(result)
        else:
            # If result is not a dictionary, print it as is
            print(result)
        
    finally:
        # Make sure to close the browser
        await browser.close()

def main():
    parser = argparse.ArgumentParser(description='Web Research CLI Tool')
    prompt_group = parser.add_mutually_exclusive_group(required=True)
    prompt_group.add_argument('prompt', type=str, nargs='?', help='Research prompt/query')
    prompt_group.add_argument('--file', type=str, help='Path to a file containing the research prompt/query')
    
    # Browser visibility options
    visibility_group = parser.add_argument_group('Browser Visibility')
    visibility_group.add_argument('--no-headless', action='store_true', 
                      help='Run with browser visible (default: headless/invisible)')
    visibility_group.add_argument('--embedded-browser', action='store_true',
                      help='Run browser in embedded mode (for iframe integration)')
    
    # Add options for connecting to existing browser
    browser_group = parser.add_argument_group('Existing Browser Connection')
    browser_group.add_argument('--connect-existing', action='store_true',
                             help='Connect to an existing browser instance (requires one of --chrome-path, --wss-url, or --cdp-url)')
    browser_group.add_argument('--chrome-path', type=str, 
                             help='Path to Chrome executable to connect to your normal browser (e.g., "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")')
    browser_group.add_argument('--wss-url', type=str, 
                             help='WebSocket URL to connect to an existing browser (e.g., "ws://localhost:9222/devtools/browser/[id]")')
    browser_group.add_argument('--cdp-url', type=str, 
                             help='CDP URL to connect to an existing browser (e.g., "http://localhost:9222/json/version")')
    
    # Advanced browser configuration
    advanced_group = parser.add_argument_group('Advanced Browser Configuration')
    advanced_group.add_argument('--enable-security', action='store_true',
                              help='Enable browser security features (default: disabled)')
    advanced_group.add_argument('--chromium-arg', action='append', dest='extra_chromium_args',
                              help='Extra arguments to pass to the browser (can be used multiple times)')
    advanced_group.add_argument('--proxy', type=str,
                              help='Proxy settings in format "http://user:pass@host:port"')
    
    args = parser.parse_args()
    
    # Validate connection arguments if --connect-existing is specified
    if args.connect_existing and not (args.chrome_path or args.wss_url or args.cdp_url):
        parser.error("--connect-existing requires one of --chrome-path, --wss-url, or --cdp-url")
    
    try:
        # Run the research with browser configuration
        asyncio.run(run_research(
            prompt=args.prompt, 
            headless=not args.no_headless,
            disable_security=not args.enable_security,
            extra_chromium_args=args.extra_chromium_args,
            chrome_path=args.chrome_path,
            wss_url=args.wss_url,
            cdp_url=args.cdp_url,
            proxy=args.proxy,
            connect_existing=args.connect_existing,
            embedded_browser=args.embedded_browser
        ))
    except KeyboardInterrupt:
        print("\n\nResearch interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
