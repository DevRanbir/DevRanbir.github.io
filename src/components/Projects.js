import React, { useEffect, useState, useCallback} from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css';
import './ProjectsStyles.css';
import Lanyard from './Lanyard';
import AnimatedList from './AnimatedList';
import LoadingOverlay from './LoadingOverlay';
import FullScreenPrompt from './FullScreenPrompt';
import { 
  getProjectsData, 
  updateProjects, 
} from '../firebase/firestoreService';

const Projects = () => {
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
  const [projects, setProjects] = useState([]);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('📽️ Projects: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);

  const [currentPage, setCurrentPage] = useState(0);
  const [editingProject, setEditingProject] = useState(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    type: '',
    repoUrl: '',
    liveUrl: '',
    description: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [showProjectOptions, setShowProjectOptions] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all'); // New state for filtering
  const getDefaultViewMode = () => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      return 'list'; // mobile
    }
    return 'blocks'; // desktop
  };

  const [viewMode, setViewMode] = useState(getDefaultViewMode);


  // Dropdown items for Windows Explorer style interface
  const dropdownItems = [
    { 
      id: 1, 
      name: 'About', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/>
      </svg>, 
      type: 'action' 
    },
    { 
      id: 2, 
      name: 'Contact', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.079 6.839a3 3 0 0 0-4.255.1M13 20h1.083A3.916 3.916 0 0 0 18 16.083V9A6 6 0 1 0 6 9v7m7 4v-1a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1Zm-7-4v-6H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h1Zm12-6h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v-6Z"/>
      </svg>, 
      type: 'action' 
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
      name: 'Documents', 
      icon: <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11H4m15.5 5a.5.5 0 0 0 .5-.5V8a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44l-1.436-2.12a1 1 0 0 0-.828-.44H8a1 1 0 0 0-1 1M4 9v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-3.75a1 1 0 0 1-.829-.44L9.985 8.44A1 1 0 0 0 9.157 8H5a1 1 0 0 0-1 1Z"/>
      </svg>, 
      type: 'folder' 
    },
  ];
  
  // Command templates for edit mode specific to Projects
  const commandTemplates = [
    { id: 'add', template: 'add [type] [name] [repo_url] [live_url] [description]', description: 'Add a new project' },
    { id: 'batch-add', template: 'batch-add [type1] [name1] [repo1] [live1] [desc1] | [type2] [name2] [repo2] [live2] [desc2] | ...', description: 'Add multiple projects' },
    { id: 'edit', template: 'edit [oldtype] [oldname] - [newtype] [newname] [newdesc]', description: 'Edit project' },
    { id: 'remove', template: 'remove [name]', description: 'Remove a project' },
    { id: 'batch-remove', template: 'batch-remove [name1] [name2] [name3] ...', description: 'Remove multiple projects' },
    { id: 'batch-remove-all', template: 'batch-remove all', description: 'Remove all projects' },
    { id: 'filter', template: 'filter [type]', description: 'Filter projects by type (all/web/mobile/desktop/ai/blockchain)' },
    { id: 'view', template: 'view [blocks|list]', description: 'Toggle between blocks and list view' },
    { id: 'exit', template: 'exit', description: 'Exit edit mode' },
  ];
  
  // Allowed project types
  const allowedTypes = [
    { value: 'web', label: 'Web Application', icon: '🌐' },
    { value: 'mobile', label: 'Mobile App', icon: '📱' },
    { value: 'desktop', label: 'Desktop App', icon: '🖥️' },
    { value: 'ai', label: 'AI/ML', icon: '🤖' },
    { value: 'blockchain', label: 'Blockchain', icon: '⛓️' }
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
        label: 'All Projects',
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
        label: 'Web Apps',
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
        label: 'Mobile Apps',
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
        label: 'Desktop Apps',
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
        label: 'AI/ML',
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
        label: 'Blockchain',
        type: 'blockchain'
    }
    ];

  // Handle view mode toggle
  const toggleViewMode = () => {
    const newViewMode = viewMode === 'blocks' ? 'list' : 'blocks';
    setViewMode(newViewMode);
    setCurrentPage(0); // Reset to first page when changing view
    showMessage(`Switched to ${newViewMode} view`);
  };

  
  const handleInputChange = (e) => {
    setCommandInput(e.target.value);
    setIsDropdownOpen(e.target.value.length > 0);
  };

  // Handle "/" key press to focus command line and close project options
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
      
      // Close project options on Escape key
      if (event.key === 'Escape' && showProjectOptions) {
        setShowProjectOptions(null);
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress);

    // Cleanup event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [showProjectOptions]);
  
  // Function to filter projects based on search query
  const getFilteredProjects = () => {
    const query = commandInput.toLowerCase().trim();
    if (!query || editMode) return [];
    
    return projects.filter(project => 
      project.name.toLowerCase().includes(query) || 
      (project.description && project.description.toLowerCase().includes(query)) ||
      project.type.toLowerCase().includes(query)
    ).slice(0, 5); // Limit to 5 results
  };
  
  // Function to get projects based on selected filter
  const getProjectsByFilter = () => {
    if (selectedFilter === 'all') {
      return projects;
    }
    return projects.filter(project => project.type === selectedFilter);
  };
  
  // Handle filter selection
  const handleFilterClick = (filterType) => {
    setSelectedFilter(filterType);
    setCurrentPage(0); // Reset to first page when filter changes
    
    // Show feedback message
    const filterLabel = filterLinks.find(f => f.type === filterType)?.label || 'All Projects';
    const filteredCount = filterType === 'all' ? projects.length : projects.filter(p => p.type === filterType).length;
    showMessage(`Showing ${filteredCount} ${filterLabel.toLowerCase()}`);
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
    } else if (typeof item === 'object' && 'id' in item && 'name' in item && 'type' in item && ('repoUrl' in item || 'liveUrl' in item)) {
      // This is a project search result - show options instead of directly opening
      handleProjectClick(item);
      setCommandInput('');
      setIsDropdownOpen(false);
      return;
    } else {
      // This is a regular folder/file item
      console.log(`Selected: ${item.name}`);
      
      // Handle navigation
      if (item.name === 'Home') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/');
        return;
      } else if (item.name === 'Documents') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/documents');
        return;
      } else if (item.name === 'About') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (item.name === 'Contact') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/contacts');
        return;
      }
      
      setCommandInput(item.name);
    }
    // Keep dropdown open for command templates in edit mode
    if (!(editMode && typeof item === 'object' && 'template' in item)) {
      setIsDropdownOpen(false);
    }
  };
  
  // Helper function to ensure URL has proper protocol
  const ensureValidUrl = (url) => {
    // If URL doesn't start with http:// or https://, add https://
    if (url && !url.match(/^https?:\/\//)) {
      return `https://${url}`;
    }
    return url;
  };
  
  // Password handling and edit mode functionality
  const handleCommandSubmit = async (e) => {
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
        // Already on projects page, just show message
        showMessage('You are already on the Projects page.');
        return;
      } else if (command === 'about') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/about');
        return;
      } else if (command === 'contacts') {
        setCommandInput('');
        setIsDropdownOpen(false);
        navigate('/contacts');
        return;
      }
      
      // Single letter navigation shortcuts
      else if (command === 'h' ) {
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
        showMessage('You are already on the Projects page.');
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
        
        // Command pattern: "add [type] [name] [repo_url] [live_url] [description]" - To add a new project
        if (command.match(/^add\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)(?:\s+(.*))?$/)) {
          const matches = command.match(/^add\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)(?:\s+(.*))?$/);
          const type = matches[1];
          const name = matches[2];
          const repoUrl = matches[3];
          const liveUrl = matches[4];
          const description = matches[5] || '';
          
          await handleAddProject(name, type, repoUrl, liveUrl, description);
        }
        // Command pattern: "batch-add [type1] [name1] [repo1] [live1] [desc1] | [type2] [name2] [repo2] [live2] [desc2] | ..." - To add multiple projects
        else if (command.match(/^batch-add\s+(.+)$/)) {
          const matches = command.match(/^batch-add\s+(.+)$/);
          const projectsString = matches[1];
          
          // Split by | to get individual project entries
          const projectEntries = projectsString.split('|').map(entry => entry.trim());
          const projectsData = [];
          
          projectEntries.forEach(entry => {
            const entryMatch = entry.match(/^(web|mobile|desktop|ai|blockchain)\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)(?:\s+(.*))?$/);
            if (entryMatch) {
              projectsData.push({
                type: entryMatch[1],
                name: entryMatch[2],
                repoUrl: entryMatch[3],
                liveUrl: entryMatch[4],
                description: entryMatch[5] || ''
              });
            }
          });
          
          if (projectsData.length > 0) {
            await handleBatchAddProjects(projectsData);
          } else {
            showMessage("Invalid batch-add format. Use: batch-add type1 name1 repo1 live1 desc1 | type2 name2 repo2 live2 desc2");
          }
        }
        // Command pattern: "edit [oldtype] [oldname] - [newtype] [newname] [newdesc]" - To edit an existing project
        else if (command.match(/^edit\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)\s+-\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)(?:\s+(.*))?$/)) {
          const matches = command.match(/^edit\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)\s+-\s+(web|mobile|desktop|ai|blockchain)\s+([^\s]+)(?:\s+(.*))?$/);
          const oldType = matches[1];
          const oldName = matches[2];
          const newType = matches[3];
          const newName = matches[4];
          const newDescription = matches[5] || '';
          
          // Find project by type and name
          const project = projects.find(p => p.type === oldType && p.name === oldName);
          if (project) {
            await handleEditProject(project.id, newName, newType, newDescription);
          } else {
            showMessage(`Project "${oldName}" of type "${oldType}" not found.`);
          }
        }
        // Command pattern: "remove [name]" - To remove a project
        else if (command.match(/^remove\s+(.+)$/)) {
          const matches = command.match(/^remove\s+(.+)$/);
          const name = matches[1];
          
          // Find project by name
          const project = projects.find(p => p.name === name);
          if (project) {
            await handleRemoveProject(project.id);
          } else {
            showMessage(`Project "${name}" not found.`);
          }
        }
        // Command pattern: "batch-remove [name1] [name2] [name3] ..." - To remove multiple projects
        else if (command.match(/^batch-remove\s+(.+)$/)) {
          const matches = command.match(/^batch-remove\s+(.+)$/);
          const namesString = matches[1];
          
          // Check if it's "batch-remove all"
          if (namesString.toLowerCase().trim() === 'all') {
            await handleBatchRemoveAllProjects();
          } else {
            // Split by spaces to get individual names (assuming names don't contain spaces)
            const names = namesString.split(/\s+/).filter(name => name.trim());
            
            if (names.length > 0) {
              await handleBatchRemoveProjects(names);
            } else {
              showMessage("Invalid batch-remove format. Use: batch-remove name1 name2 name3 or batch-remove all");
            }
          }
        }
        // Exit edit mode command
        else if (command === 'exit') {
          handleExitEditMode();
        }
        // Filter command pattern: "filter [type]" - To filter projects by type
        else if (command.match(/^filter\s+(all|web|mobile|desktop|ai|blockchain)$/)) {
          const matches = command.match(/^filter\s+(all|web|mobile|desktop|ai|blockchain)$/);
          const filterType = matches[1];
          handleFilterClick(filterType);
        }
        // View command pattern: "view [blocks|list]" - To toggle view mode
        else if (command.match(/^view\s+(blocks|list)$/)) {
          const matches = command.match(/^view\s+(blocks|list)$/);
          const viewType = matches[1];
          setViewMode(viewType);
          setCurrentPage(0);
          showMessage(`Switched to ${viewType} view`);
        }
      } else {
        // Commands available in normal mode
        if (command.match(/^filter\s+(all|web|mobile|desktop|ai|blockchain)$/)) {
          const matches = command.match(/^filter\s+(all|web|mobile|desktop|ai|blockchain)$/);
          const filterType = matches[1];
          handleFilterClick(filterType);
        }
        // View command pattern: "view [blocks|list]" - To toggle view mode
        else if (command.match(/^view\s+(blocks|list)$/)) {
          const matches = command.match(/^view\s+(blocks|list)$/);
          const viewType = matches[1];
          setViewMode(viewType);
          setCurrentPage(0);
          showMessage(`Switched to ${viewType} view`);
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
  
  // Project management functions
  const handleAddProject = async (name, type, repoUrl, liveUrl, description = '') => {
    // Validate that at least one URL is provided
    if (!repoUrl && !liveUrl) {
      showMessage("At least one URL (Repository or Live Demo) is required.");
      return;
    }
    
    // Ensure URLs have proper protocol
    const validRepoUrl = repoUrl ? ensureValidUrl(repoUrl) : '';
    const validLiveUrl = liveUrl ? ensureValidUrl(liveUrl) : '';
    
    const newId = Math.max(...projects.map(project => project.id), 0) + 1;
    const newProject = {
      id: newId,
      name: name,
      type: type || 'web', // Use provided type or default to web
      repoUrl: validRepoUrl,
      liveUrl: validLiveUrl,
      description: description,
      dateAdded: new Date().toISOString().split('T')[0]
    };
    
    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    showMessage(`Project "${name}" added successfully!`);
    
    // Save to Firestore
    await updateProjects(updatedProjects);
    
    // Dispatch event to notify Controller
    window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
      detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
    }));
  };
  
  const handleEditProject = async (id, name, type, description) => {
    const projectIndex = projects.findIndex(project => project.id === id);
    if (projectIndex === -1) {
      showMessage(`Project with ID ${id} not found.`);
      return;
    }
    
    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = {
      ...updatedProjects[projectIndex],
      name: name,
      type: type || updatedProjects[projectIndex].type,
      description: description !== undefined ? description : updatedProjects[projectIndex].description
    };
    
    setProjects(updatedProjects);
    showMessage(`Project with ID ${id} updated successfully!`);
    
    // Save to Firestore
    await updateProjects(updatedProjects);
    
    // Dispatch event to notify Controller
    window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
      detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
    }));
  };
  
  const handleRemoveProject = async (id) => {
    const projectIndex = projects.findIndex(project => project.id === id);
    if (projectIndex === -1) {
      showMessage(`Project with ID ${id} not found.`);
      return;
    }
    
    const projectName = projects[projectIndex].name;
    if (window.confirm(`Are you sure you want to remove "${projectName}"?`)) {
      const updatedProjects = projects.filter(project => project.id !== id);
      setProjects(updatedProjects);
      showMessage(`Project "${projectName}" removed successfully!`);
      
      // Save to Firestore
      await updateProjects(updatedProjects);
      
      // Dispatch event to notify Controller
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
      }));
    }
  };

  // Batch operations
  const handleBatchAddProjects = async (projectsData) => {
    let addedCount = 0;
    const updatedProjects = [...projects];
    
    projectsData.forEach(({ type, name, repoUrl, liveUrl, description }) => {
      if (type && name && (repoUrl || liveUrl)) {
        const validRepoUrl = repoUrl ? ensureValidUrl(repoUrl) : '';
        const validLiveUrl = liveUrl ? ensureValidUrl(liveUrl) : '';
        const newId = Math.max(...updatedProjects.map(project => project.id), 0) + 1 + addedCount;
        
        const newProject = {
          id: newId,
          name: name,
          type: type,
          repoUrl: validRepoUrl,
          liveUrl: validLiveUrl,
          description: description || '',
          dateAdded: new Date().toISOString().split('T')[0]
        };
        
        updatedProjects.push(newProject);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      setProjects(updatedProjects);
      
      // Save to Firestore
      await updateProjects(updatedProjects);
      
      // Dispatch event to notify Controller
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
      }));
      
      showMessage(`Successfully added ${addedCount} project(s)!`);
    } else {
      showMessage("No valid projects to add. At least one URL (repo or live) is required for each project.");
    }
  };

  const handleBatchRemoveProjects = async (names) => {
    let removedCount = 0;
    let updatedProjects = [...projects];
    
    names.forEach(name => {
      const projectIndex = updatedProjects.findIndex(p => p.name === name.trim());
      if (projectIndex !== -1) {
        updatedProjects = updatedProjects.filter(p => p.name !== name.trim());
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      setProjects(updatedProjects);
      
      // Save to Firestore
      await updateProjects(updatedProjects);
      
      // Dispatch event to notify Controller
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
      }));
      
      showMessage(`Successfully removed ${removedCount} project(s)!`);
    } else {
      showMessage("No matching projects found to remove.");
    }
  };

  const handleBatchRemoveAllProjects = async () => {
    if (projects.length === 0) {
      showMessage("No projects to remove.");
      return;
    }
    
    const projectCount = projects.length;
    if (window.confirm(`Are you sure you want to remove all ${projectCount} project(s)? This action cannot be undone.`)) {
      setProjects([]);
      
      // Save to Firestore
      await updateProjects([]);
      
      // Dispatch event to notify Controller
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: [], timestamp: new Date().toISOString() } 
      }));
      
      showMessage(`Successfully removed all ${projectCount} project(s)!`);
      
      // Reset pagination to first page
      setCurrentPage(0);
    }
  };
  
  const handleExitEditMode = () => {
    setEditMode(false);
    setEditingProject(null);
    setIsAddingProject(false);
    showMessage("Exited edit mode.");
  };

  // Handle project click to show options
  const handleProjectClick = (project) => {
    setShowProjectOptions(project);
  };

  // Handle project option selection
  const handleProjectOptionClick = (project, option) => {
    if (option === 'repo' && project.repoUrl) {
      window.open(project.repoUrl, '_blank');
    } else if (option === 'live' && project.liveUrl) {
      window.open(project.liveUrl, '_blank');
    }
    setShowProjectOptions(null);
  };

  // Close project options when clicking outside
  const handleCloseProjectOptions = () => {
    setShowProjectOptions(null);
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
  
  // Project form handlers
  const handleProjectFormChange = (e) => {
    const { name, value } = e.target;
    setProjectFormData({
      ...projectFormData,
      [name]: value
    });
  };
  
  const handleProjectFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that at least one URL is provided for new projects
    if (isAddingProject && !projectFormData.repoUrl && !projectFormData.liveUrl) {
      showMessage("Please provide at least one URL (Repository or Live Demo)");
      return;
    }
    
    if (isAddingProject) {
      // Adding a new project
      await handleAddProject(
        projectFormData.name,
        projectFormData.type,
        projectFormData.repoUrl,
        projectFormData.liveUrl,
        projectFormData.description
      );
    } else if (editingProject) {
      // Editing an existing project
      await handleEditProject(
        editingProject.id,
        projectFormData.name,
        projectFormData.type,
        projectFormData.description
      );
    }
    
    // Reset form and state
    setProjectFormData({
      name: '',
      type: '',
      repoUrl: '',
      liveUrl: '',
      description: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
    setEditingProject(null);
    setIsAddingProject(false);
  };
  
  const startEditingProject = (project) => {
    setEditingProject(project);
    setProjectFormData({
      name: project.name,
      type: project.type,
      repoUrl: project.repoUrl || '',
      liveUrl: project.liveUrl || '',
      description: project.description || '',
      dateAdded: project.dateAdded
    });
  };
  
  const startAddingProject = () => {
    setIsAddingProject(true);
    setEditingProject(null);
    setProjectFormData({
      name: '',
      type: '',
      repoUrl: '',
      liveUrl: '',
      description: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
  };
  
  const cancelProjectForm = () => {
    setEditingProject(null);
    setIsAddingProject(false);
    setProjectFormData({
      name: '',
      type: '',
      repoUrl: '',
      liveUrl: '',
      description: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
  };

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

  // WebGL error handling effect
  useEffect(() => {
    // Override WebGL context creation to handle errors gracefully
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
      if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
        try {
          const context = originalGetContext.call(this, contextType, {
            ...contextAttributes,
            antialias: false,
            alpha: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            failIfMajorPerformanceCaveat: false
          });
          
          if (context) {
            // Add error event listener to suppress GL errors
            const originalTexImage2D = context.texImage2D;
            context.texImage2D = function(...args) {
              try {
                return originalTexImage2D.apply(this, args);
              } catch (error) {
                console.warn('WebGL texImage2D error suppressed:', error);
                return null;
              }
            };
          }
          
          return context;
        } catch (error) {
          console.warn('WebGL context creation failed:', error);
          return null;
        }
      }
      return originalGetContext.call(this, contextType, contextAttributes);
    };

    // Cleanup function to restore original method
    return () => {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    };
  }, []);

  // Load projects from Firestore and set up real-time sync
  useEffect(() => {
    const loadProjectsFromFirestore = async () => {
      try {
        const data = await getProjectsData();
        if (data.projects) {
          setProjects(data.projects);
        }
      } catch (error) {
        console.error('Error loading projects from Firestore:', error);
      }
    };

    loadProjectsFromFirestore();

    // Listen for updates from Controller
    const handleProjectsUpdate = (event) => {
      const { projects: updatedProjects } = event.detail;
      setProjects(updatedProjects);
    };

    window.addEventListener('projectsDataUpdated', handleProjectsUpdate);

    
    // Load the latest Spline viewer script with enhanced error handling
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@latest/build/spline-viewer.js';
    script.onload = () => {
      // Add a small delay to ensure the script is fully loaded
      setTimeout(() => {
        const splineViewer = document.querySelector('spline-viewer');
        if (splineViewer) {
          // Add error event listener to handle WebGL errors
          splineViewer.addEventListener('error', (e) => {
            console.warn('Spline viewer error:', e.detail);
          });
          
          // Add load event listener
          splineViewer.addEventListener('load', () => {
            console.log('Spline scene loaded successfully');
          });
        }
      }, 100);
    };
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
  
  // GitHub auto-sync is now handled by the centralized sync service.
  // The local autoSyncGithubRepos logic and related effects have been removed to prevent duplicate syncs and ensure user edits are always preserved.
  
  // Function to get project icon based on type
  const getProjectIcon = (type) => {
    const size = viewMode === 'list' ? 40 : 90;
    const color = {
      web: '#00cec9',
      mobile: '#e17055',
      desktop: '#6c5ce7',
      ai: '#fd79a8',
      blockchain: '#d63031',
      default: '#0984e3'
    };

    switch (type.toLowerCase()) {
      case 'web':
        return (
          <svg width={size} height={size} viewBox="2 2 16 16" stroke={color.web} fill="none">
            <g strokeWidth="0.35">
              <path d="M15.69,4.31H4.31A1.61,1.61,0,0,0,2.7,5.92v8a1.61,1.61,0,0,0,1.61,1.61H15.69a1.61,1.61,0,0,0,1.61-1.61v-8A1.61,1.61,0,0,0,15.69,4.31ZM4.31,4.92H15.69a1,1,0,0,1,1,1v.72H3.31V5.92A1,1,0,0,1,4.31,4.92Zm11.38,10H4.31a1,1,0,0,1-1-1V7.25H16.69v6.67A1,1,0,0,1,15.69,14.92Z"/><path d="M4.31,6.18A.34.34,0,1,0,4,5.85.34.34,0,0,0,4.31,6.18Z"/><path d="M5.16,6.18a.34.34,0,1,0-.33-.33A.34.34,0,0,0,5.16,6.18Z"/><path d="M6,6.18a.34.34,0,1,0-.33-.33A.34.34,0,0,0,6,6.18Z"/><path d="M11,10.19l-.39.88-.4-.88s0,0-.07-.07,0-.06-.08-.08h0s-.07,0-.11,0a.17.17,0,0,0-.12,0h0s-.06.06-.08.08-.06,0-.08.07l-.39.88-.39-.88A.32.32,0,0,0,8.45,10a.3.3,0,0,0-.15.4L9,12a.38.38,0,0,0,.14.14h0l.12,0,.12,0h0A.38.38,0,0,0,9.53,12l.39-.89.4.89a.38.38,0,0,0,.14.14h0a.28.28,0,0,0,.13,0l.12,0h0a.38.38,0,0,0,.14-.14l.68-1.51a.31.31,0,0,0-.16-.4A.3.3,0,0,0,11,10.19Z"/><path d="M14.42,10.19l-.39.88-.4-.88s-.05,0-.07-.07,0-.06-.08-.08h0a.17.17,0,0,0-.12,0s-.07,0-.11,0h0s-.05.05-.08.08-.06,0-.07.07l-.4.88-.39-.88a.3.3,0,0,0-.4-.15.3.3,0,0,0-.16.4L12.41,12a.38.38,0,0,0,.14.14h0l.12,0a.28.28,0,0,0,.13,0h0A.38.38,0,0,0,13,12l.4-.89.39.89a.38.38,0,0,0,.14.14h0a.31.31,0,0,0,.13,0l.12,0h0a.41.41,0,0,0,.15-.14L15,10.44a.3.3,0,0,0-.16-.4A.3.3,0,0,0,14.42,10.19Z"/><path d="M7.56,10.19l-.39.88-.39-.88a.24.24,0,0,0-.08-.06A.23.23,0,0,0,6.62,10h0a.17.17,0,0,0-.12,0s-.07,0-.11,0h0l-.08.08s-.06,0-.07.07l-.4.88-.39-.88A.3.3,0,0,0,5,10a.31.31,0,0,0-.16.4L5.55,12a.38.38,0,0,0,.14.14h0l.12,0a.28.28,0,0,0,.13,0H6A.38.38,0,0,0,6.1,12l.4-.89.39.89a.38.38,0,0,0,.14.14h0l.12,0,.12,0h0A.38.38,0,0,0,7.45,12l.67-1.51A.3.3,0,0,0,8,10,.32.32,0,0,0,7.56,10.19Z"/>
            </g>
          </svg>
        );

      case 'mobile':
        return (
          <svg width={size} height={size} viewBox="0 0 32 32" stroke={color.mobile} fill="none">
            <path className="st0" d="M19,23v4c0,1.1-0.9,2-2,2H7c-1.1,0-2-0.9-2-2V5c0-1.1,0.9-2,2-2h10c1.1,0,2,0.9,2,2v2"/>
            <line className="st0" x1="5" y1="7" x2="19" y2="7"/>
            <line className="st0" x1="5" y1="23" x2="19" y2="23"/>
            <line className="st0" x1="11" y1="26" x2="13" y2="26"/>
            <polyline className="st0" points="14,12 11,15 14,18 "/>
            <polyline className="st0" points="24,12 27,15 24,18 "/>
            <line className="st0" x1="21" y1="11" x2="17" y2="19"/>
          </svg>
        );


      case 'desktop':
        return (
          <svg width={size} height={size} viewBox="0 0 512 512" stroke={color.desktop} fill={color.desktop}>
             <g id="_x32_3_x2C__art_x2C__graphic_x2C__pc_x2C__ui_ux_x2C__visual">
        <g id="XMLID_858_">
          <g id="XMLID_871_">
            <g id="XMLID_22_">
              <path d="M456.333,425.571H55.667C36.551,425.571,21,410.02,21,390.904v-30.333c0-2.762,2.239-5,5-5h460c2.762,0,5,2.238,5,5v30.333C491,410.02,475.448,425.571,456.333,425.571z M31,365.571v25.333c0,13.602,11.065,24.667,24.667,24.667h400.667c13.602,0,24.667-11.065,24.667-24.667v-25.333H31z"/>
            </g>
            <g id="XMLID_21_">
              <path d="M486,365.571H26c-2.761,0-5-2.238-5-5v-223.5c0-22.883,18.617-41.5,41.5-41.5h174.002c2.761,0,5,2.239,5,5s-2.239,5-5,5H62.5c-17.369,0-31.5,14.131-31.5,31.5v218.5h450v-218.5c0-17.369-14.131-31.5-31.5-31.5H335.497c-2.762,0-5-2.239-5-5s2.238-5,5-5H449.5c22.883,0,41.5,18.617,41.5,41.5v223.5C491,363.333,488.762,365.571,486,365.571z"/>
            </g>
            <g id="XMLID_20_">
              <path d="M177.508,214.063c-1.307,0-2.584-0.513-3.536-1.464c-1.301-1.301-1.782-3.21-1.253-4.972l21.213-70.71c0.238-0.793,0.668-1.514,1.253-2.099L311.858,18.145c7.555-7.555,17.6-11.716,28.283-11.716c10.685,0,20.729,4.161,28.284,11.716c7.556,7.555,11.717,17.6,11.717,28.284c0,10.685-4.161,20.729-11.717,28.285L251.754,191.386c-0.585,0.585-1.306,1.016-2.099,1.253l-70.71,21.213C178.472,213.995,177.988,214.063,177.508,214.063z M203.147,140.997l-18.182,60.609l60.609-18.183L361.355,67.642c5.666-5.667,8.787-13.2,8.787-21.213c0-8.013-3.121-15.547-8.787-21.213c-5.666-5.667-13.2-8.787-21.214-8.787c-8.013,0-15.547,3.121-21.213,8.787L203.147,140.997z"/>
            </g>
            <g id="XMLID_19_">
              <path d="M216.398,167.913c-5.762,0-11.523-2.193-15.91-6.579c-8.772-8.773-8.772-23.047,0-31.82c1.952-1.952,5.118-1.952,7.071,0c1.953,1.953,1.953,5.118,0,7.071c-4.874,4.874-4.874,12.804,0,17.678s12.804,4.874,17.678,0c1.954-1.952,5.119-1.951,7.071,0c1.953,1.953,1.953,5.119,0,7.071C227.922,165.72,222.16,167.913,216.398,167.913z"/>
            </g>
            <g id="XMLID_18_">
              <path d="M241.147,192.673c-6.01,0-11.66-2.341-15.91-6.59s-6.59-9.9-6.59-15.91c0-6.01,2.341-11.661,6.59-15.91l62.228-62.227c1.951-1.952,5.119-1.952,7.07,0c1.953,1.953,1.953,5.119,0,7.071l-62.227,62.227c-2.361,2.361-3.662,5.5-3.662,8.839c0,3.338,1.3,6.478,3.662,8.838c2.361,2.361,5.5,3.662,8.838,3.662c3.339,0,6.478-1.3,8.839-3.662c1.952-1.952,5.119-1.952,7.071,0c1.953,1.953,1.953,5.118,0.001,7.071C252.808,190.332,247.157,192.673,241.147,192.673z"/>
            </g>
            <g id="XMLID_17_">
              <path d="M350.749,90.32c-1.279,0-2.56-0.488-3.535-1.464l-49.498-49.498c-1.953-1.953-1.953-5.119,0-7.071c1.951-1.952,5.119-1.952,7.07,0l49.498,49.498c1.953,1.953,1.953,5.119,0,7.071C353.309,89.832,352.028,90.32,350.749,90.32z"/>
            </g>
            <g id="XMLID_16_">
              <path d="M366,315.571h-80c-16.542,0-30-13.458-30-30s13.458-30,30-30h110c11.028,0,20-8.972,20-20v-1.508c0-11.028-8.972-20-20-20H177.508c-2.761,0-5-2.239-5-5s2.239-5,5-5H396c16.542,0,30,13.458,30,30v1.508c0,16.542-13.458,30-30,30H286c-11.028,0-20,8.972-20,20s8.972,20,20,20h80c2.762,0,5,2.238,5,5S368.762,315.571,366,315.571z"/>
            </g>
            <g id="XMLID_15_">
              <path d="M176,320.571H26c-2.761,0-5-2.238-5-5s2.239-5,5-5h150c2.761,0,5,2.238,5,5S178.761,320.571,176,320.571z"/>
            </g>
            <g id="XMLID_14_">
              <path d="M176,290.571H26c-2.761,0-5-2.238-5-5s2.239-5,5-5h150c2.761,0,5,2.238,5,5S178.761,290.571,176,290.571z"/>
            </g>
            <g id="XMLID_13_">
              <path d="M176,260.571H26c-2.761,0-5-2.238-5-5c0-2.761,2.239-5,5-5h150c2.761,0,5,2.239,5,5C181,258.333,178.761,260.571,176,260.571z"/>
            </g>
          </g>
          <g id="XMLID_12_">
            <path d="M311,485.571H201c-2.761,0-5-2.238-5-5v-60c0-2.762,2.239-5,5-5h110c2.762,0,5,2.238,5,5v60C316,483.333,313.762,485.571,311,485.571z M206,475.571h100v-50H206V475.571z"/>
          </g>
          <g id="XMLID_11_">
            <path d="M286,485.571h-60c-2.761,0-5-2.238-5-5v-60c0-2.762,2.239-5,5-5h60c2.762,0,5,2.238,5,5v60C291,483.333,288.762,485.571,286,485.571z M231,475.571h50v-50h-50V475.571z"/>
          </g>
          <g id="XMLID_10_">
            <path d="M326,505.571H186c-8.271,0-15-6.729-15-15s6.729-15,15-15h140c8.271,0,15,6.729,15,15S334.271,505.571,326,505.571z M186,485.571c-2.757,0-5,2.243-5,5s2.243,5,5,5h140c2.757,0,5-2.243,5-5s-2.243-5-5-5H186z"/>
          </g>
        </g>
      </g>
          </svg>
        );

      case 'ai':
        return (
          <svg width={size} height={size} viewBox="0 0 512 512" stroke={color.ai} fill={color.ai}>
            <g>
              <g>
                <g>
                  <path d="M454.613,0H57.387C25.707,0,0,25.707,0,57.387v397.227C0,486.293,25.707,512,57.387,512h397.227
                    c31.68,0,57.387-25.707,57.387-57.387V57.387C512,25.707,486.293,0,454.613,0z M490.667,454.613
                    c0,19.947-16.107,36.053-36.053,36.053H57.387c-19.947,0-36.053-16.107-36.053-36.053V57.387
                    c0-19.947,16.107-36.053,36.053-36.053h397.227c19.947,0,36.053,16.107,36.053,36.053V454.613z"/>
                  <path d="M216,149.333l-66.667,213.333h27.627l19.947-66.133h68.267l20.587,66.133h28.267L247.68,149.333H216z M202.027,276.267
                    l18.453-59.733c3.84-13.333,7.147-27.947,10.027-41.6h0.96c2.88,13.333,6.187,27.627,10.347,41.92l18.773,59.413H202.027z"/>
                  <path d="M356.587,150.72c-9.6,0-16.747,7.253-16.747,17.067c0,9.493,6.72,16.747,16.427,16.747h0.32
                    c10.24,0,16.747-7.253,16.747-16.747C373.333,157.973,366.613,150.72,356.587,150.72z"/>
                  <rect x="343.467" y="209.067" width="26.667" height="153.6"/>
                </g>
              </g>
            </g>
          </svg>
        );

      case 'blockchain':
        return (
          <svg width={size} height={size} viewBox="0 0 102.166 102.166" stroke={color.blockchain} fill={color.blockchain}>
            <g>
              <path d="M77.5,8.75v24.666h24.666V8.75H77.5z M98.166,29.416H81.5V12.75h16.666V29.416z M77.5,93.416h24.666V68.75H77.5V93.416z
                M81.5,72.75h16.666v16.666H81.5V72.75z M0,93.416h24.666V68.75H0V93.416z M4,72.75h16.666v16.666H4V72.75z M86.583,53.434h-17.5
                h-2.25h-52v11.733h-5V48.451h2.499v-0.017h54.5h2.251h17.5V37.1h5v28.067h-5V53.434z"/>
            </g>
          </svg>
        );

      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" stroke={color.default} fill="none">
            <polyline points="8 4 3 12 8 20" strokeWidth="2"></polyline>
            <polyline points="16 4 21 12 16 20" strokeWidth="2"></polyline>
          </svg>
        );
    }
  };



  // Pagination functions
  const projectsPerPage = 2;
  const filteredProjects = getProjectsByFilter();
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const startIndex = currentPage * projectsPerPage;
  
  // For blocks view, use pagination; for list view, show all projects
  const currentProjects = viewMode === 'blocks' 
    ? filteredProjects.slice(startIndex, startIndex + projectsPerPage)
    : filteredProjects;

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  return (
    <div className="homepage">
      {/* FullScreen Prompt - Shows for mobile users */}
      <FullScreenPrompt />

      {/* LoadingOverlay - Shows for 3 seconds on Projects page load */}
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
                    // Command templates in edit mode
                    commandTemplates.map((cmd) => (
                      <div 
                        key={cmd.id} 
                        className="explorer-item command-template"
                        onClick={() => handleItemClick(cmd)}
                      >
                        <div className="item-icon">{
                          cmd.id === 'exit' ? '🚪' : 
                          cmd.id === 'add' ? '➕' : 
                          cmd.id === 'batch-add' ? '📝' :
                          cmd.id === 'edit' ? '✏️' : 
                          cmd.id === 'remove' ? '❌' : 
                          cmd.id === 'batch-remove' ? '🗂️' :
                          cmd.id === 'batch-remove-all' ? '🗑️' :
                          cmd.id === 'filter' ? '🔍' :
                          '📝'
                        }</div>
                        <div className="item-name">{cmd.id}</div>
                        <div className="item-description">{cmd.description}</div>
                      </div>
                    ))
                    :
                    // Project search results and regular items
                    <>
                      {getFilteredProjects().length > 0 && (
                        <>
                          <div className="search-section-header">
                            <span>🚀 Projects ({getFilteredProjects().length} found)</span>
                          </div>
                          {getFilteredProjects().map((project) => (
                            <div 
                              key={`project-${project.id}`} 
                              className="explorer-item project-search-result"
                              onClick={() => handleItemClick(project)}
                              title={`${project.name} - Click to view options`}
                            >
                              <div className="item-icon">
                                {project.type === 'web' ? '🌐' : 
                                 project.type === 'mobile' ? '📱' : 
                                 project.type === 'desktop' ? '🖥️' : 
                                 project.type === 'ai' ? '🤖' : 
                                 project.type === 'blockchain' ? '⛓️' : '💻'}
                              </div>
                              <div className="item-details">
                                <div className="item-name">{project.name}</div>
                                {project.description && (
                                  <div className="item-description">{project.description.substring(0, 40)}...</div>
                                )}
                                <div className="item-meta">{project.type.toUpperCase()}</div>
                              </div>
                            </div>
                          ))}
                          <div className="search-separator"></div>
                        </>
                      )}
                      {/* Regular navigation items */}
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
                    </>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Project Type Filter Links - Vertical Column */}
        <div className="social-links-container">
          {/* View Toggle Button */}
          <div className="social-link-wrapper view-toggle-wrapper">
            <button 
              className="social-link view-toggle-button"
              aria-label={`Switch to ${viewMode === 'blocks' ? 'list' : 'blocks'} view`}
              onClick={toggleViewMode}
              title={`Switch to ${viewMode === 'blocks' ? 'list' : 'blocks'} view`}
            >
              {viewMode === 'blocks' ? (
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="currentColor">
                  <path opacity="0.5" fillRule="evenodd" clipRule="evenodd" d="M2.25 6C2.25 5.58579 2.58579 5.25 3 5.25H21C21.4142 5.25 21.75 5.58579 21.75 6C21.75 6.41421 21.4142 6.75 21 6.75H3C2.58579 6.75 2.25 6.41421 2.25 6ZM2.25 10C2.25 9.58579 2.58579 9.25 3 9.25H21C21.4142 9.25 21.75 9.58579 21.75 10C21.75 10.4142 21.4142 10.75 21 10.75H3C2.58579 10.75 2.25 10.4142 2.25 10ZM2.25 14C2.25 13.5858 2.58579 13.25 3 13.25H10C10.4142 13.25 10.75 13.5858 10.75 14C10.75 14.4142 10.4142 14.75 10 14.75H3C2.58579 14.75 2.25 14.4142 2.25 14ZM2.25 18C2.25 17.5858 2.58579 17.25 3 17.25H10C10.4142 17.25 10.75 17.5858 10.75 18C10.75 18.4142 10.4142 18.75 10 18.75H3C2.58579 18.75 2.25 18.4142 2.25 18Z" fill="#1C274C"/>
                  <path d="M13.4306 14.5119C13.7001 14.1974 14.1736 14.161 14.4881 14.4306L17.5 17.0122L20.5119 14.4306C20.8264 14.161 21.2999 14.1974 21.5695 14.5119C21.839 14.8264 21.8026 15.2999 21.4881 15.5695L17.9881 18.5695C17.7072 18.8102 17.2928 18.8102 17.0119 18.5695L13.5119 15.5695C13.1974 15.2999 13.161 14.8264 13.4306 14.5119Z" fill="#1C274C"/>
                </svg>
              ) : (
                <svg viewBox="0 0 72 72" width="24" height="24" stroke="currentColor" fill="currentColor">
                  <g>
                    <g>
                      <path d="M67.5,27.568c0,3.828-3.104,6.932-6.932,6.932H10.432c-3.828,0-6.932-3.104-6.932-6.932V10.432
                        C3.5,6.604,6.604,3.5,10.432,3.5h50.137c3.828,0,6.932,3.104,6.932,6.932V27.568z M63.5,10.432c0-1.619-1.313-2.932-2.932-2.932
                        H10.432C8.813,7.5,7.5,8.813,7.5,10.432v17.137c0,1.619,1.313,2.932,2.932,2.932h50.137c1.619,0,2.932-1.313,2.932-2.932V10.432z"
                        />
                    </g>
                    <g>
                      <g>
                        <path d="M11.5,19.5c-0.553,0-1-0.447-1-1v-1.802c0-2.556,1.246-5.198,3.96-5.198h6.664c0.553,0,1,0.447,1,1s-0.447,1-1,1H14.46
                          c-1.462,0-1.96,1.626-1.96,3.198V18.5C12.5,19.053,12.052,19.5,11.5,19.5z"/>
                      </g>
                      <g>
                        <path d="M10.694,22.93c-0.26,0-0.521-0.11-0.71-0.29c-0.19-0.189-0.29-0.45-0.29-0.71s0.1-0.52,0.29-0.71
                          c0.38-0.38,1.04-0.37,1.41,0c0.189,0.19,0.3,0.45,0.3,0.71s-0.11,0.521-0.29,0.7C11.204,22.819,10.954,22.93,10.694,22.93z"/>
                      </g>
                    </g>
                    <g>
                      <path d="M46.5,61.568c0,3.828-3.104,6.932-6.932,6.932H10.432c-3.828,0-6.932-3.104-6.932-6.932V44.432
                        c0-3.828,3.104-6.932,6.932-6.932h29.137c3.828,0,6.932,3.104,6.932,6.932V61.568z M42.5,44.432c0-1.619-1.313-2.932-2.932-2.932
                        H10.432c-1.619,0-2.932,1.313-2.932,2.932v17.137c0,1.619,1.313,2.932,2.932,2.932h29.137c1.619,0,2.932-1.313,2.932-2.932V44.432
                        z"/>
                    </g>
                    <g>
                      <path d="M68.5,61.568c0,3.828-3.104,6.932-6.932,6.932h-5.137c-3.828,0-6.932-3.104-6.932-6.932V44.432
                        c0-3.828,3.104-6.932,6.932-6.932h5.137c3.828,0,6.932,3.104,6.932,6.932V61.568z M64.5,44.432c0-1.619-1.313-2.932-2.932-2.932
                        h-5.137c-1.619,0-2.932,1.313-2.932,2.932v17.137c0,1.619,1.313,2.932,2.932,2.932h5.137c1.619,0,2.932-1.313,2.932-2.932V44.432z
                        "/>
                    </g>
                  </g>
                </svg>
              )}
            </button>
          </div>
          
          {filterLinks.map((filter) => (
            <div key={filter.id} className={`social-link-wrapper ${selectedFilter === filter.type ? 'active' : ''}`}>
              <button 
                className={`social-link ${selectedFilter === filter.type ? 'active' : ''}`}
                aria-label={filter.label}
                onClick={() => handleFilterClick(filter.type)}
                title={filter.label}
              >
                {filter.icon}
              </button>
            </div>
          ))}
        </div>
        
        <div className="top-area-shade">
          <spline-viewer 
            url="https://prod.spline.design/G73ETPu1BKxE3nue/scene.splinecode"
            onError={(e) => {
              console.warn('Spline scene failed to load:', e);
              // Suppress WebGL errors by setting a fallback
              e.preventDefault();
            }}
            loading="lazy"
            style={{ 
              pointerEvents: 'none',
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)'
            }}
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

        {/* Projects Section */}
        <div className="projects-section" style={{ position: 'relative', zIndex: 10 }}>
          <div className="projects-header">
            <img src="/pic5.png" alt="My Projects" className="projects-header-image" />
          </div>
          
          {filteredProjects.length > 0 && (
            <div className="pagination-info">
              <span>Showing {currentProjects.length} of {filteredProjects.length} projects{selectedFilter !== 'all' ? ` (${selectedFilter.toUpperCase()} filter)` : ''}
                {' - '}
                <span className="view-mode-indicator">{viewMode === 'blocks' ? 'Blocks View' : 'List View'}</span>
              </span>
            </div>
          )}
          
          <div className={`projects-list ${viewMode === 'list' ? 'list-view' : 'blocks-view'}`}>
            {currentProjects.length > 0 ? (
              viewMode === 'list' ? (
                <AnimatedList
                  items={currentProjects}
                  onItemSelect={(item, index) => {
                    handleProjectClick(item);
                  }}
                  showGradients={true}
                  enableArrowNavigation={true}
                  displayScrollbar={true}
                  itemRenderer={(project, index) => (
                    <div 
                      key={project.id} 
                      className="project-item"
                      style={{ position: 'relative' }}
                    >
                      <div 
                        className="project-clickable"
                        onClick={() => handleProjectClick(project)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view options"
                      >
                        <div 
                          className="project-icon"
                          title="View project options"
                        >
                          {getProjectIcon(project.type)}
                        </div>
                        <div className="project-info">
                          <div className="project-name">
                            {project.name}
                          </div>
                          {project.description && (
                            <div className="project-description">
                              {project.description}
                            </div>
                          )}
                          <div className="project-meta">
                            <span className="project-type">{project.type}</span>
                            {project.dateAdded && <span className="project-date"> • Added {project.dateAdded}</span>}
                          </div>
                        </div>
                      </div>
                      
                      {/* Project Options Popup */}
                      {showProjectOptions && showProjectOptions.id === project.id && (
                        <div className="project-options-popup">
                          <div className="project-options-backdrop" onClick={(e) => {
                            e.stopPropagation();
                            handleCloseProjectOptions();
                          }}></div>
                          <div className="project-options-content">
                            <h4>{project.name}</h4>
                            <div className="project-options-buttons">
                              {project.repoUrl && (
                                <button 
                                  className="project-option-btn repo-btn"
                                  onClick={() => handleProjectOptionClick(project, 'repo')}
                                >
                                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                  </svg>
                                  View Repository
                                </button>
                              )}
                              {project.liveUrl && (
                                <button 
                                  className="project-option-btn live-btn"
                                  onClick={() => handleProjectOptionClick(project, 'live')}
                                >
                                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                  </svg>
                                  View Live Demo
                                </button>
                              )}
                            </div>
                            <button 
                              className="project-options-close" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseProjectOptions();
                              }}
                            >
                              <svg viewBox="0 0 384 512"><path fill="#be00ff" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <div className="project-actions">
                        {editMode ? (
                          <>
                            <button 
                              className="edit-project-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditingProject(project);
                              }}
                              title="Edit project name"
                            >
                              ✏️
                            </button>
                            <button 
                              className="remove-project-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveProject(project.id);
                              }}
                              title="Delete project"
                            >
                              🗑️
                            </button>
                          </>
                        ) : (
                          <>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                />
              ) : (
                currentProjects.map((project) => (
                  <div 
                    key={project.id} 
                    className="project-item"
                    style={{ position: 'relative' }}
                  >
                    <div 
                      className="project-clickable"
                      onClick={() => handleProjectClick(project)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view options"
                    >
                      <div 
                        className="project-icon"
                        title="View project options"
                      >
                        {getProjectIcon(project.type)}
                      </div>
                      <div className="project-info">
                        <div className="project-name">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="project-description">
                            {project.description}
                          </div>
                        )}
                        {viewMode === 'list' && (
                          <div className="project-meta">
                            <span className="project-type">{project.type}</span>
                            {project.dateAdded && <span className="project-date"> • Added {project.dateAdded}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Project Options Popup */}
                    {showProjectOptions && showProjectOptions.id === project.id && (
                      <div className="project-options-popup">
                        <div className="project-options-backdrop" onClick={(e) => {
                          e.stopPropagation();
                          handleCloseProjectOptions();
                        }}></div>
                        <div className="project-options-content">
                          <h4>{project.name}</h4>
                          <div className="project-options-buttons">
                            {project.repoUrl && (
                              <button 
                                className="project-option-btn repo-btn"
                                onClick={() => handleProjectOptionClick(project, 'repo')}
                              >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                View Repository
                              </button>
                            )}
                            {project.liveUrl && (
                              <button 
                                className="project-option-btn live-btn"
                                onClick={() => handleProjectOptionClick(project, 'live')}
                              >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                View Live Demo
                              </button>
                            )}
                          </div>
                          <button 
                            className="project-options-close" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseProjectOptions();
                            }}
                          >
                            <svg viewBox="0 0 384 512"><path fill="#be00ff" d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="project-actions">
                      {editMode ? (
                        <>
                          <button 
                            className="edit-project-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditingProject(project);
                            }}
                            title="Edit project name"
                          >
                            ✏️
                          </button>
                          <button 
                            className="remove-project-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveProject(project.id);
                            }}
                            title="Delete project"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : (
              // Show "Coming Soon" message when no projects match the filter
              <div className="empty-state">
                <div className="empty-state-icon">
                  {selectedFilter === 'all' ? '🚀' : 
                   selectedFilter === 'web' ? '🌐' : 
                   selectedFilter === 'mobile' ? '📱' : 
                   selectedFilter === 'desktop' ? '🖥️' : 
                   selectedFilter === 'ai' ? '🤖' : 
                   selectedFilter === 'blockchain' ? '⛓️' : '💻'}
                </div>
                <div className="empty-state-title">
                  {selectedFilter === 'all' ? 'Coming Soon' : `${filterLinks.find(f => f.type === selectedFilter)?.label || 'Projects'} Coming Soon`}
                </div>
                <div className="empty-state-subtitle">
                  {selectedFilter === 'all' 
                    ? 'New projects are in creation and will be available soon!' 
                    : `${filterLinks.find(f => f.type === selectedFilter)?.label || 'Projects'} are currently in development.`}
                </div>
              </div>
            )}
            
            {editMode && !isAddingProject && !editingProject && 
             (filteredProjects.length === 0 || currentPage === totalPages - 1) && (
              <div 
                className="project-item add-project-item"
                onClick={startAddingProject}
              >
                <div className="project-icon">➕</div>
                <div className="project-info">
                  <div className="project-name">Add New Project</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {viewMode === 'blocks' && filteredProjects.length > projectsPerPage && (
            <div className="pagination-controls">
              <button 
                className="pagination-btn" 
                onClick={prevPage} 
                disabled={currentPage === 0}
                title="Previous page"
              >
                ←
              </button>
              <span className="page-indicator">
                {currentPage + 1} / {totalPages}
              </span>
              <button 
                className="pagination-btn" 
                onClick={nextPage} 
                disabled={currentPage >= totalPages - 1}
                title="Next page"
              >
                →
              </button>
            </div>
          )}
          
          {/* Project Form for adding or editing */}
          {(isAddingProject || editingProject) && (
            <div className="project-form-container">
              <div className="project-form glass-panel">
                <h3>{isAddingProject ? 'Add New Project' : 'Edit Project'}</h3>
                <form onSubmit={handleProjectFormSubmit}>
                  <div className="form-group">
                    <label htmlFor="type">Project Type:</label>
                    <select
                      id="type"
                      name="type"
                      value={projectFormData.type}
                      onChange={handleProjectFormChange}
                      required
                    >
                      <option value="">Select a type...</option>
                      {allowedTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="name">Project Name:</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={projectFormData.name}
                      onChange={handleProjectFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                      id="description"
                      name="description"
                      value={projectFormData.description}
                      onChange={handleProjectFormChange}
                      placeholder="Brief description of the project..."
                      rows="3"
                    />
                  </div>
                  {isAddingProject && (
                    <>
                      <div className="form-group">
                        <label htmlFor="repoUrl">Repository URL:</label>
                        <input
                          type="text"
                          id="repoUrl"
                          name="repoUrl"
                          value={projectFormData.repoUrl}
                          onChange={handleProjectFormChange}
                          placeholder="https://github.com/username/repo"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="liveUrl">Live Demo URL:</label>
                        <input
                          type="text"
                          id="liveUrl"
                          name="liveUrl"
                          value={projectFormData.liveUrl}
                          onChange={handleProjectFormChange}
                          placeholder="https://myproject.com"
                        />
                      </div>
                      <div className="form-note">
                        <p>Note: At least one URL (Repository or Live Demo) is required.</p>
                      </div>
                    </>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="save-btn">
                      {isAddingProject ? 'Add Project' : 'Save Changes'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={cancelProjectForm}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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

export default Projects;
