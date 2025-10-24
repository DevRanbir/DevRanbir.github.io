import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './components/Homepage';
import Documents from './components/Documents';
import Projects from './components/Projects';
import MyProjects from './components/MyProjects';
import ProjectDetail from './components/ProjectDetail';
import About from './components/About';
import Contacts from './components/Contacts';
import Controller from './components/Controller';
import './App.css';
import './components/CommandLine.css';

// Import chat cleanup utility (automatically starts cleanup)
import './utils/chatCleanup';

// Import GitHub sync service
import { initializeGitHubSync } from './services/githubSyncService';

function App() {
  useEffect(() => {
    // Initialize GitHub sync service when app starts
    const initializeSync = async () => {
      try {
        console.log('🚀 Initializing GitHub sync service...');
        const result = await initializeGitHubSync('DevRanbir', true);
        
        if (result.success) {
        } else {
          console.warn('⚠️ GitHub sync service initialization failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Failed to initialize GitHub sync service:', error);
      }
    };

    initializeSync();
  }, []);

  // Global error handler for Three.js NaN errors and browser extension errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      const errorMessage = event.error?.message || event.message || '';
      
      // Suppress Three.js BufferGeometry NaN errors
      if (errorMessage.includes('THREE.BufferGeometry.computeBoundingSphere') ||
          errorMessage.includes('Computed radius is NaN') ||
          errorMessage.includes('MeshLineGeometry') ||
          (errorMessage.includes('position') && errorMessage.includes('NaN'))) {
        
        console.warn('🎭 Three.js NaN error suppressed (this is handled gracefully):', errorMessage);
        event.preventDefault();
        return false;
      }

      // Suppress Chrome extension runtime errors
      if (errorMessage.includes('runtime.lastError') ||
          errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('Receiving end does not exist') ||
          errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('Unchecked runtime.lastError')) {
        
        console.warn('🔌 Browser extension error suppressed (this is harmless):', errorMessage);
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event) => {
      const errorMessage = event.reason?.message || event.reason || '';
      
      if (errorMessage.includes('THREE.BufferGeometry') || 
          (errorMessage.includes('NaN') && errorMessage.includes('position'))) {
        console.warn('🎭 Three.js promise rejection suppressed:', errorMessage);
        event.preventDefault();
      }

      // Suppress Chrome extension promise rejections
      if (errorMessage.includes('runtime.lastError') ||
          errorMessage.includes('Could not establish connection') ||
          errorMessage.includes('Extension context invalidated') ||
          errorMessage.includes('Unchecked runtime.lastError')) {
        console.warn('🔌 Browser extension promise rejection suppressed:', errorMessage);
        event.preventDefault();
      }
    };

    // Add global error listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/myprojects" element={<MyProjects />} />
          <Route path="/myprojects/:projectName" element={<ProjectDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/controller" element={<Controller />} />
          <Route path="/god" element={<Controller />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
