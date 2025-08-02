import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  sendChatMessage, 
  subscribeToChatMessages, 
  generateAnonymousUserId,
  testChatFlow,
  startAutoCleanup,
  cleanupExpiredMessages,
  deleteChatThread
} from '../firebase/firestoreService';

const ChatBox = ({ isFullScreen, onToggleFullScreen, editMode }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showUserSetup, setShowUserSetup] = useState(true);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const cleanupIntervalRef = useRef(null);

  // Define connectToChat function with useCallback to prevent unnecessary re-renders
  const connectToChat = useCallback((userIdToUse, userNameToUse, isNewUser = false) => {
    try {
      setIsLoading(true);
      console.log('🔌 Connecting to chat for user:', userNameToUse, isNewUser ? '(New User)' : '(Existing User)');
      
      // If this is a new user (reset), clear messages immediately
      if (isNewUser) {
        setMessages([]);
        setIsConnected(false);
      }
      
      // Subscribe to messages for this user
      const unsubscribe = subscribeToChatMessages(userIdToUse, (newMessages) => {
        console.log('📨 ChatBox received messages update:', newMessages);
        
        // Always update with the latest messages from Firebase
        setMessages(newMessages);
        setIsConnected(true);
        setIsLoading(false);
        
        // Add welcome message only if no real messages exist and this is a new user
        if (isNewUser && newMessages.length === 0) {
          console.log('👋 Adding welcome message for new user with no messages');
          setMessages([{
            id: 'welcome',
            message: '👋 Hola, Type your message to start chatting...',
            userName: 'Support Team',
            sender: 'support',
            timestamp: new Date()
          }]);
        }
      });
      
      unsubscribeRef.current = unsubscribe;
      
    } catch (error) {
      console.error('Error connecting to chat:', error);
      setIsLoading(false);
    }
  }, []);

  // Initialize chat
  useEffect(() => {
    // Start auto-cleanup when component mounts
    cleanupIntervalRef.current = startAutoCleanup();
    
    // Check if user already has an ID stored
    const storedUserId = localStorage.getItem('chatUserId');
    const storedUserName = localStorage.getItem('chatUserName');
    
    if (storedUserId && storedUserName) {
      setUserId(storedUserId);
      setUserName(storedUserName);
      setShowUserSetup(false);
      connectToChat(storedUserId, storedUserName, false); // false = existing user
    }
  }, [connectToChat]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  const handleUserSetup = async () => {
    if (!userName.trim()) {
      alert('Please enter your name to continue');
      return;
    }

    setIsLoading(true);
    
    try {
      // Always generate a new user ID for a fresh session
      // DO NOT delete previous chat threads from Firebase
      const newUserId = generateAnonymousUserId();
      setUserId(newUserId);
      
      // Store in localStorage for persistence
      localStorage.setItem('chatUserId', newUserId);
      localStorage.setItem('chatUserName', userName.trim());
      
      setShowUserSetup(false);
      
      // Clear any existing messages state before connecting
      setMessages([]);
      setIsConnected(false);
      
      // Connect with isNewUser flag set to true
      connectToChat(newUserId, userName.trim(), true);
    } catch (error) {
      console.error('❌ Error setting up user:', error);
      alert('Failed to set up chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const messageToSend = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('📤 Sending message:', messageToSend, 'for user:', userId, userName);
      const result = await sendChatMessage(messageToSend, userId, userName);
      console.log('✅ Message sent successfully:', result);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');
      setInputMessage(messageToSend); // Restore message
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleResetChat = async () => {
    if (window.confirm('This will start a new chat session. You can enter a new name and begin fresh. Are you sure?')) {
      setIsLoading(true);
      
      try {
        // Unsubscribe from current chat first
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
        
        // DO NOT delete the chat document from Firebase - just clear local state
        // The old chat will remain in Firebase but user will start completely fresh
        
        // Clean up local state and storage completely
        localStorage.removeItem('chatUserId');
        localStorage.removeItem('chatUserName');
        
        // Reset all state to initial values
        setUserId('');
        setUserName('');
        setMessages([]); // Clear messages array completely
        setIsConnected(false);
        setShowUserSetup(true); // Show user setup again
        setInputMessage(''); // Clear any pending input
        
        console.log('✅ Chat reset completed successfully - user will start completely fresh with new identity');
      } catch (error) {
        console.error('❌ Error resetting chat:', error);
        alert('Failed to reset chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTestResponse = async () => {
    try {
      console.log('🧪 Running comprehensive message flow test...');
      const result = await testChatFlow(userId);
      
      if (result.success) {
        console.log('✅ Test completed successfully!', result);
        alert('Test completed! Check the console for details.');
      } else {
        console.error('❌ Test failed:', result.error);
        alert('Test failed! Check the console for details.');
      }
    } catch (error) {
      console.error('Error running test:', error);
      alert('Test failed! Check the console for details.');
    }
  };

  const handleCleanupTest = async () => {
    try {
      console.log('🧹 Running manual cleanup test...');
      const result = await cleanupExpiredMessages();
      
      if (result.success) {
        console.log('✅ Cleanup completed successfully!', result);
        alert(`Cleanup completed! Deleted ${result.deletedCount} expired messages. Check console for details.`);
      } else {
        console.error('❌ Cleanup failed:', result.error);
        alert('Cleanup failed! Check the console for details.');
      }
    } catch (error) {
      console.error('Error running cleanup test:', error);
      alert('Cleanup test failed! Check the console for details.');
    }
  };

  if (showUserSetup) {
    return (
      <div className={`chatbox-container ${isFullScreen ? 'fullscreen' : ''}`}>
        <div className="chatbox-header">
          <div className="chatbox-status">
            <div className="status-indicator offline"></div>
            <span>Start New Chat</span>
          </div>
          <div className="chatbox-controls">
            <button 
              className="fullscreen-btn"
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullScreen ? (
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                  <path d="M3 7V4a1 1 0 0 1 1-1h3m0 18H4a1 1 0 0 1-1-1v-3m18 0v3a1 1 0 0 1-1 1h-3m0-18h3a1 1 0 0 1 1 1v3"></path>
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <div className="chatbox-setup">
          <div className="setup-content">
            <h3>Welcome to the Chat!</h3>
            <div className="setup-form">
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleUserSetup()}
                className="setup-input"
                disabled={isLoading}
                maxLength={50}
              />
              <button 
                onClick={handleUserSetup}
                disabled={isLoading}
                className="setup-button"
                style={{ opacity: isLoading ? 0.6 : 1 }}
              >
                {isLoading ? 'Setting up...' : 'Start Chat'}
              </button>
            </div>
            <div className="setup-info">
              <small>
                <span className="info-icon">🔒</span>
                Your identity remains anonymous but messages may not.
              </small>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chatbox-container ${isFullScreen ? 'fullscreen' : ''}`} key={userId || 'no-user'}>
      <div className="chatbox-header">
        <div className="chatbox-status">
          <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></div>
          <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
        <div className="chatbox-info">
          <span>Chatting as: {userName}</span>
        </div>
        <div className="chatbox-controls">
          <button 
            className="reset-btn"
            onClick={handleResetChat}
            disabled={isLoading}
            title={isLoading ? "Starting new session..." : "Start new chat session with fresh identity"}
            style={{ opacity: isLoading ? 0.5 : 1 }}
          >
            {isLoading ? (
              <svg viewBox="0 0 24 24" width="16" height="16" className="loading-spinner">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
            )}
          </button>
          {editMode && (
            <>
              <button 
                className="test-btn"
                onClick={handleTestResponse}
                title="Send Test Response"
                style={{ 
                  background: 'rgba(0, 255, 0, 0.1)', 
                  border: '1px solid rgba(0, 255, 0, 0.3)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Test
              </button>
              <button 
                className="cleanup-btn"
                onClick={handleCleanupTest}
                title="Manual Cleanup Test"
                style={{ 
                  background: 'rgba(255, 165, 0, 0.1)', 
                  border: '1px solid rgba(255, 165, 0, 0.3)',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginLeft: '4px'
                }}
              >
                🧹
              </button>
            </>
          )}
          <button 
            className="fullscreen-btn"
            onClick={onToggleFullScreen}
            title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
          >
            {isFullScreen ? (
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
                <path d="M3 7V4a1 1 0 0 1 1-1h3m0 18H4a1 1 0 0 1-1-1v-3m18 0v3a1 1 0 0 1-1 1h-3m0-18h3a1 1 0 0 1 1 1v3"></path>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="chatbox-messages" key={`messages-${userId}`}>
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`message ${message.sender === 'support' ? 'support-message' : 'user-message'}`}
          >
            <div className="message-header">
              <span className="message-author">{message.userName}</span>
              <span className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
            <div className="message-content">
              {message.message}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message support-message">
            <div className="message-header">
              <span className="message-author">Support Team</span>
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
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chatbox-input-area">
        <div className="input-wrapper">
          <input 
            type="text" 
            placeholder="Type your message here..." 
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || !isConnected}
            className="chatbox-input"
            maxLength={500}
          />
          <button 
            className="send-btn" 
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim() || !isConnected}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
        <div className="input-info">
          <small>Messages are sent to our support team for quick responses</small>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
