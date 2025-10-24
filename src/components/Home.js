import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MagicBento from './MagicBento';
import './Home.css';
import Lanyard from './Lanyard'
import { FaGithub, FaLinkedin, FaTwitter, FaInstagram, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { getHomepageData } from '../firebase/firestoreService';

// GitHub service
const githubService = {
  baseURL: 'https://api.github.com',
  
  getRandomImage() {
    const seed = Math.floor(Math.random() * 10000);
    return `https://picsum.photos/seed/${seed}/800/600`;
  },
  
  async getUserRepositories(username) {
    try {
      const response = await fetch(`${this.baseURL}/users/${username}/repos?sort=updated&per_page=100`, {
        headers: {
          'Accept': 'application/vnd.github.mercy-preview+json'
        }
      });
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      const repos = await response.json();
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
      image: this.getRandomImage(),
      link: repo.homepage || repo.html_url,
      stars: repo.stargazers_count || 0,
      isPinned: repo.topics?.includes('pinned') || repo.topics?.includes('featured'),
      topics: repo.topics || [],
      controls: controls,
      type: 'default'
    };
  }
};

const Home = () => {
  const navigate = useNavigate();
  
  // Basic state for the home page
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false); // Track mobile view
  
  // Command line state (navigation only)
  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Sample card data for the bento grid
  const [cardData] = useState([
    {
      color: '#060010',
      title: 'Welcome',
      description: 'Welcome to my digital space',
      labels: [],
      image: '/pic3.png',
      link: '#',
      controls: 0, // No icons
      type: 'img' // Default card type
    },
    {
      color: '#060010',
      title: 'About Me',
      description: 'Full-stack developer passionate about creating beautiful web experiences. Specializing in React, Node.js, and modern JavaScript frameworks to build responsive and intuitive applications.',
      labels: [],
      link: '/about',
      image: 'https://picsum.photos/seed/2000/800/600',
      controls: 1.1, // Upper-right icon
      type: 'textual' // Text-focused card with no labels, full description
    },
    {
      color: '#060010',
      title: 'Ranbir Khurana',
      description: 'I transform complex challenges into elegant digital solutions.',
      labels: ['Profile'],
      image: 'https://picsum.photos/seed/3000/800/600',
      link: '/myprojects',
      controls: 0, // Bottom-right icon
      type: 'default' // Default card type
    },
    {
      color: '#060010',
      title: 'Get in Touch',
      description: 'Let\'s connect and collaborate',
      labels: ['Contact'],
      image: '',
      link: '/contacts',
      controls: 0, // No icons
      splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode', // Special Spline content
    // Default type with Spline
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
      type: 'label' // Label type with larger font, comma-separated labels
    },
    {
      color: '#060010',
      title: 'Blog',
      description: 'Read my latest thoughts and insights on technology, development practices, and industry trends. Discover tutorials, tips, and personal experiences from my journey as a developer.',
      labels: ['Writing'],
      link: '/blog',
      controls: 1.1, // Upper-right icon
      type: 'textual' // Text-focused card
    }
  ]);

  const [cardData2, setCardData2] = useState([
    {
      color: '#060010',
      title: 'Get in Touch',
      description: 'Let\'s connect and collaborate',
      labels: ['Contact'],
      image: '',
      link: '/contacts',
      controls: 0,
      splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode',
      type: 'default'
    }
  ]);
  
  // Social links data - will be fetched from Firebase
  const [socialLinks, setSocialLinks] = useState([
    { id: 'github', url: 'https://github.com/DevRanbir', icon: <FaGithub /> },
    { id: 'linkedin', url: 'https://linkedin.com/in/yourname', icon: <FaLinkedin /> },
    { id: 'twitter', url: 'https://twitter.com/yourname', icon: <FaTwitter /> },
    { id: 'instagram', url: 'https://instagram.com/yourname', icon: <FaInstagram /> },
    { id: 'mail', url: 'mailto:your.email@example.com', icon: <FaEnvelope /> },
    { id: 'discord', url: 'https://discord.gg/yourserver', icon: <FaDiscord /> }
  ]);
  
  // Dropdown items for navigation (no project filters)
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
  
  // Command line handlers (navigation only)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setCommandInput(value);
    
    // Show dropdown for navigation commands
    setIsDropdownOpen(value.length > 0);
  };
  
  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };
  
  const handleInputBlur = () => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => setIsDropdownOpen(false), 150);
  };
  
  const handleItemClick = (item) => {
    // Handle navigation based on the selected item
    setCommandInput(item.name);
    console.log(`Selected: ${item.name}`);
    
    if (item.name === 'Documents') {
      navigate('/documents');
    } else if (item.name === 'Projects') {
      navigate('/myprojects');
    } else if (item.name === 'Home') {
      navigate('/home');
    } else if (item.name === 'About') {
      navigate('/about');
    } else if (item.name === 'Contact') {
      navigate('/contacts');
    }
    
    setIsDropdownOpen(false);
  };
  
  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = commandInput.toLowerCase().trim();
      
      // Handle navigation commands
      if (command === 'documents') {
        navigate('/documents');
      } else if (command === 'projects') {
        navigate('/myprojects');
      } else if (command === 'home') {
        navigate('/home');
      } else if (command === 'about') {
        navigate('/about');
      } else if (command === 'contact' || command === 'contacts') {
        navigate('/contacts');
      } else if (command === 'clear' || command === 'reset') {
        // Clear command input
        setCommandInput('');
      }
      
      setIsDropdownOpen(false);
    } else if (e.key === 'Escape') {
      // Clear input on Escape
      setCommandInput('');
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

  // Fetch GitHub repositories for cardData2
  useEffect(() => {
    const fetchGitHubRepos = async () => {
      try {
        const repos = await githubService.getUserRepositories('DevRanbir');
        
        // Filter for pinned/featured repos or get top 5 by stars
        let selectedRepos = repos.filter(repo => 
          repo.topics?.includes('pinned') || repo.topics?.includes('featured')
        );
        
        // If no pinned repos, get top 5 by stars
        if (selectedRepos.length === 0) {
          selectedRepos = repos
            .sort((a, b) => b.stargazers_count - a.stargazers_count)
            .slice(0, 5);
        }
        
        // Convert repos to card data with controls set to 2
        const repoCards = selectedRepos.map(repo => 
          githubService.convertRepoToCardData(repo, 2)
        );
        
        // Spline "Get in Touch" card
        const splineCard = {
          color: '#060010',
          title: 'Get in Touch',
          description: 'Let\'s connect and collaborate',
          labels: ['Contact'],
          image: '',
          link: '/contacts',
          controls: 0,
          splineUrl: 'https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode',
          type: 'default'
        };
        
        // Insert Spline card at position 3 (index 2) or 4 (index 3)
        // If we have at least 3 repos, insert at position 3, otherwise position 4
        const splinePosition = repoCards.length >= 3 ? 2 : Math.min(3, repoCards.length);
        
        const finalCards = [
          ...repoCards.slice(0, splinePosition),
          splineCard,
          ...repoCards.slice(splinePosition)
        ];
        
        setCardData2(finalCards);
        
        console.log('GitHub repos fetched for cardData2:', repoCards);
        console.log('Spline card inserted at position:', splinePosition + 1);
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
      
      <div className="home-scroll-container">
        {/* Command Line Interface */}
        <div className="command-line-container">
          <div className="glass-panel">
            <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="command-input-wrapper">
                <span className="prompt-symbol">$</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder="Navigate or run a command"
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
            
            {isDropdownOpen && (
              <div className="dropdown-panel">
                <div className="explorer-grid">
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