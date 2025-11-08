import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MagicBento from '../../components/MagicBento';
import CommandLine from '../../components/CommandLine';
import SocialMediaLinks from '../../components/SocialMediaLinks';
import StaggeredMenu from '../../components/StaggeredMenu';
import './MyProjects.css';
import CurvedLoop from '../../components/CurvedLoop';
import TextPressure from '../../components/TextPressure';
import Lanyard from '../../components/Lanyard'
import { getGitHubToken } from '../../firebase/firestoreService';
import { useLoading } from '../../contexts/LoadingContext';

// GitHub service
const githubService = {
  baseURL: 'https://api.github.com',
  token: null, // Will be set from Firebase or env
  
  // Set the GitHub token
  async setToken() {
    if (!this.token) {
      this.token = await getGitHubToken();
    }
    return this.token;
  },
  
  // Project-specific images mapping
  getProjectImage(repoName) {
    // Convert repo name to lowercase for case-insensitive matching
    const name = repoName.toLowerCase().replace(/[-_\s]/g, '');
    
    console.log('Matching image for repo:', repoName, '-> normalized:', name);
    
    // Mapping of repository names to their corresponding images in public folder
    // Using normalized names (no dashes, underscores, or spaces)
    const imageMap = {
      // Periodic Table
      'periodictable': '/Ptable.png',
      'ptable': '/Ptable.png',
      'periodicapp': '/Ptable.png',
      
      // Quicky Quizy
      'quickyquizy': '/Quicky.png',
      'quicky': '/Quicky.png',
      'quiz': '/Quicky.png',
      
      // ChocoLava / Emergency
      'chocolava': '/SCC.png',
      'scc': '/SCC.png',
      'emergency': '/SCC.png',
      'physiopluse': '/SCC.png',
      'physioplus': '/SCC.png',
      
      // SpeechViber
      'speechviber': '/Speechviber.png',
      'speech': '/Speechviber.png',
      'viber': '/Speechviber.png',
      
      // Talkify
      'talkify': '/Talkify.png',
      'talk': '/Talkify.png',
      
      // ArtGallery
      'artgallery': '/ArtGalley.png',
      'artgalley': '/ArtGalley.png',
      'art': '/ArtGalley.png',
      'nft': '/ArtGalley.png',
      'gallery': '/ArtGalley.png',
      
      // Bookmark Manager
      'bookmark': '/Bookmark-manager.png',
      'bookmarkmanager': '/Bookmark-manager.png',
      'bookmarks': '/Bookmark-manager.png',
      
      // CuSpark
      'cuspark': '/CuSpark.png',
      'sparkcu': '/CuSpark.png',
      'ideathon': '/CuSpark.png',
      'hackathon': '/CuSpark.png',
      'spark': '/CuSpark.png',
      
      // HGCR
      'hgcr': '/HGCR.png',
      'gesture': '/HGCR.png',
      'robotics': '/HGCR.png',
      'handgesture': '/HGCR.png',
      
      // RepoViewer
      'repoviewer': '/RepoViewer.png',
      'githubviewer': '/RepoViewer.png',
      'viewer': '/RepoViewer.png'
    };
    
    // Try exact match first
    if (imageMap[name]) {
      console.log('✓ Exact match found:', imageMap[name]);
      return imageMap[name];
    }
    
    // Try partial match
    for (const [key, imagePath] of Object.entries(imageMap)) {
      if (name.includes(key) || key.includes(name)) {
        console.log('✓ Partial match found:', key, '->', imagePath);
        return imagePath;
      }
    }
    
    // Fallback to random HD background images from Picsum
    console.log('✗ No match found, using fallback image');
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash % 10000;
    
    return `https://picsum.photos/seed/${seed}/800/600`;
  },
  
  async getUserRepositories(username) {
    try {
      // Get the token first
      await this.setToken();
      
      // Prepare headers
      const headers = {
        'Accept': 'application/vnd.github.mercy-preview+json' // Required to get topics
      };
      
      // Add authorization if token is available
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        console.log('Using authenticated GitHub API request');
      } else {
        console.warn('Making unauthenticated GitHub API request (rate limit: 60/hour)');
      }
      
      // Include Accept header to get topics from GitHub API
      const response = await fetch(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=100`, {
        headers
      });
      
      if (!response.ok) {
        // Check if it's a rate limit error
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.message && errorData.message.includes('rate limit')) {
            throw new Error('GitHub API rate limit exceeded. Please try again later or add a GitHub token.');
          }
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const repos = await response.json();
      console.log('Sample repo data:', repos[0]); // Debug: Check first repo structure
      console.log(`Fetched ${repos.length} repositories from GitHub`);
      return repos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return [];
    }
  },
  
  convertRepoToCardData(repo) {
    // Get all topics or fallback to language
    const labels = repo.topics && repo.topics.length > 0 
      ? repo.topics 
      : (repo.language ? [repo.language] : ['']);
    
    const cardData = {
      color: '#060010',
      title: repo.name,
      description: repo.description || 'No description available',
      labels: labels, // Pass all labels instead of just one
      image: this.getProjectImage(repo.name), // Use project-specific image from public folder
      link: repo.homepage || repo.html_url, // Use homepage if available, otherwise repo URL
      stars: repo.stargazers_count || 0,
      isPinned: repo.topics?.includes('pinned') || repo.topics?.includes('featured'),
      topics: repo.topics || []
    };
    
    console.log('Card data for', repo.name, ':', cardData);
    return cardData;
  }
};

const MyProjects = () => {
  const { markAsReady } = useLoading();
  
  const [sections, setSections] = useState([]); // Start empty, will populate from GitHub
  const [allRepos, setAllRepos] = useState([]); // Store all fetched repos
  const [cardDataSets, setCardDataSets] = useState([]); // Store card data sets
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const lastSectionRef = useRef(null);
  const CARDS_PER_SECTION = 6; // Number of cards per bento grid
  const GITHUB_USERNAME = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir'; // Get from env or fallback
  
  // Command line state
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCardDataSets, setFilteredCardDataSets] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all'); // Track active project filter
  const [isMobile, setIsMobile] = useState(false); // Track mobile view
  const [socialLinksLoaded, setSocialLinksLoaded] = useState(false); // Track social links loading
  
  // AI Context - Memoized to avoid unnecessary re-renders
  const aiContext = useMemo(() => {
    // Flatten all projects from filteredCardDataSets
    // Note: filteredCardDataSets is an array of arrays (each section is an array of cards)
    const allProjects = (filteredCardDataSets || []).flatMap(section => 
      (section || []).map(card => ({
        name: card.title,
        description: card.description,
        technologies: card.labels || card.topics || [],
        url: card.link,
        featured: card.isPinned || false,
        stars: card.stars || 0
      }))
    );
    
    return {
      currentPage: 'projects',
      projects: allProjects,
      totalProjects: allProjects.length,
      searchQuery: searchQuery,
      activeFilter: activeFilter,
      pages: ['home', 'projects', 'documents', 'about', 'contacts']
    };
  }, [filteredCardDataSets, searchQuery, activeFilter]);
  
  // Handle AI responses
  const handleAIResponse = useCallback((response) => {
    console.log('🤖 AI Response:', response);
    
    // Check if AI message contains project names to filter
    const extractProjectNames = (message) => {
      const allProjects = cardDataSets.flat();
      const projectNames = [];
      
      // Look for project names in the message
      allProjects.forEach(card => {
        const titleLower = card.title.toLowerCase();
        const messageLower = message.toLowerCase();
        
        // Check if project name appears in message
        if (messageLower.includes(titleLower)) {
          projectNames.push(card.title);
        }
      });
      
      return projectNames;
    };
    
    // Handle specific actions from AI
    if (response.hasAction) {
      switch (response.action) {
        case 'filter':
          // AI wants to filter projects by technology/keyword
          console.log('🎯 Filtering projects by:', response.target);
          
          // Check if message contains specific project names
          const projectNames = extractProjectNames(response.message || '');
          
          if (projectNames.length > 0) {
            // Create a search query that matches any of these project names
            console.log('📋 Found project names in response:', projectNames);
            // Join with | for OR matching in filter
            const searchTerms = projectNames.join('|');
            setSearchQuery(searchTerms);
          } else {
            // Filter by technology/keyword
            setSearchQuery(response.target);
          }
          
          // Reset category filter when searching by technology
          setActiveFilter('all');
          break;
          
        case 'search':
          // AI wants to search
          setSearchQuery(response.target);
          setActiveFilter('all');
          break;
          
        case 'clear':
        case 'reset':
          // AI wants to clear filters
          console.log('🔄 Clearing all filters');
          setSearchQuery('');
          setActiveFilter('all');
          break;
          
        case 'open':
          // AI wants to open a project
          const allProjects = filteredCardDataSets.flat();
          const project = allProjects.find(card => 
            card.title.toLowerCase().includes(response.target.toLowerCase())
          );
          if (project && project.link) {
            window.open(project.link, '_blank');
          }
          break;
          
        default:
          break;
      }
    } else {
      // No action specified - check if user is asking to clear/reset
      const messageLower = (response.message || '').toLowerCase();
      if (messageLower.includes('clear') || 
          messageLower.includes('reset') || 
          messageLower.includes('show all') ||
          messageLower.includes('remove filter')) {
        console.log('🔄 Clearing filters based on message');
        setSearchQuery('');
        setActiveFilter('all');
      }
    }
  }, [filteredCardDataSets, cardDataSets]);
  
  // Command templates for edit mode
  const commandTemplates = [
    { 
      id: 'add', 
      name: 'add',
      template: 'add [name] [link]', 
      description: 'Add a new project',
      icon: '➕',
      className: 'explorer-item command-template',
      onClick: (item) => {
        setSearchQuery(item.template);
      }
    },
    { 
      id: 'edit', 
      name: 'edit',
      template: 'edit [name]', 
      description: 'Edit a project',
      icon: '✏️',
      className: 'explorer-item command-template',
      onClick: (item) => {
        setSearchQuery(item.template);
      }
    },
    { 
      id: 'remove', 
      name: 'remove',
      template: 'remove [name]', 
      description: 'Remove a project',
      icon: '❌',
      className: 'explorer-item command-template',
      onClick: (item) => {
        setSearchQuery(item.template);
      }
    },
    { 
      id: 'exit', 
      name: 'exit',
      template: 'exit', 
      description: 'Exit edit mode',
      icon: '🚪',
      className: 'explorer-item command-template',
      onClick: () => {
        setEditMode(false);
        setSearchQuery('');
      }
    },
  ];

  // Filter links for project types
  const filterLinks = [
    { 
        id: 'all', 
        icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
            <line x1="3" y1="8" x2="21" y2="8"></line>
        </svg>
        ), 
        name: 'All Projects',
        type: 'all',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    },
    { 
        id: 'web', 
        icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
            <line x1="3" y1="8" x2="21" y2="8"></line>
            <circle cx="7" cy="6" r="0.5"></circle>
            <circle cx="11" cy="6" r="0.5"></circle>
            <circle cx="15" cy="6" r="0.5"></circle>
        </svg>
        ), 
        name: 'Web Apps',
        type: 'web',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    },
    { 
        id: 'mobile', 
        icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
        ), 
        name: 'Mobile Apps',
        type: 'mobile',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    },
    { 
        id: 'desktop', 
        icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        ), 
        name: 'Desktop Apps',
        type: 'desktop',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    },
    { 
        id: 'ai', 
        icon: (
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="7" y="7" width="10" height="10" rx="2" ry="2"></rect>
            <path d="M4 4v2M4 10v4M4 18v2M20 4v2M20 10v4M20 18v2M10 4h4M10 20h4"></path>
            </svg>
        ), 
        name: 'AI/ML',
        type: 'ai',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    },
    { 
        id: 'blockchain', 
        icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <line x1="7" y1="7" x2="14" y2="14"></line>
            <line x1="14" y1="7" x2="7" y2="14"></line>
        </svg>
        ), 
        name: 'Blockchain',
        type: 'blockchain',
        onClick: (item) => {
          setActiveFilter(item.type);
          setSearchQuery('');
        }
    }
  ];
  
  // Function to categorize projects based on topics, languages, and keywords
  const categorizeProject = (card) => {
    const title = card.title.toLowerCase();
    const description = (card.description || '').toLowerCase();
    const topics = card.topics || [];
    const labels = card.labels || [];
    
    // Combine all searchable text
    const searchableContent = [title, description, ...topics, ...labels].join(' ').toLowerCase();
    
    // Web Apps - websites, web applications, frontend, backend
    if (searchableContent.includes('web') || 
        searchableContent.includes('website') || 
        searchableContent.includes('react') || 
        searchableContent.includes('vue') || 
        searchableContent.includes('angular') || 
        searchableContent.includes('frontend') || 
        searchableContent.includes('backend') || 
        searchableContent.includes('express') || 
        searchableContent.includes('nextjs') || 
        searchableContent.includes('javascript') || 
        searchableContent.includes('typescript') || 
        searchableContent.includes('html') || 
        searchableContent.includes('css') || 
        title.includes('.github.io') ||
        searchableContent.includes('portfolio') ||
        searchableContent.includes('dashboard')) {
      return 'web';
    }
    
    // Mobile Apps - mobile, android, ios, flutter, react-native
    if (searchableContent.includes('mobile') || 
        searchableContent.includes('android') || 
        searchableContent.includes('ios') || 
        searchableContent.includes('flutter') || 
        searchableContent.includes('react-native') || 
        searchableContent.includes('expo') || 
        (searchableContent.includes('app') && (searchableContent.includes('mobile') || searchableContent.includes('phone')))) {
      return 'mobile';
    }
    
    // Desktop Apps - desktop, electron, windows, macos, linux
    if (searchableContent.includes('desktop') || 
        searchableContent.includes('electron') || 
        searchableContent.includes('windows') || 
        searchableContent.includes('macos') || 
        searchableContent.includes('linux') || 
        searchableContent.includes('gui') || 
        (searchableContent.includes('application') && !searchableContent.includes('web'))) {
      return 'desktop';
    }
    
    // AI/ML - artificial intelligence, machine learning, deep learning
    if (searchableContent.includes('ai') || 
        searchableContent.includes('ml') || 
        searchableContent.includes('machine-learning') || 
        searchableContent.includes('deep-learning') || 
        searchableContent.includes('neural') || 
        searchableContent.includes('tensorflow') || 
        searchableContent.includes('pytorch') || 
        searchableContent.includes('sklearn') || 
        searchableContent.includes('opencv') || 
        searchableContent.includes('nlp') || 
        searchableContent.includes('computer-vision') || 
        searchableContent.includes('data-science') || 
        searchableContent.includes('prediction') || 
        searchableContent.includes('classification') || 
        searchableContent.includes('regression')) {
      return 'ai';
    }
    
    // Blockchain - blockchain, crypto, ethereum, bitcoin, smart contracts
    if (searchableContent.includes('blockchain') || 
        searchableContent.includes('crypto') || 
        searchableContent.includes('ethereum') || 
        searchableContent.includes('bitcoin') || 
        searchableContent.includes('smart-contract') || 
        searchableContent.includes('solidity') || 
        searchableContent.includes('web3') || 
        searchableContent.includes('defi') || 
        searchableContent.includes('nft') || 
        searchableContent.includes('dapp')) {
      return 'blockchain';
    }
    
    // Default to web if it has common web indicators, otherwise return 'other'
    if (searchableContent.includes('javascript') || 
        searchableContent.includes('typescript') || 
        searchableContent.includes('node') || 
        searchableContent.includes('npm') || 
        searchableContent.includes('package.json')) {
      return 'web';
    }
    
    return 'other';
  };

  // Handlers for CommandLine component
  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  // Mark page as ready when social links are loaded
  useEffect(() => {
    if (socialLinksLoaded) {
      console.log('🎉 MyProjects page: Social links loaded, marking page as ready');
      markAsReady();
    }
  }, [socialLinksLoaded, markAsReady]);

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

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check initially
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter cards based on search query and active filter
  useEffect(() => {
    // Flatten all cards from all sections
    const allCards = cardDataSets.flat();
    
    let filteredCards = allCards;
    
    // Apply project type filter first
    if (activeFilter !== 'all') {
      filteredCards = allCards.filter(card => {
        const category = categorizeProject(card);
        return category === activeFilter;
      });
    }
    
    // Then apply search query filter if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      console.log('🔍 Filtering with query:', query);
      console.log('📊 Total cards before filter:', filteredCards.length);
      
      // Check if query contains multiple project names (separated by |)
      const isMultipleProjects = query.includes('|');
      const projectNames = isMultipleProjects ? query.split('|').map(n => n.trim()) : [query];
      
      filteredCards = filteredCards.filter(card => {
        // If multiple project names, match exact project title
        if (isMultipleProjects) {
          const titleLower = card.title.toLowerCase();
          const matched = projectNames.some(name => titleLower === name);
          if (matched) {
            console.log('✅ Match by exact project name:', card.title);
          }
          return matched;
        }
        
        // Single query - match against all fields
        // Match against title
        if (card.title.toLowerCase().includes(query)) {
          console.log('✅ Match by title:', card.title);
          return true;
        }
        
        // Match against description
        if (card.description && card.description.toLowerCase().includes(query)) {
          console.log('✅ Match by description:', card.title);
          return true;
        }
        
        // Match against labels/topics
        if (card.labels && card.labels.some(label => 
          label.toLowerCase().includes(query)
        )) {
          console.log('✅ Match by label:', card.title, '- labels:', card.labels);
          return true;
        }
        
        // Match against topics
        if (card.topics && card.topics.some(topic => 
          topic.toLowerCase().includes(query)
        )) {
          console.log('✅ Match by topic:', card.title, '- topics:', card.topics);
          return true;
        }
        
        return false;
      });
      
      console.log('📊 Total cards after filter:', filteredCards.length);
    }
    
    // Re-organize filtered cards into sections
    const filteredDataSets = [];
    for (let i = 0; i < filteredCards.length; i += CARDS_PER_SECTION) {
      filteredDataSets.push(filteredCards.slice(i, i + CARDS_PER_SECTION));
    }
    
    setFilteredCardDataSets(filteredDataSets);
    
    // Update sections to show all filtered results
    if (filteredDataSets.length > 0) {
      setSections(Array.from({ length: filteredDataSets.length }, (_, i) => i));
    } else {
      setSections([]);
    }
  }, [searchQuery, cardDataSets, activeFilter]);

  // Fetch GitHub repositories on mount
  useEffect(() => {
    const fetchRepositories = async () => {
      setIsLoading(true);
      try {
        const repos = await githubService.getUserRepositories(GITHUB_USERNAME);
        
        // Convert repos to card data
        const cardData = repos.map(repo => githubService.convertRepoToCardData(repo));
        
        // Separate cards with matched images vs fallback images
        const cardsWithMatchedImages = cardData.filter(card => 
          card.image && !card.image.includes('picsum.photos')
        );
        
        const cardsWithFallbackImages = cardData.filter(card => 
          card.image && card.image.includes('picsum.photos')
        );
        
        console.log('Cards with matched images:', cardsWithMatchedImages.length);
        console.log('Cards with fallback images:', cardsWithFallbackImages.length);
        
        // Shuffle all cards with matched images using Fisher-Yates algorithm
        // This randomizes their positions on each reload
        const shuffledMatchedCards = [...cardsWithMatchedImages];
        for (let i = shuffledMatchedCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledMatchedCards[i], shuffledMatchedCards[j]] = [shuffledMatchedCards[j], shuffledMatchedCards[i]];
        }
        
        // Take the first 9 shuffled cards with matched images for top positions
        const topMatchedCards = shuffledMatchedCards.slice(0, 9);
        
        // Get any remaining matched cards after top 9
        const restMatchedCards = shuffledMatchedCards.slice(9);
        
        // Shuffle fallback cards
        const shuffledFallbackCards = [...cardsWithFallbackImages];
        for (let i = shuffledFallbackCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledFallbackCards[i], shuffledFallbackCards[j]] = [shuffledFallbackCards[j], shuffledFallbackCards[i]];
        }
        
        // Combine: Top 9 randomized matched cards, then remaining matched, then fallback
        const finalCardData = [
          ...topMatchedCards,
          ...restMatchedCards,
          ...shuffledFallbackCards
        ];
        
        console.log('Top 9 cards (all with matched images):', topMatchedCards.map(c => c.title));
        console.log('Total repos:', finalCardData.length);
        
        // Split into sections of CARDS_PER_SECTION
        const dataSets = [];
        for (let i = 0; i < finalCardData.length; i += CARDS_PER_SECTION) {
          dataSets.push(finalCardData.slice(i, i + CARDS_PER_SECTION));
        }
        
        setAllRepos(repos);
        setCardDataSets(dataSets);
        
        // Start with first 3 sections (or less if not enough data)
        const initialSections = Math.min(3, dataSets.length);
        setSections(Array.from({ length: initialSections }, (_, i) => i));
      } catch (error) {
        console.error('Failed to fetch repositories:', error);
        // Set empty state on error
        setCardDataSets([]);
        setSections([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRepositories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load more sections when user scrolls near the bottom
  const loadMoreSections = useCallback(() => {
    if (isLoadingMore || sections.length >= cardDataSets.length) return;
    
    setIsLoadingMore(true);
    setTimeout(() => {
      setSections(prev => {
        const nextIndex = prev.length;
        if (nextIndex < cardDataSets.length) {
          return [...prev, nextIndex];
        }
        return prev;
      });
      setIsLoadingMore(false);
    }, 300);
  }, [isLoadingMore, sections.length, cardDataSets.length]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadMoreSections();
        }
      });
    }, options);

    if (lastSectionRef.current) {
      observerRef.current.observe(lastSectionRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreSections, sections.length]);

  return (
    <div className="myprojects-page">
      {/* Social Media Links - Vertical Column (Desktop) / Bottom Nav (Mobile) */}
      <SocialMediaLinks 
        isMobile={isMobile} 
        onLinksLoaded={() => setSocialLinksLoaded(true)}
      />
      
      <div className="myprojects-scroll-container">
        {/* Command Line Interface with AI */}
        <CommandLine 
          editMode={editMode}
          onSearchChange={handleSearchChange}
          additionalItems={editMode ? commandTemplates : filterLinks}
          placeholder={editMode ? "Type a command or click a template below..." : "Search projects, navigate, or ask AI anything..."}
          aiContext={aiContext}
          onAIResponse={handleAIResponse}
        />

        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />

        <div style={{ position: 'relative', height: '95px', marginBottom: '2px' }}>
                    <TextPressure
                      text={`My‎‎‎‎‎‎‎‎ㅤProjects`}
                      flex={true}
                      alpha={false}
                      stroke={false}
                      width={false}
                      weight={true}
                      italic={true}
                      textColor="#ffffff"
                      strokeColor="#ff0000"
                      minFontSize={120}
                    />
                  </div>
        
        {/* Show loading spinner while fetching initial data */}
        {isLoading && sections.length === 0 ? (
          <div className="myprojects-loading initial-loading">
            <div className="loading-spinner"></div>
            <p>Loading repositories from GitHub...</p>
          </div>
        ) : (
          <>
            {/* Show search results info */}
            {(searchQuery || activeFilter !== 'all') && (
              <div className="search-info">
                <p>
                  {filteredCardDataSets.flat().length > 0 ? (
                    <>
                      Found {filteredCardDataSets.flat().length} project{filteredCardDataSets.flat().length !== 1 ? 's' : ''}
                      {searchQuery && ` matching "${searchQuery}"`}
                      {activeFilter !== 'all' && (
                        <span> in {filterLinks.find(f => f.id === activeFilter)?.name || activeFilter}</span>
                      )}
                    </>
                  ) : (
                    <>
                      No projects found
                      {searchQuery && ` matching "${searchQuery}"`}
                      {activeFilter !== 'all' && (
                        <span> in {filterLinks.find(f => f.id === activeFilter)?.name || activeFilter}</span>
                      )}
                    </>
                  )}
                </p>
                {filteredCardDataSets.flat().length === 0 && (
                  <p className="search-tip">
                    Try {searchQuery ? 'a different search term or ' : ''}changing the project filter
                  </p>
                )}
                {activeFilter !== 'all' && (
                  <p className="filter-tip">
                    <button 
                      onClick={() => {
                        setActiveFilter('all');
                        setSearchQuery('');
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(147, 51, 234, 0.5)',
                        color: 'rgba(147, 51, 234, 0.8)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Show All Projects
                    </button>
                  </p>
                )}
              </div>
            )}
            
            {sections.length > 0 ? (
              sections.map((dataSetIndex, index) => (
                
                <div 
                  key={`section-${index}-${dataSetIndex}`}
                  className="myprojects-section"
                  ref={index === sections.length - 1 ? lastSectionRef : null}
                >
                  {filteredCardDataSets[dataSetIndex] && (
                    <MagicBento 
                      cardData={filteredCardDataSets[dataSetIndex]}
                      enableStars={true}
                      enableSpotlight={true}
                      enableBorderGlow={true}
                      enableTilt={false}
                      clickEffect={true}
                      enableMagnetism={true}
                      textAutoHide={true}
                      glowColor="132, 0, 255"
                    />
                  )}
                </div>
              ))
            ) : (
              !isLoading && (searchQuery || activeFilter !== 'all') && (
                <div className="no-results-message">
                  <h3>No results found</h3>
                </div>
              )
            )}
            
            {isLoadingMore && !searchQuery && activeFilter === 'all' && (
              <div className="myprojects-loading">
                <div className="loading-spinner"></div>
              </div>
            )}
            
            {!isLoadingMore && !searchQuery && activeFilter === 'all' && sections.length >= cardDataSets.length && cardDataSets.length > 0 && (
              <div className="myprojects-end-message">
                <p>{allRepos.length} repositories loaded from GitHub</p>
              </div>
            )}
          </>
        )}

        {/* Curved Loop Component */}
        <CurvedLoop 
        marqueeText="DevRanbir ✦ End Of The Journey ✦ " 
        speed={1}
        curveAmount={-100}
        direction="right"
        interactive={true}
        className="custom-text-style"
        />
      </div>
      
      {/* Animated Bottom Pattern (Fixed Bottom) */}
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

      {/* Staggered Menu */}
      <StaggeredMenu
        position="right"
        items={[
          { label: 'Home', ariaLabel: 'Go to home page', link: '/' },
          { label: 'Projects', ariaLabel: 'View projects', link: '/projects' },
          { label: 'Documents', ariaLabel: 'View documents', link: '/documents' },
          { label: 'About', ariaLabel: 'Learn about me', link: '/about' },
          { label: 'Contacts', ariaLabel: 'Get in touch', link: '/contacts' }
        ]}
        socialItems={[
          { label: 'GitHub', link: 'https://github.com/DevRanbir' },
          { label: 'LinkedIn', link: 'https://linkedin.com/in/yourname' },
          { label: 'Instagram', link: 'https://instagram.com/yourname' }
        ]}
        displaySocials={true}
        displayItemNumbering={true}
        menuButtonColor="#fff"
        openMenuButtonColor="#fff"
        changeMenuColorOnOpen={true}
        colors={['#858585ff', '#ffffffff']}
        accentColor="#ffffffff"
        isFixed={false}
      />
    </div>
  );
};

export default MyProjects;
