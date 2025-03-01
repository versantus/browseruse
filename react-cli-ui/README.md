# Web Research Tool UI

A React-based web interface for the CLI web research tool.

## Features

- User-friendly interface for running web research queries
- Configure browser options (headless mode, security settings)
- Advanced browser connection options
- Real-time display of research results
- Error handling and loading states

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x
- Required Python packages (see main project's requirements.txt)

## Installation

1. Clone the repository
2. Install the dependencies:

```bash
cd react-cli-ui
npm install
```

## Usage

### Development Mode

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

This will start both the React frontend (on port 3003) and the Express backend server (on port 3002).

### Production Mode

To build the application for production and run it:

```bash
npm run prod
```

This will create an optimized production build and serve it through the Express server on port 3002.

## How to Use

1. Open your browser and navigate to http://localhost:3003
2. Enter your research query in the "Research Prompt" field
3. Configure browser options as needed:
   - Show Browser: Displays the browser window during research
   - Enable Browser Security: Enables browser security features
4. For advanced users, configure browser connection options:
   - Connect to Existing Browser: Use an existing Chrome instance
   - Chrome Path: Path to Chrome executable
   - WebSocket URL: WebSocket URL for connecting to an existing browser
   - CDP URL: Chrome DevTools Protocol URL
5. Add any additional options:
   - Extra Chromium Arguments: Comma-separated list of arguments to pass to Chromium
   - Proxy: Proxy settings in the format "http://user:pass@host:port"
6. Click "Run Research" to start the research process
7. View the results in the "Research Results" section

## API Endpoints

The backend server provides the following API endpoint:

- `POST /api/run-research`: Executes the research with the provided parameters
  - Request body: JSON object with research parameters
  - Response: JSON object with research results or error information

## License

This project is licensed under the MIT License.
