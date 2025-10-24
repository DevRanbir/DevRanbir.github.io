import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MagicBento from './MagicBento';
import './MyProjects.css';
import Lanyard from './Lanyard'
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { getHomepageData } from '../firebase/firestoreService';

// GitHub service
const githubService = {
  baseURL: 'https://api.github.com',
  
  // Random HD background images - using Picsum for reliable random images
  getRandomImage() {
    // Generate a random seed for consistent but varied images
    const seed = Math.floor(Math.random() * 10000);
    
    // Picsum Photos - Lorem Picsum provides reliable placeholder images
    // Using 800x600 for HD quality, with blur effect for better text readability
    return `https://picsum.photos/seed/${seed}/800/600`;
  },
  
  async getUserRepositories(username) {
    try {
      // Include Accept header to get topics from GitHub API
      const response = await fetch(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=100`, {
        headers: {
          'Accept': 'application/vnd.github.mercy-preview+json' // Required to get topics
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      const repos = await response.json();
      console.log('Sample repo data:', repos[0]); // Debug: Check first repo structure
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
      image: this.getRandomImage(), // Always add a random HD image
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
  const navigate = useNavigate();
  
  const [sections, setSections] = useState([]); // Start empty, will populate from GitHub
  const [allRepos, setAllRepos] = useState([]); // Store all fetched repos
  const [cardDataSets, setCardDataSets] = useState([]); // Store card data sets
  const [isLoading, setIsLoading] = useState(true); // Start with loading true
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef(null);
  const lastSectionRef = useRef(null);
  const CARDS_PER_SECTION = 6; // Number of cards per bento grid
  const GITHUB_USERNAME = 'DevRanbir'; // Replace with your GitHub username
  
  // Command line state
  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCardDataSets, setFilteredCardDataSets] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState('all'); // Track active project filter
  const [isMobile, setIsMobile] = useState(false); // Track mobile view
  
  // Social links data - will be fetched from Firebase
  const [socialLinks, setSocialLinks] = useState([
    { id: 'github', url: 'https://github.com/DevRanbir', icon: <FaGithub /> },
    { id: 'linkedin', url: 'https://linkedin.com/in/yourname', icon: <FaLinkedin /> },
    { id: 'twitter', url: 'https://twitter.com/yourname', icon: <FaTwitter /> },
    { id: 'instagram', url: 'https://instagram.com/yourname', icon: <FaInstagram /> },
    { id: 'mail', url: 'mailto:your.email@example.com', icon: <FaEnvelope /> },
    { id: 'discord', url: 'https://discord.gg/yourserver', icon: <FaDiscord /> }
  ]);
  
  // Dropdown items for navigation
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
      name: 'Home', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 4, 
      name: 'About', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 5, 
      name: 'Contact', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.079 6.839a3 3 0 0 0-4.255.1M13 20h1.083A3.916 3.916 0 0 0 18 16.083V9A6 6 0 1 0 6 9v7m7 4v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1Zm-7-4v-6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1Zm12-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v-6Z"/>
      </svg>, 
      type: 'action' 
    },
  ];

  // Filter links for project types (similar to social media container)
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
        type: 'all'
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
        type: 'web'
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
        type: 'mobile'
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
        type: 'desktop'
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
        type: 'ai'
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
        type: 'blockchain'
    }
    ];
  
  // Command templates for edit mode
  const commandTemplates = [
    { id: 'add', template: 'add [name] [link]', description: 'Add a new project' },
    { id: 'edit', template: 'edit [name]', description: 'Edit a project' },
    { id: 'remove', template: 'remove [name]', description: 'Remove a project' },
    { id: 'exit', template: 'exit', description: 'Exit edit mode' },
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
        searchableContent.includes('app') && (searchableContent.includes('mobile') || searchableContent.includes('phone'))) {
      return 'mobile';
    }
    
    // Desktop Apps - desktop, electron, windows, macos, linux
    if (searchableContent.includes('desktop') || 
        searchableContent.includes('electron') || 
        searchableContent.includes('windows') || 
        searchableContent.includes('macos') || 
        searchableContent.includes('linux') || 
        searchableContent.includes('gui') || 
        searchableContent.includes('application') && !searchableContent.includes('web')) {
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

  // Command line handlers
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommandInput(value);
    
    // Update search query for filtering cards
    setSearchQuery(value);
    
    // Show dropdown for navigation commands
    setIsDropdownOpen(value.length > 0 && !editMode);
  };
  
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };
  
  const handleInputBlur = () => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => setIsDropdownOpen(false), 150);
  };
  
  const handleItemClick = (item) => {
    if (editMode && typeof item === 'object' && 'template' in item) {
      // This is a command template
      setCommandInput(item.template);
    } else if (item.type && ['all', 'web', 'mobile', 'desktop', 'ai', 'blockchain'].includes(item.type)) {
      // This is a filter item
      setActiveFilter(item.type);
      setCommandInput(item.name);
      console.log(`Filter applied: ${item.type}`);
    } else {
      // This is a regular folder/file item
      setCommandInput(item.name);
      console.log(`Selected: ${item.name}`);
      
      // Handle navigation based on the selected item
      if (item.name === 'Documents') {
        navigate('/documents');
      } else if (item.name === 'Projects') {
        navigate('/projects');
      } else if (item.name === 'Home') {
        navigate('/');
      } else if (item.name === 'About') {
        navigate('/about');
      } else if (item.name === 'Contact') {
        navigate('/contacts');
      }
    }
    setIsDropdownOpen(false);
  };
  
  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = commandInput.toLowerCase().trim();
      
      // Handle filter commands
      if (command === 'all projects' || command === 'all') {
        setActiveFilter('all');
      } else if (command === 'web apps' || command === 'web') {
        setActiveFilter('web');
      } else if (command === 'mobile apps' || command === 'mobile') {
        setActiveFilter('mobile');
      } else if (command === 'desktop apps' || command === 'desktop') {
        setActiveFilter('desktop');
      } else if (command === 'ai/ml' || command === 'ai' || command === 'ml') {
        setActiveFilter('ai');
      } else if (command === 'blockchain') {
        setActiveFilter('blockchain');
      }
      // Handle navigation commands
      else if (command === 'documents') {
        navigate('/documents');
      } else if (command === 'projects') {
        navigate('/projects');
      } else if (command === 'home') {
        navigate('/');
      } else if (command === 'about') {
        navigate('/about');
      } else if (command === 'contact' || command === 'contacts') {
        navigate('/contacts');
      } else if (command === 'edit') {
        setEditMode(true);
      } else if (command === 'exit') {
        setEditMode(false);
      } else if (command === 'clear' || command === 'reset') {
        // Clear search and reset filter
        setCommandInput('');
        setSearchQuery('');
        setActiveFilter('all');
      }
      
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      // Clear search on Escape
      setCommandInput('');
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };

  // Fetch social links from Firebase
  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const data = await getHomepageData();
        if (data && data.socialLinks) {
          // Map social links from Firebase with their corresponding icons
          const iconMap = {
            github: <FaGithub />,
            linkedin: <FaLinkedin />,
            twitter: <FaTwitter />,
            instagram: <FaInstagram />,
            mail: <FaEnvelope />,
            discord: <FaDiscord />
          };
          
          const linksWithIcons = data.socialLinks.map(link => ({
            ...link,
            icon: iconMap[link.id] || <FaGithub /> // Fallback to GitHub icon
          }));
          
          setSocialLinks(linksWithIcons);
          console.log('Social links fetched from Firebase:', linksWithIcons);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
        // Keep default social links if fetch fails
      }
    };
    
    fetchSocialLinks();
  }, []);

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
      
      filteredCards = filteredCards.filter(card => {
        // Match against title
        if (card.title.toLowerCase().includes(query)) return true;
        
        // Match against description
        if (card.description && card.description.toLowerCase().includes(query)) return true;
        
        // Match against labels/topics
        if (card.labels && card.labels.some(label => 
          label.toLowerCase().includes(query)
        )) return true;
        
        // Match against topics
        if (card.topics && card.topics.some(topic => 
          topic.toLowerCase().includes(query)
        )) return true;
        
        return false;
      });
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
        
        // Separate pinned/important repos
        // Priority: 1. Has 'pinned' or 'featured' topic, 2. Stars > 5
        // IMPORTANT: Never show repos with "No description available" in top 5
        const pinnedCards = cardData
          .filter(card => {
            // Exclude repos without proper description
            if (!card.description || card.description === 'No description available') {
              return false;
            }
            
            // Explicitly pinned
            if (card.isPinned) return true;
            // High stars
            if (card.stars > 2) return true;
            return false;
          })
          .sort((a, b) => {
            // Sort by: pinned first, then by stars
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.stars - a.stars;
          })
          .slice(0, 5); // Keep only top 5 pinned
        
        // Get remaining repos
        const remainingCards = cardData.filter(card => 
          !pinnedCards.includes(card)
        );
        
        // Randomize the remaining cards using Fisher-Yates shuffle
        const shuffled = [...remainingCards];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Combine pinned at top with shuffled remaining
        const finalCardData = [...pinnedCards, ...shuffled];
        
        console.log('Pinned repos:', pinnedCards.map(c => c.title));
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
      <div 
        className="social-links-container"
        style={isMobile ? {
          position: 'fixed',
          top: '90%',
          left: '1px',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          width: '100%',
          justifyContent: 'center',
          zIndex: 1000,
          gap: '15px'
        } : {}}
      >
        {socialLinks.map((social) => (
          <div key={social.id} className="social-link-wrapper">
            <a 
              href={social.url} 
              target="_blank"
              rel="noopener noreferrer" 
              className="social-link"
              aria-label={social.id}
              style={isMobile ? {
                width: '36px',
                height: '36px'
              } : {
                paddingTop: '3px',
              }}
            >
              <span style={isMobile ? {
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              } : {}}>
                {social.icon}
              </span>
            </a>
          </div>
        ))}
      </div>
      
      <div className="myprojects-scroll-container">
        {/* Command Line Interface */}
        <div className="command-line-container">
          <div className="glass-panel">
            <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="command-input-wrapper">
                <span className="prompt-symbol">{editMode ? '🔓' : '$'}</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder={editMode ? "Type a command or click a template below..." : "Search projects, navigate, or run a command"}
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
            
            {isDropdownOpen && !searchQuery && (
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
                        <div className="item-icon">{cmd.id === 'exit' ? '🚪' : cmd.id === 'add' ? '➕' : cmd.id === 'edit' ? '✏️' : cmd.id === 'remove' ? '❌' : '📝'}</div>
                        <div className="item-name">{cmd.id}</div>
                        <div className="item-description">{cmd.description}</div>
                      </div>
                    ))
                    :
                    // Regular items when not in edit mode
                    [...dropdownItems, ...filterLinks].map((item) => (
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

        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
        
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
                        setCommandInput('');
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
                  <h3></h3>
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
                <p>-End-</p>
                <p>{allRepos.length} repositories loaded from GitHub</p>
              </div>
            )}
          </>
        )}
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

    </div>
  );
};

export default MyProjects;
