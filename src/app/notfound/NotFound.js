import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Lottie from 'lottie-react';
import CommandLine from '../../components/CommandLine';
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { getHomepageData } from '../../firebase/firestoreService';
import animationData from '../../assets/404-animation.json';
import './NotFound.css';

const NotFound = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  const [socialLinks, setSocialLinks] = useState([]);

  // Fetch social links from Firebase
  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const data = await getHomepageData();
        if (data && data.socialLinks) {
          const iconMap = {
            github: <FaGithub />,
            linkedin: <FaLinkedin />,
            instagram: <FaInstagram />,
            mail: <FaEnvelope />,
            discord: <FaDiscord />
          };
          
          const linksWithIcons = data.socialLinks.map(link => ({
            ...link,
            icon: iconMap[link.id] || <FaDiscord />
          }));
          
          setSocialLinks(linksWithIcons);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };
    
    fetchSocialLinks();
  }, []);

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
      <div 
        className="social-links-container"
        style={isMobile ? {
          position: 'fixed',
          top: '90%',
          left: '1px',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          width: '100%',
          justifyContent: 'center',
          zIndex: 1000,
          gap: '15px'
        } : {}}
      >
        {socialLinks.map((social) => (
          <div key={social.id} className="social-link-wrapper">
            <a 
              href={social.url} 
              target="_blank"
              rel="noopener noreferrer" 
              className="social-link"
              aria-label={social.id}
              style={isMobile ? {
                width: '36px',
                height: '36px'
              } : {
                paddingTop: '3px',
              }}
            >
              <span style={isMobile ? {
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              } : {}}>
                {social.icon}
              </span>
            </a>
          </div>
        ))}
      </div>

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
    </div>
  );
};

export default NotFound;
