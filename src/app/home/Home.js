import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import MagicBento from '../../components/MagicBento';
import CommandLine from '../../components/CommandLine';
import './Home.css';
import Lanyard from '../../components/Lanyard'
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { getHomepageData, getGitHubToken } from '../../firebase/firestoreService';
import { loadSplineScript } from '../../utils/splineLoader';

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
  
  // Project-specific images mapping (same as MyProjects.js)
  getProjectImage(repoName) {
    // Convert repo name to lowercase for case-insensitive matching
    const name = repoName.toLowerCase().replace(/[-_\s]/g, '');
    
    console.log('Home: Matching image for repo:', repoName, '-> normalized:', name);
    
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
      console.log('Home: ✓ Exact match found:', imageMap[name]);
      return imageMap[name];
    }
    
    // Try partial match
    for (const [key, imagePath] of Object.entries(imageMap)) {
      if (name.includes(key) || key.includes(name)) {
        console.log('Home: ✓ Partial match found:', key, '->', imagePath);
        return imagePath;
      }
    }
    
    // Fallback to random HD background images from Picsum
    console.log('Home: ✗ No match found, using fallback image');
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seed = hash % 10000;
    
    return `https://picsum.photos/seed/${seed}/800/600`;
  },
  
  getRandomImage() {
    const seed = Math.floor(Math.random() * 10000);
    return `https://picsum.photos/seed/${seed}/800/600`;
  },
  
  async getUserRepositories(username) {
    try {
      // Get the token first
      await this.setToken();
      
      // Prepare headers
      const headers = {
        'Accept': 'application/vnd.github.mercy-preview+json'
      };
      
      // Add authorization if token is available
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        console.log('Using authenticated GitHub API request');
      } else {
        console.warn('Making unauthenticated GitHub API request (rate limit: 60/hour)');
      }
      
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
      console.log(`Fetched ${repos.length} repositories from GitHub`);
      return repos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return [];
    }
  },
  
  convertRepoToCardData(repo, controls = 2) {
    const labels = repo.topics && repo.topics.length > 0 
      ? repo.topics 
      : (repo.language ? [repo.language] : ['']);
    
    return {
      color: '#060010',
      title: repo.name,
      description: repo.description || 'No description available',
      labels: labels,
      image: this.getProjectImage(repo.name), // Use project-specific image from public folder
      link: repo.homepage || repo.html_url,
      stars: repo.stargazers_count || 0,
      isPinned: repo.topics?.includes('pinned') || repo.topics?.includes('featured'),
      topics: repo.topics || [],
      controls: controls,
      type: 'default',
      isProject: true // Mark as actual project
    };
  }
};

