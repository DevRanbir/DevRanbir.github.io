import React, { useEffect, useState, useCallback, useMemo } from 'react';
import CommandLine from '../../components/CommandLine';
import '../homepage/Homepage.css';
import './Contacts.css';
import Lanyard from '../../components/Lanyard.js';
import LoadingOverlay from '../../components/LoadingOverlay';
import FullScreenPrompt from '../../components/FullScreenPrompt';
import { loadSplineScript } from '../../utils/splineLoader';
import { 
  getContactsData, 
  subscribeToContactsData 
} from '../../firebase/firestoreService';
import ChatBox from '../../components/ChatBox';

const Contacts = () => {

  const [editMode, setEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [commandMessage, setCommandMessage] = useState('');
  const [showCommandMessage, setShowCommandMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeComponent, setActiveComponent] = useState('social');
  const [isFullScreenChatbox, setIsFullScreenChatbox] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('📫 Contacts: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);

  // Contact navbar items
  const [contactNavItems] = useState([
    { 
      id: 'social', 
      name: 'Home',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9,22 9,12 15,12 15,22"></polyline>
      </svg>
    },
    { 
      id: 'chatbox', 
      name: 'Chatbox',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
        <path d="M8 10.5H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M8 14H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M17 3.33782C15.5291 2.48697 13.8214 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22C17.5228 22 22 17.5228 22 12C22 10.1786 21.513 8.47087 20.6622 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    },
    { 
      id: 'links', 
      name: 'Social Links',
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
        <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 12.7215 17.8726 13.4133 17.6392 14.054C17.5551 14.285 17.4075 14.4861 17.2268 14.6527L17.1463 14.727C16.591 15.2392 15.7573 15.3049 15.1288 14.8858C14.6735 14.5823 14.4 14.0713 14.4 13.5241V12M14.4 12C14.4 13.3255 13.3255 14.4 12 14.4C10.6745 14.4 9.6 13.3255 9.6 12C9.6 10.6745 10.6745 9.6 12 9.6C13.3255 9.6 14.4 10.6745 14.4 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    },
    { 
      id: 'location', 
      name: 'Location',
      icon: <svg viewBox="0 0 1800 1800" width="24" height="24" stroke="currentColor" fill="none">
        <g>
            <g>
                <path fill="currentColor" d="M899.993,1556.267l441.512-441.511c8.202-7.819,26.127-26.384,26.893-27.184l0.36-0.383
                    c110.946-118.997,172.046-274.141,172.046-436.851c0-353.342-287.463-640.805-640.803-640.805
                    c-353.342,0-640.805,287.463-640.805,640.805c0,162.714,61.1,317.857,172.038,436.851L899.993,1556.267z M900.001,71.159
                    c319.355,0,579.179,259.818,579.179,579.18c0,146.968-55.159,287.114-155.315,394.639c-5.202,5.387-19.292,19.873-25.095,25.383
                    L900.006,1469.1l-424.049-424.315C375.902,937.286,320.82,797.229,320.82,650.339C320.82,330.977,580.634,71.159,900.001,71.159z"
                    />
            </g>
            <g>
                <path fill="currentColor" d="M998.745,225.279c110.577,0,325.781,120.91,325.781,342.553c0,17.018,13.789,30.812,30.812,30.812
                    c17.014,0,30.812-13.794,30.812-30.812c0-115.37-50.989-222.331-143.563-301.184c-73.464-62.566-169.175-102.994-243.842-102.994
                    c-17.014,0-30.812,13.794-30.812,30.813S981.731,225.279,998.745,225.279z"/>
            </g>
            <g>
                <path fill="currentColor" d="M1286.716,1361.056c-24.003-9.809-49.854-18.548-77.134-26.264l-50.474,50.478
                    c148.765,35.502,240.488,98.79,240.488,157.599c0,87.962-205.171,185.974-499.596,185.974
                    c-294.417,0-499.597-98.012-499.597-185.974c0-58.805,91.723-122.097,240.488-157.599l-50.478-50.478
                    c-27.271,7.716-53.126,16.455-77.121,26.264c-112.537,45.995-174.513,110.563-174.513,181.813s61.977,135.817,174.513,181.813
                    c103.793,42.422,241.128,65.785,386.708,65.785c145.582,0,282.921-23.363,386.715-65.785
                    c112.536-45.995,174.504-110.563,174.504-181.813S1399.252,1407.051,1286.716,1361.056z"/>
            </g>
            <g>
                <path fill="currentColor" d="M901.771,945.221c-171.172,0-310.434-139.256-310.434-310.425S730.599,324.37,901.771,324.37
                    c171.172,0,310.434,139.256,310.434,310.425S1072.943,945.221,901.771,945.221z M901.771,385.995
                    c-137.193,0-248.809,111.612-248.809,248.801s111.616,248.801,248.809,248.801c137.192,0,248.809-111.612,248.809-248.801
                    S1038.964,385.995,901.771,385.995z"/>
            </g>
        </g>
      </svg>
    }
  ]);

  // Firestore contacts data states
  const [contactsData, setContactsData] = useState({
    description: '',
    socialBubbles: [],
    locationDetails: {
      location: '',
      responseTime: '',
      status: ''
    }
  });

  // Social links from Firestore (with icons added for display)
  const [socialLinks, setSocialLinks] = useState([]);

  // Show command message temporarily
  const showMessage = (message) => {
    setCommandMessage(message);
    setShowCommandMessage(true);
    setTimeout(() => setShowCommandMessage(false), 3000);
  };
  
  const validatePassword = (e) => {
    if (e) e.preventDefault();
    // In a real application, this would use a secure method to verify the password
    const correctPassword = 'ranbir195'; // Change this to your secure password
    if (passwordInput === correctPassword) {
      setEditMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };
  
  // AI Context for CommandLine
  const aiContext = useMemo(() => {
    return {
      currentPage: 'contacts',
      contactData: contactsData,
      socialLinks: socialLinks,
      pages: ['home', 'projects', 'documents', 'about', 'contacts']
    };
  }, [contactsData, socialLinks]);
  
  // Handle AI responses
  const handleAIResponse = useCallback((response) => {
    console.log('🤖 AI Response on Contacts:', response);
  }, []);
  
  const handleExitEditMode = () => {
    setEditMode(false);
    showMessage("Exited edit mode.");
  };
  
  // Get default icon for new social links
  const getDefaultIcon = (name) => {
    const iconMap = {
      email: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>,
      phone: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>,
      linkedin: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>,
      twitter: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>,
      github: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>,
      discord: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>,
      instagram: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>,
      facebook: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="currentColor"><path d="M18.77 7.46H15.5v-1.9c0-.9.6-1.1 1-1.1h2.2V2.5h-3.1C13.15 2.5 12 3.44 12 5.32v2.15h-3v1.9h3v10.13h3.5V9.37h2.97l.3-1.91z"></path></svg>,
      youtube: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75,15.02 15.5,11.75 9.75,8.48"></polygon></svg>,
      default: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
    };
    
    return iconMap[name.toLowerCase()] || iconMap.default;
  };

  // Dummy components for different contact sections
  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'social':
        return (
          <div className="contact-section homepage-section">
            <img src="/pic6.png" alt="Welcome to My Contact Hub" className="section-header-image" />
            
            <div className="homepage-description">
              <ul>
                <li><strong>Hola, </strong>{contactsData.description || "Loading contact information..."}</li>
                <li><strong>You may use the following to contact me</strong></li>
              </ul>
            </div>

            <div className="homepage-navigation">
              <button 
                className="nav-button chatbox-button"
                onClick={() => setActiveComponent('chatbox')}
                title="Interactive Chatbox"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                    <path d="M8 10.5H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M8 14H13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M17 3.33782C15.5291 2.48697 13.8214 2 12 2C6.47715 2 2 6.47715 2 12C2 13.5997 2.37562 15.1116 3.04346 16.4525C3.22094 16.8088 3.28001 17.2161 3.17712 17.6006L2.58151 19.8267C2.32295 20.793 3.20701 21.677 4.17335 21.4185L6.39939 20.8229C6.78393 20.72 7.19121 20.7791 7.54753 20.9565C8.88837 21.6244 10.4003 22 12 22C17.5228 22 22 17.5228 22 12C22 10.1786 21.513 8.47087 20.6622 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>          
                </svg>
              </button>
              
              <button 
                className="nav-button links-button"
                onClick={() => setActiveComponent('links')}
                title="All Social Links"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                    <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 12.7215 17.8726 13.4133 17.6392 14.054C17.5551 14.285 17.4075 14.4861 17.2268 14.6527L17.1463 14.727C16.591 15.2392 15.7573 15.3049 15.1288 14.8858C14.6735 14.5823 14.4 14.0713 14.4 13.5241V12M14.4 12C14.4 13.3255 13.3255 14.4 12 14.4C10.6745 14.4 9.6 13.3255 9.6 12C9.6 10.6745 10.6745 9.6 12 9.6C13.3255 9.6 14.4 10.6745 14.4 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M7 3.33782C8.47087 2.48697 10.1786 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 10.1786 2.48697 8.47087 3.33782 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              
              <button 
                className="nav-button location-button"
                onClick={() => setActiveComponent('location')}
                title="Current Location"
              >
                <svg viewBox="0 0 1800 1800" width="24" height="24" stroke="currentColor" fill="none">
                  <g>
                    <g>
                        <path fill="currentColor" d="M899.993,1556.267l441.512-441.511c8.202-7.819,26.127-26.384,26.893-27.184l0.36-0.383
                            c110.946-118.997,172.046-274.141,172.046-436.851c0-353.342-287.463-640.805-640.803-640.805
                            c-353.342,0-640.805,287.463-640.805,640.805c0,162.714,61.1,317.857,172.038,436.851L899.993,1556.267z M900.001,71.159
                            c319.355,0,579.179,259.818,579.179,579.18c0,146.968-55.159,287.114-155.315,394.639c-5.202,5.387-19.292,19.873-25.095,25.383
                            L900.006,1469.1l-424.049-424.315C375.902,937.286,320.82,797.229,320.82,650.339C320.82,330.977,580.634,71.159,900.001,71.159z"
                            />
                    </g>
                    <g>
                        <path fill="currentColor" d="M998.745,225.279c110.577,0,325.781,120.91,325.781,342.553c0,17.018,13.789,30.812,30.812,30.812
                            c17.014,0,30.812-13.794,30.812-30.812c0-115.37-50.989-222.331-143.563-301.184c-73.464-62.566-169.175-102.994-243.842-102.994
                            c-17.014,0-30.812,13.794-30.812,30.813S981.731,225.279,998.745,225.279z"/>
                    </g>
                    <g>
                        <path fill="currentColor" d="M1286.716,1361.056c-24.003-9.809-49.854-18.548-77.134-26.264l-50.474,50.478
                            c148.765,35.502,240.488,98.79,240.488,157.599c0,87.962-205.171,185.974-499.596,185.974
                            c-294.417,0-499.597-98.012-499.597-185.974c0-58.805,91.723-122.097,240.488-157.599l-50.478-50.478
                            c-27.271,7.716-53.126,16.455-77.121,26.264c-112.537,45.995-174.513,110.563-174.513,181.813s61.977,135.817,174.513,181.813
                            c103.793,42.422,241.128,65.785,386.708,65.785c145.582,0,282.921-23.363,386.715-65.785
                            c112.536-45.995,174.504-110.563,174.504-181.813S1399.252,1407.051,1286.716,1361.056z"/>
                    </g>
                    <g>
                        <path fill="currentColor" d="M901.771,945.221c-171.172,0-310.434-139.256-310.434-310.425S730.599,324.37,901.771,324.37
                            c171.172,0,310.434,139.256,310.434,310.425S1072.943,945.221,901.771,945.221z M901.771,385.995
                            c-137.193,0-248.809,111.612-248.809,248.801s111.616,248.801,248.809,248.801c137.192,0,248.809-111.612,248.809-248.801
                            S1038.964,385.995,901.771,385.995z"/>
                    </g>
                </g>
                </svg>
              </button>
            </div>
          </div>
        );
      case 'chatbox':
        return (
          <div className={`contact-section chatbox-section ${isFullScreenChatbox ? 'fullscreen' : ''}`}>
            <img src="/pic7.png" alt="Interactive Chatbox" className="section-header-image" />
            <ChatBox 
              isFullScreen={isFullScreenChatbox}
              onToggleFullScreen={() => setIsFullScreenChatbox(!isFullScreenChatbox)}
              editMode={editMode}
            />
          </div>
        );
      case 'links':
        return (
          <div className="contact-section social-links-section">
            <img src="/pic8.png" alt="All Social Links" className="section-header-image" />
            <p className="homepage-description">
              Click on any bubble to visit the respective platform.
            </p>
            <div className="social-bubbles-container">
              {socialLinks.map((social) => (
                <div 
                  key={social.id} 
                  className={`social-bubble ${editMode ? 'edit-mode' : ''}`}
                  style={{
                    left: `${social.x}%`,
                    top: `${social.y}%`,
                    width: `${social.size}px`,
                    height: `${social.size}px`,
                  }}
                  title={`${social.id} - ${social.url}`}
                >
                  <a 
                    href={social.url} 
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="bubble-link"
                    aria-label={social.id}
                  >
                    <div className="bubble-icon">
                      {social.icon}
                    </div>
                    <div className="bubble-name">{social.id}</div>
                  </a>
                  {editMode && (
                    <div className="bubble-controls">
                      <span className="bubble-size">{social.size}px</span>
                      <span className="bubble-position">({social.x}, {social.y})</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
          </div>
        );
      case 'location':
        return (
          <div className="contact-section location-section">
            <img src="/pic9.png" alt="Current Location & Availability" className="section-header-image" />
            
            <div className="location-container">
              <div className="location-card">
                <div className="location-header">
                  <div className="location-icon">
                    <svg viewBox="0 0 1800 1800" width="52" height="52" stroke="currentColor" fill="none">
                      <g>
                        <g>
                            <path fill="currentColor" d="M899.993,1556.267l441.512-441.511c8.202-7.819,26.127-26.384,26.893-27.184l0.36-0.383
                                c110.946-118.997,172.046-274.141,172.046-436.851c0-353.342-287.463-640.805-640.803-640.805
                                c-353.342,0-640.805,287.463-640.805,640.805c0,162.714,61.1,317.857,172.038,436.851L899.993,1556.267z M900.001,71.159
                                c319.355,0,579.179,259.818,579.179,579.18c0,146.968-55.159,287.114-155.315,394.639c-5.202,5.387-19.292,19.873-25.095,25.383
                                L900.006,1469.1l-424.049-424.315C375.902,937.286,320.82,797.229,320.82,650.339C320.82,330.977,580.634,71.159,900.001,71.159z"
                                />
                        </g>
                        <g>
                            <path fill="currentColor" d="M998.745,225.279c110.577,0,325.781,120.91,325.781,342.553c0,17.018,13.789,30.812,30.812,30.812
                                c17.014,0,30.812-13.794,30.812-30.812c0-115.37-50.989-222.331-143.563-301.184c-73.464-62.566-169.175-102.994-243.842-102.994
                                c-17.014,0-30.812,13.794-30.812,30.813S981.731,225.279,998.745,225.279z"/>
                        </g>
                        <g>
                            <path fill="currentColor" d="M1286.716,1361.056c-24.003-9.809-49.854-18.548-77.134-26.264l-50.474,50.478
                                c148.765,35.502,240.488,98.79,240.488,157.599c0,87.962-205.171,185.974-499.596,185.974
                                c-294.417,0-499.597-98.012-499.597-185.974c0-58.805,91.723-122.097,240.488-157.599l-50.478-50.478
                                c-27.271,7.716-53.126,16.455-77.121,26.264c-112.537,45.995-174.513,110.563-174.513,181.813s61.977,135.817,174.513,181.813
                                c103.793,42.422,241.128,65.785,386.708,65.785c145.582,0,282.921-23.363,386.715-65.785
                                c112.536-45.995,174.504-110.563,174.504-181.813S1399.252,1407.051,1286.716,1361.056z"/>
                        </g>
                        <g>
                            <path fill="currentColor" d="M901.771,945.221c-171.172,0-310.434-139.256-310.434-310.425S730.599,324.37,901.771,324.37
                                c171.172,0,310.434,139.256,310.434,310.425S1072.943,945.221,901.771,945.221z M901.771,385.995
                                c-137.193,0-248.809,111.612-248.809,248.801s111.616,248.801,248.809,248.801c137.192,0,248.809-111.612,248.809-248.801
                                S1038.964,385.995,901.771,385.995z"/>
                        </g>
                    </g>
                    </svg>
                  </div>
                  <div className="location-status">
                    <span className="status-indicator online"></span>
                    <span>{contactsData.locationDetails?.status || 'Available'}</span>
                  </div>
                </div>
                
                <div className="location-details">
                  <div className="detail-item">
                    <strong>📍 Location:</strong> {contactsData.locationDetails?.location || 'Location not set'}
                  </div>
                  <div className="detail-item">
                    <strong>🕒 Current Time:</strong> {currentTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata' })} IST
                  </div>
                  <div className="detail-item">
                    <strong>📧 Response Time:</strong> {contactsData.locationDetails?.responseTime || 'within 24 hours'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Clock update effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      
      // Update CSS custom properties for the clock display
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      document.documentElement.style.setProperty('--timer-hours', `"${hours}"`);
      document.documentElement.style.setProperty('--timer-minutes', `"${minutes}"`);
      document.documentElement.style.setProperty('--timer-seconds', `"${seconds}"`);
    };

    // Update immediately
    updateClock();
    
    // Update every second
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load contact links from localStorage on initial render
  useEffect(() => {
    const savedContactLinks = localStorage.getItem('contactLinks');
    if (savedContactLinks) {
      try {
        const parsedLinks = JSON.parse(savedContactLinks);
        setSocialLinks(parsedLinks);
      } catch (error) {
        console.error('Error loading contact links from localStorage:', error);
      }
    }
    
    // Load Spline viewer script using centralized loader
    loadSplineScript();
  }, []);
  
  // Load contacts data from Firestore
  const loadContactsData = useCallback(async () => {
    try {
      const data = await getContactsData();
      setContactsData(data);
      
      // Convert socialBubbles to socialLinks with icons
      if (data.socialBubbles) {
        const linksWithIcons = data.socialBubbles.map(bubble => ({
          ...bubble,
          icon: getDefaultIcon(bubble.id)
        }));
        setSocialLinks(linksWithIcons);
      }
      
      showMessage('Contacts data loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading contacts data:', error);
      showMessage('Error loading contacts data from Firestore');
    }
  }, []);

  // Load data on component mount and set up real-time listener
  useEffect(() => {
    loadContactsData();
    
    // Set up real-time listener for contacts data updates
    const unsubscribe = subscribeToContactsData((data) => {
      if (data) {
        setContactsData(data);
        
        // Update social links with icons
        if (data.socialBubbles) {
          const linksWithIcons = data.socialBubbles.map(bubble => ({
            ...bubble,
            icon: getDefaultIcon(bubble.id)
          }));
          setSocialLinks(linksWithIcons);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [loadContactsData]);
  
  return (
    <div className="homepage">
      {/* FullScreen Prompt - Shows for mobile users */}
      <FullScreenPrompt />

      {/* LoadingOverlay - Shows for 15 seconds on page load */}
      {showLoadingOverlay && (
        <LoadingOverlay 
          duration={4000}
          onComplete={handleLoadingComplete}
        />
      )}

      {/* Main content - Always rendered but hidden behind overlay when loading */}
      <div className={`main-content ${showLoadingOverlay ? 'loading' : 'loaded'}`}>
        {/* Spline 3D Background */}
        <div className="spline-background">
        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
        
        {/* Command Line Interface */}
        <CommandLine 
          aiContext={aiContext}
          onAIResponse={handleAIResponse}
        />
        
        {/* Contact Navigation - Vertical Column */}
        <div className="social-links-container">
          {contactNavItems.map((item) => (
            <div key={item.id} className={`social-link-wrapper ${editMode ? 'edit-mode' : ''}`}>
              <div 
                className={`social-link ${activeComponent === item.id ? 'active' : ''}`}
                onClick={() => setActiveComponent(item.id)}
                aria-label={item.name}
                title={item.name}
              >
                {item.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Content Area */}
        <div className="contact-content-area">
          {renderActiveComponent()}
        </div>
        
        <div className="top-area-shade">
          <spline-viewer 
            url="https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode"
            onError={() => console.warn('Spline scene failed to load')}
          ></spline-viewer>
          <div className="spline-cover"></div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="password-modal-overlay">
            <div className="password-modal glass-panel">
              <h3>Enter Password</h3>
              <p>Enter the password to access edit mode.</p>
              
              {passwordError && <div className="password-error">{passwordError}</div>}
              
              <div className="password-input-wrapper">
                <form autoComplete="off" onSubmit={(e) => {
                  e.preventDefault();
                  validatePassword();
                }}>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="password-input"
                    autoComplete="new-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        validatePassword();
                      }
                    }}
                  />
                </form>
              </div>

              <div className="password-modal-buttons">
                <button 
                  className="password-submit-btn" 
                  onClick={validatePassword}
                >
                  Submit
                </button>
                <button 
                  className="password-cancel-btn" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Command Message - For feedback on command actions */}
        {showCommandMessage && (
          <div className="command-message">
            {commandMessage}
          </div>
        )}

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

        {/* Digital Clock */}
        <div className="digital-clock-container">
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
        
        {/* Edit Mode Indicator */}
        {editMode && (
          <div className="edit-mode-indicator">
            <button className="exit-edit-mode-btn" onClick={handleExitEditMode}>
              Exit Edit Mode
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Contacts;
