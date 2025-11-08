import Groq from "groq-sdk";

// Lazy initialization of Groq client
let groq = null;

const getGroqClient = () => {
  if (!groq) {
    const apiKey = process.env.REACT_APP_GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('REACT_APP_GROQ_API_KEY is not set in .env file');
      throw new Error('Groq API key is missing. Please add REACT_APP_GROQ_API_KEY to your .env file.');
    }
    
    groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }
  
  return groq;
};

// Available models with their rate limits (RPM - Requests Per Minute)
const MODELS = [
  { id: "llama-3.3-70b-versatile", rpm: 30, tpm: 12000, priority: 1 },
  { id: "llama-3.1-8b-instant", rpm: 30, tpm: 6000, priority: 2 },
  { id: "meta-llama/llama-4-scout-17b-16e-instruct", rpm: 30, tpm: 30000, priority: 3 },
  { id: "groq/compound-mini", rpm: 30, tpm: 70000, priority: 4 },
  { id: "allam-2-7b", rpm: 30, tpm: 6000, priority: 5 }
];

// Track API calls per model
class RateLimiter {
  constructor() {
    this.modelUsage = {};
    this.windowSize = 60000; // 1 minute in milliseconds
  }

  canUseModel(modelId) {
    const model = MODELS.find(m => m.id === modelId);
    if (!model) return false;

    const now = Date.now();
    const usage = this.modelUsage[modelId] || [];
    
    // Remove old requests outside the time window
    const recentRequests = usage.filter(timestamp => now - timestamp < this.windowSize);
    this.modelUsage[modelId] = recentRequests;

    return recentRequests.length < model.rpm;
  }

  recordUsage(modelId) {
    if (!this.modelUsage[modelId]) {
      this.modelUsage[modelId] = [];
    }
    this.modelUsage[modelId].push(Date.now());
  }

