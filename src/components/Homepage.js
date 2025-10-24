import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import TextType from './TextType';
import Lanyard from './Lanyard'
import LoadingOverlay from './LoadingOverlay';
import FullScreenPrompt from './FullScreenPrompt';
import { 
  updateSocialLinks, 
  updateAuthorDescription, 
  updateAuthorSkills,
  subscribeToHomepageData,
  initializeHomepageData
} from '../firebase/firestoreService';

const Homepage = () => {
  const navigate = useNavigate();

  const [commandInput, setCommandInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [editingSocial, setEditingSocial] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(false);
  const [authorDescription, setAuthorDescription] = useState("");
  const [tempAuthorDescription, setTempAuthorDescription] = useState("");
  const [authorSkills, setAuthorSkills] = useState([]);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [editFormData, setEditFormData] = useState({
    name: '',
    iconType: '',
    url: ''
  });
  const [commandMessage, setCommandMessage] = useState('');
  const [showCommandMessage, setShowCommandMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('🏠 Homepage: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);

  // Firestore subscription unsubscribe function
  const [unsubscribe, setUnsubscribe] = useState(null);

  // Dummy dropdown items for Windows Explorer style interface
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
      id: 5, 
      name: 'About', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 6, 
      name: 'Contact', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.079 6.839a3 3 0 0 0-4.255.1M13 20h1.083A3.916 3.916 0 0 0 18 16.083V9A6 6 0 1 0 6 9v7m7 4v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1Zm-7-4v-6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1Zm12-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v-6Z"/>
      </svg>, 
      type: 'action' 
    },
  ];
  
  // Command templates for edit mode
  const commandTemplates = [
    { id: 'add', template: 'add [name] [link]', description: 'Add a new social link' },
    { id: 'edit', template: 'edit [oldname] [oldlink] - [newname] [newlink]', description: 'Edit an existing link' },
    { id: 'remove', template: 'remove [name] link', description: 'Remove a social link' },
    { id: 'author', template: 'author edit [description]', description: 'Edit author description' },
    { id: 'skill', template: 'add skill [skillname]', description: 'Add a new skill' },
    { id: 'editskill', template: 'edit skill [oldname] [newname]', description: 'Edit a skill name' },
    { id: 'removeskill', template: 'remove skill [skillname]', description: 'Remove a skill' },
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
      if (item.name === 'Documents') {
        navigate('/documents');
      } else if (item.name === 'Projects') {
        navigate('/projects');
      } else if (item.name === 'About') {
        navigate('/about');
      } else if (item.name === 'Contact') {
        navigate('/contacts');
      }
    }
    // Keep dropdown open for command templates in edit mode
    if (!(editMode && typeof item === 'object' && 'template' in item)) {
      setIsDropdownOpen(false);
    }
  };
  
  // Password handling and edit mode functionality
  const handleCommandSubmit = (e) => {
    if (e.key === 'Enter') {
      const command = commandInput.toLowerCase().trim();
      
      // Navigation commands (available in both edit and normal mode)
      if (command === 'documents') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (command === 'projects') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/projects');
        return;
      } else if (command === 'about') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (command === 'home') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
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
        
        // Command pattern: "add [name] [link]" - To add a new social link (but not skill)
        if (command.match(/^add\s+(\w+)\s+(.+)$/) && !command.startsWith('add skill')) {
          const matches = command.match(/^add\s+(\w+)\s+(.+)$/);
          const name = matches[1];
          const url = matches[2];
          handleCommandCreateLink(name, url);
        }
        // Add skill command - must be checked before general add command
        else if (command.match(/^add skill\s+(.+)$/)) {
          const matches = command.match(/^add skill\s+(.+)$/);
          const skillName = matches[1];
          handleAddSkill(skillName);
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
        // Author edit command
        else if (command === 'author edit') {
          handleAuthorEdit();
        }
        // Author edit with new description command
        else if (command.match(/^author edit\s+(.+)$/)) {
          const matches = command.match(/^author edit\s+(.+)$/);
          const newDescription = matches[1];
          handleAuthorEditDirect(newDescription);
        }
        // Add skill command
        else if (command.match(/^add skill\s+(.+)$/)) {
          const matches = command.match(/^add skill\s+(.+)$/);
          const skillName = matches[1];
          handleAddSkill(skillName);
        }
        // Remove skill command
        else if (command.match(/^remove skill\s+(.+)$/)) {
          const matches = command.match(/^remove skill\s+(.+)$/);
          const skillName = matches[1];
          handleRemoveSkill(skillName);
        }
        // Edit skill command
        else if (command.match(/^edit skill\s+(.+?)\s+(.+)$/)) {
          const matches = command.match(/^edit skill\s+(.+?)\s+(.+)$/);
          const oldSkillName = matches[1];
          const newSkillName = matches[2];
          handleEditSkill(oldSkillName, newSkillName);
        }
      }
      
      // Clear command input after processing
      setCommandInput('');
      setIsDropdownOpen(false);
    }
  };
  
  const validatePassword = (e) => {
    if (e) e.preventDefault();
    // In a real application, this would use a secure method to verify the password
    const correctPassword = 'ranbir195'; // Change this to your secure password
    if (passwordInput === correctPassword) {
      setEditMode(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      setCommandInput(''); // Clear the command input
      // Show the dropdown with command templates
      setIsDropdownOpen(true);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
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
    const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    
    let updatedLinks;
    let actionMessage = '';
    
    if (isCreatingNew) {
      // Creating a new social link
      const newSocial = {
        id: editFormData.name.toLowerCase(),
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
          id: editFormData.name.toLowerCase(),
          url: editFormData.url
        } : 
        link
      );
      actionMessage = `"${oldName}" link has been updated to "${editFormData.name}".`;
    }
    
    // Save to Firestore
    await saveDataToFirestore('socialLinks', updatedLinks);
    
    // Show success message
    showMessage(actionMessage);
    
    // Reset the editing state
    setEditingSocial(null);
    setIsCreatingNew(false);
  };

  const handleRemoveSocial = async (socialId) => {
    const link = socialLinks.find(link => link.id === socialId);
    const updatedLinks = socialLinks.filter(link => link.id !== socialId);
    
    // Save to Firestore
    await saveDataToFirestore('socialLinks', updatedLinks);
    
    if (link) {
      showMessage(`The "${link.id}" link has been removed.`);
    }
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

  // Save updated data to Firestore
  const saveDataToFirestore = async (key, data) => {
    try {
      switch (key) {
        case 'socialLinks':
          await updateSocialLinks(data);
          break;
        case 'authorDescription':
          await updateAuthorDescription(data);
          break;
        case 'authorSkills':
          await updateAuthorSkills(data);
          break;
        default:
          throw new Error(`Invalid data key: ${key}`);
      }
      
      showMessage(`${key} updated successfully!`);
    } catch (err) {
      console.error(`Error updating ${key}:`, err);
      showMessage(`Error: Failed to update ${key}`);
    }
  };
  
  // Command handlers for social link operations
  const handleCommandCreateLink = async (name, url) => {
    // Check if a link with this name already exists
    const exists = socialLinks.some(link => link.id.toLowerCase() === name.toLowerCase());
    if (exists) {
      showMessage(`A link with the name "${name}" already exists. Please use a different name.`);
      return;
    }
    
    // Create the new link
    const newSocial = {
      id: name.toLowerCase(),
      url: url
    };
    
    const updatedLinks = [...socialLinks, newSocial];
    
    // Save to Firestore
    await saveDataToFirestore('socialLinks', updatedLinks);
  };
  
  const handleCommandRemoveLink = async (name) => {
    // Find the link with the given name
    const link = socialLinks.find(link => link.id.toLowerCase() === name.toLowerCase());
    if (!link) {
      showMessage(`No link found with the name "${name}". Please check the name and try again.`);
      return;
    }
    
    if (window.confirm(`Are you sure you want to remove the "${name}" link?`)) {
      const updatedLinks = socialLinks.filter(link => link.id.toLowerCase() !== name.toLowerCase());
      
      // Save to Firestore
      await saveDataToFirestore('socialLinks', updatedLinks);
    }
  };
  
  const handleCommandEditLink = async (oldName, oldLink, newName, newLink) => {
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
    
    // Update the link
    const updatedLinks = socialLinks.map(l => 
      l.id.toLowerCase() === oldName.toLowerCase() 
        ? { 
            id: newName.toLowerCase(),
            url: newLink
          } 
        : l
    );
    
    // Save to Firestore
    await saveDataToFirestore('socialLinks', updatedLinks);
  };
  
  const handleExitEditMode = () => {
    setEditMode(false);
    setEditingSocial(null);
    setIsCreatingNew(false);
    setEditingAuthor(false);
    setIsAddingSkill(false);
    setNewSkillInput('');
    showMessage("Exited edit mode.");
  };

  const handleAuthorEdit = () => {
    setEditingAuthor(true);
    setTempAuthorDescription(authorDescription);
    showMessage("Author edit mode activated. Click the edit button in the author section.");
  };

  const handleAuthorEditDirect = async (newDescription) => {
    // Save to Firestore
    await saveDataToFirestore('authorDescription', newDescription);
  };

  const handleAuthorSave = async () => {
    // Save to Firestore
    await saveDataToFirestore('authorDescription', tempAuthorDescription);
    setEditingAuthor(false);
  };

  const handleAuthorCancel = () => {
    setEditingAuthor(false);
    setTempAuthorDescription("");
    showMessage("Author edit cancelled.");
  };

  const handleAddSkill = async (skillName) => {
    // Check if skill already exists (case insensitive)
    const exists = authorSkills.some(skill => skill.toLowerCase() === skillName.toLowerCase());
    if (exists) {
      showMessage(`Skill "${skillName}" already exists.`);
      return;
    }
    
    const updatedSkills = [...authorSkills, skillName];
    
    // Save to Firestore
    await saveDataToFirestore('authorSkills', updatedSkills);
  };

  const handleRemoveSkill = async (skillName) => {
    // Find skill (case insensitive)
    const skillIndex = authorSkills.findIndex(skill => skill.toLowerCase() === skillName.toLowerCase());
    if (skillIndex === -1) {
      showMessage(`Skill "${skillName}" not found.`);
      return;
    }
    
    const skillToRemove = authorSkills[skillIndex];
    
    if (window.confirm(`Are you sure you want to remove the "${skillToRemove}" skill?`)) {
      const updatedSkills = authorSkills.filter((_, index) => index !== skillIndex);
      
      // Save to Firestore
      await saveDataToFirestore('authorSkills', updatedSkills);
    }
  };

  const handleSkillInputSubmit = async (e) => {
    e.preventDefault();
    if (newSkillInput.trim()) {
      await handleAddSkill(newSkillInput.trim());
      setNewSkillInput('');
      setIsAddingSkill(false);
    }
  };

  const handleSkillInputCancel = () => {
    setNewSkillInput('');
    setIsAddingSkill(false);
  };

  const handleEditSkill = async (oldSkillName, newSkillName) => {
    // Find skill (case insensitive)
    const skillIndex = authorSkills.findIndex(skill => skill.toLowerCase() === oldSkillName.toLowerCase());
    if (skillIndex === -1) {
      showMessage(`Skill "${oldSkillName}" not found.`);
      return;
    }

    // Check if new skill name already exists (case insensitive)
    const exists = authorSkills.some((skill, index) => 
      skill.toLowerCase() === newSkillName.toLowerCase() && index !== skillIndex
    );
    if (exists) {
      showMessage(`Skill "${newSkillName}" already exists.`);
      return;
    }

    // Update the skill
    const updatedSkills = [...authorSkills];
    updatedSkills[skillIndex] = newSkillName;
    
    // Save to Firestore
    await saveDataToFirestore('authorSkills', updatedSkills);
  };
  
  // Effect for handling edit command - Removed since it's now handled in handleCommandSubmit
  useEffect(() => {
    // Load the latest Spline viewer script with error handling
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js';
    script.onerror = () => {
      console.warn('Failed to load Spline viewer script, falling back to basic version');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
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

  // Load homepage data from Firestore and set up real-time listener
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize Firestore data if it doesn't exist
        await initializeHomepageData();
        
        // Set up real-time subscription
        const unsubscribeFn = subscribeToHomepageData((data) => {
          console.log('Homepage data updated from Firestore:', data);
          
          // Update social links with reconstructed icons
          if (data.socialLinks) {
            const linksWithIcons = data.socialLinks.map(link => ({
              ...link,
              icon: getDefaultIcon(link.id)
            }));
            setSocialLinks(linksWithIcons);
          }
          
          // Update author description
          if (data.authorDescription) {
            setAuthorDescription(data.authorDescription);
          }
          
          // Update author skills
          if (data.authorSkills) {
            setAuthorSkills(data.authorSkills);
          }
        });
        
        // Store the unsubscribe function
        setUnsubscribe(() => unsubscribeFn);
        
      } catch (err) {
        console.error('Error initializing homepage data:', err);
      }
    };
    
    initializeData();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line
  }, []); // Empty dependency array is intentional - we only want this to run once

  // Handle "/" key press to focus command line
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
        {/* Command Line Interface */}
        <div className="command-line-container">
          <div className="glass-panel">
            <form id="command-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
              <div className="command-input-wrapper">
                <span className="prompt-symbol">{editMode ? '🔓' : '$'}</span>
                <input
                  type="text"
                  className="command-input"
                  placeholder={editMode ? "Type a command or click a template below..." : "Search, navigate, or run a command"}
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
                    // Command templates in edit mode
                    commandTemplates.map((cmd) => (
                      <div 
                        key={cmd.id} 
                        className="explorer-item command-template"
                        onClick={() => handleItemClick(cmd)}
                      >
                        <div className="item-icon">{cmd.id === 'exit' ? '🚪' : cmd.id === 'add' ? '➕' : cmd.id === 'edit' ? '✏️' : cmd.id === 'remove' ? '❌' : cmd.id === 'author' ? '👤' : cmd.id === 'skill' ? '🎯' : cmd.id === 'editskill' ? '✏️' : cmd.id === 'removeskill' ? '🗑️' : '📝'}</div>
                        <div className="item-name">{cmd.id}</div>
                        <div className="item-description">{cmd.description}</div>
                      </div>
                    ))
                    :
                    // Regular items when not in edit mode
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

        <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
        
        {/* Social Media Links - Vertical Column */}
        <div className="social-links-container">
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

        <div className="author-section">
          <div className="authornameimg">
            <img src="pic3.png" alt="Author name" className="author-avatar" />
          </div>
          <div className="author-divider"></div>
          <div className="author-description">
            <h2>About the Author</h2>
            {editingAuthor ? (
              <div className="author-edit-form">
                <textarea
                  value={tempAuthorDescription}
                  onChange={(e) => setTempAuthorDescription(e.target.value)}
                  className="author-edit-textarea"
                  rows="4"
                  placeholder="Enter author description..."
                />
                <div className="author-edit-buttons">
                  <button 
                    className="author-save-btn" 
                    onClick={handleAuthorSave}
                    title="Save changes"
                  >
                    ✅ Save
                  </button>
                  <button 
                    className="author-cancel-btn" 
                    onClick={handleAuthorCancel}
                    title="Cancel editing"
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <TextType 
                  text={authorDescription || ""}
                  typingSpeed={75}
                  pauseDuration={1500}
                  deletingSpeed={0}
                  showCursor={true}
                  cursorCharacter="|"
                  className="text-type"
                  cursorClassName="text-type__cursor"
                  loop={false}
                  hideCursorWhileTyping={false}
                />
                {editMode && (
                  <button 
                    className="edit-author-btn" 
                    onClick={() => setEditingAuthor(true)}
                    title="Edit description"
                  >
                    ✏️
                  </button>
                )}
              </>
            )}
            
            {/* Skills Section */}
            <div className="author-skills-section">
              <h3>Skills & Technologies</h3>
              <div className="skills-container">
                {authorSkills.map((skill, index) => (
                  <div key={index} className="skill-badge">
                    <span className="skill-name">{skill}</span>
                    {editMode && (
                      <button 
                        className="remove-skill-btn"
                        onClick={() => handleRemoveSkill(skill)}
                        title={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {editMode && (
                  <>
                    {isAddingSkill ? (
                      <div className="skill-badge add-skill-input-form">
                        <form onSubmit={handleSkillInputSubmit} className="skill-input-form">
                          <input
                            type="text"
                            value={newSkillInput}
                            onChange={(e) => setNewSkillInput(e.target.value)}
                            placeholder="Enter skill name"
                            className="skill-input"
                            autoFocus
                            onBlur={(e) => {
                              // Don't close if clicking on save/cancel buttons
                              if (!e.relatedTarget || (!e.relatedTarget.classList.contains('skill-save-btn') && !e.relatedTarget.classList.contains('skill-cancel-btn'))) {
                                setTimeout(() => handleSkillInputCancel(), 150);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                handleSkillInputCancel();
                              }
                            }}
                          />
                          <div className="skill-input-buttons">
                            <button 
                              type="submit" 
                              className="skill-save-btn"
                              title="Add skill"
                            >
                              ✓
                            </button>
                            <button 
                              type="button" 
                              className="skill-cancel-btn"
                              onClick={handleSkillInputCancel}
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div 
                        className="skill-badge add-skill-badge"
                        onClick={() => setIsAddingSkill(true)}
                      >
                        <span className="add-skill-text">+ Add Skill</span>
                        <div className="add-skill-tooltip">Click to add or use: add skill [name]</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Command Message - For feedback on command actions */}
        {showCommandMessage && (
          <div className="command-message">
            {commandMessage}
          </div>
        )}

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

export default Homepage;
