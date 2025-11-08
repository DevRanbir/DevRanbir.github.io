import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  const markAsReady = useCallback(() => {
    console.log('✅ Page content marked as ready');
    setIsReady(true);
  }, []);

  const resetReady = useCallback(() => {
    console.log('🔄 Resetting ready state');
    setIsReady(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ isReady, markAsReady, resetReady }}>
      {children}
    </LoadingContext.Provider>
  );
};
