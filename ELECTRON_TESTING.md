# Electron App Testing Guide

This document outlines the steps to test the Electron application locally.

## Prerequisites

- Node.js and npm installed
- Chrome browser installed (for browser automation)

## Testing Steps

### 1. Start the Electron App in Development Mode

```bash
cd ~/repos/browseruse/react-cli-ui
npm run electron-dev
```

This command will:
- Start the React development server on port 3003
- Wait for the server to be ready
- Launch the Electron application pointing to the development server

### 2. Verify Basic Functionality

- Confirm the Electron window opens correctly
- Verify all UI elements are displayed properly
- Check that the new Electron-specific elements (Chrome path browser button, remote backend configuration) are visible and styled correctly

### 3. Test Local Backend Configuration

- Enter a prompt in the text area
- Select "Use Local Backend" (default)
- Configure browser settings (headless, connect existing, etc.)
- Click "Run Research"
- Verify that the CLI output shows the command execution
- Confirm that browser automation works correctly
- Check that results are displayed properly

### 4. Test Remote Backend Configuration

- Enter a prompt in the text area
- Select "Use Remote Backend"
- Enter a valid remote backend URL
- Click "Run Research"
- Verify that the CLI output shows the request being forwarded to the remote backend
- Confirm that results from the remote backend are displayed properly

### 5. Test Chrome Path Selection

- Select "Connect to existing Chrome"
- Click the "Browse..." button next to Chrome Path
- Verify that the file dialog opens
- Select a Chrome executable
- Confirm that the selected path appears in the input field
- Run a test with the selected Chrome path
- Verify that the application connects to the specified Chrome instance

### 6. Test Error Handling

- Test with invalid remote backend URL
- Test with invalid Chrome path
- Verify that appropriate error messages are displayed

## Building for Production

To build the Electron app for production:

```bash
cd ~/repos/browseruse/react-cli-ui
npm run electron-build
```

This will create distributable packages in the `dist` directory.
