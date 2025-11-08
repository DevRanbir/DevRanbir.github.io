import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Lottie from 'lottie-react';
import CommandLine from '../../components/CommandLine';
import SocialMediaLinks from '../../components/SocialMediaLinks';
import StaggeredMenu from '../../components/StaggeredMenu';
import animationData from '../../assets/404-animation.json';
import './NotFound.css';
import { useLoading } from '../../contexts/LoadingContext';

const NotFound = () => {
  const { markAsReady } = useLoading();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [socialLinksLoaded, setSocialLinksLoaded] = useState(false);

  // Mark page as ready when social links are loaded
  useEffect(() => {
    if (socialLinksLoaded) {
      console.log('🎉 NotFound page: Social links loaded, marking page as ready');
      markAsReady();
    }
  }, [socialLinksLoaded, markAsReady]);

  // Clock update effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      document.documentElement.style.setProperty('--timer-hours', `"${hours}"`);
      document.documentElement.style.setProperty('--timer-minutes', `"${minutes}"`);
      document.documentElement.style.setProperty('--timer-seconds', `"${seconds}"`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // AI Context for CommandLine
  const aiContext = useMemo(() => ({
    currentPage: '404',
    pages: ['home', 'projects', 'documents', 'about', 'contacts'],
    error: '404 - Page Not Found'
  }), []);

  const handleAIResponse = useCallback((response) => {
    console.log('🤖 AI Response on 404:', response);
  }, []);

  const handleCommandSearch = useCallback((query) => {
    console.log('🔍 Search query on 404:', query);
  }, []);

  return (
    <div className="notfound-page">
      {/* Social Media Links */}
      <SocialMediaLinks 
        isMobile={isMobile} 
        onLinksLoaded={() => setSocialLinksLoaded(true)}
      />

      <div className="notfound-scroll-container">
        {/* Command Line Interface */}
        <CommandLine 
          aiContext={aiContext}
          onAIResponse={handleAIResponse}
          onSearchChange={handleCommandSearch}
        />

        {/* Main Content */}
        <div className="notfound-content-wrapper">
          <div className="notfound-lottie-container">
            <Lottie 
              animationData={animationData}
              loop={true}
              autoplay={true}
              className="notfound-lottie"
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '600px',
                maxHeight: '600px'
              }}
            />
          </div>

        </div>
      </div>

      {/* Digital Clock */}
      <div 
        className="digital-clock-container" 
        style={{ 
          position: "absolute", 
          top: "20px", 
          right: "20px", 
          width: "210px", 
          textAlign: "center" 
        }}
      >
        <div className="clock-container">
          <div className="clock-col">
            <p className="clock-hours clock-timer"></p>
            <p className="clock-label">Hours</p>
          </div>
          <div className="clock-col">
            <p className="clock-minutes clock-timer"></p>
            <p className="clock-label">Minutes</p>
          </div>
          <div className="clock-col">
            <p className="clock-seconds clock-timer"></p>
            <p className="clock-label">Seconds</p>
          </div>
        </div>
        <div className="current-date">
          <span className="date-display">{currentTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} IST</span>
        </div>
      </div>

      {/* Animated Bottom Pattern */}
      <div className="bottom-pattern">
        <div className="wave-container">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
        <div className="geometric-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      {/* Staggered Menu */}
      <StaggeredMenu
        position="right"
        items={[
          { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
          { label: 'Projects', ariaLabel: 'View projects', link: '/projects' },
          { label: 'Documents', ariaLabel: 'View documents', link: '/documents' },
          { label: 'About', ariaLabel: 'Learn about me', link: '/about' },
          { label: 'Contacts', ariaLabel: 'Get in touch', link: '/contacts' }
        ]}
        socialItems={[
          { label: 'GitHub', link: 'https://github.com/DevRanbir' },
          { label: 'LinkedIn', link: 'https://linkedin.com/in/yourname' },
          { label: 'Instagram', link: 'https://instagram.com/yourname' }
        ]}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={['#B19EEF', '#8400ff']}
        accentColor="#8400ff"
        isFixed={false}
      />
    </div>
  );
};

export default NotFound;
