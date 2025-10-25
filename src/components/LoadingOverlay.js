import React, { useState, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './LoadingOverlay.css';

const LoadingOverlay = ({ 
  duration = 3000, 
  lottieUrl = "https://lottie.host/84bf1caa-4c33-4817-bb77-89d02ec48363/k6ekHMqGII.lottie",
  fadeOutDuration = 500,
  onComplete
}) => {
  const [isFading, setIsFading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    console.log(`🎭 LoadingOverlay starting with ${duration}ms duration`);
    
    // Start fade out process
    const fadeOutTimer = setTimeout(() => {
      console.log('🎭 LoadingOverlay starting fade out');
      setIsFading(true);
    }, duration - fadeOutDuration);

    // Complete removal and call onComplete
    const completeTimer = setTimeout(() => {
      console.log('🎭 LoadingOverlay completed, calling onComplete');
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
    // Only depend on duration and fadeOutDuration, not onComplete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, fadeOutDuration]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`loading-overlay ${isFading ? 'loading-overlay--fading' : ''}`}
      style={{
        '--fade-duration': `${fadeOutDuration}ms`
      }}
    >
      <div className="loading-overlay__content">
        <DotLottieReact
          src={lottieUrl}
          loop
          autoplay
          style={{
            width: '400px',
            height: '400px',
          }}
        />
      </div>
    </div>
  );
};

export default LoadingOverlay;
