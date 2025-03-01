import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import axios from 'axios';
import Iframe from 'react-iframe';
import './App.css';

interface FormData {
  prompt: string;
  noHeadless: boolean;
  enableSecurity: boolean;
  connectExisting: boolean;
  chromePath: string;
  wssUrl: string;
  cdpUrl: string;
  extraChromiumArgs: string;
  proxy: string;
}

interface CliOutput {
  text: string;
  timestamp: number;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    prompt: '',
    noHeadless: false,
    enableSecurity: false,
    connectExisting: false,
    chromePath: '',
    wssUrl: '',
    cdpUrl: '',
    extraChromiumArgs: '',
    proxy: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserVisible, setBrowserVisible] = useState(false);
  const [browserUrl, setBrowserUrl] = useState('');
  const [cliOutput, setCliOutput] = useState<CliOutput[]>([]);
  const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const cliOutputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Auto-scroll CLI output to bottom when new content is added
  useEffect(() => {
    if (cliOutputRef.current) {
      cliOutputRef.current.scrollTop = cliOutputRef.current.scrollHeight;
    }
  }, [cliOutput]);
  
  // Set up event listener for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Check if the message is from our iframe
      if (event.data && event.data.type === 'cli-output') {
        addCliOutput(event.data.data);
        
        // Check if the task is completed
        if (event.data.data.includes("Task completed successfully") || 
            event.data.data.includes("Research task completed.")) {
          setTaskCompleted(true);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };
  
  // Handle keyboard shortcuts (Ctrl+Enter or Cmd+Enter)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (formData.prompt.trim()) {
        // Create a synthetic form event
        const syntheticEvent = {
          preventDefault: () => {},
        } as React.FormEvent;
        handleSubmit(syntheticEvent);
      }
    }
  };

  // Function to add CLI output
  const addCliOutput = (text: string) => {
    setCliOutput(prev => [...prev, { text, timestamp: Date.now() }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    setTaskCompleted(false);
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);
    setCliOutput([]);
    
    // Always set noHeadless to true when using embedded browser
    const updatedFormData = {
      ...formData,
      noHeadless: true
    };

    try {
      // Parse extra chromium args into an array
      const extraChromiumArgsArray = updatedFormData.extraChromiumArgs
        ? updatedFormData.extraChromiumArgs.split(',').map(arg => arg.trim())
        : [];

      // Show the embedded browser
      setBrowserVisible(true);
      
      // Set the browser URL to the embedded browser endpoint
      setBrowserUrl('http://localhost:3002/embedded-browser');
      
      // Add initial CLI output
      addCliOutput(`Starting research: "${formData.prompt}"`);
      addCliOutput("Initializing browser...");
      
      // Send the research request
      const response = await axios.post('http://localhost:3002/api/run-research', {
        ...updatedFormData,
        extraChromiumArgs: extraChromiumArgsArray,
        useEmbeddedBrowser: true, // Tell the server to use the embedded browser
      });

      // Add the response to CLI output
      const outputLines = response.data.output.split('\n');
      outputLines.forEach((line: string) => {
        if (line.trim()) {
          addCliOutput(line);
        }
      });

      setResult(response.data.output);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        const errorMsg = err.response.data.error || 'An error occurred';
        setError(errorMsg);
        addCliOutput(`ERROR: ${errorMsg}`);
      } else {
        setError('An unexpected error occurred');
        addCliOutput('ERROR: An unexpected error occurred');
      }
      console.error('Error:', err);
      // Hide the browser on error
      setBrowserVisible(false);
    } finally {
      setIsLoading(false);
      addCliOutput("Research task completed.");
    }
  };

  const toggleAdvancedConfig = () => {
    setAdvancedConfigOpen(!advancedConfigOpen);
  };
  
  const startNewTask = () => {
    setBrowserVisible(false);
    setResult(null);
    setError(null);
    setCliOutput([]);
    setFormData({
      ...formData,
      prompt: ''
    });
    setTaskCompleted(false);
  };

  return (
    <div className="App">
      <div className="versantus-bar">
        <a href="https://versantus.co.uk" target="_blank" rel="noopener noreferrer">
          Made with ❤️ by Versantus
        </a>
      </div>
      
      <header className="App-header">
        <h1>AI-powered web browser driver</h1>
      </header>
      
      <main className="App-main-container">
        {/* CLI Output Column - 20% width */}
        <div className="cli-output-column">
          <h2>CLI Output</h2>
          <div className="cli-output-content" ref={cliOutputRef}>
            {cliOutput.length > 0 ? (
              cliOutput.map((output, index) => (
                <div key={index} className="cli-output-line">
                  {output.text}
                </div>
              ))
            ) : (
              <div className="cli-output-placeholder">
                CLI output will appear here during research...
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content - 80% width */}
        <div className="main-content">
          {/* Research Query Section */}
          <div className="form-section query-section">
            <h2>What do you want to do?</h2>
            
            {/* Show either the form or the summary based on research status */}
            {!browserVisible ? (
              <form onSubmit={handleSubmit} className="research-form">
                <div className="form-group">
                  <textarea
                    id="prompt"
                    name="prompt"
                    value={formData.prompt}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    ref={textareaRef}
                    required
                    rows={4}
                    placeholder="Enter your research query here... (Press Ctrl+Enter or Cmd+Enter to submit)"
                  />
                  <div className="prompt-button">
                    <button type="submit" disabled={isLoading}>
                      {isLoading ? 'Running Research...' : 'Run Research'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="research-summary">
                <p><strong>Current task:</strong> {formData.prompt}</p>
              </div>
            )}
          </div>
          
          {/* Browser Container - Only shown when research is in progress */}
          {browserVisible && (
            <div className="browser-container">
              <h2>Embedded Browser</h2>
              <Iframe
                url={browserUrl}
                width="100%"
                height="600px"
                id="embedded-browser"
                className="embedded-browser"
                display="block"
                position="relative"
                allowFullScreen
              />
            </div>
          )}
          
          {/* Advanced Configuration Accordion */}
          <div className="advanced-config-section">
            <div className="accordion-header" onClick={toggleAdvancedConfig}>
              <h2>Advanced Configuration</h2>
              <span className={`accordion-icon ${advancedConfigOpen ? 'open' : ''}`}>▼</span>
            </div>
            
            {advancedConfigOpen && (
              <div className="accordion-content">
                {/* Browser Options */}
                <div className="form-section">
                  <h3>Browser Options</h3>
                  <div className="form-group checkbox">
                    <input
                      type="checkbox"
                      id="noHeadless"
                      name="noHeadless"
                      checked={formData.noHeadless}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="noHeadless">Show Browser (not headless)</label>
                  </div>

                  <div className="form-group checkbox">
                    <input
                      type="checkbox"
                      id="enableSecurity"
                      name="enableSecurity"
                      checked={formData.enableSecurity}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="enableSecurity">Enable Browser Security</label>
                  </div>
                </div>

                {/* Advanced Browser Connection */}
                <div className="form-section">
                  <h3>Advanced Browser Connection</h3>
                  <div className="form-group checkbox">
                    <input
                      type="checkbox"
                      id="connectExisting"
                      name="connectExisting"
                      checked={formData.connectExisting}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="connectExisting">Connect to Existing Browser</label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="chromePath">Chrome Path:</label>
                    <input
                      type="text"
                      id="chromePath"
                      name="chromePath"
                      value={formData.chromePath}
                      onChange={handleInputChange}
                      placeholder="e.g., /Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
                      disabled={!formData.connectExisting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="wssUrl">WebSocket URL:</label>
                    <input
                      type="text"
                      id="wssUrl"
                      name="wssUrl"
                      value={formData.wssUrl}
                      onChange={handleInputChange}
                      placeholder="e.g., ws://localhost:9222/devtools/browser/[id]"
                      disabled={!formData.connectExisting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cdpUrl">CDP URL:</label>
                    <input
                      type="text"
                      id="cdpUrl"
                      name="cdpUrl"
                      value={formData.cdpUrl}
                      onChange={handleInputChange}
                      placeholder="e.g., http://localhost:9222/json/version"
                      disabled={!formData.connectExisting}
                    />
                  </div>
                </div>

                {/* Additional Options */}
                <div className="form-section">
                  <h3>Additional Options</h3>
                  <div className="form-group">
                    <label htmlFor="extraChromiumArgs">Extra Chromium Arguments:</label>
                    <input
                      type="text"
                      id="extraChromiumArgs"
                      name="extraChromiumArgs"
                      value={formData.extraChromiumArgs}
                      onChange={handleInputChange}
                      placeholder="Comma-separated list of arguments"
                    />
                    <small>Example: --disable-gpu,--no-sandbox</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="proxy">Proxy:</label>
                    <input
                      type="text"
                      id="proxy"
                      name="proxy"
                      value={formData.proxy}
                      onChange={handleInputChange}
                      placeholder="e.g., http://user:pass@host:port"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="error-container">
              <h3>Error</h3>
              <pre>{error}</pre>
            </div>
          )}
          
          {/* Results Display */}
          {result && !browserVisible && (
            <div className="result-container">
              <h2>Research Results</h2>
              <pre>{result}</pre>
              {taskCompleted && (
                <div className="new-task-button">
                  <button onClick={startNewTask}>Start New Task</button>
                </div>
              )}
            </div>
          )}
          
          {/* New Task Button when browser is visible but task is completed */}
          {browserVisible && taskCompleted && (
            <div className="new-task-button-container">
              <button className="new-task-button" onClick={startNewTask}>Start New Task</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
