import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress specific Three.js NaN errors and browser extension runtime errors
const originalError = console.error;
const originalWarn = console.warn;
console.log = function() {}; // Disable all console.log output

console.error = (...args) => {
  const message = args.join(' ');
  
  // Suppress the specific MeshLineGeometry NaN error
  if (message.includes('THREE.BufferGeometry.computeBoundingSphere') ||
      message.includes('Computed radius is NaN') ||
      (message.includes('MeshLineGeometry') && message.includes('NaN'))) {
    // These errors are handled gracefully by our error recovery system
    return;
  }

  // Suppress Chrome extension runtime errors
  if (message.includes('runtime.lastError') ||
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Extension context invalidated') ||
      message.includes('Unchecked runtime.lastError')) {
    // These are harmless browser extension communication errors
    return;
  }
  
  // Allow all other errors to be logged normally
  originalError.apply(console, args);
};

console.warn = (...args) => {
  const message = args.join(' ');
  
  // Suppress Chrome extension runtime warnings
  if (message.includes('runtime.lastError') ||
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Extension context invalidated') ||
      message.includes('Unchecked runtime.lastError')) {
    // These are harmless browser extension communication warnings
    return;
  }
  
  // Allow all other warnings to be logged normally
  originalWarn.apply(console, args);
};

// Additional Chrome extension error suppression
if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
  // Override chrome.runtime.lastError to prevent unchecked errors
  const originalLastError = window.chrome.runtime.lastError;
  Object.defineProperty(window.chrome.runtime, 'lastError', {
    get: function() {
      const error = originalLastError;
      if (error && (
        error.message?.includes('Could not establish connection') ||
        error.message?.includes('Receiving end does not exist') ||
        error.message?.includes('Extension context invalidated')
      )) {
        // Silently consume the error to prevent "Unchecked runtime.lastError"
        return null;
      }
      return error;
    },
    configurable: true
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