  getAvailableModel() {
    // Sort models by priority and find the first available one
    const sortedModels = [...MODELS].sort((a, b) => a.priority - b.priority);
    
    for (const model of sortedModels) {
      if (this.canUseModel(model.id)) {
        return model.id;
      }
    }

    // If all models are rate-limited, return the highest priority one
    return sortedModels[0].id;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Get chat completion from Groq API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Optional parameters (temperature, max_tokens, etc.)
 * @returns {Promise<string>} - The AI response
 */
export const getChatCompletion = async (messages, options = {}) => {
  try {
    // Initialize Groq client if not already initialized
    const client = getGroqClient();
    
    const modelId = rateLimiter.getAvailableModel();
    rateLimiter.recordUsage(modelId);

    const completion = await client.chat.completions.create({
      messages,
      model: modelId,
      temperature: options.temperature || 0.7,
      max_completion_tokens: options.max_tokens || 1024,
      top_p: options.top_p || 1,
      stop: options.stop || null,
      stream: false
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq API Error:", error);
    
    // If rate limited, throw error immediately (don't try other models)
    if (error.status === 429) {
      console.error("Rate limit exceeded. Cooldown activated.");
      throw new Error('All AI models are currently rate-limited. Please try again in a few minutes.');
    }
    
    throw error;
  }
};

/**
 * Stream chat completion from Groq API
 * @param {Array} messages - Array of message objects with role and content
 * @param {Function} onChunk - Callback function for each chunk
 * @param {Object} options - Optional parameters
 * @returns {Promise<void>}
 */
export const streamChatCompletion = async (messages, onChunk, options = {}) => {
  try {
    // Initialize Groq client if not already initialized
    const client = getGroqClient();
    
    const modelId = rateLimiter.getAvailableModel();
    rateLimiter.recordUsage(modelId);

    const stream = await client.chat.completions.create({
      messages,
      model: modelId,
      temperature: options.temperature || 0.7,
      max_completion_tokens: options.max_tokens || 1024,
      top_p: options.top_p || 1,
      stop: options.stop || null,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        onChunk(content);
      }
    }
  } catch (error) {
    console.error("Groq Streaming Error:", error);
    
    // If rate limited, throw error immediately (don't try other models)
    if (error.status === 429) {
      console.error("Rate limit exceeded. Cooldown activated.");
      throw new Error('All AI models are currently rate-limited. Please try again in a few minutes.');
    }
    
    throw error;
  }
};

/**
 * Create a system prompt with context about the user's portfolio
 * @param {Object} context - Context object with user data
 * @returns {Object} - System message object
 */
export const createSystemPrompt = (context = {}) => {
  // Safely extract context properties with defaults
  const { 
    projects = [], 
    documents = [], 
    socialLinks = [], 
    currentPage = 'home',
    searchQuery = '',
    skills = [],
    authorDescription = '',
    authorSkills = [],
    aboutData = ''
  } = context || {};

  const projectCount = Array.isArray(projects) ? projects.length : 0;
  const documentCount = Array.isArray(documents) ? documents.length : 0;
  
  // Build complete project list with details
  let projectsList = '';
  if (Array.isArray(projects) && projects.length > 0) {
    projectsList = projects.map((p, i) => {
      const tech = (p.technologies || p.tags || []).join(', ') || 'Not specified';
      const stars = p.stars ? ` ⭐${p.stars}` : '';
      const source = p.source === 'github' ? ' [GitHub]' : ' [Firebase]';
      const dateInfo = p.created_at ? ` | Created: ${new Date(p.created_at).toLocaleDateString()}` : '';
      const updateInfo = p.updated_at ? ` | Updated: ${new Date(p.updated_at).toLocaleDateString()}` : '';
      return `${i + 1}. ${p.name || p.title}${source}${stars}: ${p.description || 'No description'} | Tech: ${tech}${dateInfo}${updateInfo}`;
    }).join('\n');
  }

  // Build complete social links list
  let socialLinksList = '';
  if (Array.isArray(socialLinks) && socialLinks.length > 0) {
    socialLinksList = socialLinks.map(s => {
      return `${s.id || s.name}: ${s.url || s.link}`;
    }).join('\n');
  }

  // Build complete documents list
  let documentsList = '';
  if (Array.isArray(documents) && documents.length > 0) {
    documentsList = documents.map((d, i) => {
      return `${i + 1}. ${d.title || d.name}: ${d.description || 'No description'}`;
    }).join('\n');
  }

  // Extract skills/technologies from projects
  const technologies = new Set();
  
  if (Array.isArray(skills)) {
    skills.forEach(skill => technologies.add(skill));
  }
  
  if (Array.isArray(projects)) {
    projects.forEach(project => {
      if (Array.isArray(project.technologies)) {
        project.technologies.forEach(tech => technologies.add(tech));
      }
      if (Array.isArray(project.tags)) {
        project.tags.forEach(tag => technologies.add(tag));
      }
    });
  }
  const skillsList = Array.from(technologies).join(', ');

  // Build author information
  let authorInfo = '';
  if (authorDescription) {
    authorInfo = `\n\nABOUT RANBIR:\n${authorDescription}`;
  } else if (aboutData) {
    authorInfo = `\n\nABOUT RANBIR:\n${aboutData}`;
  }
  
  if (authorSkills && authorSkills.length > 0) {
    authorInfo += `\n\nAUTHOR SKILLS: ${authorSkills.join(', ')}`;
  }

  const systemContent = `You are an AI assistant for Ranbir's portfolio website. You have access to real-time data fetched from GitHub and Firebase.

IMPORTANT INSTRUCTIONS:
- You have COMPLETE ACCESS to all projects, documents, and data fetched from GitHub and Firebase
- When asked about counts (how many projects, documents, etc.), use the EXACT numbers from the data below
- When listing items, use the ACTUAL data provided below, not what's "visible on page"
- Be specific and accurate with numbers and details
- If asked about GitHub, provide the exact GitHub profile URL if available in social links

=== COMPLETE DATA FROM GITHUB & FIREBASE ===

TOTAL PROJECTS: ${projectCount}
All Projects (from GitHub + Firebase):
${projectsList || 'No projects found'}

TOTAL DOCUMENTS: ${documentCount}
All Documents:
${documentsList || 'No documents found'}

SOCIAL LINKS:
${socialLinksList || 'No social links found'}

TECHNOLOGIES/SKILLS: ${skillsList || 'Not available'}
${authorInfo}

CURRENT CONTEXT:
- Page: ${currentPage}
- Search Query: ${searchQuery || 'None'}

=== END OF DATA ===

IMPORTANT RULES FOR ANSWERING:
1. GREETINGS: If user says "hi", "hello", "hey", "howdy", or similar greetings, respond warmly and briefly introduce yourself. DO NOT treat greetings as search queries!
2. AUTHOR QUESTIONS: When asked "who is ranbir" or similar, use the "ABOUT RANBIR" section above - this contains complete information from Firebase
3. COUNTS: Always use exact numbers from "TOTAL PROJECTS" and "TOTAL DOCUMENTS" above
4. LISTINGS: When listing projects/documents, use the numbered lists above
5. GITHUB: Extract GitHub URL from SOCIAL LINKS section
6. LATEST/RECENT PROJECTS: When asked about "latest", "newest", "most recent" projects, look at the "Updated" or "Created" dates in the project list. GitHub projects include these timestamps - use them to identify the most recent project.
7. DON'T say "no information available" - ALL data is provided above in the relevant sections

When answering:
1. Always use the exact counts from the data above
2. Reference specific projects/documents by name from the lists
3. If listing multiple items, show them clearly with numbers
4. For GitHub profile questions, extract the GitHub URL from social links
5. For "latest project" questions, check the Updated/Created dates and identify the most recently updated project from GitHub
5. Be precise and don't say "visible on this page" - you have ALL the data

RESPONSE FORMAT:
For greetings (hi, hello, hey, etc.):
{
  "action": "explain",
  "message": "Hello! 👋 I'm Ranbir's AI assistant. I can help you explore his ${projectCount} projects, answer questions about his work, or navigate through the portfolio. What would you like to know?"
}

For filtering by SPECIFIC technology:
{
  "action": "filter",
  "target": "technology_name",
  "message": "Filtering projects that use [technology]..."
}

For searching by term:
{
  "action": "search",
  "target": "search_term",
  "message": "Searching for [search_term]..."
}

For clearing filters:
{
  "action": "filter",
  "target": "",
  "message": "Showing all projects..."
}

For navigation (only when explicitly requested):
{
  "action": "navigate",
  "target": "page_name",
  "message": "Taking you to the [page] page..."
}

For information queries (counts, lists, URLs):
{
  "action": "explain",
  "message": "[Answer based on the COMPLETE DATA above. Use exact counts and list items from the numbered lists.]"
}

CRITICAL RULES:
- GREETINGS (hi, hello, hey, howdy, etc.) → USE "explain" action with friendly greeting response
- "who is ranbir", "about ranbir", "tell me about" → USE "explain" with info from ABOUT RANBIR section
- Specific technology mentioned → USE "filter" action
- "find [project name]" → USE "search" action
- "show all", "clear filter" → USE "filter" with empty target
- "list projects", "how many projects", "what skills" → USE "explain" action
- "GitHub URL", "GitHub profile" → USE "explain" and extract from SOCIAL LINKS
- "go to", "navigate to" → USE "navigate" action

Remember: You have ${projectCount} total projects and ${documentCount} documents. Always use these exact numbers!`;

  return {
    role: "system",
    content: systemContent
  };
};

const groqService = {
  getChatCompletion,
  streamChatCompletion,
  createSystemPrompt,
  rateLimiter
};

export default groqService;