const Home = () => {
  
  // Basic state for the home page
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false); // Track mobile view
  
  // Ref for LaserFlow hover reveal effect
  const scrollContainerRef = useRef(null);
  
  // Sample card data for the bento grid (original data for filtering)
  // This section contains informational cards, not projects
  const [originalCardData] = useState([
    {
      color: '#060010',
      title: 'Welcome',
      description: 'Welcome to my digital space',
      labels: [],
      image: '/pic3.png',
      link: '#',
      controls: 0, // No icons
      type: 'img', // Default card type
      isProject: false // Not a project
    },
    {
      color: '#060010',
      title: 'About Me',
      description: 'Full-stack developer passionate about creating beautiful web experiences. Specializing in React, Node.js, and modern JavaScript frameworks to build responsive and intuitive applications.',
      labels: [],
      link: '/about',
      image: '',
      controls: 1.1, // Upper-right icon
      type: 'textual', // Text-focused card with no labels, full description
      isProject: false // Not a project
    },
    {
      color: '#060010',
      title: 'Ranbir Khurana',
      description: 'I transform complex challenges into elegant digital solutions.',
      labels: ['Profile'],
      image: '/userpic.png',
      link: '/myprojects',
      controls: 0, // Bottom-right icon
      type: 'default', // Default card type
      isProject: false // Not a project
    },
    {
      color: '#060010',
      title: 'Get in Touch',
      description: 'Let\'s connect and collaborate',
      labels: ['Welcome Friend'],
      image: '',
      link: '/contacts',
      controls: 0, // No icons
      splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode', // Special Spline content
      type: 'default', // Default type with Spline
      isProject: false // Not a project
    },
    {
      color: '#060010',
      labels: [
        'JavaScript',
        'React',
        'Node.js',
        'Python and its Libraries',
        'C/C++',
        'HTML/CSS',
        'SQL/NoSQL',
        'AI Prompting and integration with Sites',
        'Beginner Dart'
      ],
      image: '',
      link: '/documents',
      title: 'Skills',
      controls: 0, // Upper-right icon
      type: 'label', // Label type with larger font, comma-separated labels
      isProject: false // Not a project
    },
    {
      color: '#060010',
      title: 'Blog',
      description: 'Read my latest thoughts and insights on technology, development practices, and industry trends. Discover tutorials, tips, and personal experiences from my journey as a developer.',
      labels: ['Writing'],
      link: '/blog',
      controls: 1.1, // Upper-right icon
      type: 'textual', // Text-focused card
      isProject: false // Not a project
    }
  ]);

  // State for displayable card data (will be filtered)
  const [cardData, setCardData] = useState(originalCardData);
  
  const [originalCardData2, setOriginalCardData2] = useState([
    {
      color: '#060010',
      title: 'Get in Touch',
      description: 'Let\'s connect and collaborate',
      labels: ['Contact'],
      image: '',
      link: '/contacts',
      controls: 0,
      splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode',
      type: 'default',
      isProject: false // Not a project
    }
  ]);
  
  const [cardData2, setCardData2] = useState(originalCardData2);

  const [cardData3, setCardData3] = useState([]);
  
  // Store original data for filtering
  const [originalCardData3, setOriginalCardData3] = useState([]);
  
  // Social links data - will be fetched from Firebase
  const [socialLinks, setSocialLinks] = useState([
  ]);

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
            instagram: <FaInstagram />,
            mail: <FaEnvelope />,
            discord: <FaDiscord />
          };
          
          const linksWithIcons = data.socialLinks.map(link => ({
            ...link,
            icon: iconMap[link.id] || <FaDiscord /> // Fallback to Discord icon
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

  // Ensure Spline viewer is loaded only once
  useEffect(() => {
    loadSplineScript();
  }, []);

  // Fetch GitHub repositories for cardData2
  useEffect(() => {
    const fetchGitHubRepos = async () => {
      try {
        const repos = await githubService.getUserRepositories('DevRanbir');
        
        // Separate cards with matched images vs fallback images
        const allRepoCards = repos.map(repo => githubService.convertRepoToCardData(repo, 2));
        
        const cardsWithMatchedImages = allRepoCards.filter(card => 
          card.image && !card.image.includes('picsum.photos')
        );
        
        const cardsWithFallbackImages = allRepoCards.filter(card => 
          card.image && card.image.includes('picsum.photos')
        );
        
        console.log('Home: Cards with matched images:', cardsWithMatchedImages.length);
        console.log('Home: Cards with fallback images:', cardsWithFallbackImages.length);
        
        // Shuffle cards with matched images using Fisher-Yates algorithm
        const shuffledMatchedCards = [...cardsWithMatchedImages];
        for (let i = shuffledMatchedCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledMatchedCards[i], shuffledMatchedCards[j]] = [shuffledMatchedCards[j], shuffledMatchedCards[i]];
        }
        
        // Shuffle fallback cards separately
        const shuffledFallbackCards = [...cardsWithFallbackImages];
        for (let i = shuffledFallbackCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledFallbackCards[i], shuffledFallbackCards[j]] = [shuffledFallbackCards[j], shuffledFallbackCards[i]];
        }
        
        // Combine: Matched images first, then fallback images
        const shuffledRepoCards = [...shuffledMatchedCards, ...shuffledFallbackCards];
        
        // Select top 5 cards for display (prioritizing matched images)
        const selectedRepoCards = shuffledRepoCards.slice(0, 5);
        
        // Spline "Get in Touch" card
        const splineCard = {
          color: '#060010',
          title: 'Get in Touch',
          description: 'Let\'s connect and collaborate',
          labels: ['Projects'],
          image: '',
          link: '/contacts',
          controls: 0,
          splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode',
          type: 'default',
          isProject: false // Not a project
        };
        
        // Randomly choose position for Spline card (but prefer positions 2-4 for better UX)
        // Positions: 0, 1, 2, 3, 4, 5 (6 total cards)
        const splinePosition = Math.floor(Math.random() * 4) + 1; // Random position between 1-4
        
        const finalCards = [
          ...selectedRepoCards.slice(0, splinePosition),
          splineCard,
          ...selectedRepoCards.slice(splinePosition)
        ];
        
        setCardData2(finalCards);
        setOriginalCardData2(finalCards); // Update original data for filtering
        
        console.log('Home: Spline card inserted at position:', splinePosition + 1);
        console.log('Home: Final card order:', finalCards.map(c => c.title));
        console.log('Home: Projects count:', finalCards.filter(c => c.isProject).length);
      } catch (error) {
        console.error('Error fetching GitHub repos:', error);
      }
    };
    
    fetchGitHubRepos();
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

  // Generate and shuffle cardData3 on mount
  useEffect(() => {
    // Define the shuffleable cards (positions 1, 2, 5, 6)
    const shuffleableCards = [
      {
        color: '#060010',
        title: 'My Projects',
        description: 'Explore my portfolio of creative and technical projects',
        labels: ['Portfolio', 'Work'],
        image: githubService.getRandomImage(),
        link: '/myprojects',
        controls: 1.1,
        type: 'default',
        isProject: false // Not a project, it's a navigation card
      },
      {
        color: '#060010',
        title: 'About Me',
        description: 'Learn more about my journey, skills, and passion for development',
        labels: ['Profile', 'Bio'],
        image: githubService.getRandomImage(),
        link: '/about',
        controls: 1.1,
        type: 'default',
        isProject: false // Not a project
      },
      {
        color: '#060010',
        title: 'Documents',
        description: 'Access my technical documentation and resources',
        labels: ['Docs', 'Resources'],
        image: githubService.getRandomImage(),
        link: '/documents',
        controls: 1.1,
        type: 'default',
        isProject: false // Not a project
      },
      {
        color: '#060010',
        title: 'Contact',
        description: 'Get in touch for collaborations and opportunities',
        labels: ['Connect', 'Reach Out'],
        image: githubService.getRandomImage(),
        link: '/contacts',
        controls: 1.1,
        type: 'default',
        isProject: false // Not a project
      }
    ];

    // Shuffle the cards using Fisher-Yates algorithm
    const shuffled = [...shuffleableCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Fixed card at position 3 (index 2) - Image card
    const fixedImageCard = {
      color: '#060010',
      title: '',
      description: '',
      labels: [],
      image: '/pic3.png',
      link: '#',
      controls: 0,
      type: 'img',
      isProject: false // Not a project
    };

    // Fixed card at position 4 (index 3) - Spline card
    const fixedSplineCard = {
      color: '#060010',
      title: 'Interactive Experience',
      description: 'Explore this 3D interactive element',
      labels: ['Connect Using'],
      image: '',
      link: '/contacts',
      controls: 0,
      splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode',
      type: 'default',
      isProject: false // Not a project
    };

    // Construct final array: [shuffled[0], shuffled[1], fixedImage, fixedSpline, shuffled[2], shuffled[3]]
    const finalCards = [
      shuffled[0],      // Position 1
      shuffled[1],      // Position 2
      fixedImageCard,   // Position 3 (fixed)
      fixedSplineCard,  // Position 4 (fixed)
      shuffled[2],      // Position 5
      shuffled[3]       // Position 6
    ];

    setCardData3(finalCards);
    setOriginalCardData3(finalCards); // Store original for filtering
    console.log('CardData3 generated with shuffled cards');
  }, []); // Empty dependency array means this runs once on mount

  // AI Context - Memoized to avoid unnecessary re-renders
  const aiContext = useMemo(() => {
    // Extract only actual projects (filter out navigation/info cards)
    const allProjects = [...cardData, ...cardData2, ...cardData3]
      .filter(card => card.isProject === true) // Only include cards marked as projects
      .map(card => ({
        name: card.title,
        title: card.title,
        description: card.description,
        technologies: card.labels || [],
        tags: card.labels || [],
        type: card.type || 'project',
        url: card.link,
        featured: card.isPinned || false
      }));
    
    console.log('🎯 AI Context - Total projects found:', allProjects.length);
    console.log('📊 Projects breakdown:', {
      fromCardData: cardData.filter(c => c.isProject === true).length,
      fromCardData2: cardData2.filter(c => c.isProject === true).length,
      fromCardData3: cardData3.filter(c => c.isProject === true).length
    });
    
    // Extract skills from the Skills card
    const skillsCard = cardData.find(card => card.title === 'Skills');
    const skills = skillsCard ? skillsCard.labels : [];
    
    // Get about info from About Me card
    const aboutCard = cardData.find(card => card.title === 'About Me');
    const aboutData = aboutCard ? aboutCard.description : '';
    
    return {
      currentPage: 'home',
      projects: allProjects,
      skills: skills,
      aboutData: aboutData,
      socialLinks: socialLinks,
      pages: ['home', 'projects', 'documents', 'about', 'contacts']
    };
  }, [cardData, cardData2, cardData3, socialLinks]);
  
  // Handle AI responses
  const handleAIResponse = useCallback((response) => {
    console.log('🤖 AI Response on Home:', response);
    // You can add any additional handling here if needed
  }, []);
  
  // Handle search/filter from command line
  const handleCommandSearch = useCallback((query) => {
    console.log('🔍 Search/Filter query on Home:', query);
    
    if (!query || query.trim() === '') {
      // Reset - show all projects
      console.log('✅ Showing all projects (no filter applied)');
      setCardData(originalCardData);
      setCardData2(originalCardData2);
      setCardData3(originalCardData3);
      return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    console.log('🔍 Applying filter for:', searchTerm);
    
    // Special case: filter to show only actual projects
    if (searchTerm === 'projects') {
      console.log('🎯 Filtering to show ONLY project cards (isProject === true)');
      const projectsOnly1 = originalCardData.filter(card => card.isProject === true);
      const projectsOnly2 = originalCardData2.filter(card => card.isProject === true);
      const projectsOnly3 = originalCardData3.filter(card => card.isProject === true);
      
      const totalProjects = projectsOnly1.length + projectsOnly2.length + projectsOnly3.length;
      console.log(`✅ Showing ${totalProjects} project cards only`, {
        section1: `${projectsOnly1.length}/${originalCardData.length}`,
        section2: `${projectsOnly2.length}/${originalCardData2.length}`,
        section3: `${projectsOnly3.length}/${originalCardData3.length}`
      });
      
      setCardData(projectsOnly1);
      setCardData2(projectsOnly2);
      setCardData3(projectsOnly3);
      return;
    }
    
    // Helper function to filter a card array
    const filterCards = (cards) => {
      return cards.filter(card => {
        // Check title
        if (card.title && card.title.toLowerCase().includes(searchTerm)) {
          console.log(`  ✓ Match found in title: "${card.title}"`);
          return true;
        }
        
        // Check description
        if (card.description && card.description.toLowerCase().includes(searchTerm)) {
          console.log(`  ✓ Match found in description: "${card.title}"`);
          return true;
        }
        
        // Check labels/technologies
        if (card.labels && Array.isArray(card.labels)) {
          if (card.labels.some(label => 
            label.toLowerCase().includes(searchTerm)
          )) {
            console.log(`  ✓ Match found in labels: "${card.title}" - ${card.labels.join(', ')}`);
            return true;
          }
        }
        
        // Check topics
        if (card.topics && Array.isArray(card.topics)) {
          if (card.topics.some(topic => 
            topic.toLowerCase().includes(searchTerm)
          )) {
            console.log(`  ✓ Match found in topics: "${card.title}" - ${card.topics.join(', ')}`);
            return true;
          }
        }
        
        return false;
      });
    };
    
    // Filter all three card arrays
    const filtered1 = filterCards(originalCardData);
    const filtered2 = filterCards(originalCardData2);
    const filtered3 = filterCards(originalCardData3);
    
    const totalResults = filtered1.length + filtered2.length + filtered3.length;
    console.log(`✅ Filter applied! Found ${totalResults} matching items:`, {
      section1: `${filtered1.length}/${originalCardData.length}`,
      section2: `${filtered2.length}/${originalCardData2.length}`,
      section3: `${filtered3.length}/${originalCardData3.length}`
    });
    
    setCardData(filtered1);
    setCardData2(filtered2);
    setCardData3(filtered3);
  }, [originalCardData, originalCardData2, originalCardData3]);

  return (
    <div className="home-page">

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
      
      <div className="home-scroll-container" ref={scrollContainerRef}>
        {/* Command Line Interface */}
        <CommandLine 
          aiContext={aiContext}
          onAIResponse={handleAIResponse}
          onSearchChange={handleCommandSearch}
        />

        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />

        
        
        {/* Main Content Section */}
        <div className="home-section">
          <MagicBento 
            cardData={cardData}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={false}
            clickEffect={true}
            enableMagnetism={true}
            textAutoHide={true}
            glowColor="132, 0, 255"
          />
        </div>

        {/* Second Bento Section */}
        <div className="home-section">
          <MagicBento 
            cardData={cardData2}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt={false}
            clickEffect={true}
            enableMagnetism={true}
            textAutoHide={true}
            glowColor="132, 0, 255"
          />
        </div>

        {/* Third Bento Section */}
        {cardData3.length > 0 && (
          <div className="home-section">
            <MagicBento 
              cardData={cardData3}
              enableStars={true}
              enableSpotlight={true}
              enableBorderGlow={true}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={true}
              textAutoHide={true}
              glowColor="132, 0, 255"
            />
          </div>
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

export default Home;