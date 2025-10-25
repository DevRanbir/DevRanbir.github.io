import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Homepage from './app/homepage/Homepage';
import Documents from './app/documents/Documents';
import Projects from './app/projects/Projects';
import MyProjects from './app/myprojects/MyProjects';
import Home from './app/home/Home';
import ProjectDetail from './app/projectdetail/ProjectDetail';
import About from './app/about/About';
import Contacts from './app/contacts/Contacts';
import Controller from './app/controller/Controller';
import NotFound from './app/notfound/NotFound';
import Loading from './app/loading/Loading';
import LoadingOverlay from './components/LoadingOverlay';
import './App.css';
import './components/CommandLine.css';

// Import chat cleanup utility (automatically starts cleanup)
import './utils/chatCleanup';

// Import GitHub sync service
import { initializeGitHubSync } from './services/githubSyncService';

// Route loader component
function RouteLoader({ children }) {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show loading overlay when route changes
    setIsLoading(true);
    
    // Hide loading overlay after a short delay (simulating route load)
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Adjust duration as needed

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {isLoading && <LoadingOverlay />}
      {children}
    </>
  );
}

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
      
      // Suppress Spline viewer duplicate registration errors
      if (errorMessage.includes('spline-viewer') && 
          errorMessage.includes('already been used with this registry')) {
        console.warn('🎭 Spline viewer duplicate registration suppressed (handled by centralized loader)');
        event.preventDefault();
        return false;
      }
      
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
        <RouteLoader>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Homepage />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/projects" element={<MyProjects />} />
            <Route path="/myprojects" element={<Projects />} />
            <Route path="/projects/:projectName" element={<ProjectDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/controller" element={<Controller />} />
            <Route path="/god" element={<Controller />} />
            <Route path="/loading" element={<Loading />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RouteLoader>
      </Router>
    </div>
  );
}

export default App;
