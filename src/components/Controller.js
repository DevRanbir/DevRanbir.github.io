import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Homepage.css'; // Reusing Homepage.css
import './Controller.css'; // New styles for Controller component

import { 
  getHomepageData, 
  updateSocialLinks, 
  updateAuthorDescription, 
  updateAuthorSkills,
  subscribeToHomepageData,
  initializeHomepageData,
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
  subscribeToAboutData
} from '../firebase/firestoreService';

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

  // Navigation links (reusing social links design)
  const navigationLinks = [
    { 
      id: 'home', 
      icon: <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9,22 9,12 15,12 15,22"></polyline></svg>, 
      path: '/',
      label: 'Home'
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
  const loadHomepageData = async () => {
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
  };

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
  const loadDocumentsData = async () => {
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
  };

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
  const loadProjectsData = async () => {
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
  };

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
  const loadAboutData = async () => {
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
  };

  // Handle about data editing
  const handleEditAboutData = () => {
    setEditingAboutData(true);
    setAboutFormData({
      githubUsername: aboutData.githubUsername || '',
      repositoryName: aboutData.repositoryName || ''
    });
  };

  // Save about data
  const handleSaveAboutData = async () => {
    try {
      if (!aboutFormData.githubUsername || !aboutFormData.repositoryName) {
        showMessage('Please fill in both GitHub username and repository name');
        return;
      }
      
      setLoading(true);
      
      const updatedAboutData = {
        githubUsername: aboutFormData.githubUsername.trim(),
        repositoryName: aboutFormData.repositoryName.trim(),
        githubReadmeUrl: `https://api.github.com/repos/${aboutFormData.githubUsername.trim()}/${aboutFormData.repositoryName.trim()}/readme`
      };
      
      await updateAboutData(updatedAboutData);
      setAboutData(updatedAboutData);
      
      // Dispatch event to notify About.js component
      window.dispatchEvent(new CustomEvent('aboutDataUpdated', { 
        detail: { aboutData: updatedAboutData, timestamp: new Date().toISOString() } 
      }));
      
      showMessage('About data updated successfully!');
    } catch (error) {
      console.error('Error updating about data:', error);
      setError('Failed to update about data');
      showMessage('Error updating about data');
    } finally {
      setLoading(false);
      setEditingAboutData(null);
    }
  };

  // Generate GitHub README URL preview
  const generateReadmeUrl = () => {
    if (aboutFormData.githubUsername && aboutFormData.repositoryName) {
      return `https://api.github.com/repos/${aboutFormData.githubUsername.trim()}/${aboutFormData.repositoryName.trim()}/readme`;
    }
    return '';
  };

  // Render content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className="section-content home-management">
            <div className="home-header">
              <h2>Homepage Management</h2>
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
              <h2>Documents Management</h2>
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
              <h2>Projects Management</h2>
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
            <div className="project-display-section">
              <h3>💼 Current Projects</h3>
              {getProjectsByFilter().length === 0 ? (
                <div className="no-projects-message">
                  {selectedProjectFilter === 'all' 
                    ? 'No projects found. Add your first project!'
                    : `No ${selectedProjectFilter} projects found.`}
                </div>
              ) : (
                <div className={`project-display ${projectViewMode === 'list' ? 'list-view' : 'block-view'}`}>
                  {getProjectsByFilter().map(project => (
                    <div key={project.id} className="project-item">
                      <div className="project-item-content">
                        <div className="project-icon">
                          {getProjectTypeIcon(project.type)}
                        </div>
                        <div className="project-details">
                          <h4 className="project-name">{project.name}</h4>
                          <p className="project-type">{allowedProjectTypes.find(t => t.value === project.type)?.label}</p>
                          {project.description && <p className="project-description">{project.description}</p>}
                          <p className="project-date">Added: {project.dateAdded}</p>
                          <div className="project-links">
                            {project.repoUrl && (
                              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="project-link repo-link">
                                📁 Repository
                              </a>
                            )}
                            {project.liveUrl && (
                              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="project-link live-link">
                                🌐 Live Demo
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="project-actions">
                          <button onClick={() => handleEditProject(project)} className="project-edit-btn">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteProject(project.id)} className="project-delete-btn">
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
          <div className="about-section-content">
            <div className="about-mgmt-header">
              <h2>About Page Management</h2>
              <p>Manage the GitHub repository settings for the About page README display.</p>
              {loading && <div className="loading-indicator">🔄 Syncing with Firestore...</div>}
              {error && <div className="error-indicator">❌ {error}</div>}
            </div>
            
            {/* GitHub Repository Settings */}
            <div className="about-mgmt-section">
              <h3>📖 GitHub Repository Settings</h3>
              <div className="github-repo-manager">
                {editingAboutData ? (
                  <div className="about-edit-form">
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
                        <div className="about-url-preview">
                          <code>{generateReadmeUrl()}</code>
                        </div>
                      </div>
                    )}
                    
                    <div className="about-edit-actions">
                      <button onClick={handleSaveAboutData} className="about-save-btn">Save Changes</button>
                      <button onClick={() => setEditingAboutData(null)} className="about-cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="about-display-content">
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
                        <span className="about-setting-value about-url-text">
                          {aboutData.githubReadmeUrl || 'Not configured'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="about-actions">
                      <button onClick={handleEditAboutData} className="about-edit-btn">
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
            
            {/* README Preview Information */}
            <div className="about-mgmt-section">
              <h3>📄 README Information</h3>
              <div className="about-readme-info">
                <p>The About page displays the README content from the specified GitHub repository.</p>
                <ul className="about-readme-features">
                  <li>✅ Automatically fetches README from GitHub API</li>
                  <li>✅ Displays HTML-formatted content</li>
                  <li>✅ Supports images, code blocks, and links</li>
                  <li>✅ Auto-refreshes when repository settings change</li>
                </ul>
                
                {aboutData.githubReadmeUrl ? (
                  <div className="about-readme-status">
                    <span className="about-status-indicator about-status-active">✅ Active</span>
                    <span className="about-status-text">
                      README will be loaded from: {aboutData.githubUsername}/{aboutData.repositoryName}
                    </span>
                  </div>
                ) : (
                  <div className="about-readme-status">
                    <span className="about-status-indicator about-status-inactive">❌ Inactive</span>
                    <span className="about-status-text">
                      Configure GitHub repository settings to display README
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'contacts':
        return (
          <div className="section-content">
            <h2>Contacts</h2>
            <p>Contacts section content</p>
          </div>
        );
      default:
        return (
          <div className="section-content">
            <h2>Homepage</h2>
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

      // Cleanup subscriptions on unmount
      return () => {
        unsubscribeHomepage();
        unsubscribeDocuments();
        unsubscribeProjects();
        unsubscribeAbout();
      };
    }
  }, [isAuthenticated]);

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
                placeholder="Controller mode - UI only (use navigation buttons)"
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
  );
};

export default Controller;
