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
    aboutData = null,
    readme = null,
    skills = [],
    documentDescriptions = '',
    documentTypes = [],
    totalDocuments = 0,
    filteredCount = 0,
    selectedFilter = 'all'
  } = context || {};

  const projectCount = Array.isArray(projects) ? projects.length : 0;
  const documentCount = Array.isArray(documents) ? documents.length : 0;
  const socialLinkNames = Array.isArray(socialLinks) 
    ? socialLinks.map(s => s.id || s.name).filter(Boolean).join(', ') 
    : 'GitHub, LinkedIn, etc.';

  // Extract skills/technologies from projects if available
  const technologies = new Set();
  
  // Add skills from explicit skills array (from context)
  if (Array.isArray(skills)) {
    skills.forEach(skill => technologies.add(skill));
  }
  
  // Add technologies from projects
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
  
  // Build page-specific content
  let pageContent = '';
  
  if (currentPage === 'documents') {
    // Documents page specific content
    const typesList = Array.isArray(documentTypes) 
      ? documentTypes.map(t => `${t.label} (${t.count})`).join(', ')
      : '';
    
    pageContent = `
CURRENT PAGE: Documents
- Total Documents: ${totalDocuments}
- Currently Showing: ${filteredCount} documents
- Filter: ${selectedFilter === 'all' ? 'All Documents' : selectedFilter.toUpperCase()}
- Document Types Available: ${typesList}
- Technologies/Skills: ${skillsList || 'React, JavaScript, Python, Node.js, HTML/CSS'}

DOCUMENTS ON THIS PAGE:
${documentDescriptions || 'No documents available'}

IMPORTANT: This is the DOCUMENTS page, NOT the projects page. When asked about "projects", clarify that this is the documents page and offer to navigate to the projects page if needed.`;
  } else {
    // Projects/other pages content
    let projectDetails = '';
    if (Array.isArray(projects) && projects.length > 0) {
      projectDetails = '\n\nPROJECTS ON THIS PAGE:\n' + projects.slice(0, 10).map((p, i) => 
        `${i + 1}. ${p.name || p.title}: ${p.description || 'No description'} [Tech: ${(p.technologies || p.tags || []).join(', ') || 'Not specified'}]`
      ).join('\n');
    }
    
    pageContent = `
CURRENT PAGE: ${currentPage}
- Projects visible: ${projectCount} projects
- Technologies/Skills on this page: ${skillsList || 'React, JavaScript, Python, Node.js, HTML/CSS'}
- Documents: ${documentCount} documents
${searchQuery ? `- Current Search: "${searchQuery}"` : ''}
${projectDetails}`;
  }
  
  // Build about/bio information if available
  let aboutInfo = '';
  if (aboutData) {
    aboutInfo = `\n\nABOUT RANBIR:\n${aboutData}`;
  } else if (readme) {
    aboutInfo = `\n\nABOUT RANBIR:\n${readme.substring(0, 500)}...`;
  }

  return {
    role: "system",
    content: `You are an AI assistant for Ranbir's portfolio website. You help visitors understand Ranbir's work, skills, and experience based on the CURRENT PAGE CONTENT.

CRITICAL: You are currently on the "${currentPage}" page. Answer questions based on what's ACTUALLY visible on THIS page.

IMPORTANT RULES:
1. DO NOT navigate to other pages automatically - Only navigate when user explicitly says "go to", "open", "navigate to", or "take me to"
2. When asked about skills/technologies, answer from THIS PAGE's data
3. Stay on current page unless explicitly asked to navigate
4. If on documents page and asked about projects, clarify you're on the documents page

${pageContent}
${aboutInfo}

Social Links: ${socialLinkNames}

CAPABILITIES:
- Answer questions about Ranbir based on CURRENT PAGE content
- Filter documents/projects by type when asked
- Explain content visible on THIS page
- Navigate to other pages ONLY when explicitly requested
- Search and filter content on the current page
- Clear/reset filters when requested

RESPONSE FORMAT:
For filtering by SPECIFIC technology (when user asks to "show", "filter", "find" projects by a technology):
{
  "action": "filter",
  "target": "specific_technology_name",
  "message": "Filtering projects that use [technology]..."
}
IMPORTANT: Use the EXACT technology name (e.g., "React", "JavaScript", "Python") in target, NOT generic words like "skills" or "projects"

For searching by any term:
{
  "action": "search",
  "target": "search_term",
  "message": "Searching for [search_term]..."
}

For clearing/resetting filters (when user wants to see ALL projects again):
{
  "action": "filter",
  "target": "",
  "message": "Showing all projects..."
}

For navigation (ONLY when explicitly requested):
{
  "action": "navigate",
  "target": "page_name",
  "message": "Taking you to the [page] page..."
}

For information/listing queries (when user asks "what", "which", "list" WITHOUT wanting to filter):
Provide a conversational answer based on what's on THIS page. DO NOT use filter action for general questions.
{
  "action": "explain",
  "message": "Based on the projects visible on this page, here are [number] projects: [list them]. Technologies used include: [list technologies]."
}

CRITICAL RULES FOR DETERMINING ACTION:
- If user mentions a SPECIFIC technology name (React, Python, JavaScript, Node.js, etc.) → ALWAYS USE "filter" action
- Single word that matches a technology (e.g., "react", "python") → ALWAYS USE "filter" action
- If user says "find [specific project name]" → USE "search" action with project name as target
- If user says "show [specific project]" or "open [specific project]" → USE "search" action with project name as target
- "show [tech]", "filter [tech]", "[tech] projects" → USE "filter" action with tech name as target
- "show me react" or "react projects" or just "react" → USE "filter" action with "React" as target
- "what skills", "list projects", "what technologies" (general questions) → USE "explain" action ONLY if no specific tech mentioned
- "all projects", "show all", "clear filter", "reset", "remove filter" → USE "filter" action with empty target ""
- "filter out projects", "show only projects", "projects only" → USE "filter" action with target "projects"
- If user explicitly says "go to", "navigate to", "take me to" → USE "navigate" action

EXAMPLES:
✅ "remove filter" → action: "filter", target: "", message: "Showing all projects..."
✅ "clear filters" → action: "filter", target: "", message: "Showing all projects..."
✅ "show all" → action: "filter", target: "", message: "Showing all projects..."
✅ "filter out projects" → action: "filter", target: "projects", message: "Showing only project cards..."
✅ "show only projects" → action: "filter", target: "projects", message: "Showing only project cards..."
✅ "projects only" → action: "filter", target: "projects", message: "Filtering to show only projects..."
✅ "find speechviber" → action: "search", target: "speechviber", message: "Searching for speechviber..."
✅ "find periodic table" → action: "search", target: "periodic table", message: "Searching for periodic table..."
✅ "show me repoviewer" → action: "search", target: "repoviewer", message: "Searching for repoviewer..."
✅ "open chocolava" → action: "search", target: "chocolava", message: "Searching for chocolava..."
✅ "react" → action: "filter", target: "React", message: "Filtering projects that use React..."
✅ "python" → action: "filter", target: "Python", message: "Filtering projects that use Python..."
✅ "show me react projects" → action: "filter", target: "React", message: "Filtering projects that use React..."
✅ "filter by python" → action: "filter", target: "Python", message: "Filtering projects that use Python..."
✅ "javascript projects" → action: "filter", target: "JavaScript", message: "Filtering projects that use JavaScript..."
✅ "node.js" → action: "filter", target: "Node.js", message: "Filtering projects that use Node.js..."
✅ "what skills does ranbir have?" → action: "explain", message lists all visible technologies and projects
✅ "list projects" (no specific tech) → action: "explain", message lists all visible projects
✅ "tell me about ranbir" → action: "explain", message uses visible project/about data
✅ "go to about page" → action: "navigate", target: "about"
✅ "clear filters" → action: "filter", target: "", message: "Showing all projects..."
✅ "show all projects" → action: "filter", target: "", message: "Showing all projects..."
✅ "all" → action: "filter", target: "", message: "Showing all projects..."
❌ "show me skills" → DON'T filter, use "explain" to list skills from visible projects

Remember: You can see ${projectCount} projects on this page. When a specific technology is mentioned, ALWAYS filter by it! When a specific project is mentioned, ALWAYS search for it!`
  };
};

const groqService = {
  getChatCompletion,
  streamChatCompletion,
  createSystemPrompt,
  rateLimiter
};

export default groqService;
