import { getChatCompletion, createSystemPrompt } from './groqService';

/**
 * Process user command with AI to determine intent and action
 * @param {string} userInput - The user's command/query
 * @param {Object} context - Current application context
 * @returns {Promise<Object>} - AI response with action and message
 */
export const processAICommand = async (userInput, context = {}) => {
  try {
    const systemPrompt = createSystemPrompt(context);
    
    // Add user's command
    const messages = [
      systemPrompt,
      {
        role: "user",
        content: userInput
      }
    ];

    const response = await getChatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 512
    });

    // Try to parse JSON if response contains action
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const action = JSON.parse(jsonMatch[0]);
        return {
          hasAction: true,
          action: action.action,
          target: action.target,
          message: action.message || response,
          fullResponse: response
        };
      } catch (e) {
        // If JSON parsing fails, return as regular response
      }
    }

    // Return as conversational response
    return {
      hasAction: false,
      message: response,
      fullResponse: response
    };
  } catch (error) {
    console.error("AI Command Processing Error:", error);
    
    // Re-throw rate limit errors so CommandLine can handle them properly
    if (error.message && error.message.includes('rate-limited')) {
      throw error;
    }
    
    return {
      hasAction: false,
      message: "I'm having trouble processing your request right now. Please try again.",
      error: error.message
    };
  }
};

/**
 * Detect if user input is asking for AI assistance
 * @param {string} input - User input
 * @returns {boolean}
 */
export const isAIQuery = (input) => {
  const lowerInput = input.toLowerCase().trim();
  
  // List of navigation-only commands that shouldn't trigger AI
  const navigationCommands = [
    'documents', 'projects', 'home', 'about', 
    'contact', 'contacts', 'clear', 'reset'
  ];
  
  // If it's a navigation command, don't treat as AI query
  if (navigationCommands.includes(lowerInput)) {
    return false;
  }
  
  // Otherwise, treat everything else as an AI query
  // This allows natural conversation without needing trigger words
  return true;
};

/**
 * Extract context from the current page and data
 * @param {string} currentPage - Current page name
 * @param {Object} pageData - Data from the current page
 * @returns {Object} - Context object for AI
 */
export const extractContext = (currentPage, pageData = {}) => {
  return {
    currentPage,
    projects: pageData.projects || [],
    documents: pageData.documents || [],
    socialLinks: pageData.socialLinks || [],
    filteredProjects: pageData.filteredProjects || [],
    searchQuery: pageData.searchQuery || ''
  };
};

/**
 * Execute action based on AI response
 * @param {Object} aiResponse - Response from processAICommand
 * @param {Object} handlers - Object containing handler functions
 * @returns {void}
 */
export const executeAction = (aiResponse, handlers = {}) => {
  if (!aiResponse.hasAction) return;

  const { action, target } = aiResponse;

  switch (action) {
    case 'navigate':
      if (handlers.onNavigate) {
        handlers.onNavigate(target);
      }
      break;

    case 'filter':
      if (handlers.onFilter) {
        handlers.onFilter(target);
      }
      break;

    case 'open':
      if (handlers.onOpen) {
        handlers.onOpen(target);
      }
      break;

    case 'search':
      if (handlers.onSearch) {
        handlers.onSearch(target);
      }
      break;

    case 'explain':
      // Message already contains explanation
      break;

    default:
      console.log('Unknown action:', action);
  }
};

/**
 * Generate conversational responses for common queries
 * @param {string} input - User input
 * @param {Object} context - Application context
 * @returns {Promise<string>} - AI response
 */
export const getConversationalResponse = async (input, context) => {
  const systemPrompt = createSystemPrompt(context);
  
  const messages = [
    systemPrompt,
    {
      role: "user",
      content: input
    }
  ];

  return await getChatCompletion(messages, {
    temperature: 0.8,
    max_tokens: 300
  });
};

const aiCommandProcessor = {
  processAICommand,
  isAIQuery,
  extractContext,
  executeAction,
  getConversationalResponse
};

export default aiCommandProcessor;
