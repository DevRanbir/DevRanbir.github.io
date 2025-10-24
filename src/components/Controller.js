import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css'; // Reusing Homepage.css
import './Controller.css'; // New styles for Controller component
import Lanyard from './Lanyard';
import LoadingOverlay from './LoadingOverlay';
import FullScreenPrompt from './FullScreenPrompt';

import { 
  getHomepageData, 
  updateSocialLinks, 
  updateAuthorDescription, 
  updateAuthorSkills,
  subscribeToHomepageData,
  // Document management imports
  getDocumentsData,
  updateDocuments,
  subscribeToDocumentsData,
  // Project management imports
  getProjectsData,
  updateProjects,
  subscribeToProjectsData,
  // About management imports
  getAboutData,
  updateAboutData,
  subscribeToAboutData,
  // Contacts management imports
  getContactsData,
  updateContactsDescription,
  updateSocialBubbles,
  updateLocationDetails,
  subscribeToContactsData
} from '../firebase/firestoreService';

// GitHub sync service import
import githubSyncService from '../services/githubSyncService';

const Controller = () => {
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [commandMessage, setCommandMessage] = useState('');
  const [showCommandMessage, setShowCommandMessage] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [activeSection, setActiveSection] = useState('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('🎮 Controller: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);
  
  // Homepage data sync states
  const [socialLinks, setSocialLinks] = useState([]);
  const [authorDescription, setAuthorDescription] = useState('');
  const [authorSkills, setAuthorSkills] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [newItemData, setNewItemData] = useState({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // Documents data states
  const [documents, setDocuments] = useState([]);
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentFormData, setDocumentFormData] = useState({
    name: '',
    type: '',
    url: '',
    description: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('blocks'); // 'blocks' or 'list'

  // Projects data states
  const [projects, setProjects] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFormData, setProjectFormData] = useState({
    name: '',
    type: '',
    repoUrl: '',
    liveUrl: '',
    description: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all');
  const [projectViewMode, setProjectViewMode] = useState('blocks'); // 'blocks' or 'list'
  const [draggedProject, setDraggedProject] = useState(null);

  // About data states
  const [aboutData, setAboutData] = useState({
    githubReadmeUrl: '',
    githubUsername: '',
    repositoryName: ''
  });
  const [editingAboutData, setEditingAboutData] = useState(null);
  const [aboutFormData, setAboutFormData] = useState({
    githubUsername: '',
    repositoryName: ''
  });

  // Contacts data states
  const [contactsData, setContactsData] = useState({
    description: '',
    socialBubbles: [],
    locationDetails: {
      location: '',
      responseTime: '',
      status: ''
    }
  });
  
  // Contacts Description Management
  const [contactsDescriptionManager, setContactsDescriptionManager] = useState({
    isEditing: false,
    tempDescription: ''
  });
  
  // Social Bubbles Management  
  const [socialBubblesManager, setSocialBubblesManager] = useState({
    isEditing: false,
    editingBubbleId: null,
    tempBubbles: [],
    isAddingNew: false,
    newBubbleData: {
      id: '',
      url: '',
      size: 70,
      color: '#be00ff',
      x: 50,
      y: 50
    }
  });
  
  // Location Details Management
  const [locationDetailsManager, setLocationDetailsManager] = useState({
    isEditing: false,
    tempLocationData: {
      location: '',
      responseTime: '',
      status: ''
    }
  });

  // GitHub sync service states
  const [githubSyncStatus, setGithubSyncStatus] = useState({
    isInitialized: false,
    username: 'DevRanbir',
    lastSyncTime: null,
    syncInProgress: false,
    autoSyncEnabled: false
  });
  // eslint-disable-next-line 
  const [githubServiceInfo, setGithubServiceInfo] = useState({});
  // eslint-disable-next-line 
  const [githubProjectStatus, setGithubProjectStatus] = useState([]);
  const [githubSyncResults, setGithubSyncResults] = useState([]);
  const [githubTestResults, setGithubTestResults] = useState([]);
  const [githubUsername, setGithubUsername] = useState('DevRanbir');

  // Navigation links (reusing social links design)
  const navigationLinks = [
    { 
      id: 'home', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>, 
      path: '/',
      label: 'Home'
    },
    { 
      id: 'github', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>, 
      path: '/github',
      label: 'GitHub'
    },
    { 
      id: 'documents', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>, 
      path: '/documents',
      label: 'Documents'
    },
    { 
      id: 'projects', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>, 
      path: '/projects',
      label: 'Projects'
    },
    { 
      id: 'about', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, 
      path: '/about',
      label: 'About'
    },
    { 
      id: 'contacts', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>, 
      path: '/contacts',
      label: 'Contacts'
    },
  ];

  const handleNavigationClick = (link) => {
    setActiveSection(link.id);
    showMessage(`Switched to ${link.label} section`);
  };

  // Authentication
  const validatePassword = (e) => {
    if (e) e.preventDefault();
    const correctPassword = 'controller123'; // Admin password
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      showMessage("Controller mode activated. Welcome, Admin!");
    } else {
      setPasswordError('Invalid controller password. Access denied.');
    }
  };

  // Show message function
  const showMessage = (message) => {
    setCommandMessage(message);
    setShowCommandMessage(true);
    setTimeout(() => {
      setShowCommandMessage(false);
    }, 4000);
  };

  // Load Homepage data from Firestore
  const loadHomepageData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getHomepageData();
      
      if (data.socialLinks) {
        const reconstructedLinks = data.socialLinks.map(link => ({
          ...link,
          icon: getDefaultIcon(link.id)
        }));
        setSocialLinks(reconstructedLinks);
      }
      
      if (data.authorDescription) {
        setAuthorDescription(data.authorDescription);
      }
      
      if (data.authorSkills) {
        setAuthorSkills(data.authorSkills);
      }
      
      showMessage('Data loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading homepage data:', error);
      setError('Failed to load data from Firestore');
      showMessage('Error loading data from Firestore');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save data to Firestore and dispatch event
  const saveToFirestore = async (updateFunction, data, successMessage) => {
    try {
      setLoading(true);
      await updateFunction(data);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('homepageDataUpdated', { 
        detail: { data, timestamp: new Date().toISOString() } 
      }));
      
      showMessage(successMessage);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      setError('Failed to save data to Firestore');
      showMessage('Error saving data to Firestore');
    } finally {
      setLoading(false);
    }
  };

  // Handle social link editing
  const handleEditSocialLink = (link) => {
    setEditingItem(`social-${link.id}`);
    setEditFormData({
      name: link.id,
      url: link.url
    });
  };

  const handleSaveSocialLink = async () => {
    const updatedLinks = socialLinks.map(link => 
      link.id === editingItem.replace('social-', '') 
        ? { ...link, id: editFormData.name, url: editFormData.url, icon: getDefaultIcon(editFormData.name) }
        : link
    );
    setSocialLinks(updatedLinks);
    await saveToFirestore(updateSocialLinks, updatedLinks, 'Social link updated successfully!');
    setEditingItem(null);
  };

  const handleDeleteSocialLink = async (linkId) => {
    if (window.confirm('Are you sure you want to delete this social link?')) {
      const updatedLinks = socialLinks.filter(link => link.id !== linkId);
      setSocialLinks(updatedLinks);
      await saveToFirestore(updateSocialLinks, updatedLinks, 'Social link deleted successfully!');
    }
  };

  // Handle author description editing
  const handleEditAuthorDescription = () => {
    setEditingItem('author-description');
    setEditFormData({ description: authorDescription });
  };

  const handleSaveAuthorDescription = async () => {
    setAuthorDescription(editFormData.description);
    await saveToFirestore(updateAuthorDescription, editFormData.description, 'Author description updated successfully!');
    setEditingItem(null);
  };

  // Handle skills editing
  const handleEditSkill = (skill, index) => {
    setEditingItem(`skill-${index}`);
    setEditFormData({ skill });
  };

  const handleSaveSkill = async (index) => {
    const updatedSkills = [...authorSkills];
    updatedSkills[index] = editFormData.skill;
    setAuthorSkills(updatedSkills);
    await saveToFirestore(updateAuthorSkills, updatedSkills, 'Skill updated successfully!');
    setEditingItem(null);
  };

  const handleDeleteSkill = async (index) => {
    if (window.confirm('Are you sure you want to delete this skill?')) {
      const updatedSkills = authorSkills.filter((_, i) => i !== index);
      setAuthorSkills(updatedSkills);
      await saveToFirestore(updateAuthorSkills, updatedSkills, 'Skill deleted successfully!');
    }
  };

  const handleAddNewSkill = async () => {
    if (newItemData.skill && newItemData.skill.trim()) {
      const updatedSkills = [...authorSkills, newItemData.skill.trim()];
      setAuthorSkills(updatedSkills);
      await saveToFirestore(updateAuthorSkills, updatedSkills, 'New skill added successfully!');
      setNewItemData({});
      setIsAddingNew(false);
    }
  };

  const handleAddNewSocialLink = async () => {
    if (newItemData.name && newItemData.url && newItemData.name.trim() && newItemData.url.trim()) {
      const newLink = {
        id: newItemData.name.trim().toLowerCase(),
        url: newItemData.url.trim(),
        icon: getDefaultIcon(newItemData.name.trim())
      };
      const updatedLinks = [...socialLinks, newLink];
      setSocialLinks(updatedLinks);
      await saveToFirestore(updateSocialLinks, updatedLinks, 'New social link added successfully!');
      setNewItemData({});
      setIsAddingNew(false);
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

  // Function to convert Google Drive URLs to preview URLs
  const convertToPreviewUrl = (url) => {
    // Check if it's a Google Drive sharing URL
    const gdriveLinkRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/view/;
    const match = url.match(gdriveLinkRegex);
    
    if (match && match[1]) {
      // Extract the file ID and convert to preview URL
      const fileId = match[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    
    // Return the original URL if it's not a Google Drive URL
    return url;
  };

  // Document management functions
  const loadDocumentsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getDocumentsData();
      
      if (data.documents) {
        setDocuments(data.documents);
      }
      
      showMessage('Documents loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading documents data:', error);
      setError('Failed to load documents from Firestore');
      showMessage('Error loading documents from Firestore');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter documents by type
  const getDocumentsByFilter = () => {
    if (selectedFilter === 'all') {
      return documents;
    }
    return documents.filter(doc => doc.type === selectedFilter);
  };
  
  // Handle filter selection
  const handleFilterClick = (filterType) => {
    setSelectedFilter(filterType);
    
    // Show feedback message
    const filterLabel = documentFilterLinks.find(f => f.type === filterType)?.label || 'All Documents';
    const filteredCount = filterType === 'all' ? documents.length : documents.filter(d => d.type === filterType).length;
    showMessage(`Showing ${filteredCount} ${filterLabel.toLowerCase()}`);
  };

  // Toggle view mode (blocks or list)
  const toggleViewMode = () => {
    const newViewMode = viewMode === 'blocks' ? 'list' : 'blocks';
    setViewMode(newViewMode);
    showMessage(`Switched to ${newViewMode} view`);
  };

  // Get document icon based on type
  const getDocumentTypeIcon = (type) => {
    const docType = allowedDocTypes.find(t => t.value === type);
    return docType ? docType.icon : '📄';
  };

  // Handle document editing
  const handleEditDocument = (document) => {
    setEditingDocument(document);
    setDocumentFormData({
      name: document.name,
      type: document.type,
      url: document.url,
      description: document.description || '',
      dateAdded: document.dateAdded
    });
  };

  // Save edited document
  const handleSaveDocument = async () => {
    try {
      setLoading(true);
      
      const updatedDocuments = [...documents];
      const index = updatedDocuments.findIndex(doc => doc.id === editingDocument.id);
      
      if (index !== -1) {
        // Ensure URL has proper protocol
        const validUrl = ensureValidUrl(documentFormData.url);
        // Convert Google Drive URLs to preview URLs
        const previewUrl = convertToPreviewUrl(validUrl);
        
        updatedDocuments[index] = {
          ...updatedDocuments[index],
          name: documentFormData.name,
          type: documentFormData.type,
          url: validUrl,
          previewUrl: previewUrl,
          description: documentFormData.description
        };
        
        setDocuments(updatedDocuments);
        await updateDocuments(updatedDocuments);
        showMessage(`Document "${documentFormData.name}" updated successfully!`);
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setError('Failed to update document');
      showMessage('Error updating document');
    } finally {
      setLoading(false);
      setEditingDocument(null);
    }
  };

  // Add new document
  const handleAddDocument = async () => {
    try {
      if (!documentFormData.name || !documentFormData.type || !documentFormData.url) {
        showMessage('Please fill in all required fields (name, type, URL)');
        return;
      }
      
      setLoading(true);
      
      // Ensure URL has proper protocol
      const validUrl = ensureValidUrl(documentFormData.url);
      // Convert Google Drive URLs to preview URLs
      const previewUrl = convertToPreviewUrl(validUrl);
      
      const newId = documents.length > 0 ? Math.max(...documents.map(doc => doc.id)) + 1 : 1;
      
      const newDocument = {
        id: newId,
        name: documentFormData.name,
        type: documentFormData.type,
        url: validUrl,
        previewUrl: previewUrl,
        description: documentFormData.description || '',
        dateAdded: new Date().toISOString().split('T')[0]
      };
      
      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      await updateDocuments(updatedDocuments);
      showMessage(`Document "${documentFormData.name}" added successfully!`);
      
      // Reset form
      setDocumentFormData({
        name: '',
        type: '',
        url: '',
        description: '',
        dateAdded: new Date().toISOString().split('T')[0]
      });
      
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error adding document:', error);
      setError('Failed to add document');
      showMessage('Error adding document');
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (id) => {
    try {
      const documentToDelete = documents.find(doc => doc.id === id);
      
      if (!documentToDelete) {
        showMessage('Document not found');
        return;
      }
      
      if (window.confirm(`Are you sure you want to delete "${documentToDelete.name}"?`)) {
        setLoading(true);
        
        const updatedDocuments = documents.filter(doc => doc.id !== id);
        setDocuments(updatedDocuments);
        await updateDocuments(updatedDocuments);
        showMessage(`Document "${documentToDelete.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
      showMessage('Error deleting document');
    } finally {
      setLoading(false);
    }
  };

  // Reorder projects functions
  const handleDragStart = (e, project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
  };

  const handleDrop = async (e, targetProject) => {
    e.preventDefault();
    
    if (!draggedProject || draggedProject.id === targetProject.id) {
      return;
    }

    const filteredProjects = getProjectsByFilter();
    const draggedIndex = filteredProjects.findIndex(p => p.id === draggedProject.id);
    const targetIndex = filteredProjects.findIndex(p => p.id === targetProject.id);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new projects array with reordered items
    const newProjects = [...projects];
    const draggedProjectIndex = newProjects.findIndex(p => p.id === draggedProject.id);
    const targetProjectIndex = newProjects.findIndex(p => p.id === targetProject.id);
    
    // Remove dragged project and insert at target position
    const [removed] = newProjects.splice(draggedProjectIndex, 1);
    newProjects.splice(targetProjectIndex, 0, removed);

    try {
      setLoading(true);
      setProjects(newProjects);
      await updateProjects(newProjects);
      
      // Dispatch event to notify Projects.js
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: newProjects, timestamp: new Date().toISOString() } 
      }));
      
      showMessage('Project order updated successfully!');
    } catch (error) {
      console.error('Error reordering projects:', error);
      showMessage('Error reordering projects');
      // Revert changes on error
      setProjects(projects);
    } finally {
      setLoading(false);
      setDraggedProject(null);
    }
  };

  // Default icon function
  const getDefaultIcon = (name) => {
    const iconName = name.toLowerCase();
    if (iconName.includes('github')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>;
    } else if (iconName.includes('linkedin')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>;
    } else if (iconName.includes('twitter')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>;
    } else if (iconName.includes('instagram')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>;
    } else if (iconName.includes('mail')) {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
    } else {
      return <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
    }
  };

  // Project management functions
  const loadProjectsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getProjectsData();
      
      if (data.projects) {
        setProjects(data.projects);
      }
      
      showMessage('Projects loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading projects data:', error);
      setError('Failed to load projects from Firestore');
      showMessage('Error loading projects from Firestore');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter projects by type
  const getProjectsByFilter = () => {
    if (selectedProjectFilter === 'all') {
      return projects;
    }
    return projects.filter(project => project.type === selectedProjectFilter);
  };
  
  // Handle project filter selection
  const handleProjectFilterClick = (filterType) => {
    setSelectedProjectFilter(filterType);
    
    // Show feedback message
    const filterLabel = projectFilterLinks.find(f => f.type === filterType)?.label || 'All Projects';
    const filteredCount = filterType === 'all' ? projects.length : projects.filter(p => p.type === filterType).length;
    showMessage(`Showing ${filteredCount} ${filterLabel.toLowerCase()}`);
  };

  // Toggle project view mode (blocks or list)
  const toggleProjectViewMode = () => {
    const newViewMode = projectViewMode === 'blocks' ? 'list' : 'blocks';
    setProjectViewMode(newViewMode);
    showMessage(`Switched to ${newViewMode} view for projects`);
  };

  // Get project icon based on type
  const getProjectTypeIcon = (type) => {
    const projectType = allowedProjectTypes.find(t => t.value === type);
    return projectType ? projectType.icon : '💻';
  };

  // Handle project editing
  const handleEditProject = (project) => {
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

  // Save edited project
  const handleSaveProject = async () => {
    try {
      setLoading(true);
      
      const updatedProjects = [...projects];
      const index = updatedProjects.findIndex(project => project.id === editingProject.id);
      
      if (index !== -1) {
        // Ensure URLs have proper protocol
        const validRepoUrl = projectFormData.repoUrl ? ensureValidUrl(projectFormData.repoUrl) : '';
        const validLiveUrl = projectFormData.liveUrl ? ensureValidUrl(projectFormData.liveUrl) : '';
        
        updatedProjects[index] = {
          ...updatedProjects[index],
          name: projectFormData.name,
          type: projectFormData.type,
          repoUrl: validRepoUrl,
          liveUrl: validLiveUrl,
          description: projectFormData.description
        };
        
        setProjects(updatedProjects);
        await updateProjects(updatedProjects);
        
        // Dispatch event to notify Projects.js
        window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
          detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
        }));
        
        showMessage(`Project "${projectFormData.name}" updated successfully!`);
      }
    } catch (error) {
      console.error('Error updating project:', error);
      setError('Failed to update project');
      showMessage('Error updating project');
    } finally {
      setLoading(false);
      setEditingProject(null);
    }
  };

  // Add new project
  const handleAddProject = async () => {
    try {
      if (!projectFormData.name || !projectFormData.type) {
        showMessage('Please fill in all required fields (name and type)');
        return;
      }
      
      if (!projectFormData.repoUrl && !projectFormData.liveUrl) {
        showMessage('Please provide at least one URL (Repository or Live Demo)');
        return;
      }
      
      setLoading(true);
      
      // Ensure URLs have proper protocol
      const validRepoUrl = projectFormData.repoUrl ? ensureValidUrl(projectFormData.repoUrl) : '';
      const validLiveUrl = projectFormData.liveUrl ? ensureValidUrl(projectFormData.liveUrl) : '';
      
      const newId = projects.length > 0 ? Math.max(...projects.map(proj => proj.id)) + 1 : 1;
      
      const newProject = {
        id: newId,
        name: projectFormData.name,
        type: projectFormData.type,
        repoUrl: validRepoUrl,
        liveUrl: validLiveUrl,
        description: projectFormData.description || '',
        dateAdded: new Date().toISOString().split('T')[0]
      };
      
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      await updateProjects(updatedProjects);
      
      // Dispatch event to notify Projects.js
      window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
        detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
      }));
      
      showMessage(`Project "${projectFormData.name}" added successfully!`);
      
      // Reset form
      setProjectFormData({
        name: '',
        type: '',
        repoUrl: '',
        liveUrl: '',
        description: '',
        dateAdded: new Date().toISOString().split('T')[0]
      });
      
      setIsAddingNew(false);
    } catch (error) {
      console.error('Error adding project:', error);
      setError('Failed to add project');
      showMessage('Error adding project');
    } finally {
      setLoading(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (id) => {
    try {
      const projectToDelete = projects.find(project => project.id === id);
      
      if (!projectToDelete) {
        showMessage('Project not found');
        return;
      }
      
      if (window.confirm(`Are you sure you want to delete "${projectToDelete.name}"?`)) {
        setLoading(true);
        
        const updatedProjects = projects.filter(project => project.id !== id);
        setProjects(updatedProjects);
        await updateProjects(updatedProjects);
        
        // Dispatch event to notify Projects.js
        window.dispatchEvent(new CustomEvent('projectsDataUpdated', { 
          detail: { projects: updatedProjects, timestamp: new Date().toISOString() } 
        }));
        
        showMessage(`Project "${projectToDelete.name}" deleted successfully!`);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Failed to delete project');
      showMessage('Error deleting project');
    } finally {
      setLoading(false);
    }
  };

  // === ABOUT DATA MANAGEMENT ===
  
  // Load About data from Firestore
  const loadAboutData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getAboutData();
      setAboutData(data);
      
      showMessage('About data loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading about data:', error);
      setError('Failed to load about data from Firestore');
      showMessage('Error loading about data from Firestore');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate README URL from form data
  const generateReadmeUrl = () => {
    if (aboutFormData.githubUsername && aboutFormData.repositoryName) {
      return `https://api.github.com/repos/${aboutFormData.githubUsername}/${aboutFormData.repositoryName}/readme`;
    }
    return '';
  };

  // Handle editing about data
  const handleEditAboutData = () => {
    setEditingAboutData(true);
    setAboutFormData({
      githubUsername: aboutData.githubUsername || '',
      repositoryName: aboutData.repositoryName || ''
    });
  };

  // Handle saving about data
  const handleSaveAboutData = async () => {
    try {
      setLoading(true);
      const updatedData = {
        ...aboutData,
        githubUsername: aboutFormData.githubUsername,
        repositoryName: aboutFormData.repositoryName,
        githubReadmeUrl: generateReadmeUrl()
      };
      
      await updateAboutData(updatedData);
      setAboutData(updatedData);
      setEditingAboutData(false);
      showMessage('About data saved successfully!');
    } catch (error) {
      console.error('Error saving about data:', error);
      setError('Failed to save about data');
      showMessage('Error saving about data');
    } finally {
      setLoading(false);
    }
  };

  // === CONTACTS DATA MANAGEMENT ===
  
  // Load Contacts data from Firestore
  const loadContactsData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await getContactsData();
      setContactsData(data);
      
      showMessage('Contacts data loaded from Firestore successfully!');
    } catch (error) {
      console.error('Error loading contacts data:', error);
      setError('Failed to load contacts data from Firestore');
      showMessage('Error loading contacts data from Firestore');
    } finally {
      setLoading(false);
    }
  }, []);

  // === CONTACTS DESCRIPTION MANAGEMENT ===
  
  const contactsDescriptionManagementComponent = {
    startEditing: () => {
      setContactsDescriptionManager({
        isEditing: true,
        tempDescription: contactsData.description
      });
    },
    
    cancelEditing: () => {
      setContactsDescriptionManager({
        isEditing: false,
        tempDescription: ''
      });
    },
    
    updateTempDescription: (description) => {
      setContactsDescriptionManager(prev => ({
        ...prev,
        tempDescription: description
      }));
    },
    
    saveDescription: async () => {
      try {
        setLoading(true);
        await updateContactsDescription(contactsDescriptionManager.tempDescription);
        setContactsData(prev => ({
          ...prev,
          description: contactsDescriptionManager.tempDescription
        }));
        setContactsDescriptionManager({
          isEditing: false,
          tempDescription: ''
        });
        showMessage('Contacts description updated successfully!');
      } catch (error) {
        console.error('Error updating contacts description:', error);
        setError('Failed to update contacts description');
        showMessage('Error updating contacts description');
      } finally {
        setLoading(false);
      }
    }
  };

  // === SOCIAL BUBBLES MANAGEMENT ===
  
  const socialBubblesManagementComponent = {
    startEditing: () => {
      setSocialBubblesManager({
        isEditing: true,
        editingBubbleId: null,
        tempBubbles: [...contactsData.socialBubbles],
        isAddingNew: false,
        newBubbleData: {
          id: '',
          url: '',
          size: 70,
          color: '#be00ff',
          x: 50,
          y: 50
        }
      });
    },
    
    cancelEditing: () => {
      setSocialBubblesManager({
        isEditing: false,
        editingBubbleId: null,
        tempBubbles: [],
        isAddingNew: false,
        newBubbleData: {
          id: '',
          url: '',
          size: 70,
          color: '#be00ff',
          x: 50,
          y: 50
        }
      });
    },
    
    startEditingBubble: (bubbleId) => {
      setSocialBubblesManager(prev => ({
        ...prev,
        editingBubbleId: bubbleId
      }));
    },
    
    updateTempBubble: (bubbleId, field, value) => {
      setSocialBubblesManager(prev => ({
        ...prev,
        tempBubbles: prev.tempBubbles.map(bubble =>
          bubble.id === bubbleId ? { ...bubble, [field]: value } : bubble
        )
      }));
    },
    
    startAddingNew: () => {
      setSocialBubblesManager(prev => ({
        ...prev,
        isAddingNew: true,
        newBubbleData: {
          id: '',
          url: '',
          size: 70,
          color: '#be00ff',
          x: 50,
          y: 50
        }
      }));
    },
    
    updateNewBubbleData: (field, value) => {
      setSocialBubblesManager(prev => ({
        ...prev,
        newBubbleData: { ...prev.newBubbleData, [field]: value }
      }));
    },
    
    addNewBubble: () => {
      const newBubble = { ...socialBubblesManager.newBubbleData };
      setSocialBubblesManager(prev => ({
        ...prev,
        tempBubbles: [...prev.tempBubbles, newBubble],
        isAddingNew: false,
        newBubbleData: {
          id: '',
          url: '',
          size: 70,
          color: '#be00ff',
          x: 50,
          y: 50
        }
      }));
    },
    
    deleteBubble: (bubbleId) => {
      setSocialBubblesManager(prev => ({
        ...prev,
        tempBubbles: prev.tempBubbles.filter(bubble => bubble.id !== bubbleId)
      }));
    },
    
    saveBubbles: async () => {
      try {
        setLoading(true);
        await updateSocialBubbles(socialBubblesManager.tempBubbles);
        setContactsData(prev => ({
          ...prev,
          socialBubbles: socialBubblesManager.tempBubbles
        }));
        setSocialBubblesManager({
          isEditing: false,
          editingBubbleId: null,
          tempBubbles: [],
          isAddingNew: false,
          newBubbleData: {
            id: '',
            url: '',
            size: 70,
            color: '#be00ff',
            x: 50,
            y: 50
          }
        });
        showMessage('Social bubbles updated successfully!');
      } catch (error) {
        console.error('Error updating social bubbles:', error);
        setError('Failed to update social bubbles');
        showMessage('Error updating social bubbles');
      } finally {
        setLoading(false);
      }
    }
  };

  // === LOCATION DETAILS MANAGEMENT ===
  
  const locationDetailsManagementComponent = {
    startEditing: () => {
      setLocationDetailsManager({
        isEditing: true,
        tempLocationData: { ...contactsData.locationDetails }
      });
    },
    
    cancelEditing: () => {
      setLocationDetailsManager({
        isEditing: false,
        tempLocationData: {
          location: '',
          responseTime: '',
          status: ''
        }
      });
    },
    
    updateTempLocationField: (field, value) => {
      setLocationDetailsManager(prev => ({
        ...prev,
        tempLocationData: { ...prev.tempLocationData, [field]: value }
      }));
    },
    
    saveLocationDetails: async () => {
      try {
        setLoading(true);
        await updateLocationDetails(locationDetailsManager.tempLocationData);
        setContactsData(prev => ({
          ...prev,
          locationDetails: locationDetailsManager.tempLocationData
        }));
        setLocationDetailsManager({
          isEditing: false,
          tempLocationData: {
            location: '',
            responseTime: '',
            status: ''
          }
        });
        showMessage('Location details updated successfully!');
      } catch (error) {
        console.error('Error updating location details:', error);
        setError('Failed to update location details');
        showMessage('Error updating location details');
      } finally {
        setLoading(false);
      }
    }
  };

  // === GITHUB SYNC SERVICE MANAGEMENT ===
  
  // Create refreshStatus function separately to avoid circular dependencies
  const refreshGithubStatus = useCallback(async () => {
    try {
      const [status, serviceInfo, projectStatus] = await Promise.all([
        githubSyncService.getSyncStatus(),
        githubSyncService.getServiceInfo(),
        githubSyncService.getProjectStatus()
      ]);
      
      setGithubSyncStatus(prev => ({
        ...prev,
        ...status,
        lastSyncTime: serviceInfo.lastSyncTime
      }));
      setGithubServiceInfo(serviceInfo);
      setGithubProjectStatus(projectStatus);
    } catch (error) {
      console.error('Error refreshing GitHub status:', error);
      setError(`Failed to refresh status: ${error.message}`);
    }
  }, []);
  
  const githubSyncManagementComponent = {
    // Initialize GitHub sync service
    initialize: async () => {
      try {
        setLoading(true);
        const result = await githubSyncService.initialize(githubUsername, true);
        if (result.success) {
          setGithubSyncStatus(prev => ({ ...prev, isInitialized: true }));
          showMessage('GitHub sync service initialized successfully!');
          await refreshGithubStatus();
        } else {
          throw new Error(result.error || 'Failed to initialize');
        }
      } catch (error) {
        console.error('Error initializing GitHub sync:', error);
        setError(`Failed to initialize GitHub sync: ${error.message}`);
        showMessage('Error initializing GitHub sync service');
      } finally {
        setLoading(false);
      }
    },

    // Start auto sync
    startAutoSync: async () => {
      try {
        setLoading(true);
        const result = await githubSyncService.startAutoSync(githubUsername);
        if (result.success) {
          setGithubSyncStatus(prev => ({ ...prev, autoSyncEnabled: true }));
          showMessage('Auto sync started successfully!');
        } else {
          throw new Error(result.error || 'Failed to start auto sync');
        }
      } catch (error) {
        console.error('Error starting auto sync:', error);
        setError(`Failed to start auto sync: ${error.message}`);
        showMessage('Error starting auto sync');
      } finally {
        setLoading(false);
      }
    },

    // Stop auto sync
    stopAutoSync: async () => {
      try {
        setLoading(true);
        const result = await githubSyncService.stopAutoSync();
        if (result.success) {
          setGithubSyncStatus(prev => ({ ...prev, autoSyncEnabled: false }));
          showMessage('Auto sync stopped successfully!');
        } else {
          throw new Error(result.error || 'Failed to stop auto sync');
        }
      } catch (error) {
        console.error('Error stopping auto sync:', error);
        setError(`Failed to stop auto sync: ${error.message}`);
        showMessage('Error stopping auto sync');
      } finally {
        setLoading(false);
      }
    },

    // Manual sync
    manualSync: async () => {
      try {
        setLoading(true);
        setGithubSyncResults([]);
        const result = await githubSyncService.manualSync();
        setGithubSyncResults([{ 
          timestamp: new Date().toISOString(),
          action: 'Manual Sync',
          result: result.success ? 'Success' : 'Failed',
          details: result.message || result.error || 'Manual sync completed'
        }]);
        if (result.success) {
          showMessage('Manual sync completed successfully!');
          await refreshGithubStatus();
        } else {
          throw new Error(result.error || 'Manual sync failed');
        }
      } catch (error) {
        console.error('Error during manual sync:', error);
        setError(`Manual sync failed: ${error.message}`);
        setGithubSyncResults(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action: 'Manual Sync',
          result: 'Error',
          details: error.message
        }]);
        showMessage('Error during manual sync');
      } finally {
        setLoading(false);
      }
    },

    // Get sync status
    refreshStatus: refreshGithubStatus,

    // Run tests
    runTests: async () => {
      try {
        setLoading(true);
        setGithubTestResults([]);
        const results = await githubSyncService.runTests();
        setGithubTestResults(results);
        showMessage('GitHub sync tests completed!');
      } catch (error) {
        console.error('Error running tests:', error);
        setError(`Tests failed: ${error.message}`);
        setGithubTestResults([{
          test: 'Test Suite',
          status: 'error',
          message: error.message
        }]);
        showMessage('Error running GitHub sync tests');
      } finally {
        setLoading(false);
      }
    },

    // Force sync project
    forceSyncProject: async (projectId) => {
      try {
        setLoading(true);
        const result = await githubSyncService.forceSyncProject(projectId);
        if (result.success) {
          showMessage(`Project ${projectId} synced successfully!`);
          await refreshGithubStatus();
        } else {
          throw new Error(result.error || 'Force sync failed');
        }
      } catch (error) {
        console.error('Error force syncing project:', error);
        setError(`Force sync failed: ${error.message}`);
        showMessage('Error force syncing project');
      } finally {
        setLoading(false);
      }
    },

    // Remove project
    removeProject: async (projectId) => {
      try {
        setLoading(true);
        const result = await githubSyncService.removeProject(projectId);
        if (result.success) {
          showMessage(`Project ${projectId} removed successfully!`);
          await refreshGithubStatus();
        } else {
          throw new Error(result.error || 'Remove project failed');
        }
      } catch (error) {
        console.error('Error removing project:', error);
        setError(`Remove project failed: ${error.message}`);
        showMessage('Error removing project');
      } finally {
        setLoading(false);
      }
    },

    // Reset user edits
    resetUserEdits: async () => {
      try {
        setLoading(true);
        const result = await githubSyncService.resetUserEdits();
        if (result.success) {
          showMessage('User edit flags reset successfully!');
          await refreshGithubStatus();
        } else {
          throw new Error(result.error || 'Reset failed');
        }
      } catch (error) {
        console.error('Error resetting user edits:', error);
        setError(`Reset failed: ${error.message}`);
        showMessage('Error resetting user edits');
      } finally {
        setLoading(false);
      }
    },

    // Update username
    updateUsername: (newUsername) => {
      setGithubUsername(newUsername);
      githubSyncService.updateConfig({ username: newUsername });
      showMessage(`GitHub username updated to: ${newUsername}`);
    }
  };

  // Render content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="section-content home-management">
            <div className="home-header">
              <img src="/pic11.png" alt="Home Management" className="section-header-image2" />
              <p>Manage all homepage content from here</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* Author Description Section */}
            <div className="management-section">
              <h3>📝 Author Description</h3>
              <div className="author-description-manager">
                {editingItem === 'author-description' ? (
                  <div className="edit-form">
                    <textarea
                      value={editFormData.description}
                      onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                      className="edit-textarea"
                      rows="4"
                      placeholder="Enter author description..."
                    />
                    <div className="edit-actions">
                      <button onClick={handleSaveAuthorDescription} className="save-btn">Save</button>
                      <button onClick={() => setEditingItem(null)} className="cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="display-content">
                    <p className="content-text">{authorDescription}</p>
                    <button onClick={handleEditAuthorDescription} className="edit-btn">Edit</button>
                  </div>
                )}
              </div>
            </div>

            {/* Skills Section */}
            <div className="management-section">
              <h3>🎯 Skills & Technologies</h3>
              <div className="skills-manager">
                <div className="skills-grid">
                  {authorSkills.map((skill, index) => (
                    <div key={index} className="skill-item">
                      {editingItem === `skill-${index}` ? (
                        <div className="edit-form inline">
                          <input
                            type="text"
                            value={editFormData.skill}
                            onChange={(e) => setEditFormData({...editFormData, skill: e.target.value})}
                            className="edit-input"
                          />
                          <div className="edit-actions">
                            <button onClick={() => handleSaveSkill(index)} className="save-btn">✓</button>
                            <button onClick={() => setEditingItem(null)} className="cancel-btn">✕</button>
                          </div>
                        </div>
                      ) : (
                        <div className="skill-display">
                          <span className="skill-name">{skill}</span>
                          <div className="skill-actions">
                            <button onClick={() => handleEditSkill(skill, index)} className="edit-btn">✏️</button>
                            <button onClick={() => handleDeleteSkill(index)} className="delete-btn">🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Add New Skill */}
                  <div className="skill-item add-new">
                    {isAddingNew === 'skill' ? (
                      <div className="edit-form inline">
                        <input
                          type="text"
                          value={newItemData.skill || ''}
                          onChange={(e) => setNewItemData({...newItemData, skill: e.target.value})}
                          className="edit-input"
                          placeholder="Enter new skill..."
                        />
                        <div className="edit-actions">
                          <button onClick={handleAddNewSkill} className="save-btn">✓</button>
                          <button onClick={() => setIsAddingNew(false)} className="cancel-btn">✕</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setIsAddingNew('skill')} className="add-btn">+ Add Skill</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links Section */}
            <div className="management-section">
              <h3>🔗 Social Links</h3>
              <div className="social-links-manager">
                {socialLinks.map((link, index) => (
                  <div key={link.id} className="social-item">
                    {editingItem === `social-${link.id}` ? (
                      <div className="edit-form">
                        <div className="form-group">
                          <label>Name:</label>
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            className="edit-input"
                          />
                        </div>
                        <div className="form-group">
                          <label>URL:</label>
                          <input
                            type="url"
                            value={editFormData.url}
                            onChange={(e) => setEditFormData({...editFormData, url: e.target.value})}
                            className="edit-input"
                          />
                        </div>
                        <div className="edit-actions">
                          <button onClick={handleSaveSocialLink} className="save-btn">Save</button>
                          <button onClick={() => setEditingItem(null)} className="cancel-btn">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="social-display">
                        <div className="social-info">
                          <div className="social-icon">{link.icon}</div>
                          <div className="social-details">
                            <span className="social-name">{link.id}</span>
                            <span className="social-url">{link.url}</span>
                          </div>
                        </div>
                        <div className="social-actions">
                          <button onClick={() => handleEditSocialLink(link)} className="edit-btn">✏️</button>
                          <button onClick={() => handleDeleteSocialLink(link.id)} className="delete-btn">🗑️</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add New Social Link */}
                <div className="social-item add-new">
                  {isAddingNew === 'social' ? (
                    <div className="edit-form">
                      <div className="form-group">
                        <label>Name:</label>
                        <input
                          type="text"
                          value={newItemData.name || ''}
                          onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                          className="edit-input"
                          placeholder="e.g., github, linkedin, twitter"
                        />
                      </div>
                      <div className="form-group">
                        <label>URL:</label>
                        <input
                          type="url"
                          value={newItemData.url || ''}
                          onChange={(e) => setNewItemData({...newItemData, url: e.target.value})}
                          className="edit-input"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="edit-actions">
                        <button onClick={handleAddNewSocialLink} className="save-btn">Add</button>
                        <button onClick={() => setIsAddingNew(false)} className="cancel-btn">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingNew('social')} className="add-btn">+ Add Social Link</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'documents':
        return (
          <div className="section-content doc-management">
            <div className="doc-header">
              <img src="/pic12.png" alt="Documents Management" className="section-header-image2" />
              <p>Manage all documents from here - add, edit, or remove documents.</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* Filter and View Controls */}
            <div className="doc-controls-section">
              <div className="doc-filters">
                <h3>📑 Filter Documents</h3>
                <div className="doc-filter-buttons">
                  {documentFilterLinks.map(filter => (
                    <button 
                      key={filter.id}
                      className={`doc-filter-btn ${selectedFilter === filter.type ? 'active' : ''}`}
                      onClick={() => handleFilterClick(filter.type)}
                    >
                      <span className="filter-icon">{filter.icon}</span>
                      <span className="filter-label">{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="doc-view-toggle">
                <h3>👁️ View Mode</h3>
                <div className="view-toggle-buttons">
                  <button 
                    className={`view-toggle-btn ${viewMode === 'blocks' ? 'active' : ''}`}
                    onClick={() => viewMode !== 'blocks' && toggleViewMode()}
                  >
                    <span className="toggle-icon">📦</span>
                    <span className="toggle-label">Blocks</span>
                  </button>
                  <button 
                    className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => viewMode !== 'list' && toggleViewMode()}
                  >
                    <span className="toggle-icon">📋</span>
                    <span className="toggle-label">List</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Add Document Button */}
            <div className="doc-add-section">
              <button 
                className="doc-add-btn"
                onClick={() => setIsAddingNew('document')}
              >
                + Add New Document
              </button>
            </div>
            
            {/* Add/Edit Document Form */}
            {(isAddingNew === 'document' || editingDocument) && (
              <div className="doc-form-section">
                <h3>{editingDocument ? 'Edit Document' : 'Add New Document'}</h3>
                <div className="doc-form">
                  <div className="form-group">
                    <label>Document Name:</label>
                    <input
                      type="text"
                      value={documentFormData.name}
                      onChange={(e) => setDocumentFormData({...documentFormData, name: e.target.value})}
                      className="edit-input"
                      placeholder="Enter document name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Document Type:</label>
                    <select
                      value={documentFormData.type}
                      onChange={(e) => setDocumentFormData({...documentFormData, type: e.target.value})}
                      className="edit-input doc-select"
                    >
                      <option value="">Select document type</option>
                      {allowedDocTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Document URL:</label>
                    <input
                      type="url"
                      value={documentFormData.url}
                      onChange={(e) => setDocumentFormData({...documentFormData, url: e.target.value})}
                      className="edit-input"
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Description (optional):</label>
                    <textarea
                      value={documentFormData.description}
                      onChange={(e) => setDocumentFormData({...documentFormData, description: e.target.value})}
                      className="edit-textarea"
                      placeholder="Enter document description"
                      rows="3"
                    />
                  </div>
                  
                  <div className="doc-form-actions">
                    {editingDocument ? (
                      <>
                        <button onClick={handleSaveDocument} className="save-btn">Save Changes</button>
                        <button onClick={() => setEditingDocument(null)} className="cancel-btn">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleAddDocument} className="save-btn">Add Document</button>
                        <button onClick={() => setIsAddingNew(false)} className="cancel-btn">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Documents Display */}
            <div className="doc-display-section">
              <h3>📚 Current Documents</h3>
              {getDocumentsByFilter().length === 0 ? (
                <div className="no-docs-message">
                  {selectedFilter === 'all' 
                    ? 'No documents found. Add your first document!'
                    : `No ${selectedFilter} documents found.`}
                </div>
              ) : (
                <div className={`doc-display ${viewMode === 'list' ? 'list-view' : 'block-view'}`}>
                  {getDocumentsByFilter().map(doc => (
                    <div key={doc.id} className="doc-item">
                      <div className="doc-item-content">
                        <div className="doc-icon">
                          {getDocumentTypeIcon(doc.type)}
                        </div>
                        <div className="doc-details">
                          <h4 className="doc-name">{doc.name}</h4>
                          <p className="doc-type">{allowedDocTypes.find(t => t.value === doc.type)?.label}</p>
                          {doc.description && <p className="doc-description">{doc.description}</p>}
                          <p className="doc-date">Added: {doc.dateAdded}</p>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="doc-link">
                            View Document
                          </a>
                        </div>
                        <div className="doc-actions">
                          <button onClick={() => handleEditDocument(doc)} className="doc-edit-btn">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteDocument(doc.id)} className="doc-delete-btn">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'projects':
        return (
          <div className="section-content project-management">
            <div className="project-header">
              <img src="/pic13.png" alt="Projects Management" className="section-header-image2" />
              <p>Manage all projects from here - add, edit, or remove projects.</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* Filter and View Controls */}
            <div className="project-controls-section">
              <div className="project-filters">
                <h3>🎯 Filter Projects</h3>
                <div className="project-filter-buttons">
                  {projectFilterLinks.map(filter => (
                    <button 
                      key={filter.id}
                      className={`project-filter-btn ${selectedProjectFilter === filter.type ? 'active' : ''}`}
                      onClick={() => handleProjectFilterClick(filter.type)}
                    >
                      <span className="filter-icon">{filter.icon}</span>
                      <span className="filter-label">{filter.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="project-view-toggle">
                <h3>👁️ View Mode</h3>
                <div className="view-toggle-buttons">
                  <button 
                    className={`view-toggle-btn ${projectViewMode === 'blocks' ? 'active' : ''}`}
                    onClick={() => projectViewMode !== 'blocks' && toggleProjectViewMode()}
                  >
                    <span className="toggle-icon">📦</span>
                    <span className="toggle-label">Blocks</span>
                  </button>
                  <button 
                    className={`view-toggle-btn ${projectViewMode === 'list' ? 'active' : ''}`}
                    onClick={() => projectViewMode !== 'list' && toggleProjectViewMode()}
                  >
                    <span className="toggle-icon">📋</span>
                    <span className="toggle-label">List</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Add Project Button */}
            <div className="project-add-section">
              <button 
                className="project-add-btn"
                onClick={() => setIsAddingNew('project')}
              >
                + Add New Project
              </button>
            </div>
            
            {/* Add/Edit Project Form */}
            {(isAddingNew === 'project' || editingProject) && (
              <div className="project-form-section">
                <h3>{editingProject ? 'Edit Project' : 'Add New Project'}</h3>
                <div className="project-form">
                  <div className="form-group">
                    <label>Project Name:</label>
                    <input
                      type="text"
                      value={projectFormData.name}
                      onChange={(e) => setProjectFormData({...projectFormData, name: e.target.value})}
                      className="edit-input"
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Project Type:</label>
                    <select
                      value={projectFormData.type}
                      onChange={(e) => setProjectFormData({...projectFormData, type: e.target.value})}
                      className="edit-input project-select"
                    >
                      <option value="">Select project type</option>
                      {allowedProjectTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Repository URL:</label>
                    <input
                      type="url"
                      value={projectFormData.repoUrl}
                      onChange={(e) => setProjectFormData({...projectFormData, repoUrl: e.target.value})}
                      className="edit-input"
                      placeholder="https://github.com/username/repo"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Live Demo URL:</label>
                    <input
                      type="url"
                      value={projectFormData.liveUrl}
                      onChange={(e) => setProjectFormData({...projectFormData, liveUrl: e.target.value})}
                      className="edit-input"
                      placeholder="https://yourproject.com"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Description (optional):</label>
                    <textarea
                      value={projectFormData.description}
                      onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
                      className="edit-textarea"
                      placeholder="Enter project description"
                      rows="3"
                    />
                  </div>
                  
                  <div className="project-form-actions">
                    {editingProject ? (
                      <>
                        <button onClick={handleSaveProject} className="save-btn">Save Changes</button>
                        <button onClick={() => setEditingProject(null)} className="cancel-btn">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={handleAddProject} className="save-btn">Add Project</button>
                        <button onClick={() => setIsAddingNew(false)} className="cancel-btn">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Projects Display */}
            <div className="projects-showcase-container">
              <h3>💼 Current Projects</h3>
              {getProjectsByFilter().length === 0 ? (
                <div className="empty-projects-notice">
                  {selectedProjectFilter === 'all' 
                    ? 'No projects found. Add your first project!'
                    : `No ${selectedProjectFilter} projects found.`}
                </div>
              ) : (
                <div className={`projects-grid-wrapper ${projectViewMode === 'list' ? 'linear-layout' : 'card-layout'}`}>
                  {getProjectsByFilter().map(project => (
                    <div 
                      key={project.id} 
                      className={`project-card ${draggedProject?.id === project.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project)}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, project)}
                      style={{ cursor: 'move' }}
                    >
                      <div className="project-card-body">
                        <div className="project-drag-handle" title="Drag to reorder">
                          ⋮⋮
                        </div>
                        <div className="project-type-icon">
                          {getProjectTypeIcon(project.type)}
                        </div>
                        <div className="project-info">
                          <h4 className="project-title">{project.name}</h4>
                          <p className="project-category">{allowedProjectTypes.find(t => t.value === project.type)?.label}</p>
                          {project.description && <p className="project-summary">{project.description}</p>}
                          <p className="project-timestamp">Added: {project.dateAdded}</p>
                          <div className="project-external-links">
                            {project.repoUrl && (
                              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="external-link repository-link">
                                  Repository
                              </a>
                            )}
                            {project.liveUrl && (
                              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="external-link demo-link">
                                🌐 Live Demo
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="project-control-buttons">
                          <button onClick={() => handleEditProject(project)} className="control-btn edit-control">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteProject(project.id)} className="control-btn delete-control">
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


          </div>
        );
      case 'about':
        return (
          <div className="section-content about-management">
            <div className="about-mgmt-header">
              <img src="/pic14.png" alt="About Management" className="section-header-image2" />
              <p>Manage the GitHub repository settings for the About page README display.</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* GitHub Repository Settings */}
            <div className="about-mgmt-section">
              <h3>📖 GitHub Repository Settings</h3>
              <div className="github-repo-manager">
                {editingAboutData ? (                    <div className="about-edit-form">
                      <div className="about-form-group">
                        <label>GitHub Username:</label>
                        <input
                          type="text"
                          value={aboutFormData.githubUsername}
                          onChange={(e) => setAboutFormData({...aboutFormData, githubUsername: e.target.value})}
                          className="about-edit-input"
                          placeholder="Enter GitHub username"
                        />
                      </div>
                      
                      <div className="about-form-group">
                        <label>Repository Name:</label>
                        <input
                          type="text"
                          value={aboutFormData.repositoryName}
                          onChange={(e) => setAboutFormData({...aboutFormData, repositoryName: e.target.value})}
                          className="about-edit-input"
                          placeholder="Enter repository name"
                        />
                      </div>
                      
                      {generateReadmeUrl() && (
                        <div className="about-form-group">
                          <label>Generated README URL:</label>
                          <div className="url-preview">
                            <code>{generateReadmeUrl()}</code>
                          </div>
                        </div>
                      )}
                      
                      <div className="about-actions">
                        <button onClick={handleSaveAboutData} className="save-btn">Save Changes</button>
                        <button onClick={() => setEditingAboutData(null)} className="cancel-btn">Cancel</button>
                      </div>
                    </div>
                ) : (
                  <div className="display-content">
                    <div className="about-current-settings">
                      <h4>Current Settings:</h4>
                      <div className="about-setting-item">
                        <strong>GitHub Username:</strong> 
                        <span className="about-setting-value">{aboutData.githubUsername || 'Not set'}</span>
                      </div>
                      <div className="about-setting-item">
                        <strong>Repository Name:</strong> 
                        <span className="about-setting-value">{aboutData.repositoryName || 'Not set'}</span>
                      </div>
                      <div className="about-setting-item">
                        <strong>README URL:</strong> 
                        <span className="about-setting-value">
                          {aboutData.githubReadmeUrl || 'Not configured'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="about-actions">
                      <button onClick={handleEditAboutData} className="edit-btn">
                        ✏️ Edit Repository Settings
                      </button>
                      {aboutData.githubReadmeUrl && (
                        <a 
                          href={`https://github.com/${aboutData.githubUsername}/${aboutData.repositoryName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="about-view-repo-btn"
                        >
                          🔗 View Repository
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        );
      case 'contacts':
        return (
          <div className="section-content contacts-management">
            <div className="contacts-header">
              <img src="/pic15.png" alt="Contacts Management" className="section-header-image2" />
              <p>Manage all contact information and social media settings.</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* Contacts Description Management */}
            <div className="management-controls">
              <h3>📝 Description Management</h3>
              <div className="contacts-description-manager">
                {!contactsDescriptionManager.isEditing ? (
                  <div className="display-content">
                    <div className="current-data">
                      <strong>Current Description:</strong>
                      <p className="data-preview">{contactsData.description || 'No description set'}</p>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={contactsDescriptionManagementComponent.startEditing}
                    >
                      ✏️ Edit Description
                    </button>
                  </div>
                ) : (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Description Text:</label>
                      <textarea
                        value={contactsDescriptionManager.tempDescription}
                        onChange={(e) => contactsDescriptionManagementComponent.updateTempDescription(e.target.value)}
                        className="edit-textarea"
                        rows="4"
                        placeholder="Enter description text..."
                      />
                    </div>
                    <div className="form-actions">
                      <button 
                        className="btn-success"
                        onClick={contactsDescriptionManagementComponent.saveDescription}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={contactsDescriptionManagementComponent.cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Social Bubbles Management */}
            <div className="management-controls">
              <h3>💬 Social Bubbles Management</h3>
              <div className="social-bubbles-manager">
                {!socialBubblesManager.isEditing ? (
                  <div className="display-content">
                    <div className="current-data">
                      <strong>Current Social Bubbles:</strong>
                      <div className="bubbles-preview">
                        {contactsData.socialBubbles?.map(bubble => (
                          <div key={bubble.id} className="bubble-item">
                            <div className="bubble-info">
                              <span className="bubble-name">{bubble.id}</span>
                              <span className="bubble-url">{bubble.url}</span>
                            </div>
                            <div className="bubble-meta">
                              <span className="bubble-size">Size: {bubble.size}</span>
                              <span className="bubble-color" style={{backgroundColor: bubble.color}}></span>
                            </div>
                          </div>
                        )) || <span className="no-data">No social bubbles set</span>}
                      </div>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={socialBubblesManagementComponent.startEditing}
                    >
                      ✏️ Manage Social Bubbles
                    </button>
                  </div>
                ) : (
                  <div className="edit-form">
                    <div className="bubbles-list">
                      {socialBubblesManager.tempBubbles.map(bubble => (
                        <div key={bubble.id} className="bubble-edit-item">
                          <div className="bubble-edit-form">
                            <div className="form-group">
                              <label>ID:</label>
                              <input
                                type="text"
                                value={bubble.id}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'id', e.target.value)}
                                className="edit-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>URL:</label>
                              <input
                                type="text"
                                value={bubble.url}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'url', e.target.value)}
                                className="edit-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>Size:</label>
                              <input
                                type="number"
                                value={bubble.size}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'size', parseInt(e.target.value))}
                                className="edit-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>Color:</label>
                              <input
                                type="color"
                                value={bubble.color}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'color', e.target.value)}
                                className="edit-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>X Position:</label>
                              <input
                                type="number"
                                value={bubble.x}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'x', parseInt(e.target.value))}
                                className="edit-input"
                              />
                            </div>
                            <div className="form-group">
                              <label>Y Position:</label>
                              <input
                                type="number"
                                value={bubble.y}
                                onChange={(e) => socialBubblesManagementComponent.updateTempBubble(bubble.id, 'y', parseInt(e.target.value))}
                                className="edit-input"
                              />
                            </div>
                            <button 
                              className="btn-danger"
                              onClick={() => socialBubblesManagementComponent.deleteBubble(bubble.id)}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {socialBubblesManager.isAddingNew && (
                      <div className="new-bubble-form">
                        <h4>Add New Bubble</h4>
                        <div className="bubble-form-row">
                          <div className="form-group">
                            <label>ID:</label>
                            <input
                              type="text"
                              value={socialBubblesManager.newBubbleData.id}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('id', e.target.value)}
                              className="edit-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>URL:</label>
                            <input
                              type="text"
                              value={socialBubblesManager.newBubbleData.url}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('url', e.target.value)}
                              className="edit-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Size:</label>
                            <input
                              type="number"
                              value={socialBubblesManager.newBubbleData.size}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('size', parseInt(e.target.value))}
                              className="edit-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Color:</label>
                            <input
                              type="color"
                              value={socialBubblesManager.newBubbleData.color}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('color', e.target.value)}
                              className="edit-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>X Position:</label>
                            <input
                              type="number"
                              value={socialBubblesManager.newBubbleData.x}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('x', parseInt(e.target.value))}
                              className="edit-input"
                            />
                          </div>
                          <div className="form-group">
                            <label>Y Position:</label>
                            <input
                              type="number"
                              value={socialBubblesManager.newBubbleData.y}
                              onChange={(e) => socialBubblesManagementComponent.updateNewBubbleData('y', parseInt(e.target.value))}
                              className="edit-input"
                            />
                          </div>
                          <button 
                            className="btn-success"
                            onClick={socialBubblesManagementComponent.addNewBubble}
                          >
                            ✓ Add Bubble
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="form-actions">
                      <button 
                        className="btn-primary"
                        onClick={socialBubblesManagementComponent.startAddingNew}
                      >
                        + Add New Bubble
                      </button>
                      <button 
                        className="btn-success"
                        onClick={socialBubblesManagementComponent.saveBubbles}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save All Changes'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={socialBubblesManagementComponent.cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Details Management */}
            <div className="management-controls">
              <h3>📍 Location Management</h3>
              <div className="location-details-manager">
                {!locationDetailsManager.isEditing ? (
                  <div className="display-content">
                    <div className="current-data">
                      <strong>Current Location Details:</strong>
                      <div className="location-preview">
                        <div className="location-item">
                          <strong>Location:</strong> <span>{contactsData.locationDetails?.location || 'Not set'}</span>
                        </div>
                        <div className="location-item">
                          <strong>Response Time:</strong> <span>{contactsData.locationDetails?.responseTime || 'Not set'}</span>
                        </div>
                        <div className="location-item">
                          <strong>Status:</strong> <span>{contactsData.locationDetails?.status || 'Not set'}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={locationDetailsManagementComponent.startEditing}
                    >
                      ✏️ Edit Location Details
                    </button>
                  </div>
                ) : (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Location:</label>
                      <input
                        type="text"
                        value={locationDetailsManager.tempLocationData.location}
                        onChange={(e) => locationDetailsManagementComponent.updateTempLocationField('location', e.target.value)}
                        className="edit-input"
                        placeholder="e.g., New York, NY, USA"
                      />
                    </div>
                    <div className="form-group">
                      <label>Response Time:</label>
                      <input
                        type="text"
                        value={locationDetailsManager.tempLocationData.responseTime}
                        onChange={(e) => locationDetailsManagementComponent.updateTempLocationField('responseTime', e.target.value)}
                        className="edit-input"
                        placeholder="e.g., within 24 hours"
                      />
                    </div>
                    <div className="form-group">
                      <label>Status:</label>
                      <select
                        value={locationDetailsManager.tempLocationData.status}
                        onChange={(e) => locationDetailsManagementComponent.updateTempLocationField('status', e.target.value)}
                        className="edit-input"
                      >
                        <option value="">Select status...</option>
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="Away">Away</option>
                        <option value="Do Not Disturb">Do Not Disturb</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button 
                        className="btn-success"
                        onClick={locationDetailsManagementComponent.saveLocationDetails}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button 
                        className="btn-secondary"
                        onClick={locationDetailsManagementComponent.cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'github':
        return (
          <div className="section-content github-management">
            <div className="github-header">
              <img src="/pic11.png" alt="GitHub Management" className="section-header-image2" />
              <p>Manage GitHub sync service and repository integration.</p>
              {loading && <div className="loading-indicator">🔄 Processing GitHub operations...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* Service Status Section */}
            <div className="management-section">
              <h3>🔧 Service Status & Configuration</h3>
              <div className="github-status-manager">
                <div className="status-display">
                  
                  {/* Username Configuration */}
                  <div className="config-section">
                    <div className="form-group">
                      <label>GitHub Username:</label>
                      <div className="username-config">
                        <input
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          className="edit-input"
                          placeholder="Enter GitHub username"
                        />
                        <button 
                          onClick={() => githubSyncManagementComponent.updateUsername(githubUsername)}
                          className="update-btn"
                          disabled={loading}
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="action-buttons">
                    <button 
                      onClick={githubSyncManagementComponent.initialize}
                      className="btn-primary"
                      disabled={loading || githubSyncStatus.isInitialized}
                    >
                      🚀 Initialize Service
                    </button>
                    <button 
                      onClick={githubSyncManagementComponent.startAutoSync}
                      className="btn-success"
                      disabled={loading || !githubSyncStatus.isInitialized || githubSyncStatus.autoSyncEnabled}
                    >
                      ▶️ Start Auto Sync
                    </button>
                    <button 
                      onClick={githubSyncManagementComponent.stopAutoSync}
                      className="btn-warning"
                      disabled={loading || !githubSyncStatus.autoSyncEnabled}
                    >
                      ⏸️ Stop Auto Sync
                    </button>
                    <button 
                      onClick={refreshGithubStatus}
                      className="btn-secondary"
                      disabled={loading}
                    >
                      🔄 Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Operations Section */}
            <div className="management-section">
              <h3>🔧 Manual Operations</h3>
              <div className="manual-operations-manager">
                <div className="operations-grid">
                  <div className="operation-card">
                    <h4>📥 Manual Sync</h4>
                    <p>Trigger a manual sync of all non-user-edited projects</p>
                    <button 
                      onClick={githubSyncManagementComponent.manualSync}
                      className="btn-primary"
                      disabled={loading || !githubSyncStatus.isInitialized}
                    >
                      🔄 Run Manual Sync
                    </button>
                  </div>
                  
                  <div className="operation-card">
                    <h4>🧪 Run Tests</h4>
                    <p>Run GitHub sync service tests to verify functionality</p>
                    <button 
                      onClick={githubSyncManagementComponent.runTests}
                      className="btn-info"
                      disabled={loading || !githubSyncStatus.isInitialized}
                    >
                      🧪 Run Tests
                    </button>
                  </div>
                  
                  <div className="operation-card">
                    <h4>🔄 Reset User Edits</h4>
                    <p>Reset all user edit flags (allows projects to be re-synced)</p>
                    <button 
                      onClick={githubSyncManagementComponent.resetUserEdits}
                      className="btn-warning"
                      disabled={loading || !githubSyncStatus.isInitialized}
                    >
                      🔄 Reset Flags
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sync Results Section */}
            {Array.isArray(githubSyncResults) && githubSyncResults.length > 0 && (
              <div className="management-section">
                <h3>📋 Recent Sync Results</h3>
                <div className="sync-results-manager">
                  <div className="results-list">
                    {githubSyncResults.map((result, index) => (
                      <div key={index} className={`result-item ${result.result.toLowerCase()}`}>
                        <div className="result-header">
                          <span className="result-action">{result.action}</span>
                          <span className="result-timestamp">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="result-status">
                          Status: <span className={`status-${result.result.toLowerCase()}`}>{result.result}</span>
                        </div>
                        <div className="result-details">{result.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Test Results Section */}
            {Array.isArray(githubTestResults) && githubTestResults.length > 0 && (
              <div className="management-section">
                <h3>🧪 Test Results</h3>
                <div className="test-results-manager">
                  <div className="test-results-list">
                    {githubTestResults.map((test, index) => (
                      <div key={index} className={`test-result-item ${test.status}`}>
                        <div className="test-info">
                          <h4 className="test-name">{test.test}</h4>
                          <span className={`test-status status-${test.status}`}>
                            {test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️'} 
                            {test.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="test-message">{test.message}</div>
                        {test.details && (
                          <div className="test-details">
                            <pre>{JSON.stringify(test.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        );
      default:
        return (
          <div className="section-content">
            <img src="/pic3.png" alt="Homepage" className="section-header-image2" />
            <p>Welcome to the Controller Homepage section</p>
          </div>
        );
    }
  };

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

  // Load homepage data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadHomepageData();
      loadDocumentsData();
      loadProjectsData();
      loadAboutData();
      loadContactsData();
      
      // Set up real-time listener for Firestore updates
      const unsubscribeHomepage = subscribeToHomepageData((data) => {
        // Update local state when Firestore data changes
        if (data.socialLinks) {
          const reconstructedLinks = data.socialLinks.map(link => ({
            ...link,
            icon: getDefaultIcon(link.id)
          }));
          setSocialLinks(reconstructedLinks);
        }
        
        if (data.authorDescription) {
          setAuthorDescription(data.authorDescription);
        }
        
        if (data.authorSkills) {
          setAuthorSkills(data.authorSkills);
        }
      });
      
      // Set up real-time listener for documents updates
      const unsubscribeDocuments = subscribeToDocumentsData((data) => {
        if (data.documents) {
          setDocuments(data.documents);
        }
      });

      // Set up real-time listener for projects updates
      const unsubscribeProjects = subscribeToProjectsData((data) => {
        if (data.projects) {
          setProjects(data.projects);
        }
      });

      // Set up real-time listener for about data updates
      const unsubscribeAbout = subscribeToAboutData((data) => {
        if (data) {
          setAboutData(data);
        }
      });

      // Set up real-time listener for contacts data updates
      const unsubscribeContacts = subscribeToContactsData((data) => {
        if (data) {
          setContactsData(data);
        }
      });

      // Cleanup subscriptions on unmount
      return () => {
        unsubscribeHomepage();
        unsubscribeDocuments();
        unsubscribeProjects();
        unsubscribeAbout();
        unsubscribeContacts();
      };
    }
  }, [isAuthenticated, loadHomepageData, loadDocumentsData, loadProjectsData, loadAboutData, loadContactsData]);

  // Initialize GitHub sync service
  useEffect(() => {
    if (isAuthenticated && activeSection === 'github') {
      // Refresh GitHub status when GitHub section is accessed
      refreshGithubStatus();
    }
  }, [isAuthenticated, activeSection, refreshGithubStatus]);

  // Allowed document types
  const allowedDocTypes = [
    { value: 'video', label: 'Video', icon: '🎬' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'text', label: 'Text', icon: '📝' },
    { value: 'ppt', label: 'PowerPoint', icon: '📊' }
  ];
  
  // Filter links for document types
  const documentFilterLinks = [
    { id: 'all', label: 'All Documents', type: 'all', icon: '📚' },
    { id: 'video', label: 'Videos', type: 'video', icon: '🎬' },
    { id: 'image', label: 'Images', type: 'image', icon: '🖼️' },
    { id: 'pdf', label: 'PDFs', type: 'pdf', icon: '📄' },
    { id: 'text', label: 'Text Files', type: 'text', icon: '📝' },
    { id: 'ppt', label: 'PowerPoints', type: 'ppt', icon: '📊' }
  ];

  // Allowed project types
  const allowedProjectTypes = [
    { value: 'web', label: 'Web Development', icon: '🌐' },
    { value: 'mobile', label: 'Mobile Apps', icon: '📱' },
    { value: 'desktop', label: 'Desktop Software', icon: '💻' },
    { value: 'game', label: 'Games', icon: '🎮' },
    { value: 'other', label: 'Other', icon: '📂' }
  ];
  
  // Filter links for project types
  const projectFilterLinks = [
    { id: 'all', label: 'All Projects', type: 'all', icon: '📚' },
    { id: 'web', label: 'Web Development', type: 'web', icon: '🌐' },
    { id: 'mobile', label: 'Mobile Apps', type: 'mobile', icon: '📱' },
    { id: 'desktop', label: 'Desktop Software', type: 'desktop', icon: '💻' },
    { id: 'game', label: 'Games', type: 'game', icon: '🎮' },
    { id: 'other', label: 'Other', type: 'other', icon: '📂' }
  ];

  if (!isAuthenticated) {
    return (
      <div className="homepage">
        <div className="spline-background">
          <Lanyard position={[2.5, 2, 20]} gravity={[0, -40, 0]} />
          {/* Password Modal */}
          {showPasswordModal && (
            <div className="password-modal-overlay">
              <div className="password-modal glass-panel">
                <h3>🔒 Controller Access</h3>
                <p>Enter the controller password to access admin functions.</p>
                
                {passwordError && <div className="password-error">{passwordError}</div>}
                
                <div className="password-input-wrapper">
                  <form autoComplete="off" onSubmit={validatePassword}>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Controller password"
                      className="password-input"
                      autoComplete="new-password"
                      autoFocus
                    />
                  </form>
                </div>
                
                <div className="password-modal-buttons">
                  <button 
                    className="password-submit-btn" 
                    onClick={validatePassword}
                  >
                    Access Controller
                  </button>
                  <button 
                    className="password-cancel-btn" 
                    onClick={() => navigate('/')}
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </div>
      </div>
    );
  }

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
        <div className="spline-background">
        {/* Social Media Links - Repurposed as Navigation Links */}
        <div className="social-links-container">
          {navigationLinks.map((link) => (
            <div key={link.id} className="social-link-wrapper">
              <button 
                className={`social-link ${activeSection === link.id ? 'active' : ''}`}
                aria-label={link.label}
                onClick={() => handleNavigationClick(link)}
                title={`Go to ${link.label}`}
              >
                {link.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Content Section */}
        <div className="controller-content">
          {renderSectionContent()}
        </div>

        {/* Command Line Interface (UI Only) */}
        <div className="command-line-container">
          <div className="glass-panel">
            <div className="command-input-wrapper">
              <span className="prompt-symbol">$</span>
              <input
                type="text"
                className="command-input"
                placeholder="Controller mode "
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        {/* Command Message */}
        {showCommandMessage && (
          <div className="command-message">
            {commandMessage}
          </div>
        )}

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
      </div>
      </div>
    </div>
  );
};

export default Controller;
