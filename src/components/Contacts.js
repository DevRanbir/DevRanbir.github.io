import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import './Contacts.css';
import Lanyard from './Lanyard.js';
import LoadingOverlay from './LoadingOverlay';
import FullScreenPrompt from './FullScreenPrompt';
import { 
  getContactsData, 
  updateSocialBubbles, 
  subscribeToContactsData 
} from '../firebase/firestoreService';
import ChatBox from './ChatBox';

const Contacts = () => {
  const navigate = useNavigate();

  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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

  // Dropdown items for Windows Explorer style interface
  const dropdownItems = [
    { 
      id: 1, 
      name: 'Documents', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11H4m15.5 5a.5.5 0 0 0 .5-.5V8a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44l-1.436-2.12a1 1 0 0 0-.828-.44H8a1 1 0 0 0-1 1M4 9v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44L9.985 8.44A1 1 0 0 0 9.157 8H5a1 1 0 0 0-1 1Z"/>
      </svg>, 
      type: 'folder' 
    },
    { 
      id: 2, 
      name: 'Projects', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 9h6m-6 3h6m-6 3h6M6.996 9h.01m-.01 3h.01m-.01 3h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
      </svg>, 
      type: 'folder' 
    },
    { 
      id: 3, 
      name: 'About', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 4, 
      name: 'Home', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/>
      </svg>, 
      type: 'action' 
    },
  ];
  
  // Command templates for edit mode
  const commandTemplates = [
    { id: 'add', template: 'add [name] [link] [size] [color]', description: 'Add a new contact bubble' },
    { id: 'edit', template: 'edit [name] [newname] [newlink] [size] [color]', description: 'Edit an existing contact' },
    { id: 'move', template: 'move [name] [x] [y]', description: 'Move a bubble to new position' },
    { id: 'resize', template: 'resize [name] [size]', description: 'Change bubble size' },
    { id: 'color', template: 'color [name] [color]', description: 'Change bubble color' },
    { id: 'remove', template: 'remove [name]', description: 'Remove a contact bubble' },
    { id: 'exit', template: 'exit', description: 'Exit edit mode' },
  ];
  
  const handleInputChange = (e) => {
    setCommandInput(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };
  
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };
  
  const handleInputBlur = () => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => setIsDropdownOpen(false), 150);
  };

  useEffect(() => {
      const handleKeyPress = (event) => {
        // Check if "/" is pressed and no input/textarea is currently focused
        if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          event.preventDefault();
          const commandInput = document.querySelector('.command-input');
          if (commandInput) {
            commandInput.focus();
          }
        }
      };
  
      // Add event listener to document
      document.addEventListener('keydown', handleKeyPress);
  
      // Cleanup event listener
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }, []);
  
  const handleItemClick = (item) => {
    if (editMode && typeof item === 'object' && 'template' in item) {
      // This is a command template
      setCommandInput(item.template);
    } else {
      // This is a regular folder/file item
      setCommandInput(item.name);
      console.log(`Selected: ${item.name}`);
      
      // Handle navigation based on the selected item
      if (item.name === 'Documents') {
        navigate('/documents');
      } else if (item.name === 'Projects') {
        navigate('/projects');
      } else if (item.name === 'About') {
        navigate('/about');
      } else if (item.name === 'Home') {
        navigate('/');
      }
    }
    // Keep dropdown open for command templates in edit mode
    if (!(editMode && typeof item === 'object' && 'template' in item)) {
      setIsDropdownOpen(false);
    }
  };
  
  // Password handling and edit mode functionality
  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.toLowerCase().trim();
      
      // Navigation commands (available in both edit and normal mode)
      if (command === 'home') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
        return;
      } else if (command === 'documents') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (command === 'projects') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/projects');
        return;
      } else if (command === 'about') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (command === 'contacts' || command === 'contact') {
        setCommandInput('');
        setIsDropdownOpen(false);
        // Already on contacts page, just show message
        showMessage('You are already on the Contacts page.');
        return;
      }
      
      // Single letter navigation shortcuts
      else if (command === 'h') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
        return;
      } else if (command === 'd') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (command === 'p') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/projects');
        return;
      } else if (command === 'a') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (command === 'c') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/contacts');
        return;
      }

      if (command === 'edit') {
        setShowPasswordModal(true);
      } else if (command.match(/^edit\s+(.+)\.$/)) {
        // Handle "edit [password]." format - password must end with a period
        const matches = command.match(/^edit\s+(.+)\.$/);
        const password = matches[1];
        const correctPassword = 'ranbir195'; // Same password as in validatePassword
        
        if (password === correctPassword) {
          setEditMode(true);
          setCommandInput('');
          setIsDropdownOpen(true);
          showMessage("Edit mode activated!");
        } else {
          showMessage("Incorrect password. Access denied.");
        }
      } else if (editMode) {
        // Process commands only available in edit mode
        
        // Command pattern: "add [name] [link] [size] [color]" - To add a new contact bubble
        if (command.match(/^add\s+([^\s]+)\s+([^\s]+)(?:\s+(\d+))?(?:\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}))?$/)) {
          const matches = command.match(/^add\s+([^\s]+)\s+([^\s]+)(?:\s+(\d+))?(?:\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}))?$/);
          const name = matches[1];
          const url = matches[2];
          const size = matches[3] ? parseInt(matches[3]) : Math.floor(Math.random() * 40) + 60; // Random size between 60-100
          const color = matches[4] || '#be00ff';
          
          handleAddSocial(name, url, size, color);
        }
        // Command pattern: "edit [name] [newname] [newlink] [size] [color]" - To edit an existing contact
        else if (command.match(/^edit\s+([^\s]+)(?:\s+([^\s]+))?(?:\s+([^\s]+))?(?:\s+(\d+))?(?:\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}))?$/)) {
          const matches = command.match(/^edit\s+([^\s]+)(?:\s+([^\s]+))?(?:\s+([^\s]+))?(?:\s+(\d+))?(?:\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}))?$/);
          const oldName = matches[1];
          const newName = matches[2] || oldName;
          const newUrl = matches[3];
          const size = matches[4] ? parseInt(matches[4]) : undefined;
          const color = matches[5];
          
          const social = socialLinks.find(s => s.id === oldName);
          if (social) {
            handleEditSocial(oldName, newName, newUrl || social.url, size || social.size, color || social.color);
          } else {
            showMessage(`Contact "${oldName}" not found.`);
          }
        }
        // Command pattern: "move [name] [x] [y]" - To move a bubble
        else if (command.match(/^move\s+([^\s]+)\s+(\d+)\s+(\d+)$/)) {
          const matches = command.match(/^move\s+([^\s]+)\s+(\d+)\s+(\d+)$/);
          const name = matches[1];
          const x = parseInt(matches[2]);
          const y = parseInt(matches[3]);
          
          handleMoveBubble(name, x, y);
        }
        // Command pattern: "resize [name] [size]" - To resize a bubble
        else if (command.match(/^resize\s+([^\s]+)\s+(\d+)$/)) {
          const matches = command.match(/^resize\s+([^\s]+)\s+(\d+)$/);
          const name = matches[1];
          const size = parseInt(matches[2]);
          
          handleResizeBubble(name, size);
        }
        // Command pattern: "color [name] [color]" - To change bubble color
        else if (command.match(/^color\s+([^\s]+)\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})$/)) {
          const matches = command.match(/^color\s+([^\s]+)\s+(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})$/);
          const name = matches[1];
          const color = matches[2];
          
          handleColorBubble(name, color);
        }
        // Command pattern: "remove [name]" - To remove a contact bubble
        else if (command.match(/^remove\s+([^\s]+)$/)) {
          const matches = command.match(/^remove\s+([^\s]+)$/);
          const name = matches[1];
          
          const social = socialLinks.find(s => s.id === name);
          if (social) {
            handleRemoveSocial(social.id);
          } else {
            showMessage(`Contact "${name}" not found.`);
          }
        }
        // Exit edit mode command
        else if (command === 'exit') {
          handleExitEditMode();
        }
      }
      
      // Clear command input after processing
      setCommandInput('');
      setIsDropdownOpen(false);
    }
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
      setCommandInput(''); // Clear the command input
      // Show the dropdown with command templates
      setIsDropdownOpen(true);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };
  
  // Social link management functions
  const handleAddSocial = async (name, url, size = 75, color = '#be00ff') => {
    // Ensure URL has proper protocol
    const validUrl = url.startsWith('http') ? url : `https://${url}`;
    
    // Generate random position that doesn't overlap
    const getRandomPosition = () => {
      let attempts = 0;
      let position = { x: 0, y: 0 };
      
      while (attempts < 10) {
        const x = Math.floor(Math.random() * 80) + 10; // 10-90% of container width
        const y = Math.floor(Math.random() * 70) + 15; // 15-85% of container height
        
        // Check if position overlaps with existing bubbles
        const hasOverlap = socialLinks.some(s => 
          Math.abs(s.x - x) < 15 && Math.abs(s.y - y) < 15
        );
        
        if (!hasOverlap) {
          position = { x, y };
          break;
        }
        
        attempts++;
      }
      
      // If no non-overlapping position found after 10 attempts, use the last generated position
      if (attempts === 10) {
        position = {
          x: Math.floor(Math.random() * 80) + 10,
          y: Math.floor(Math.random() * 70) + 15
        };
      }
      
      return position;
    };
    
    const position = getRandomPosition();
    
    const newSocial = {
      id: name.toLowerCase(),
      url: validUrl,
      size: Math.min(Math.max(size, 40), 120), // Ensure size is between 40-120
      color: color,
      x: position.x,
      y: position.y
    };
    
    const updatedSocialLinks = [...socialLinks, { ...newSocial, icon: getDefaultIcon(name) }];
    setSocialLinks(updatedSocialLinks);
    
    // Save to Firestore
    await saveSocialBubbles(updatedSocialLinks);
    showMessage(`Contact "${name}" added successfully!`);
  };
  
  const handleEditSocial = async (id, newName, newUrl, size, color) => {
    const validUrl = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`;
    
    const updatedSocialLinks = socialLinks.map(social =>
      social.id === id
        ? { 
            ...social, 
            id: newName.toLowerCase(), 
            url: validUrl,
            size: size ? Math.min(Math.max(size, 40), 120) : social.size,
            color: color || social.color
          }
        : social
    );
    
    setSocialLinks(updatedSocialLinks);
    
    // Save to Firestore
    await saveSocialBubbles(updatedSocialLinks);
    showMessage(`Contact updated successfully!`);
  };
  
  const handleMoveBubble = async (name, x, y) => {
    const updatedSocialLinks = socialLinks.map(social =>
      social.id === name
        ? { 
            ...social, 
            x: Math.min(Math.max(x, 0), 100), // Ensure x is between 0-100%
            y: Math.min(Math.max(y, 0), 100)  // Ensure y is between 0-100%
          }
        : social
    );
    
    setSocialLinks(updatedSocialLinks);
    
    // Save to Firestore
    await saveSocialBubbles(updatedSocialLinks);
    showMessage(`Moved "${name}" to position (${x}, ${y})`);
  };
  
  const handleResizeBubble = async (name, size) => {
    const updatedSocialLinks = socialLinks.map(social =>
      social.id === name
        ? { 
            ...social, 
            size: Math.min(Math.max(size, 40), 120) // Ensure size is between 40-120
          }
        : social
    );
    
    setSocialLinks(updatedSocialLinks);
    
    // Save to Firestore
    await saveSocialBubbles(updatedSocialLinks);
    showMessage(`Resized "${name}" to ${size}px`);
  };
  
  const handleColorBubble = async (name, color) => {
    const updatedSocialLinks = socialLinks.map(social =>
      social.id === name
        ? { ...social, color: color }
        : social
    );
    
    setSocialLinks(updatedSocialLinks);
    
    // Save to Firestore
    await saveSocialBubbles(updatedSocialLinks);
    showMessage(`Changed "${name}" color to ${color}`);
  };
  
  const handleRemoveSocial = async (id) => {
    const socialToRemove = socialLinks.find(s => s.id === id);
    if (socialToRemove && window.confirm(`Are you sure you want to remove "${id}" contact?`)) {
      const updatedSocialLinks = socialLinks.filter(social => social.id !== id);
      setSocialLinks(updatedSocialLinks);
      
      // Save to Firestore
      await saveSocialBubbles(updatedSocialLinks);
      showMessage(`Contact "${id}" removed successfully!`);
    }
  };
  
  const handleExitEditMode = () => {
    setEditMode(false);
    showMessage("Exited edit mode.");
  };
  
  // Show a temporary command result message
  const showMessage = (message) => {
    setCommandMessage(message);
    setShowCommandMessage(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowCommandMessage(false);
    }, 3000);
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
    
    // Load the latest Spline viewer script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js';
    script.onload = () => {
      console.log('Spline viewer script loaded successfully');
    };
    script.onerror = () => {
      console.warn('Failed to load Spline viewer script');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
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

  // Save social bubbles to Firestore
  const saveSocialBubbles = async (bubbles) => {
    try {
      // Remove icons before saving to Firestore
      const bubblesForFirestore = bubbles.map(({ icon, ...bubble }) => bubble);
      await updateSocialBubbles(bubblesForFirestore);
      showMessage('Social bubbles saved to Firestore successfully!');
    } catch (error) {
      console.error('Error saving social bubbles:', error);
      showMessage('Error saving social bubbles to Firestore');
    }
  };

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
        {/* Command Line Interface */}
        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
        <div className="command-line-container">
          <div className="glass-panel">
            <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="command-input-wrapper">
                <span className="prompt-symbol">{editMode ? '🔓' : '$'}</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder={editMode ? "Type a command or click a template below..." : "Search, navigate, or run a command..."}
                  value={commandInput}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onKeyDown={handleCommandSubmit}
                  autoComplete="off"
                />
                <span className={`dropdown-indicator ${isDropdownOpen ? 'open' : 'closed'}`}>
                  {isDropdownOpen ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  )}
                </span>
              </div>
            </form>
            
            {isDropdownOpen && (
              <div className="dropdown-panel">
                <div className="explorer-grid">
                  {editMode ? 
                    // Command templates in edit mode
                    commandTemplates.map((cmd) => (
                      <div 
                        key={cmd.id} 
                        className="explorer-item command-template"
                        onClick={() => handleItemClick(cmd)}
                      >
                        <div className="item-icon">{
                          cmd.id === 'exit' ? '🚪' : 
                          cmd.id === 'add' ? '🔮' : 
                          cmd.id === 'edit' ? '✏️' : 
                          cmd.id === 'move' ? '🎯' : 
                          cmd.id === 'resize' ? '📏' : 
                          cmd.id === 'color' ? '🎨' : 
                          cmd.id === 'remove' ? '❌' : '📝'
                        }</div>
                        <div className="item-name">{cmd.id}</div>
                        <div className="item-description">{cmd.description}</div>
                      </div>
                    ))
                    :
                    // Regular items when not in edit mode
                    dropdownItems.map((item) => (
                      <div 
                        key={item.id} 
                        className="explorer-item"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="item-icon">{item.icon}</div>
                        <div className="item-name">{item.name}</div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>
        
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
