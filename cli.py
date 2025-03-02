#!/usr/bin/env python3
import os
import asyncio
import argparse
from typing import List, Optional, Dict, Any, Union
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from browser_use import Agent
from browser_use.browser.browser import Browser, BrowserConfig
from playwright_stealth import stealth_async

# Custom Browser class that applies stealth mode
class StealthBrowser(Browser):
    """
    Extended Browser class that applies stealth mode to each page.
    """
    def __init__(self, config=None, stealth_enabled=False):
        super().__init__(config=config)
        self.stealth_enabled = stealth_enabled
        
    async def new_page(self, **kwargs):
        """
        Create a new page with stealth mode applied.
        """
        page = await super().new_page(**kwargs)
        
        # Apply stealth mode to the page
        if self.stealth_enabled:
            print("Applying stealth mode to avoid captchas...")
            await stealth_async(page)
        
        return page

# Load environment variables
load_dotenv()

async def run_research(
    prompt: str, 
    headless: bool = True, 
    disable_security: bool = True,
    extra_chromium_args: Optional[List[str]] = None,
    chrome_path: Optional[str] = None, 
    wss_url: Optional[str] = None, 
    cdp_url: Optional[str] = None,
    proxy: Optional[str] = None,
    connect_existing: bool = False,
    embedded_browser: bool = False,
    use_local_browser: bool = False,  # Add parameter for local browser mode
    stealth_mode: bool = True  # Stealth mode enabled by default
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
                time.sleep(5)  # Give Chrome more time to start
                
                # Set the CDP URL to connect to this instance
                # Use socket.gethostname() to get the current hostname
                import socket
                import requests
                import time
                from urllib.parse import urlparse
                
                # Try to get the hostname, with fallback to localhost
                try:
                    hostname = socket.gethostname()
                    print(f"Got system hostname: {hostname}")
                    
                    # Try to resolve the hostname to make sure it's valid
                    try:
                        socket.gethostbyname(hostname)
                        print(f"Successfully resolved hostname {hostname} to an IP address")
                    except socket.gaierror as e:
                        print(f"Warning: Could not resolve hostname {hostname}: {e}")
                        print("This might cause connection issues. Will try using it anyway.")
                except Exception as e:
                    print(f"Error getting hostname: {e}")
                    hostname = "localhost"
                    print(f"Falling back to default hostname: {hostname}")
                
                # We'll try to use the hostname, but if that fails, we'll fall back to localhost
                # The server.js file has a similar fallback mechanism
                print(f"Setting CDP URL to http://{hostname}:{debug_port}/json/version")
                print(f"If connection fails, try manually setting --cdp-url=http://localhost:{debug_port}/json/version")
                
                # Give Chrome more time to initialize
                print("Waiting for Chrome to initialize...")
                time.sleep(3)
                
                # Define the endpoints to try
                endpoints = [
                    {"url": f"http://{hostname}:{debug_port}/json/version", "name": "hostname version"},
                    {"url": f"http://localhost:{debug_port}/json/version", "name": "localhost version"},
                    {"url": f"http://{hostname}:{debug_port}/json/list", "name": "hostname list"},
                    {"url": f"http://localhost:{debug_port}/json/list", "name": "localhost list"}
                ]
                
                # Try each endpoint until one works
                cdp_url = None
                connection_timeout = 5  # seconds
                
                for endpoint in endpoints:
                    try:
                        url = endpoint["url"]
                        name = endpoint["name"]
                        print(f"Testing connection to CDP endpoint ({name}): {url}")
                        
                        response = requests.get(url, timeout=connection_timeout)
                        if response.status_code == 200:
                            print(f"✅ Successfully connected to CDP endpoint ({name}): {url}")
                            
                            # Validate the response content
                            try:
                                response_data = response.json()
                                if isinstance(response_data, dict) or isinstance(response_data, list):
                                    print(f"Response contains valid JSON data")
                                    cdp_url = url
                                    
                                    # If this is a /json/list endpoint, use the first target's webSocketDebuggerUrl
                                    if url.endswith('/json/list') and isinstance(response_data, list) and len(response_data) > 0:
                                        if 'webSocketDebuggerUrl' in response_data[0]:
                                            print(f"Found WebSocket debugger URL in response")
                                        else:
                                            print(f"No WebSocket debugger URL found in response")
                                    
                                    # If we found a working endpoint, break the loop
                                    break
                                else:
                                    print(f"Response does not contain valid JSON data")
                            except ValueError:
                                print(f"Response is not valid JSON")
                        else:
                            print(f"❌ Failed to connect to CDP endpoint ({name}): {url}, status code: {response.status_code}")
                    except requests.exceptions.Timeout:
                        print(f"❌ Connection to CDP endpoint ({name}) timed out after {connection_timeout} seconds")
                    except requests.exceptions.ConnectionError as e:
                        print(f"❌ Connection error to CDP endpoint ({name}): {e}")
                    except Exception as e:
                        print(f"❌ Unexpected error connecting to CDP endpoint ({name}): {e}")
                
                if cdp_url:
                    print(f"✅ Successfully found working CDP URL: {cdp_url}")
                else:
                    print(f"❌ Failed to connect to any CDP endpoint. Using default URL as fallback.")
                    cdp_url = f"http://localhost:{debug_port}/json/version"
                    print(f"Fallback CDP URL: {cdp_url}")
                
                # Parse the URL to extract hostname and port for logging
                parsed_url = urlparse(cdp_url)
                final_hostname = parsed_url.hostname or "localhost"
                final_port = parsed_url.port or debug_port
                
                print(f"Final CDP connection will use hostname: {final_hostname}, port: {final_port}")
                
                chrome_path = ""  # Don't use chrome_path anymore since we're using CDP
            except Exception as e:
                print(f"Error starting Chrome: {e}")
    
    # If embedded browser is enabled, ensure we're using the right configuration
    if embedded_browser:
        # When running on a server without a display, we need to use headless mode
        # Check if we're running on a server by looking for environment variables
        import os
        is_server = os.environ.get('SERVER_ENVIRONMENT') == 'true'
        
        # Use headless mode for embedded browser
        # This ensures the browser is hidden but can still capture screenshots
        print(f"Embedded browser mode: Using headless={headless}")
        
        # Make sure we have the remote debugging port set
        if not any([arg.startswith('--remote-debugging-port=') for arg in chromium_args]):
            chromium_args.append('--remote-debugging-port=9222')
        
        # Add other necessary flags for embedding
        if not any([arg == '--no-sandbox' for arg in chromium_args]):
            chromium_args.append('--no-sandbox')
            
        # Add headless flag if headless is True
        if headless:
            # Use the new headless flag if not already specified
            if not any([arg.startswith('--headless=') for arg in chromium_args]):
                chromium_args.append('--headless=new')
            
            # Add additional flags for better headless operation
            if not any([arg == '--disable-gpu' for arg in chromium_args]):
                chromium_args.append('--disable-gpu')
            
            if not any([arg == '--disable-dev-shm-usage' for arg in chromium_args]):
                chromium_args.append('--disable-dev-shm-usage')
                
            if not any([arg == '--window-size=1280,720' for arg in chromium_args]):
                chromium_args.append('--window-size=1280,720')
            
        print("Running in embedded browser mode with args:", chromium_args)
    # For local browser, force headless mode to hide the window
    elif use_local_browser:
        # Force headless to True for local browser to hide the window
        headless = True
        print("Local browser mode: Setting headless=True to hide the browser window")
        
        # Make sure we have the remote debugging port set for screenshots
        if not any([arg.startswith('--remote-debugging-port=') for arg in chromium_args]):
            chromium_args.append('--remote-debugging-port=9222')
            
        # Add other necessary flags for headless mode
        if not any([arg.startswith('--headless=') for arg in chromium_args]):
            chromium_args.append('--headless=new')
            
        if not any([arg == '--disable-gpu' for arg in chromium_args]):
            chromium_args.append('--disable-gpu')
            
        if not any([arg == '--window-size=1280,720' for arg in chromium_args]):
            chromium_args.append('--window-size=1280,720')
            
        print("Running in local browser mode with args:", chromium_args)
    
    # Initialize browser with configurable options
    # Create a dictionary of kwargs to pass to BrowserConfig
    browser_config_kwargs = {
        "headless": headless,
        "disable_security": disable_security,
        "extra_chromium_args": chromium_args,
        "chrome_instance_path": chrome_path,
        "wss_url": wss_url,
        "cdp_url": cdp_url,
        "proxy": {"server": proxy} if proxy else None
    }
    
    # Remove any None values to avoid passing unnecessary kwargs
    browser_config_kwargs = {k: v for k, v in browser_config_kwargs.items() if v is not None}
    
    # Create the config object
    config = BrowserConfig(**browser_config_kwargs)
    
    # Use StealthBrowser by default (stealth_mode is True by default)
    if stealth_mode:
        browser = StealthBrowser(config=config, stealth_enabled=True)
    else:
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
    visibility_group.add_argument('--use-local-browser', action='store_true',
                      help='Use local browser (hidden) with screenshots in embedded view')
    
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
    advanced_group.add_argument('--no-stealth-mode', action='store_true',
                              help='Disable stealth mode (stealth mode is enabled by default)')
    
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
            embedded_browser=args.embedded_browser,
            use_local_browser=args.use_local_browser,
            stealth_mode=not args.no_stealth_mode
        ))
    except KeyboardInterrupt:
        print("\n\nResearch interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
