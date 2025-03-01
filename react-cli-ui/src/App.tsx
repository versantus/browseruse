import React, { useState } from 'react';
import axios from 'axios';
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // Parse extra chromium args into an array
      const extraChromiumArgsArray = formData.extraChromiumArgs
        ? formData.extraChromiumArgs.split(',').map(arg => arg.trim())
        : [];

      const response = await axios.post('http://localhost:3002/api/run-research', {
        ...formData,
        extraChromiumArgs: extraChromiumArgsArray,
      });

      setResult(response.data.output);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'An error occurred');
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Web Research Tool</h1>
      </header>
      <main className="App-main">
        <form onSubmit={handleSubmit} className="research-form">
          <div className="form-section">
            <h2>Research Query</h2>
            <div className="form-group">
              <label htmlFor="prompt">Research Prompt:</label>
              <textarea
                id="prompt"
                name="prompt"
                value={formData.prompt}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Enter your research query here..."
              />
            </div>
          </div>

          <div className="form-section">
            <h2>Browser Options</h2>
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

          <div className="form-section">
            <h2>Advanced Browser Connection</h2>
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

          <div className="form-section">
            <h2>Additional Options</h2>
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

          <div className="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Running Research...' : 'Run Research'}
            </button>
          </div>
        </form>

        {isLoading && (
          <div className="loading-indicator">
            <p>Running research, please wait...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <h3>Error</h3>
            <pre>{error}</pre>
          </div>
        )}

        {result && (
          <div className="result-container">
            <h2>Research Results</h2>
            <pre>{result}</pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
