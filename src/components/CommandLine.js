import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommandLine.css';

// Import AI services dynamically to avoid circular dependencies
let processAICommand, isAIQuery, executeAction;

// AI state management
let aiCooldownUntil = null;
const AI_COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const AI_STATE_KEY = 'commandline_ai_enabled';

// Initialize AI state from localStorage (default to false if not set)
let isAIEnabled = (() => {
  try {
    const savedState = localStorage.getItem(AI_STATE_KEY);
    return savedState === 'true'; // Returns true only if explicitly set to 'true'
  } catch (error) {
    console.warn('Could not access localStorage:', error);
    return false; // Default to disabled
  }
})();

// Check if AI is enabled
const getAIEnabled = () => isAIEnabled;

// Set AI enabled state and save to localStorage
const setAIEnabled = (enabled) => {
  isAIEnabled = enabled;
  try {
    localStorage.setItem(AI_STATE_KEY, enabled.toString());
  } catch (error) {
    console.warn('Could not save AI state to localStorage:', error);
  }
  
  if (enabled) {
    console.log('✅ AI has been enabled');
  } else {
    console.log('🚫 AI has been disabled');
  }
};

// Check if AI is in cooldown
const isAIInCooldown = () => {
  if (!aiCooldownUntil) return false;
  
  const now = Date.now();
  if (now < aiCooldownUntil) {
    const remainingMinutes = Math.ceil((aiCooldownUntil - now) / 60000);
    console.log(`⏳ AI is in cooldown. Retry in ${remainingMinutes} minute(s)`);
    return true;
  }
  
  // Cooldown expired, reset
  aiCooldownUntil = null;
  return false;
};

// Set AI cooldown and disable AI
const setAICooldown = () => {
  aiCooldownUntil = Date.now() + AI_COOLDOWN_DURATION;
  const cooldownEnd = new Date(aiCooldownUntil).toLocaleTimeString();
  console.log(`🚫 AI cooldown activated. AI disabled until ${cooldownEnd}`);
  setAIEnabled(false); // Automatically disable AI when rate limited
};

// Get remaining cooldown time in minutes
const getRemainingCooldownTime = () => {
  if (!aiCooldownUntil) return 0;
  const remaining = Math.ceil((aiCooldownUntil - Date.now()) / 60000);
  return Math.max(0, remaining);
};

// Lazy load AI services
const loadAIServices = async () => {
  if (!processAICommand) {
    const aiModule = await import('../services/aiCommandProcessor');
    processAICommand = aiModule.processAICommand;
    isAIQuery = aiModule.isAIQuery;
    executeAction = aiModule.executeAction;
  }
};

