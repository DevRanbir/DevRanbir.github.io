import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Utility to initialize the GitHub token in Firestore with a fake value (run once, then update in Firestore UI)
export async function initializeFakeGithubToken() {
  // Use token from env if available, otherwise use fake token
  const fakeToken = process.env.REACT_APP_GITHUB_TOKEN || 'ghp_FAKE_TOKEN_FOR_SETUP';
  try {
    await GitHubRepoService.setToken(fakeToken);
    if (process.env.REACT_APP_GITHUB_TOKEN) {
      console.log('Initialized github-token document in Firestore with token from environment.');
    } else {
      console.log('Initialized github-token document in Firestore with a fake token. Please update it with your real token in the Firestore console.');
    }
  } catch (error) {
    console.error('Failed to initialize github-token document:', error);
  }
}
// GitHub Repository Service for fetching user repositories with pinned repos and enhanced sorting
class GitHubRepoService {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = null; // Will be loaded from Firestore
    this.tokenLoaded = false;
    this.tokenLoadingPromise = null;
  }

  // Firestore document path for GitHub token
  static getTokenDocRef() {
    return doc(db, 'website-content', 'github-token');
  }

  // Fetch token from Firestore (and cache it)
  async loadToken() {
    if (this.tokenLoaded && this.token) return this.token;
    if (this.tokenLoadingPromise) return this.tokenLoadingPromise;
    this.tokenLoadingPromise = (async () => {
      try {
        const docSnap = await getDoc(GitHubRepoService.getTokenDocRef());
        if (docSnap.exists() && docSnap.data().token) {
          this.token = docSnap.data().token;
          this.tokenLoaded = true;
          console.log('GitHub token loaded from Firestore:');
          return this.token;
        } else {
          this.token = null;
          this.tokenLoaded = false;
          return null;
        }
      } catch (error) {
        console.error('Error loading GitHub token from Firestore:', error);
        this.token = null;
        this.tokenLoaded = false;
        return null;
      } finally {
        this.tokenLoadingPromise = null;
      }
    })();
    return this.tokenLoadingPromise;
  }

  // Set token in Firestore (for manual admin use)
  static async setToken(token) {
    try {
      await setDoc(GitHubRepoService.getTokenDocRef(), { token });
      return true;
    } catch (error) {
      console.error('Error setting GitHub token in Firestore:', error);
      return false;
    }
  }

  // Get authorization headers (async, always loads token if not loaded)
  async getHeaders() {
    if (!this.tokenLoaded || !this.token) {
      await this.loadToken();
    }
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }
    return headers;
  }

  // Fetch pinned repositories for a user
  async getPinnedRepositories(username) {
    try {
      // GitHub GraphQL API is needed for pinned repositories
      const query = `
        query {
          user(login: "${username}") {
            pinnedItems(first: 6, types: [REPOSITORY]) {
              edges {
                node {
                  ... on Repository {
                    id
                    name
                    description
                    url
                    homepageUrl
                    createdAt
                    updatedAt
                    stargazerCount
                    forkCount
                    primaryLanguage {
                      name
                    }
                    repositoryTopics(first: 20) {
                      edges {
                        node {
                          topic {
                            name
                          }
                        }
                      }
                    }
                    isPrivate
                    isFork
                    defaultBranchRef {
                      name
                    }
                    diskUsage
                  }
                }
              }
            }
          }
        }
      `;

      const headers = await this.getHeaders();
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`GitHub GraphQL API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      // Convert GraphQL response to REST API format
      return data.data.user.pinnedItems.edges.map(edge => {
        const repo = edge.node;
        return {
          id: parseInt(repo.id.replace('MDEwOlJlcG9zaXRvcnk=', ''), 10) || Date.now(),
          name: repo.name,
          description: repo.description,
          html_url: repo.url,
          homepage: repo.homepageUrl,
          created_at: repo.createdAt,
          updated_at: repo.updatedAt,
          stargazers_count: repo.stargazerCount,
          forks_count: repo.forkCount,
          language: repo.primaryLanguage?.name,
          topics: repo.repositoryTopics.edges.map(edge => edge.node.topic.name),
          private: repo.isPrivate,
          fork: repo.isFork,
          default_branch: repo.defaultBranchRef?.name || 'main',
          size: repo.diskUsage || 0,
          isPinned: true // Mark as pinned
        };
      });
    } catch (error) {
      console.error('Error fetching pinned repositories:', error);
      // Return empty array if pinned repos can't be fetched
      return [];
    }
  }

  // Fetch user repositories
  async getUserRepositories(username, options = {}) {
    try {
      const {
        type = 'owner', // 'all', 'owner', 'member'
        sort = 'updated', // 'created', 'updated', 'pushed', 'full_name'
        direction = 'asc', // 'asc', 'desc'
        per_page = 100, // max 100
        page = 1
      } = options;

      const params = new URLSearchParams({
        type,
        sort,
        direction,
        per_page: per_page.toString(),
        page: page.toString()
      });

      const url = `${this.baseURL}/users/${username}/repos?${params}`;
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`User not found: ${username}`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user repositories:', error);
      throw error;
    }
  }

  // Fetch authenticated user's repositories
  async getMyRepositories(options = {}) {
    try {
      const {
        visibility = 'all', // 'all', 'public', 'private'
        affiliation = 'owner', // 'owner', 'collaborator', 'organization_member'
        type = 'owner', // 'all', 'owner', 'public', 'private', 'member'
        sort = 'updated', // 'created', 'updated', 'pushed', 'full_name'
        direction = 'desc', // 'asc', 'desc'
        per_page = 100, // max 100
        page = 1
      } = options;

      const params = new URLSearchParams({
        visibility,
        affiliation,
        type,
        sort,
        direction,
        per_page: per_page.toString(),
        page: page.toString()
      });

      const url = `${this.baseURL}/user/repos?${params}`;
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Please check your GitHub token');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching my repositories:', error);
      throw error;
    }
  }

  // Convert GitHub repository to project format
  convertRepoToProject(repo) {
    // Determine project type based on language and topics
    const projectType = this.determineProjectType(repo.language, repo.topics || []);
    
    return {
      id: `github-${repo.id}`, // Prefix with 'github-' to identify GitHub repos
      name: repo.name,
      type: projectType,
      repoUrl: repo.html_url,
      liveUrl: repo.homepage || '', // GitHub Pages or custom homepage
      description: repo.description || '',
      dateAdded: repo.created_at ? new Date(repo.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isFromGitHub: true, // Flag to identify GitHub-sourced projects
      isPinned: repo.isPinned || false, // Flag for pinned repositories
      githubData: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics || [],
        updated_at: repo.updated_at,
        size: repo.size,
        default_branch: repo.default_branch,
        is_private: repo.private,
        is_fork: repo.fork,
        isPinned: repo.isPinned || false
      }
    };
  }

  // Determine project type based on language and topics
  determineProjectType(language, topics) {
    // Check topics first for more specific categorization
    const topicSet = new Set(topics.map(topic => topic.toLowerCase()));
    
    if (topicSet.has('react') || topicSet.has('vue') || topicSet.has('angular') || 
        topicSet.has('web') || topicSet.has('frontend') || topicSet.has('website')) {
      return 'web';
    }
    
    if (topicSet.has('mobile') || topicSet.has('android') || topicSet.has('ios') || 
        topicSet.has('react-native') || topicSet.has('flutter')) {
      return 'mobile';
    }
    
    if (topicSet.has('desktop') || topicSet.has('electron') || topicSet.has('gui')) {
      return 'desktop';
    }
    
    if (topicSet.has('ai') || topicSet.has('ml') || topicSet.has('machine-learning') || 
        topicSet.has('deep-learning') || topicSet.has('neural-network') || 
        topicSet.has('tensorflow') || topicSet.has('pytorch')) {
      return 'ai';
    }
    
    if (topicSet.has('blockchain') || topicSet.has('cryptocurrency') || 
        topicSet.has('bitcoin') || topicSet.has('ethereum') || topicSet.has('web3')) {
      return 'blockchain';
    }
    
    // Fall back to language-based detection
    if (language) {
      const lang = language.toLowerCase();
      
      if (lang === 'javascript' || lang === 'typescript' || lang === 'html' || 
          lang === 'css' || lang === 'scss' || lang === 'vue' || lang === 'svelte') {
        return 'web';
      }
      
      if (lang === 'swift' || lang === 'kotlin' || lang === 'java' || lang === 'dart') {
        return 'mobile';
      }
      
      if (lang === 'c++' || lang === 'c#' || lang === 'c' || lang === 'rust' || 
          lang === 'go' || lang === 'java') {
        return 'desktop';
      }
      
      if (lang === 'python' || lang === 'r' || lang === 'jupyter notebook') {
        return 'ai';
      }
      
      if (lang === 'solidity') {
        return 'blockchain';
      }
    }
    
    // Default to web if unable to determine
    return 'web';
  }

  // Enhanced sorting function
  sortRepositories(repos, sortBy = 'pinned', direction = 'desc') {
    const sorted = [...repos].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'pinned':
          // Always show pinned first, then sort by stars
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          if (a.isPinned && b.isPinned) {
            aValue = a.githubData?.stars || 0;
            bValue = b.githubData?.stars || 0;
          } else {
            aValue = a.githubData?.stars || 0;
            bValue = b.githubData?.stars || 0;
          }
          break;

        case 'stars':
          aValue = a.githubData?.stars || 0;
          bValue = b.githubData?.stars || 0;
          break;

        case 'forks':
          aValue = a.githubData?.forks || 0;
          bValue = b.githubData?.forks || 0;
          break;

        case 'updated':
          aValue = new Date(a.githubData?.updated_at || a.dateAdded);
          bValue = new Date(b.githubData?.updated_at || b.dateAdded);
          break;

        case 'created':
          aValue = new Date(a.dateAdded);
          bValue = new Date(b.dateAdded);
          break;

        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;

        case 'size':
          aValue = a.githubData?.size || 0;
          bValue = b.githubData?.size || 0;
          break;

        case 'language':
          aValue = a.githubData?.language || 'zzz'; // Put repos without language at end
          bValue = b.githubData?.language || 'zzz';
          break;

        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;

        default:
          return 0;
      }

      // Handle different value types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Numeric comparison
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }

  // Fetch repositories and convert to project format with enhanced sorting
  async getRepositoriesAsProjects(username = null, options = {}) {
    try {
      let repos;
      let pinnedRepos = [];
      
      // Get pinned repos if username is provided
      if (username) {
        pinnedRepos = await this.getPinnedRepositories(username);
        repos = await this.getUserRepositories(username, options);
      } else {
        repos = await this.getMyRepositories(options);
      }
      
      // Mark pinned repositories
      const pinnedRepoNames = new Set(pinnedRepos.map(repo => repo.name));
      repos = repos.map(repo => ({
        ...repo,
        isPinned: pinnedRepoNames.has(repo.name)
      }));

      // Add pinned repos that might not be in the regular repos list
      const repoNames = new Set(repos.map(repo => repo.name));
      const additionalPinnedRepos = pinnedRepos.filter(repo => !repoNames.has(repo.name));
      repos = [...repos, ...additionalPinnedRepos];
      
      // Filter options
      const {
        excludeForks = true,
        excludePrivate = false,
        minStars = 0,
        excludeTopics = [],
        includeTopics = [],
        sortBy = 'pinned', // New sorting option
        sortDirection = 'desc'
      } = options;
      
      let filteredRepos = repos;
      
      if (excludeForks) {
        filteredRepos = filteredRepos.filter(repo => !repo.fork);
      }
      
      if (excludePrivate) {
        filteredRepos = filteredRepos.filter(repo => !repo.private);
      }
      
      if (minStars > 0) {
        filteredRepos = filteredRepos.filter(repo => repo.stargazers_count >= minStars);
      }
      
      if (excludeTopics.length > 0) {
        filteredRepos = filteredRepos.filter(repo => {
          const repoTopics = repo.topics || [];
          return !excludeTopics.some(topic => repoTopics.includes(topic));
        });
      }
      
      if (includeTopics.length > 0) {
        filteredRepos = filteredRepos.filter(repo => {
          const repoTopics = repo.topics || [];
          return includeTopics.some(topic => repoTopics.includes(topic));
        });
      }
      
      // Convert to project format
      const projects = filteredRepos.map(repo => this.convertRepoToProject(repo));
      
      // Apply sorting
      return this.sortRepositories(projects, sortBy, sortDirection);
      
    } catch (error) {
      console.error('Error fetching repositories as projects:', error);
      throw error;
    }
  }

  // Get available sorting options
  getSortingOptions() {
    return [
      { value: 'pinned', label: 'Pinned First' },
      { value: 'stars', label: 'Stars' },
      { value: 'forks', label: 'Forks' },
      { value: 'updated', label: 'Recently Updated' },
      { value: 'created', label: 'Recently Created' },
      { value: 'name', label: 'Name' },
      { value: 'size', label: 'Size' },
      { value: 'language', label: 'Language' },
      { value: 'type', label: 'Project Type' }
    ];
  }

  // Check if token is configured (async)
  async isTokenConfigured() {
    await this.loadToken();
    return !!this.token;
  }

  // Get rate limit information
  async getRateLimit() {
    try {
      const url = `${this.baseURL}/rate_limit`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching rate limit:', error);
      throw error;
    }
  }

  // Utility method to get repositories with custom sorting
  async getRepositoriesWithCustomSort(username = null, sortBy = 'pinned', sortDirection = 'desc', filterOptions = {}) {
    const options = {
      ...filterOptions,
      sortBy,
      sortDirection
    };

    return await this.getRepositoriesAsProjects(username, options);
  }
}

const githubRepoService = new GitHubRepoService();
export default githubRepoService;