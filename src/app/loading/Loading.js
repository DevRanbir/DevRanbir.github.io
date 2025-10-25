import React, { useState, useEffect } from 'react';
import LoadingOverlay from '../../components/LoadingOverlay';
import './Loading.css';

const Loading = () => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    // Reset the LoadingOverlay every 2.5 seconds to keep it showing
    const interval = setInterval(() => {
      setKey(prevKey => prevKey + 1);
    }, 2500); // Reset before it fades out (default is 3000ms)

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-page">
      <LoadingOverlay key={key} />
    </div>
  );
};

export default Loading;
