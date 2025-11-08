import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommandLine.css';

const CommandLine = ({ 
  editMode = false,
  onSearchChange = null,
  additionalItems = [],
  placeholder = "Navigate or search",
  onCommandSubmit = null
}) => {
  const navigate = useNavigate();
  const commandLineRef = useRef(null);
  const inputRef = useRef(null);
  
  // Command line state
  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Dropdown items for navigation
  const dropdownItems = [
    { 
      id: 1, 
      name: 'Documents', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11H4m15.5 5a.5.5 0 0 0 .5-.5V8a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44l-1.436-2.12a1 1 0 0 0-.828-.44H8a1 1 0 0 0-1 1M4 9v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44L9.985 8.44A1 1 0 0 0 9.157 8H5a1 1 0 0 0-1 1Z"/>
      </svg>, 
      type: 'folder',
      path: '/documents'
    },
    { 
      id: 2, 
      name: 'Projects', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 9h6m-6 3h6m-6 3h6M6.996 9h.01m-.01 3h.01m-.01 3h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
      </svg>, 
      type: 'folder',
      path: '/projects'
    },
    { 
      id: 3, 
      name: 'Home', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/>
      </svg>, 
      type: 'action',
      path: '/'
    },
    { 
      id: 4, 
      name: 'About', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
      </svg>, 
      type: 'action',
      path: '/about'
    },
    { 
      id: 5, 
      name: 'Contact', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.079 6.839a3 3 0 0 0-4.255.1M13 20h1.083A3.916 3.916 0 0 0 18 16.083V9A6 6 0 1 0 6 9v7m7 4v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1Zm-7-4v-6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1Zm12-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v-6Z"/>
      </svg>, 
      type: 'action',
      path: '/contacts'
    }
  ];
  
  // Command line handlers
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommandInput(value);
    
    // Auto-open dropdown when user starts typing
    if (value.length > 0 && !editMode) {
      setIsDropdownOpen(true);
    }
    
    // Trigger search/filter if handler provided
    if (onSearchChange) {
      onSearchChange(value);
    }
  };
  
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };
  
  const handleInputClick = () => {
    setIsDropdownOpen(true);
  };
  
  const handleInputBlur = () => {
    // Don't close dropdown on blur - let click outside handler manage it
  };
  
  // Toggle dropdown when clicking the indicator icon
  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setIsDropdownOpen(prev => !prev);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (commandLineRef.current && !commandLineRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Keyboard shortcut: Focus input when "/" or "t" is pressed
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Ignore if user is typing in another input/textarea
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.isContentEditable) {
        return;
      }
      
      // Focus input on "/" or "t" key
      if (event.key === '/' || event.key === 't') {
        event.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          setIsDropdownOpen(true);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  
  const handleItemClick = (item) => {
    // Handle custom items first
    if (item.onClick) {
      item.onClick(item);
      setIsDropdownOpen(false);
      return;
    }
    
    // Handle navigation
    console.log(`Selected: ${item.name}`);
    
    if (item.path) {
      navigate(item.path);
    }
    setIsDropdownOpen(false);
  };
  
  const handleCommandSubmit = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const command = commandInput.trim();
      if (!command) return;
      
      // Call parent's command handler if provided
      if (onCommandSubmit) {
        onCommandSubmit(e, commandInput);
        setIsDropdownOpen(false);
        return;
      }
      
      const lowerCommand = command.toLowerCase();
      
      // Handle regular navigation commands
      const commandMap = {
        'documents': '/documents',
        'projects': '/projects',
        'home': '/',
        'about': '/about',
        'contact': '/contacts',
        'contacts': '/contacts'
      };
      
      if (commandMap[lowerCommand]) {
        navigate(commandMap[lowerCommand]);
        setCommandInput('');
      } else if (lowerCommand === 'clear' || lowerCommand === 'reset') {
        setCommandInput('');
        if (onSearchChange) {
          onSearchChange('');
        }
      }
      
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      setCommandInput('');
      if (onSearchChange) {
        onSearchChange('');
      }
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="command-line-container" ref={commandLineRef}>
      <div className="glass-panel">
        <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="command-input-wrapper">
            <span className="prompt-symbol">
              {editMode ? '🔓' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="command-input"
              placeholder={placeholder}
              value={commandInput}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              onBlur={handleInputBlur}
              onKeyDown={handleCommandSubmit}
              autoComplete="off"
            />
            <span 
              className={`dropdown-indicator ${isDropdownOpen ? 'open' : 'closed'}`}
              onClick={handleDropdownToggle}
              style={{ cursor: 'pointer' }}
            >
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
              {/* Render additional items first if provided */}
              {additionalItems.map((item) => (
                <div 
                  key={item.id} 
                  className={item.className || "explorer-item"}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  {item.description && <div className="item-description">{item.description}</div>}
                </div>
              ))}
              
              {/* Then render default navigation items */}
              {dropdownItems.map((item) => (
                <div 
                  key={item.id} 
                  className="explorer-item"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandLine;
