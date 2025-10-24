import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css'; // Reusing Homepage styles
import './About.css'; // New styles for About-specific content
import Lanyard from './Lanyard'; // Importing Lanyard component
import LoadingOverlay from './LoadingOverlay';
import FullScreenPrompt from './FullScreenPrompt';
import { 
  getAboutData, 
  subscribeToAboutData,
  getHomepageData,
  subscribeToHomepageData,
  updateSocialLinks 
} from '../firebase/firestoreService';

const About = () => {
  const navigate = useNavigate();

  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [commandMessage, setCommandMessage] = useState('');
  const [showCommandMessage, setShowCommandMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingSocial, setEditingSocial] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  // About data state
  const [aboutData, setAboutData] = useState({
    githubReadmeUrl: 'https://api.github.com/repos/DevRanbir/DevRanbir/readme',
    githubUsername: 'DevRanbir',
    repositoryName: 'DevRanbir'
  });
  // Social links from homepage data (synced with homepage)
  const [socialLinks, setSocialLinks] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    iconType: '',
    url: ''
  });
  const [readme, setReadme] = useState('');
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [readmeError, setReadmeError] = useState(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollInterval, setScrollInterval] = useState(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('👤 About: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);

  // Dropdown items for navigation
  const dropdownItems = [
    { 
      id: 1, 
      name: 'Contact', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.079 6.839a3 3 0 0 0-4.255.1M13 20h1.083A3.916 3.916 0 0 0 18 16.083V9A6 6 0 1 0 6 9v7m7 4v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1Zm-7-4v-6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1Zm12-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v-6Z"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 2, 
      name: 'Home', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 3, 
      name: 'Documents', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11H4m15.5 5a.5.5 0 0 0 .5-.5V8a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44l-1.436-2.12a1 1 0 0 0-.828-.44H8a1 1 0 0 0-1 1M4 9v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44L9.985 8.44A1 1 0 0 0 9.157 8H5a1 1 0 0 0-1 1Z"/>
      </svg>, 
      type: 'folder' 
    },
    { 
      id: 4, 
      name: 'Projects', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 9h6m-6 3h6m-6 3h6M6.996 9h.01m-.01 3h.01m-.01 3h.01M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>
      </svg>, 
      type: 'folder' 
    },
  ];
  
  // Command templates for edit mode
  const commandTemplates = [
    { id: 'add', template: 'add [name] [link]', description: 'Add a new social link' },
    { id: 'edit', template: 'edit [oldname] [oldlink] - [newname] [newlink]', description: 'Edit an existing link' },
    { id: 'remove', template: 'remove [name] link', description: 'Remove a social link' },
    { id: 'exit', template: 'exit', description: 'Exit edit mode' },
  ];
  
  const handleInputChange = (e) => {
    setCommandInput(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
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
    } else {
      // This is a regular folder/file item
      setCommandInput(item.name);
      console.log(`Selected: ${item.name}`);
      
      // Handle navigation based on the selected item
      if (item.name === 'Home') {
        navigate('/');
      } else if (item.name === 'Documents') {
        navigate('/documents');
      } else if (item.name === 'Projects') {
        navigate('/projects');
      } else if (item.name === 'Contact') {
        navigate('/contacts');
      }
    }
    // Keep dropdown open for command templates in edit mode
    if (!(editMode && typeof item === 'object' && 'template' in item)) {
      setIsDropdownOpen(false);
    }
  };
  
  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.toLowerCase().trim();
      
      // Navigation commands (available in both edit and normal mode)
      if (command === 'home') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
        return;
      } else if (command === 'documents') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (command === 'projects') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/projects');
        return;
      }
      
      // Single letter navigation shortcuts
      else if (command === 'h') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
        return;
      } else if (command === 'd') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (command === 'p') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/projects');
        return;
      } else if (command === 'a') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (command === 'c') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/contacts');
        return;
      }
      if (command === 'edit') {
        setShowPasswordModal(true);
      } else if (command.match(/^edit\s+(.+)\.$/)) {
        // Handle "edit [password]." format - password must end with a period
        const matches = command.match(/^edit\s+(.+)\.$/);
        const password = matches[1];
        const correctPassword = 'ranbir195'; // Same password as in validatePassword
        
        if (password === correctPassword) {
          setEditMode(true);
          setCommandInput('');
          setIsDropdownOpen(true);
          showMessage("Edit mode activated!");
        } else {
          showMessage("Incorrect password. Access denied.");
        }
      } else if (editMode) {
        // Process commands only available in edit mode
        
        // Command pattern: "add [name] [link]" - To add a new social link
        if (command.match(/^add\s+(\w+)\s+(.+)$/)) {
          const matches = command.match(/^add\s+(\w+)\s+(.+)$/);
          const name = matches[1];
          const url = matches[2];
          handleCommandCreateLink(name, url);
        }
        // Command pattern: "remove [name] link" - To remove an existing social link
        else if (command.match(/^remove\s+(\w+)\s+link$/)) {
          const name = command.split(' ')[1];
          handleCommandRemoveLink(name);
        } 
        // Command pattern: "edit [oldname] [oldlink] - [newname] [newlink]" - To edit an existing social link
        else if (command.match(/^edit\s+(\w+)\s+(.+?)\s+-\s+(\w+)\s+(.+)$/)) {
          const matches = command.match(/^edit\s+(\w+)\s+(.+?)\s+-\s+(\w+)\s+(.+)$/);
          const oldName = matches[1];
          const oldLink = matches[2];
          const newName = matches[3];
          const newLink = matches[4];
          handleCommandEditLink(oldName, oldLink, newName, newLink);
        }
        // Exit edit mode command
        else if (command === 'exit') {
          handleExitEditMode();
        }
      }
      
      // Clear command input after processing
      setCommandInput('');
      setIsDropdownOpen(false);
    }
  };
  
  const validatePassword = (e) => {
    if (e) e.preventDefault();
    const correctPassword = 'ranbir195';
    if (passwordInput === correctPassword) {
      setEditMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      setCommandInput('');
      setIsDropdownOpen(true);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };
  
  const handleExitEditMode = () => {
    setEditMode(false);
    setEditingSocial(null);
    setIsCreatingNew(false);
    showMessage("Exited edit mode.");
  };

  const handleSocialEdit = (social) => {
    setEditingSocial(social);
    setIsCreatingNew(false);
    setEditFormData({
      name: social.id,
      iconType: 'default',
      url: social.url
    });
  };
  
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingSocial(null);
    setEditFormData({
      name: '',
      iconType: 'default',
      url: ''
    });
  };
  
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: value
    });
  };
  useEffect(() => {
      const handleKeyPress = (event) => {
        // Check if "/" is pressed and no input/textarea is currently focused
        if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          event.preventDefault();
          const commandInput = document.querySelector('.command-input');
          if (commandInput) {
            commandInput.focus();
          }
        }
      };
  
      // Add event listener to document
      document.addEventListener('keydown', handleKeyPress);
  
      // Cleanup event listener
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }, []);
  
  const handleEditFormSubmit = (e) => {
    e.preventDefault();
    
    let updatedLinks;
    let actionMessage = '';
    
    if (isCreatingNew) {
      // Creating a new social link
      const newIcon = getDefaultIcon(editFormData.name);
      const newSocial = {
        id: editFormData.name.toLowerCase(),
        icon: newIcon,
        url: editFormData.url
      };
      
      updatedLinks = [...socialLinks, newSocial];
      actionMessage = `New "${editFormData.name}" link has been added.`;
    } else {
      // Updating an existing link
      const oldName = editingSocial.id;
      updatedLinks = socialLinks.map(link => 
        link.id === editingSocial.id ? 
        { 
          ...link, 
          id: editFormData.name,
          url: editFormData.url
        } : 
        link
      );
      actionMessage = `"${oldName}" link has been updated to "${editFormData.name}".`;
    }
    
    // Update the links in Firestore
    updateSocialLinksToFirestore(updatedLinks, actionMessage);
    
    // Reset the editing state
    setEditingSocial(null);
    setIsCreatingNew(false);
  };
  
  const handleRemoveSocial = (socialId) => {
    const link = socialLinks.find(link => link.id === socialId);
    const updatedLinks = socialLinks.filter(link => link.id !== socialId);
    
    if (link) {
      const actionMessage = `The "${link.id}" link has been removed.`;
      updateSocialLinksToFirestore(updatedLinks, actionMessage);
    }
  };

  // Helper function to update social links to Firestore
  const updateSocialLinksToFirestore = async (updatedLinks, successMessage) => {
    try {
      // Update local state immediately for better UX
      setSocialLinks(updatedLinks);
      
      // Save to Firestore
      await updateSocialLinks(updatedLinks);
      showMessage(successMessage);
    } catch (error) {
      console.error('Error updating social links:', error);
      showMessage('Error updating social links. Please try again.');
    }
  };

  // Command handlers for social link operations
  const handleCommandCreateLink = (name, url) => {
    // Check if a link with this name already exists
    const exists = socialLinks.some(link => link.id.toLowerCase() === name.toLowerCase());
    if (exists) {
      showMessage(`A link with the name "${name}" already exists. Please use a different name.`);
      return;
    }
    
    // Create the new link directly
    const newIcon = getDefaultIcon(name);
    const newSocial = {
      id: name.toLowerCase(),
      icon: newIcon,
      url: url
    };
    
    const updatedLinks = [...socialLinks, newSocial];
    const actionMessage = `New "${name}" link has been added.`;
    updateSocialLinksToFirestore(updatedLinks, actionMessage);
  };
  
  const handleCommandRemoveLink = (name) => {
    // Find the link with the given name
    const link = socialLinks.find(link => link.id.toLowerCase() === name.toLowerCase());
    if (!link) {
      showMessage(`No link found with the name "${name}". Please check the name and try again.`);
      return;
    }
    
    if (window.confirm(`Are you sure you want to remove the "${name}" link?`)) {
      const updatedLinks = socialLinks.filter(link => link.id.toLowerCase() !== name.toLowerCase());
      const actionMessage = `The "${name}" link has been removed.`;
      updateSocialLinksToFirestore(updatedLinks, actionMessage);
    }
  };
  
  const handleCommandEditLink = (oldName, oldLink, newName, newLink) => {
    // Find the link with the given name
    const link = socialLinks.find(link => link.id.toLowerCase() === oldName.toLowerCase());
    if (!link) {
      showMessage(`No link found with the name "${oldName}". Please check the name and try again.`);
      return;
    }
    
    // Verify the old link matches (optional verification)
    if (link.url !== oldLink) {
      showMessage(`The link URL for "${oldName}" doesn't match. Please check and try again.`);
      return;
    }
    
    // Update the link directly
    const updatedLinks = socialLinks.map(l => 
      l.id.toLowerCase() === oldName.toLowerCase() 
        ? { 
            ...l, 
            id: newName.toLowerCase(),
            url: newLink,
            icon: getDefaultIcon(newName) // Update icon based on new name
          } 
        : l
    );
    
    const actionMessage = `"${oldName}" link has been updated to "${newName}".`;
    updateSocialLinksToFirestore(updatedLinks, actionMessage);
  };

  // Show a temporary command result message
  const showMessage = (message) => {
    setCommandMessage(message);
    setShowCommandMessage(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowCommandMessage(false);
    }, 3000);
  };

  // Fetch README content from GitHub API (HTML version)
  const fetchReadme = async () => {
    try {
      setReadmeLoading(true);
      setReadmeError(null);
      
      // Use the dynamic GitHub README URL from aboutData
      const readmeUrl = aboutData.githubReadmeUrl || 'https://api.github.com/repos/DevRanbir/DevRanbir/readme';
      
      // Fetch HTML version of README from GitHub API
      const response = await fetch(
        readmeUrl,
        {
          headers: {
            Accept: 'application/vnd.github.v3.html'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      // Process HTML to enhance it
      let processedHtml = await response.text();
      
      // Add target="_blank" to all links
      processedHtml = processedHtml.replace(
        /<a\s+(?![^>]*\btarget=(['"])_blank\1)[^>]*>/gi,
        (match) => match.replace(/<a\s/, '<a target="_blank" rel="noopener noreferrer" ')
      );
      
      // Add class to images for animations
      processedHtml = processedHtml.replace(
        /<img\s/gi,
        '<img class="readme-img" '
      );
      
      // Add classes to code blocks for syntax highlighting
      processedHtml = processedHtml.replace(
        /<pre>/gi,
        '<pre class="code-block">'
      );
      
      setReadme(processedHtml);
    } catch (error) {
      console.error('Error fetching README:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('404')) {
        setReadmeError('README not found. This user may not have a profile README.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setReadmeError('GitHub API rate limit exceeded. Please try again later.');
      } else {
        setReadmeError(`Failed to load README: ${errorMessage}`);
      }
    } finally {
      setReadmeLoading(false);
    }
  };

  // Effect for loading Spline viewer script
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js';
    script.onerror = () => {
      console.warn('Failed to load Spline viewer script, falling back to basic version');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Clock update effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      document.documentElement.style.setProperty('--timer-hours', `"${hours}"`);
      document.documentElement.style.setProperty('--timer-minutes', `"${minutes}"`);
      document.documentElement.style.setProperty('--timer-seconds', `"${seconds}"`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load social links from Firestore (synced with homepage)
  useEffect(() => {
    const loadHomepageData = async () => {
      try {
        const data = await getHomepageData();
        if (data.socialLinks) {
          // Reconstruct social links with icons
          const reconstructedLinks = data.socialLinks.map(link => ({
            ...link,
            icon: getDefaultIcon(link.id)
          }));
          setSocialLinks(reconstructedLinks);
        }
      } catch (error) {
        console.error('Error loading homepage data:', error);
      }
    };

    loadHomepageData();

    // Set up real-time listener for homepage data updates
    const unsubscribe = subscribeToHomepageData((data) => {
      if (data.socialLinks) {
        const reconstructedLinks = data.socialLinks.map(link => ({
          ...link,
          icon: getDefaultIcon(link.id)
        }));
        setSocialLinks(reconstructedLinks);
        console.log('Social links updated from homepage data:', reconstructedLinks);
      }
    });

    // Listen for homepageDataUpdated events from Controller
    const handleHomepageDataUpdate = (event) => {
      if (event.detail && event.detail.data && event.detail.data.socialLinks) {
        const reconstructedLinks = event.detail.data.socialLinks.map(link => ({
          ...link,
          icon: getDefaultIcon(link.id)
        }));
        setSocialLinks(reconstructedLinks);
        console.log('Social links updated from Controller:', reconstructedLinks);
      }
    };

    window.addEventListener('homepageDataUpdated', handleHomepageDataUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('homepageDataUpdated', handleHomepageDataUpdate);
    };
  }, []);

  // Load About data from Firestore on component mount
  useEffect(() => {
    const loadAboutData = async () => {
      try {
        const data = await getAboutData();
        setAboutData(data);
        console.log('About data loaded:', data);
      } catch (error) {
        console.error('Error loading about data:', error);
        // Use default values if loading fails
        setAboutData({
          githubReadmeUrl: 'https://api.github.com/repos/DevRanbir/DevRanbir/readme',
          githubUsername: 'DevRanbir',
          repositoryName: 'DevRanbir'
        });
      }
    };

    loadAboutData();

    // Set up real-time listener for About data updates
    const unsubscribe = subscribeToAboutData((data) => {
      if (data) {
        setAboutData(data);
        console.log('About data updated from Firestore:', data);
        // Re-fetch README when data changes
        fetchReadme();
      }
    });

    // Listen for aboutDataUpdated events from Controller
    const handleAboutDataUpdate = (event) => {
      if (event.detail && event.detail.aboutData) {
        setAboutData(event.detail.aboutData);
        console.log('About data updated from Controller:', event.detail.aboutData);
        // Re-fetch README when data changes
        fetchReadme();
      }
    };

    window.addEventListener('aboutDataUpdated', handleAboutDataUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('aboutDataUpdated', handleAboutDataUpdate);
    };
    // eslint-disable-next-line
  }, []);
  
  // Save social links to localStorage whenever they change
  // Note: Now using Firestore instead of localStorage for persistence
  // Social links are saved via updateSocialLinksToFirestore function

  // Fetch README content when component mounts or aboutData changes
  useEffect(() => {
    fetchReadme();
    // eslint-disable-next-line
  }, [aboutData.githubReadmeUrl]);
  
  // Function to get default icon based on social media name
  const getDefaultIcon = (name) => {
    const iconName = name.toLowerCase();
    if (iconName.includes('github')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;
    } else if (iconName.includes('linkedin')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
    } else if (iconName.includes('twitter') || iconName.includes('x')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
    } else if (iconName.includes('instagram')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
    } else if (iconName.includes('mail') || iconName.includes('email')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
    } else if (iconName.includes('facebook')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>;
    } else {
      // Generic link icon
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
    }
  };
  
  const toggleAutoScroll = () => {
    const container = document.querySelector('.readme-viewer');
    if (!container) return;

    if (isAutoScrolling) {
        if (scrollInterval) {
        clearInterval(scrollInterval);
        setScrollInterval(null);
        }
        setIsAutoScrolling(false);
        return;
    }

    // Start auto-scroll
    const speed = 4; // pixels per frame
    const fps = 120;  // frame rate
    const interval = setInterval(() => {
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop >= maxScroll - 1) {
        clearInterval(interval);
        setScrollInterval(null);
        setIsAutoScrolling(false);
        return;
        }
        container.scrollTop += speed;
    }, 2000 / fps); // ~60fps

    setScrollInterval(interval);
    setIsAutoScrolling(true);
    };




  // Cleanup auto-scroll on component unmount
  useEffect(() => {
    return () => {
      if (scrollInterval) {
        clearInterval(scrollInterval);
      }
    };
  }, [scrollInterval]);
  
  return (
    <div className="homepage">
      {/* FullScreen Prompt - Shows for mobile users */}
      <FullScreenPrompt />

      {/* LoadingOverlay - Shows for 15 seconds on page load */}
      {showLoadingOverlay && (
        <LoadingOverlay 
          duration={4000}
          onComplete={handleLoadingComplete}
        />
      )}

      {/* Main content - Always rendered but hidden behind overlay when loading */}
      <div className={`main-content ${showLoadingOverlay ? 'loading' : 'loaded'}`}>
        {/* Spline 3D Background */}
        <div className="spline-background">
        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
        {/* Command Line Interface */}
        <div className="command-line-container">
          <div className="glass-panel">
            <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="command-input-wrapper">
                <span className="prompt-symbol">{editMode ? '🔓' : '$'}</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder={editMode ? "Type a command or click a template below..." : "Search, navigate, or run a command..."}
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
                  {editMode ? 
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
                    dropdownItems.map((item) => (
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
        
        {/* Social Media Links - Vertical Column */}
        <div className="social-links-container">
          {/* Auto-scroll Play Button - Always at top */}
          <div className="social-link-wrapper auto-scroll-wrapper">
            <button 
              className={`social-link auto-scroll-button ${isAutoScrolling ? 'playing' : ''}`}
              aria-label={isAutoScrolling ? "Stop auto-scroll" : "Start auto-scroll"}
              onClick={toggleAutoScroll}
              title={isAutoScrolling ? "Stop auto-scrolling README" : "Auto-scroll README"}
            >
              {isAutoScrolling ? (
                // Pause icon
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                // Play icon
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="currentColor">
                  <polygon points="5,3 19,12 5,21"></polygon>
                </svg>
              )}
            </button>
          </div>
          
          {socialLinks.map((social) => (
            <div key={social.id} className={`social-link-wrapper ${editMode ? 'edit-mode' : ''}`}>
              {editMode && editingSocial?.id === social.id ? (
                <form className="social-edit-form" onSubmit={handleEditFormSubmit} autoComplete="off">
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    placeholder="Social name"
                    required
                  />
                  <input
                    type="text"
                    name="url"
                    value={editFormData.url}
                    onChange={handleEditFormChange}
                    placeholder="URL"
                    required
                  />
                  <div className="edit-form-buttons">
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingSocial(null)}>Cancel</button>
                  </div>
                  <button 
                    type="button" 
                    className="delete-button"
                    onClick={() => {
                      handleRemoveSocial(editingSocial.id);
                      setEditingSocial(null);
                    }}
                  >
                    Delete
                  </button>
                </form>
              ) : (
                editMode ? (
                  <button 
                    className="social-link editable"
                    aria-label={`Edit ${social.id}`}
                    onClick={() => handleSocialEdit(social)}
                  >
                    {social.icon}
                    <div className="edit-icon">✏️</div>
                  </button>
                ) : (
                  <a 
                    href={social.url} 
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="social-link"
                    aria-label={social.id}
                  >
                    {social.icon}
                  </a>
                )
              )}
            </div>
          ))}
          
          {/* Add New Social Link Button - Only visible in edit mode */}
          {editMode && (
            <div className="social-link-wrapper add-new-wrapper">
              {isCreatingNew ? (
                <form className="social-edit-form" onSubmit={handleEditFormSubmit} autoComplete="off">
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    placeholder="Social name"
                    required
                  />
                  <input
                    type="text"
                    name="url"
                    value={editFormData.url}
                    onChange={handleEditFormChange}
                    placeholder="URL"
                    required
                  />
                  <div className="edit-form-buttons">
                    <button type="submit">Add</button>
                    <button type="button" onClick={() => setIsCreatingNew(false)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <button 
                  className="social-link add-new-button" 
                  aria-label="Add new social link"
                  onClick={handleCreateNew}
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"></line>
                    <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"></line>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="top-area-shade">
          <spline-viewer 
            url="https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode"
            onError={() => console.warn('Spline scene failed to load')}
          ></spline-viewer>
          <div className="spline-cover"></div>
        </div>

        {/* Password Modal */}
        {showPasswordModal && (
          <div className="password-modal-overlay">
            <div className="password-modal glass-panel">
              <h3>Enter Password</h3>
              <p>Enter the password to access edit mode.</p>
              
              {passwordError && <div className="password-error">{passwordError}</div>}
              
              <div className="password-input-wrapper">
                <form autoComplete="off" onSubmit={(e) => {
                  e.preventDefault();
                  validatePassword();
                }}>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="password-input"
                    autoComplete="new-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        validatePassword();
                      }
                    }}
                  />
                </form>
              </div>
              
              <div className="password-modal-buttons">
                <button 
                  className="password-submit-btn" 
                  onClick={validatePassword}
                >
                  Submit
                </button>
                <button 
                  className="password-cancel-btn" 
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordInput('');
                    setPasswordError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Command Message */}
        {showCommandMessage && (
          <div className="command-message">
            {commandMessage}
          </div>
        )}

        {/* README Content Display */}
        <div className="readme-content-section">
          <div className="readme-container">            
            <div className="readme-viewer">
              {readmeLoading ? (
                <div className="readme-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading README...</p>
                </div>
              ) : readmeError ? (
                <div className="readme-error">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p>{readmeError}</p>
                  <button 
                    className="retry-btn"
                    onClick={fetchReadme}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div 
                  className="readme-content" 
                  dangerouslySetInnerHTML={{ __html: readme }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Animated Bottom Pattern */}
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
        <div className="digital-clock-container">
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
        
        {/* Edit Mode Indicator */}
        {editMode && (
          <div className="edit-mode-indicator">
            <button className="exit-edit-mode-btn" onClick={handleExitEditMode}>
              Exit Edit Mode
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default About;