const CommandLine = ({ 
  editMode = false,
  onSearchChange = null,
  additionalItems = [],
  placeholder = "Ask, Navigate or run a command",
  onCommandSubmit = null,
  aiContext = null, // Context for AI (projects, documents, etc.)
  onAIResponse = null // Callback for AI responses
}) => {
  const navigate = useNavigate();
  const commandLineRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const inputRef = useRef(null);
  
  // Provide default context if none is provided
  const defaultContext = {
    currentPage: 'home',
    projects: [],
    documents: [],
    socialLinks: [],
    filteredProjects: [],
    searchQuery: ''
  };
  
  const contextToUse = aiContext || defaultContext;
  
  // Command line state
  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [aiEnabled, setAiEnabledState] = useState(getAIEnabled());
  
  // Copy to clipboard handler with visual feedback
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('✓ Copied to clipboard');
      setCopiedIndex(index);
      // Hide the "Copied!" message after 2 seconds
      setTimeout(() => setCopiedIndex(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };
  
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
    },
    { 
      id: 6, 
      name: aiEnabled ? 'Turn OFF AI' : 'Turn ON AI', 
      icon: aiEnabled ? (
        <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
        </svg>
      ) : (
        <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21a9 9 0 1 1 0-18c1.052 0 2.062.18 3 .512M7 9.577l3.923 3.923 8.5-8.5M17 14v6m-3-3h6"/>
        </svg>
      ), 
      type: 'toggle',
      onClick: () => {
        const newState = !aiEnabled;
        setAIEnabled(newState);
        setAiEnabledState(newState);
        setShowChat(true);
        const message = {
          role: 'assistant',
          content: newState 
            ? ' AI has been enabled. You can now use AI commands and ask questions!' 
            : ' AI has been disabled. Only basic commands will work. Click the toggle again to re-enable.',
          isError: false
        };
        setConversationHistory(prev => [...prev, message]);
        setIsDropdownOpen(true);
      }
    },
  ];
  
  // Command line handlers
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommandInput(value);
    
    // Auto-open dropdown when user starts typing
    if (value.length > 0 && !editMode) {
      setIsDropdownOpen(true);
    }
  };
  
  const handleInputFocus = () => {
    // Always open dropdown on focus - don't close if already open
    setIsDropdownOpen(true);
  };
  
  const handleInputClick = () => {
    // Always open dropdown on click - never close it
    setIsDropdownOpen(true);
  };
  
  const handleInputBlur = () => {
    // Don't close dropdown on blur - let click outside handler manage it
    // This prevents dropdown from closing when clicking inside it
  };
  
  // Toggle dropdown when clicking the indicator icon
  const handleDropdownToggle = (e) => {
    e.stopPropagation(); // Prevent event from bubbling
    setIsDropdownOpen(prev => !prev);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (commandLineRef.current && !commandLineRef.current.contains(event.target)) {
        // Close dropdown but don't clear chat or input
        setIsDropdownOpen(false);
      }
    };
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
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
        event.preventDefault(); // Prevent the key from being typed
        if (inputRef.current) {
          inputRef.current.focus();
          setIsDropdownOpen(true);
        }
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyPress);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
  
  // Auto-scroll chat to show newest messages (with column-reverse layout)
  useEffect(() => {
    if (chatMessagesRef.current) {
      // Reversing scroll direction - scroll to top (0)
      requestAnimationFrame(() => {
        if (chatMessagesRef.current) {
          chatMessagesRef.current.scrollTop = 0;
        }
      });
    }
  }, [conversationHistory, isProcessingAI]);
  
  const handleItemClick = (item) => {
    // Handle custom items first (filters, templates, etc.)
    if (item.onClick) {
      item.onClick(item);
      // Don't write to input for toggle buttons and actions
      setIsDropdownOpen(false);
      return;
    }
    
    // Handle navigation based on the selected item
    // Don't write to input, just navigate
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
      
      // Check for AI toggle commands first
      const lowerCommand = command.toLowerCase();
      if (lowerCommand === 'turn on ai' || lowerCommand === 'enable ai' || 
          lowerCommand === 'ai on' || lowerCommand === 'start ai') {
        setAIEnabled(true);
        setAiEnabledState(true);
        setShowChat(true);
        const confirmMessage = {
          role: 'assistant',
          content: '✅ AI has been enabled. You can now use AI commands and ask questions!',
          isError: false
        };
        setConversationHistory(prev => [...prev, confirmMessage]);
        setCommandInput('');
        setIsDropdownOpen(true);
        return;
      }
      
      if (lowerCommand === 'turn off ai' || lowerCommand === 'disable ai' || 
          lowerCommand === 'ai off' || lowerCommand === 'stop ai') {
        setAIEnabled(false);
        setAiEnabledState(false);
        setShowChat(true);
        const confirmMessage = {
          role: 'assistant',
          content: '🚫 AI has been disabled. Only basic commands will work. Type "turn on ai" to re-enable.',
          isError: false
        };
        setConversationHistory(prev => [...prev, confirmMessage]);
        setCommandInput('');
        setIsDropdownOpen(true);
        return;
      }
      
      // Check AI status command
      if (lowerCommand === 'ai status' || lowerCommand === 'ai state') {
        setShowChat(true);
        const statusMessage = {
          role: 'assistant',
          content: aiEnabled 
            ? ' AI is currently ENABLED and ready to help!' 
            : ' AI is currently DISABLED. Type "turn on ai" to enable it.',
          isError: false
        };
        setConversationHistory(prev => [...prev, statusMessage]);
        setCommandInput('');
        setIsDropdownOpen(true);
        return;
      }
      
      // Call parent's command handler if provided (takes priority)
      if (onCommandSubmit) {
        onCommandSubmit(e, commandInput);
        setIsDropdownOpen(false);
        return;
      }
      
      // Load AI services if not already loaded
      await loadAIServices();
      
      // Check if it's an AI query
      if (isAIQuery && isAIQuery(command)) {
        // Check if AI is disabled
        if (!aiEnabled) {
          console.log('⚠️ AI is disabled, using fallback logic');
          setShowChat(true);
          const userMessage = { role: 'user', content: command };
          
          // Use fallback immediately without trying AI
          const fallbackResult = handleFallbackCommand(command);
          
          if (fallbackResult) {
            const fallbackMessage = {
              role: 'assistant',
              content: fallbackResult.action === 'help' 
                ? fallbackResult.message 
                : `AI is currently disabled. ${fallbackResult.message}`,
              isError: false
            };
            setConversationHistory(prev => [...prev, userMessage, fallbackMessage]);
            setCommandInput('');
            setIsDropdownOpen(true);
            
            // Execute fallback action
            if (fallbackResult.action === 'navigate') {
              setTimeout(() => {
                navigate(fallbackResult.path);
                setIsDropdownOpen(false);
                setShowChat(false);
              }, 500);
            } else if (fallbackResult.action === 'filter' && onSearchChange) {
              onSearchChange(fallbackResult.query);
            }
          } else {
            const fallbackMessage = {
              role: 'assistant',
              content: `AI is currently disabled. Try basic commands like page names or search terms.`,
              isError: true
            };
            setConversationHistory(prev => [...prev, userMessage, fallbackMessage]);
            setCommandInput('');
            setIsDropdownOpen(true);
          }
          
          return;
        }
        
        // Check if AI is in cooldown
        if (isAIInCooldown()) {
          const remainingTime = getRemainingCooldownTime();
          console.log('⚠️ AI in cooldown, using fallback logic');
          
          // Use fallback immediately without trying AI
          const fallbackResult = handleFallbackCommand(command);
          
          if (fallbackResult) {
            setShowChat(true);
            const userMessage = { role: 'user', content: command };
            const fallbackMessage = {
              role: 'assistant',
              content: fallbackResult.action === 'help' 
                ? fallbackResult.message 
                : `AI is temporarily unavailable (retry in ${remainingTime} min). ${fallbackResult.message}`,
              isError: false
            };
            setConversationHistory(prev => [...prev, userMessage, fallbackMessage]);
            setCommandInput('');
            setIsDropdownOpen(true);
            
            // Execute fallback action
            if (fallbackResult.action === 'navigate') {
              setTimeout(() => {
                navigate(fallbackResult.path);
                setIsDropdownOpen(false);
                setShowChat(false);
              }, 500);
            } else if (fallbackResult.action === 'filter' && onSearchChange) {
              onSearchChange(fallbackResult.query);
            }
            // For 'help' action, just show the message (no additional action needed)
          } else {
            setShowChat(true);
            const userMessage = { role: 'user', content: command };
            const fallbackMessage = {
              role: 'assistant',
              content: `AI is temporarily unavailable (retry in ${remainingTime} min). Try basic commands like page names or search terms.`,
              isError: true
            };
            setConversationHistory(prev => [...prev, userMessage, fallbackMessage]);
            setCommandInput('');
            setIsDropdownOpen(true);
          }
          
          return;
        }
        
        setIsProcessingAI(true);
        setIsDropdownOpen(true); // Keep dropdown open to show AI response
        setShowChat(true); // Show chat interface
        
        // Add user message to conversation history immediately
        const userMessage = { role: 'user', content: command };
        setConversationHistory(prev => [...prev, userMessage]);
        
        try {
          // Process with AI (use contextToUse which has default fallback)
          const response = await processAICommand(command, contextToUse);
          
          // Add AI response to conversation history
          const assistantMessage = { role: 'assistant', content: response.message, action: response.action };
          setConversationHistory(prev => [...prev, assistantMessage]);
          
          // Show AI response
          setAiResponse(response);
          
          // Call parent callback if provided
          if (onAIResponse) {
            onAIResponse(response);
          }
          
          // Execute action if AI returned one
          if (response.hasAction && executeAction) {
            executeAction(response, {
              onNavigate: (path) => {
                const pathMap = {
                  'home': '/',
                  'projects': '/projects',
                  'documents': '/documents',
                  'about': '/about',
                  'contact': '/contacts',
                  'contacts': '/contacts'
                };
                navigate(pathMap[path] || `/${path}`);
                setIsDropdownOpen(false);
                setAiResponse(null);
                setShowChat(false);
              },
              onFilter: (filterType) => {
                // If parent has search change handler, use it for filtering
                console.log('🔍 Filtering by:', filterType);
                if (onSearchChange) {
                  onSearchChange(filterType);
                }
                // Keep dropdown open to show the AI response
              },
              onOpen: (target) => {
                // This would open a specific project or document
                console.log('Opening:', target);
              },
              onSearch: (query) => {
                console.log('🔍 Searching for:', query);
                if (onSearchChange) {
                  onSearchChange(query);
                }
                // Keep dropdown open to show the AI response
              }
            });
          }
          
          setCommandInput('');
        } catch (error) {
          console.error('AI Processing Error:', error);
          
          // Check if it's a rate limit error
          const isRateLimitError = error.message && error.message.includes('rate-limited');
          
          if (isRateLimitError) {
            // Set AI cooldown for 5 minutes
            setAICooldown();
            
            // AI is unavailable - use fallback logic
            console.log('⚠️ AI unavailable, activating 5-minute cooldown and using fallback logic');
            setIsProcessingAI(false);
            
            // Try fallback navigation and filtering
            const fallbackResult = handleFallbackCommand(command);
            
            if (fallbackResult) {
              const errorMessage = {
                role: 'assistant',
                content: fallbackResult.action === 'help'
                  ? fallbackResult.message
                  : `AI has been disabled due to rate limiting. ${fallbackResult.message}\n\nType "turn on ai" when you want to re-enable it.`,
                isError: false
              };
              setConversationHistory(prev => [...prev, errorMessage]);
              setCommandInput('');
              setAiEnabledState(false); // Update local state
              
              // Execute fallback action
              if (fallbackResult.action === 'navigate') {
                navigate(fallbackResult.path);
                setIsDropdownOpen(false);
                setShowChat(false);
              } else if (fallbackResult.action === 'filter' && onSearchChange) {
                onSearchChange(fallbackResult.query);
              }
              // For 'help' action, just show the message (no additional action needed)
              
              return;
            }
          }
          
          const errorMessage = {
            role: 'assistant',
            content: isRateLimitError 
              ? "AI has been disabled due to rate limiting. Basic commands still work - try typing a page name or search term.\n\nType \"turn on ai\" to re-enable when ready."
              : "Sorry, I encountered an error. Please try again.",
            isError: true
          };
          setConversationHistory(prev => [...prev, errorMessage]);
          setAiResponse({
            hasAction: false,
            message: errorMessage.content
          });
          
          if (isRateLimitError) {
            setAiEnabledState(false); // Update local state
          }
        } finally {
          setIsProcessingAI(false);
        }
        
        return;
      }
      
      // Handle regular navigation commands (lowerCommand already defined above for AI toggle)
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
        // Clear command input
        setCommandInput('');
        setAiResponse(null);
        setConversationHistory([]);
        setShowChat(false);
        if (onSearchChange) {
          onSearchChange('');
        }
      }
      
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      // Clear input on Escape
      setCommandInput('');
      setAiResponse(null);
      setShowChat(false);
      if (onSearchChange) {
        onSearchChange('');
      }
      setIsDropdownOpen(false);
    }
  };

  // Fallback command handler when AI is unavailable
  const handleFallbackCommand = (command) => {
    const lowerCommand = command.toLowerCase().trim();
    
    // Help command - show available options
    if (lowerCommand === 'help' || lowerCommand === '?' || lowerCommand === 'commands') {
      const aiStatus = aiEnabled ? 'enabled ✅' : 'disabled 🚫';
      return {
        action: 'help',
        message: `Available commands (AI ${aiStatus}):\n\n🤖 AI Control:\n• "turn on ai" / "turn off ai" - Toggle AI\n• "ai status" - Check AI state\n\n📍 Navigation:\n• home, documents, projects, about, contacts\n• "go to [page]" or "open [page]"\n\n🔍 Search/Filter:\n• Type any technology: react, python, javascript, etc.\n• "filter [tech]", "show [tech]", "find [term]"\n• "projects" - show only project cards\n• "clear" or "show all" - show everything\n\n💡 Examples:\n• "documents" → Go to documents page\n• "react" → Filter React projects\n• "show python" → Filter Python projects\n• "projects" → Show only projects`
      };
    }
    
    // Navigation keywords and their paths
    const navigationMap = {
      // Direct page names
      'home': { path: '/', message: 'Taking you to Home page.' },
      'homepage': { path: '/home', message: 'Taking you to Homepage.' },
      'documents': { path: '/documents', message: 'Taking you to Documents page.' },
      'docs': { path: '/documents', message: 'Taking you to Documents page.' },
      'projects': { path: '/projects', message: 'Taking you to Projects page.' },
      'myprojects': { path: '/myprojects', message: 'Taking you to My Projects page.' },
      'about': { path: '/about', message: 'Taking you to About page.' },
      'contacts': { path: '/contacts', message: 'Taking you to Contacts page.' },
      'contact': { path: '/contacts', message: 'Taking you to Contacts page.' },
      'controller': { path: '/controller', message: 'Opening Controller.' },
      'god': { path: '/god', message: 'Opening God Mode.' },
      
      // Navigation phrases
      'go to home': { path: '/', message: 'Taking you to Home page.' },
      'go to homepage': { path: '/home', message: 'Taking you to Homepage.' },
      'go to documents': { path: '/documents', message: 'Taking you to Documents page.' },
      'go to docs': { path: '/documents', message: 'Taking you to Documents page.' },
      'go to projects': { path: '/projects', message: 'Taking you to Projects page.' },
      'go to about': { path: '/about', message: 'Taking you to About page.' },
      'go to contacts': { path: '/contacts', message: 'Taking you to Contacts page.' },
      'go to contact': { path: '/contacts', message: 'Taking you to Contacts page.' },
      
      'open home': { path: '/', message: 'Opening Home page.' },
      'open documents': { path: '/documents', message: 'Opening Documents page.' },
      'open projects': { path: '/projects', message: 'Opening Projects page.' },
      'open about': { path: '/about', message: 'Opening About page.' },
      'open contacts': { path: '/contacts', message: 'Opening Contacts page.' },
      
      'take me to home': { path: '/', message: 'Taking you to Home page.' },
      'take me to documents': { path: '/documents', message: 'Taking you to Documents page.' },
      'take me to projects': { path: '/projects', message: 'Taking you to Projects page.' },
      'take me to about': { path: '/about', message: 'Taking you to About page.' },
      'take me to contacts': { path: '/contacts', message: 'Taking you to Contacts page.' }
    };
    
    // Check for exact navigation match
    if (navigationMap[lowerCommand]) {
      return {
        action: 'navigate',
        path: navigationMap[lowerCommand].path,
        message: navigationMap[lowerCommand].message
      };
    }
    
    // Filter/search keywords
    const filterKeywords = [
      'react', 'javascript', 'python', 'node.js', 'nodejs', 'html', 'css',
      'typescript', 'java', 'c++', 'cpp', 'sql', 'mongodb', 'firebase',
      'express', 'vue', 'angular', 'django', 'flask', 'ai', 'ml', 'machine learning'
    ];
    
    // Check if command contains filter keywords
    for (const keyword of filterKeywords) {
      if (lowerCommand.includes(keyword)) {
        return {
          action: 'filter',
          query: keyword,
          message: `Filtering by "${keyword}".`
        };
      }
    }
    
    // Check for filter phrases
    if (lowerCommand.startsWith('filter ') || lowerCommand.startsWith('show ') || 
        lowerCommand.startsWith('find ') || lowerCommand.startsWith('search ')) {
      const searchTerm = lowerCommand
        .replace(/^(filter|show|find|search)\s+/, '')
        .replace(/\s+(projects?|cards?|items?)$/i, '')
        .trim();
      
      if (searchTerm) {
        return {
          action: 'filter',
          query: searchTerm,
          message: `Searching for "${searchTerm}".`
        };
      }
    }
    
    // Special commands
    if (lowerCommand === 'clear' || lowerCommand === 'reset' || 
        lowerCommand === 'show all' || lowerCommand === 'all') {
      return {
        action: 'filter',
        query: '',
        message: 'Showing all items.'
      };
    }
    
    if (lowerCommand === 'projects' || lowerCommand === 'show projects' || 
        lowerCommand === 'filter projects' || lowerCommand === 'only projects') {
      return {
        action: 'filter',
        query: 'projects',
        message: 'Showing only project cards.'
      };
    }
    
    // If nothing matches and it's not a clear tech/search term, suggest help
    const commonTechTerms = ['react', 'javascript', 'python', 'node', 'html', 'css', 'java', 'typescript'];
    const isLikelySearchTerm = commonTechTerms.some(term => lowerCommand.includes(term));
    
    if (!isLikelySearchTerm && command.length > 2) {
      // Check if it looks like a question or request for information
      const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'tell', 'show me', 'explain', 'list'];
      const isQuestion = questionWords.some(word => lowerCommand.includes(word));
      
      if (isQuestion) {
        return {
          action: 'help',
          message: `AI is unavailable to answer questions right now.\n\nAvailable commands:\n• Navigation: home, documents, projects, about, contacts\n• Filter: react, python, javascript, or any technology\n• Type "help" for more options`
        };
      }
      
      // Try general search with the full command
      return {
        action: 'filter',
        query: command,
        message: `Searching for "${command}".`
      };
    }
    
    // For very short commands that don't match anything
    if (command.length <= 2) {
      return {
        action: 'help',
        message: 'Command too short. Type "help" to see available commands.'
      };
    }
    
    return null;
  };

  return (
    <div className="command-line-container" ref={commandLineRef}>
      <div className="glass-panel">
        <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="command-input-wrapper">
            <span className="prompt-symbol" title={aiEnabled ? "AI Enabled" : "AI Disabled"}>
              {editMode ? '🔓' : isProcessingAI ? '' : aiEnabled ? '$+' : '$'}
            </span>
            <input
              ref={inputRef}
              type="text"
              className="command-input"
              placeholder={isProcessingAI ? "AI is thinking..." : aiEnabled ? placeholder : `${placeholder} (AI off)`}
              value={commandInput}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onClick={handleInputClick}
              onBlur={handleInputBlur}
              onKeyDown={handleCommandSubmit}
              autoComplete="off"
              disabled={isProcessingAI}
            />
            <span 
              className={`dropdown-indicator ${isDropdownOpen ? 'open' : 'closed'}`}
              onClick={handleDropdownToggle}
              style={{ cursor: 'pointer' }}
            >
              {isProcessingAI ? (
                <svg className="spinner" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                </svg>
              ) : isDropdownOpen ? (
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
            {/* Show Chat History if available */}
            {showChat && conversationHistory.length > 0 && (
              <div className="chat-container">
                <div className="chat-messages" ref={chatMessagesRef}>
                  {conversationHistory.map((message, index) => (
                    <div 
                      key={index} 
                      className={`chat-message ${message.role}`}
                      onClick={() => copyToClipboard(message.content, index)}
                      title="Click to copy"
                      style={{ cursor: 'pointer', position: 'relative' }}
                    >
                      <div className="message-header">
                        <span className="message-role">
                          {message.role === 'user' ? '' : ''}
                        </span>
                        {copiedIndex === index && (
                          <span className="copied-indicator">
                            Copied!
                          </span>
                        )}
                      </div>
                      <div className="message-content">
                        {message.content}
                      </div>
                      {message.action && (
                        <div className="message-action">
                          <span className="action-text">{message.action}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Show processing indicator */}
                  {isProcessingAI && (
                    <div className="chat-message assistant processing">
                      <div className="message-header">
                        <span className="message-role">AI</span>
                      </div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Show legacy AI Response if chat is not active */}
            {aiResponse && !showChat && (
              <div className="ai-response-section">
                <div className="ai-response-header">
                  <span className="ai-icon"></span>
                  <span className="ai-label">AI Assistant</span>
                  {aiResponse.hasAction && (
                    <span className="ai-action-badge">
                      <span className="action-text">{aiResponse.action}</span>
                    </span>
                  )}
                </div>
                <div className="ai-response-content">
                  {aiResponse.message}
                </div>
              </div>
            )}
            
            {/* Show processing state when chat is not active */}
            {isProcessingAI && !showChat && (
              <div className="ai-processing-section">
                <div className="ai-spinner"></div>
                <span className="ai-processing-text">AI is thinking...</span>
              </div>
            )}
            
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
