import React, { useEffect, useState, useCallback, useMemo } from 'react';
import CommandLine from '../../components/CommandLine';
import '../homepage/Homepage.css';
import './DocumentsStyles.css';
import Lanyard from '../../components/Lanyard';
import LoadingOverlay from '../../components/LoadingOverlay';
import FullScreenPrompt from '../../components/FullScreenPrompt';
import { loadSplineScript } from '../../utils/splineLoader';

// Firebase imports
import { 
  getDocumentsData,
  getHomepageData,
  updateDocuments,
  subscribeToDocumentsData
} from '../../firebase/firestoreService';

const Documents = () => {
  const [editMode, setEditMode] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [commandMessage, setCommandMessage] = useState('');
  const [showCommandMessage, setShowCommandMessage] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [documents, setDocuments] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [editingDocument, setEditingDocument] = useState(null);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [documentFormData, setDocumentFormData] = useState({
    name: '',
    type: '',
    url: '',
    description: '',
    dateAdded: new Date().toISOString().split('T')[0]
  });
  const [selectedFilter, setSelectedFilter] = useState('all'); // New state for filtering
  const [viewMode, setViewMode] = useState('blocks'); // New state for view mode: 'blocks' or 'list'
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [socialLinks, setSocialLinks] = useState([]);
  const [skills, setSkills] = useState([]);

  // Memoized callback to prevent useEffect loops in LoadingOverlay
  const handleLoadingComplete = useCallback(() => {
    console.log('  Documents: LoadingOverlay completed, hiding overlay');
    setShowLoadingOverlay(false);
  }, []);

  // Allowed document types (wrapped in useMemo to avoid re-creation on every render)
  const allowedTypes = useMemo(() => [
    { value: 'video', label: 'Video', icon: '🎬' },
    { value: 'image', label: 'Image', icon: '🖼️' },
    { value: 'pdf', label: 'PDF', icon: '📄' },
    { value: 'text', label: 'Text', icon: '📝' },
    { value: 'ppt', label: 'PowerPoint', icon: '📊' }
  ], []);
  
  // Filter links for document types (similar to social media container)
  const filterLinks = [
    { 
      id: 'all', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
          <line x1="3" y1="8" x2="21" y2="8"></line>
        </svg>
      ), 
      label: 'All Documents',
      type: 'all'
    },
    { 
      id: 'video', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10,8 16,12 10,16"></polygon>
        </svg>
      ), 
      label: 'Videos',
      type: 'video'
    },
    { 
      id: 'image', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8" cy="8" r="1.5"></circle>
          <polyline points="4,20 10,14 14,18 20,12"></polyline>
        </svg>
      ), 
      label: 'Images',
      type: 'image'
    },
    { 
      id: 'pdf', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
          <polyline points="14,2 14,8 20,8"></polyline>
        </svg>
      ), 
      label: 'PDFs',
      type: 'pdf'
    },
    { 
      id: 'text', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path>
          <line x1="8" y1="8" x2="16" y2="8"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
          <line x1="8" y1="16" x2="16" y2="16"></line>
        </svg>
      ), 
      label: 'Text Files',
      type: 'text'
    },
    { 
      id: 'ppt', 
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none">
          <rect x="3" y="4" width="18" height="14" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="8" y1="22" x2="16" y2="22"></line>
        </svg>
      ), 
      label: 'PowerPoints',
      type: 'ppt'
    }
  ];

  // Function to get documents based on selected filter
  const getDocumentsByFilter = useCallback(() => {
    if (selectedFilter === 'all') {
      return documents;
    }
    return documents.filter(doc => doc.type === selectedFilter);
  }, [documents, selectedFilter]);

  // AI Context for CommandLine
  const aiContext = useMemo(() => {
    const filteredDocs = getDocumentsByFilter();
    const allDocs = documents;
    
    // Count documents by type
    const docCounts = allowedTypes.reduce((acc, type) => {
      acc[type.value] = allDocs.filter(doc => doc.type === type.value).length;
      return acc;
    }, {});
    
    // Create detailed document descriptions for AI
    const documentDescriptions = filteredDocs.length > 0 
      ? filteredDocs.map((doc, index) => 
          `${index + 1}. "${doc.name}" (Type: ${doc.type.toUpperCase()}) - ${doc.description || 'No description'}`
        ).join('\n')
      : 'No documents match the current filter';
    
    return {
      currentPage: 'documents',
      documents: filteredDocs.map(doc => ({
        name: doc.name,
        type: doc.type,
        description: doc.description,
        url: doc.url,
        dateAdded: doc.dateAdded,
        size: doc.size || 'Unknown'
      })),
      allDocuments: allDocs.map(doc => ({
        name: doc.name,
        type: doc.type,
        description: doc.description
      })),
      documentDescriptions: documentDescriptions,
      documentTypes: allowedTypes.map(t => ({
        type: t.value,
        label: t.label,
        count: docCounts[t.value] || 0
      })),
      totalDocuments: allDocs.length,
      filteredCount: filteredDocs.length,
      selectedFilter: selectedFilter,
      viewMode: viewMode,
      skills: skills,
      socialLinks: socialLinks,
      pages: ['home', 'projects', 'documents', 'about', 'contacts'],
      allowedTypes: allowedTypes
    };
  }, [documents, selectedFilter, viewMode, skills, socialLinks, getDocumentsByFilter, allowedTypes]);
  
  // Handle search/filter from command line
  const handleCommandSearch = useCallback((query) => {
    if (!query || query.trim() === '') {
      setSelectedFilter('all');
      return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    // Create alias mappings for common variations
    const typeAliases = {
      'pdfs': 'pdf',
      'images': 'image',
      'pictures': 'image',
      'photos': 'image',
      'pics': 'image',
      'videos': 'video',
      'movies': 'video',
      'words': 'word',
      'docs': 'word',
      'documents': 'word',
      'powerpoint': 'ppt',
      'powerpoints': 'ppt',
      'ppts': 'ppt',
      'presentations': 'ppt',
      'slides': 'ppt',
      'texts': 'text',
      'text files': 'text',
      'txts': 'text'
    };
    
    // Check aliases first
    const aliasedType = typeAliases[searchTerm];
    if (aliasedType) {
      setSelectedFilter(aliasedType);
      setCurrentPage(0);
      console.log('✅ Matched alias:', searchTerm, '→', aliasedType);
      return;
    }
    
    // Check if query matches a document type (exact match or label contains)
    const matchingType = allowedTypes.find(type => 
      type.value.toLowerCase() === searchTerm || 
      type.label.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(type.value.toLowerCase()) ||
      searchTerm.includes(type.label.toLowerCase())
    );
    
    if (matchingType) {
      setSelectedFilter(matchingType.value);
      setCurrentPage(0);
      console.log('✅ Matched document type:', matchingType.value);
    } else {
      console.log('❌ No matching document type for:', searchTerm);
    }
  }, [allowedTypes]);
  
  // Handle AI responses
  const handleAIResponse = useCallback((response) => {
    console.log('🤖 AI Response on Documents:', response);
    
    // Handle specific actions
    if (response.hasAction) {
      switch (response.action) {
        case 'filter':
          // AI wants to filter documents by type
          console.log('🎯 Filtering documents by:', response.target);
          handleCommandSearch(response.target);
          break;
        case 'clear':
        case 'reset':
          // AI wants to clear filters
          console.log('🔄 Clearing document filters');
          setSelectedFilter('all');
          setCurrentPage(0);
          break;
        default:
          break;
      }
    }
  }, [handleCommandSearch]);

  // Handle view mode toggle
  const toggleViewMode = () => {
    const newViewMode = viewMode === 'blocks' ? 'list' : 'blocks';
    setViewMode(newViewMode);
    setCurrentPage(0); // Reset to first page when changing view
    showMessage(`Switched to ${newViewMode} view`);
  };
  
  // Handle filter selection
  const handleFilterClick = (filterType) => {
    setSelectedFilter(filterType);
    setCurrentPage(0); // Reset to first page when filter changes
    
    // Show feedback message
    const filterLabel = filterLinks.find(f => f.type === filterType)?.label || 'All Documents';
    const filteredCount = filterType === 'all' ? documents.length : documents.filter(d => d.type === filterType).length;
    showMessage(`Showing ${filteredCount} ${filterLabel.toLowerCase()}`);
  };

  // Helper function to ensure URL has proper protocol
  const ensureValidUrl = (url) => {
    // If URL doesn't start with http:// or https://, add https://
    if (url && !url.match(/^https?:\/\//)) {
      return `https://${url}`;
    }
    return url;
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
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
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
  const handleAddDocument = async (name, type, url, description = '') => {
    try {
      // Ensure URL has proper protocol
      const validUrl = ensureValidUrl(url);
      // Convert Google Drive URLs to preview URLs
      const previewUrl = convertToPreviewUrl(validUrl);
      
      const newId = Math.max(...documents.map(doc => doc.id), 0) + 1;
      const newDocument = {
        id: newId,
        name: name,
        type: type || 'pdf', // Use provided type or default to pdf
        url: validUrl,
        previewUrl: previewUrl,
        description: description,
        dateAdded: new Date().toISOString().split('T')[0]
      };
      
      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      
      // Save to Firebase instead of localStorage
      await updateDocuments(updatedDocuments);
      showMessage(`Document "${name}" added successfully!`);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('documentsUpdated', { 
        detail: { documents: updatedDocuments, timestamp: new Date().toISOString() } 
      }));
    } catch (error) {
      console.error('Error adding document:', error);
      showMessage(`Error adding document: ${error.message}`);
    }
  };
  
  const handleEditDocument = async (id, name, type, description) => {
    try {
      const documentIndex = documents.findIndex(doc => doc.id === id);
      if (documentIndex === -1) {
        showMessage(`Document with ID ${id} not found.`);
        return;
      }
      
      const updatedDocuments = [...documents];
      updatedDocuments[documentIndex] = {
        ...updatedDocuments[documentIndex],
        name: name,
        type: type || updatedDocuments[documentIndex].type,
        description: description !== undefined ? description : updatedDocuments[documentIndex].description
      };
      
      setDocuments(updatedDocuments);
      
      // Save to Firebase instead of localStorage
      await updateDocuments(updatedDocuments);
      showMessage(`Document with ID ${id} updated successfully!`);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('documentsUpdated', { 
        detail: { documents: updatedDocuments, timestamp: new Date().toISOString() } 
      }));
    } catch (error) {
      console.error('Error updating document:', error);
      showMessage(`Error updating document: ${error.message}`);
    }
  };
  
  const handleRemoveDocument = async (id) => {
    try {
      const documentIndex = documents.findIndex(doc => doc.id === id);
      if (documentIndex === -1) {
        showMessage(`Document with ID ${id} not found.`);
        return;
      }
      
      const documentName = documents[documentIndex].name;
      if (window.confirm(`Are you sure you want to remove "${documentName}"?`)) {
        const updatedDocuments = documents.filter(doc => doc.id !== id);
        setDocuments(updatedDocuments);
        
        // Save to Firebase instead of localStorage
        await updateDocuments(updatedDocuments);
        showMessage(`Document "${documentName}" removed successfully!`);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('documentsUpdated', { 
          detail: { documents: updatedDocuments, timestamp: new Date().toISOString() } 
        }));
      }
    } catch (error) {
      console.error('Error removing document:', error);
      showMessage(`Error removing document: ${error.message}`);
    }
  };
  
  const handleExitEditMode = () => {
    setEditMode(false);
    setEditingDocument(null);
    setIsAddingDocument(false);
    showMessage("Exited edit mode.");
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
  
  // Document form handlers
  const handleDocumentFormChange = (e) => {
    const { name, value } = e.target;
    setDocumentFormData({
      ...documentFormData,
      [name]: value
    });
  };
  
  const handleDocumentFormSubmit = (e) => {
    e.preventDefault();
    
    if (isAddingDocument) {
      // Adding a new document
      handleAddDocument(
        documentFormData.name,
        documentFormData.type,
        documentFormData.url,
        documentFormData.description
      );
    } else if (editingDocument) {
      // Editing an existing document
      handleEditDocument(
        editingDocument.id,
        documentFormData.name,
        documentFormData.type,
        documentFormData.description
      );
    }
    
    // Reset form and state
    setDocumentFormData({
      name: '',
      type: '',
      url: '',
      description: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
    setEditingDocument(null);
    setIsAddingDocument(false);
  };
  
  const startEditingDocument = (document) => {
    setEditingDocument(document);
    setDocumentFormData({
      name: document.name,
      type: document.type,
      url: document.url,
      description: document.description || '',
      dateAdded: document.dateAdded
    });
  };
  
  const startAddingDocument = () => {
    setIsAddingDocument(true);
    setEditingDocument(null);
    setDocumentFormData({
      name: '',
      type: '',
      url: '',
      description: '',
      dateAdded: new Date().toISOString().split('T')[0]
    });
  };
  
  const cancelDocumentForm = () => {
    setEditingDocument(null);
    setIsAddingDocument(false);
    setDocumentFormData({
      name: '',
      type: '',
      url: '',
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

  // Load documents from Firebase on initial render
  useEffect(() => {
    const loadDocumentsFromFirebase = async () => {
      try {
        const data = await getDocumentsData();
        
        if (data.documents) {
          // Ensure all documents have previewUrl and description properties
          const updatedDocuments = data.documents.map(doc => {
            const updatedDoc = { ...doc };
            if (!updatedDoc.previewUrl) {
              updatedDoc.previewUrl = convertToPreviewUrl(doc.url);
            }
            if (!updatedDoc.description) {
              updatedDoc.description = '';
            }
            return updatedDoc;
          });
          
          setDocuments(updatedDocuments);
          
          // Update Firebase if we made any changes to the documents
          if (JSON.stringify(data.documents) !== JSON.stringify(updatedDocuments)) {
            await updateDocuments(updatedDocuments);
          }
        }
      } catch (error) {
        console.error('Error loading documents from Firebase:', error);
        // Fallback to localStorage if Firebase fails
        const savedDocuments = localStorage.getItem('documents');
        if (savedDocuments) {
          try {
            const parsedDocuments = JSON.parse(savedDocuments);
            setDocuments(parsedDocuments);
          } catch (parseError) {
            console.error('Error parsing localStorage documents:', parseError);
          }
        }
      }
    };

    loadDocumentsFromFirebase();

    // Fetch skills and social links from homepage data
    const fetchSkillsAndLinks = async () => {
      try {
        const data = await getHomepageData();
        if (data) {
          // Extract skills from homepage data
          if (data.skills) {
            setSkills(data.skills);
          } else if (data.cardData) {
            // Extract from Skills card if available
            const skillsCard = data.cardData.find(card => card.title === 'Skills');
            if (skillsCard && skillsCard.labels) {
              setSkills(skillsCard.labels);
            }
          }
          
          // Set social links
          if (data.socialLinks) {
            setSocialLinks(data.socialLinks);
          }
        }
      } catch (error) {
        console.error('Error fetching skills and social links:', error);
      }
    };
    
    fetchSkillsAndLinks();

    // Set up real-time listener for Firebase updates
    const unsubscribe = subscribeToDocumentsData((data) => {
      if (data.documents) {
        setDocuments(data.documents);
      }
    });
    
    // Load Spline viewer script using centralized loader
    loadSplineScript();

    return () => {
      // Cleanup Firebase subscription
      unsubscribe();
    };
  }, []);
  
  // Listen for external document updates (from Controller or other components)
  useEffect(() => {
    const handleDocumentsUpdate = (event) => {
      if (event.detail && event.detail.documents) {
        setDocuments(event.detail.documents);
      }
    };

    // Listen for custom events from other components
    window.addEventListener('documentsUpdated', handleDocumentsUpdate);

    return () => {
      window.removeEventListener('documentsUpdated', handleDocumentsUpdate);
    };
  }, []);
  
  // Function to get document icon as SVG based on type
  const getDocumentIcon = (type) => {
    const size = 64;
    
    switch (type.toLowerCase()) {
      case 'video':
        return (
          <svg width={size} height={size} viewBox="0 0 511.968 511.968" fill="#ff6b6b">
            <g>
              <g>
                <path d="M466.96,43.968H45.152c-22.864,0-41.456,18.896-41.456,42.096v224.912c0,23.2,18.592,42.096,41.456,42.096H466.96
                  c22.848,0,41.424-18.896,41.424-42.096V86.064C508.384,62.864,489.808,43.968,466.96,43.968z M492.384,310.976
                  c0,14.384-11.408,26.096-25.424,26.096H45.152c-14.032,0-25.456-11.696-25.456-26.096V86.064
                  c0-14.384,11.424-26.096,25.456-26.096H466.96c14.016,0,25.424,11.696,25.424,26.096V310.976z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M204.352,116.752v163.52l140.368-81.76L204.352,116.752z M220.352,144.576l92.592,53.92l-92.592,53.92V144.576z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M451.104,420.8c-3.664-17.808-19.296-31.184-38.032-31.184s-34.368,13.376-38.032,31.184H0v16h375.056
                  c3.648,17.824,19.28,31.2,38.032,31.2c18.736,0,34.368-13.392,38.032-31.2h60.848v-16H451.104z M413.088,452.016
                  c-12.608,0-22.848-10.4-22.848-23.2c-0.016-12.8,10.24-23.2,22.848-23.2c12.608,0,22.848,10.4,22.848,23.2
                  C435.936,441.6,425.68,452.016,413.088,452.016z"/>
              </g>
            </g>
          </svg>
        );
      case 'image':
        return (
          <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke="#4ecdc4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path class="b" d="M29.4995,12.3739c.7719-.0965,1.5437,.4824,1.5437,1.2543h0l2.5085,23.8312c.0965,.7719-.4824,1.5437-1.2543,1.5437l-23.7347,2.5085c-.7719,.0965-1.5437-.4824-1.5437-1.2543h0l-2.5085-23.7347c-.0965-.7719,.4824-1.5437,1.2543-1.5437l23.7347-2.605Z"/><path class="b" d="M12.9045,18.9347c-1.7367,.193-3.0874,1.7367-2.8945,3.5699,.193,1.7367,1.7367,3.0874,3.5699,2.8945,1.7367-.193,3.0874-1.7367,2.8945-3.5699s-1.8332-3.0874-3.5699-2.8945h0Zm8.7799,5.596l-4.6312,5.6925c-.193,.193-.4824,.2894-.6754,.0965h0l-1.0613-.8683c-.193-.193-.5789-.0965-.6754,.0965l-5.0171,6.1749c-.193,.193-.193,.5789,.0965,.6754-.0965,.0965,.0965,.0965,.193,.0965l19.9719-2.1226c.2894,0,.4824-.2894,.4824-.5789,0-.0965-.0965-.193-.0965-.2894l-7.8151-9.0694c-.2894-.0965-.5789-.0965-.7719,.0965h0Z"/><path class="b" d="M16.2814,13.8211l.6754-6.0784c.0965-.7719,.7719-1.3508,1.5437-1.2543l23.7347,2.5085c.7719,.0965,1.3508,.7719,1.2543,1.5437h0l-2.5085,23.7347c0,.6754-.7719,1.2543-1.5437,1.2543l-6.1749-.6754"/><path class="b" d="M32.7799,29.9337l5.3065,.5789c.2894,0,.4824-.193,.5789-.4824,0-.0965,0-.193-.0965-.2894l-5.789-10.5166c-.0965-.193-.4824-.2894-.6754-.193h0l-.3859,.3859"/>
          </svg>
        );
      case 'pdf':
        return (
          <svg width={size} height={size} viewBox="0 0 487.887 487.887" fill="#ff4757">
            <path d="M409.046,453.807c0,2.762-2.239,5-5,5H69.414c-2.761,0-5-2.238-5-5s2.239-5,5-5h334.632
              C406.808,448.807,409.046,451.045,409.046,453.807z M404.046,462.643H69.414c-2.761,0-5,2.238-5,5s2.239,5,5,5h334.632
              c2.761,0,5-2.238,5-5S406.808,462.643,404.046,462.643z M124.073,17.067c-2.761,0-5,2.238-5,5v342.819c0,2.762,2.239,5,5,5
              s5-2.238,5-5V22.067C129.073,19.306,126.834,17.067,124.073,17.067z M124.073,394.021c-2.761,0-5,2.238-5,5v15.588
              c0,2.762,2.239,5,5,5s5-2.238,5-5v-15.588C129.073,396.259,126.834,394.021,124.073,394.021z M261.382,343.332v-36.878
              c0-0.009,0-0.018,0-0.026V269.98c0-2.762,2.239-5,5-5h18.398c12.838,0,23.283,10.444,23.283,23.282
              c0,6.244-2.438,12.108-6.867,16.511c-4.396,4.37-10.219,6.771-16.412,6.771c-0.046,0-0.092,0-0.138,0l-13.265-0.076v31.863
              c0,2.762-2.239,5-5,5S261.382,346.094,261.382,343.332z M271.382,301.469l13.322,0.076c0.026,0,0.053,0,0.079,0
              c3.533,0,6.855-1.37,9.363-3.862c2.526-2.512,3.917-5.857,3.917-9.42c0-7.324-5.958-13.282-13.283-13.282h-13.398V301.469z
              M316.404,343.332V269.97c0-2.762,2.239-5,5-5c22.983,0,41.681,18.698,41.681,41.681c0,22.983-18.698,41.682-41.681,41.682
              C318.643,348.332,316.404,346.094,316.404,343.332z M326.404,337.938c15.102-2.403,26.681-15.518,26.681-31.286
              s-11.579-28.884-26.681-31.287V337.938z M376.425,348.332c2.761,0,5-2.238,5-5v-31.67h22.511c2.761,0,5-2.238,5-5s-2.239-5-5-5
              h-22.511V274.98h31.681c2.761,0,5-2.238,5-5s-2.239-5-5-5h-36.681c-2.761,0-5,2.238-5,5v73.352
              C371.425,346.094,373.664,348.332,376.425,348.332z M449.271,244.319v124.675c0,2.762-2.239,5-5,5h-17.3v42.674v21.273v44.945
              c0,2.762-2.239,5-5,5H43.616c-2.761,0-5-2.238-5-5v-44.933v-0.013V5c0-2.762,2.239-5,5-5h54.075h324.28c2.761,0,5,2.238,5,5v234.319
              h17.3C447.032,239.319,449.271,241.558,449.271,244.319z M48.616,432.941h44.075V10H48.616V432.941z M416.971,477.887v-34.945
              H97.817c-0.043,0.001-0.083,0.013-0.126,0.013H48.616v34.933H416.971z M416.971,373.994H226.115c-2.761,0-5-2.238-5-5V244.319
              c0-2.762,2.239-5,5-5h190.855V10h-314.28v422.941h314.28v-16.273V373.994z M439.271,249.319H231.115v114.675h208.156V249.319z"/>
          </svg>
        );
      case 'text':
        return (
          <svg width={size} height={size} viewBox="0 0 512 512" fill="#5f27cd">
            <g>
              <g>
                <path d="M466.896,87.86L381.384,2.348C379.882,0.844,377.842,0,375.716,0H119.182c-13.851,0-25.119,11.268-25.119,25.119v291.273
                  H67.875c-13.851,0-25.119,11.268-25.119,25.119v85.511c0,13.851,11.268,25.119,25.119,25.119h26.188v34.739
                  c0,13.851,11.268,25.119,25.119,25.119h324.944c13.851,0,25.119-11.268,25.119-25.119V93.528
                  C469.244,91.402,468.4,89.363,466.896,87.86z M383.733,27.37l58.141,58.141h-49.056c-5.01,0-9.086-4.076-9.086-9.086V27.37z
                  M67.875,436.109c-5.01,0-9.086-4.076-9.086-9.086v-85.511c0-5.01,4.076-9.086,9.086-9.086h230.881
                  c5.01,0,9.086,4.076,9.086,9.086v85.511c0,5.01-4.076,9.086-9.086,9.086H67.875z M453.211,486.881c0,5.01-4.076,9.086-9.086,9.086
                  H119.182c-5.01,0-9.086-4.076-9.086-9.086v-34.739h188.66c13.851,0,25.119-11.268,25.119-25.119v-85.511
                  c0-13.851-11.268-25.119-25.119-25.119h-188.66V25.119c0-5.01,4.076-9.086,9.086-9.086h248.518v60.393
                  c0,13.851,11.268,25.119,25.119,25.119h60.393V486.881z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M193.751,384.267l17.101-20.522c2.835-3.401,2.375-8.456-1.026-11.291c-3.401-2.835-8.456-2.375-11.291,1.026
                  l-15.22,18.264l-15.219-18.263c-2.835-3.403-7.891-3.862-11.291-1.026c-3.401,2.835-3.861,7.889-1.026,11.291l17.101,20.522
                  l-17.101,20.522c-2.836,3.4-2.375,8.455,1.026,11.29c1.499,1.248,3.318,1.858,5.128,1.858c2.296,0,4.577-0.982,6.163-2.885
                  l15.219-18.263l15.219,18.263c1.585,1.903,3.866,2.885,6.163,2.885c1.81,0,3.63-0.609,5.127-1.858
                  c3.401-2.835,3.861-7.89,1.026-11.291L193.751,384.267z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M136.284,350.597H84.977c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h17.637v43.29
                  c0,4.427,3.589,8.017,8.017,8.017s8.017-3.589,8.017-8.017v-43.29h17.637c4.427,0,8.017-3.589,8.017-8.017
                  S140.711,350.597,136.284,350.597z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M281.653,350.597h-51.307c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h17.637v43.29
                  c0,4.427,3.589,8.017,8.017,8.017s8.017-3.589,8.017-8.017v-43.29h17.637c4.427,0,8.017-3.589,8.017-8.017
                  S286.081,350.597,281.653,350.597z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M336.124,119.56l-12.093-12.093c-6.459-6.458-16.97-6.458-23.43,0l-109.09,109.09c-0.721,0.721-1.298,1.573-1.7,2.511
                  l-18.14,42.326c-1.291,3.013-0.618,6.508,1.7,8.827c1.535,1.535,3.585,2.348,5.67,2.348c1.065,0,2.138-0.212,3.156-0.648
                  l42.326-18.14c0.937-0.402,1.789-0.979,2.511-1.7l109.09-109.091C342.584,136.531,342.584,126.02,336.124,119.56z
                  M194.305,249.288l9.207-21.487l12.278,12.278L194.305,249.288z M227.412,229.028l-12.849-12.849l73.567-73.567l12.849,12.849
                  L227.412,229.028z M324.786,131.654l-12.471,12.471l-12.849-12.849l12.471-12.471c0.208-0.208,0.547-0.208,0.757,0l12.092,12.092
                  C324.995,131.105,324.995,131.445,324.786,131.654z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M375.716,256.534H247.449c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h128.267
                  c4.427,0,8.017-3.589,8.017-8.017S380.143,256.534,375.716,256.534z"/>
              </g>
            </g>
            <g>
              <g>
                <path d="M341.511,222.33h-59.858c-4.427,0-8.017,3.589-8.017,8.017s3.589,8.017,8.017,8.017h59.858
                  c4.427,0,8.017-3.589,8.017-8.017S345.939,222.33,341.511,222.33z"/>
              </g>
            </g>
          </svg>
        );
      case 'ppt':
        return (
          <svg width={size} height={size} viewBox="0 0 1024 1024" fill="#ff9ff3">
            <path d="M336.150126 671.57242c-79.30497 0-143.830841-64.517874-143.830841-143.83084s64.525871-143.828841 143.830841-143.828842 143.830841 64.515875 143.83084 143.828842-64.525871 143.830841-143.83084 143.83084z m0-271.679144c-70.495083 0-127.848303 57.35322-127.848304 127.848304s57.35322 127.848303 127.848304 127.848303 127.848303-57.35322 127.848303-127.848303-57.35322-127.848303-127.848303-127.848304z" fill="" /><path d="M336.150126 703.535496c-79.30497 0-143.830841-64.515875-143.830841-143.830841a7.986271 7.986271 0 0 1 7.992268-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269c0 70.497083 57.35322 127.850302 127.848304 127.850302s127.848303-57.35322 127.848303-127.850302a7.986271 7.986271 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.992268 7.990269c0 79.312966-64.525871 143.830841-143.83084 143.830841z" fill="" /><path d="M200.311553 567.694924a7.986271 7.986271 0 0 1-7.992268-7.992268v-31.961076a7.986271 7.986271 0 0 1 7.992268-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269v31.961076a7.986271 7.986271 0 0 1-7.990269 7.992268zM471.990697 567.694924a7.986271 7.986271 0 0 1-7.990269-7.992268v-31.961076a7.986271 7.986271 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.992268 7.990269v31.961076a7.98827 7.98827 0 0 1-7.992268 7.992268zM336.150126 591.66773c-35.247542 0-63.926151-28.670613-63.926151-63.92615s28.678609-63.924152 63.926151-63.924152 63.924152 28.668614 63.924151 63.924152-28.67661 63.926151-63.924151 63.92615z m0-111.867765c-26.437655 0-47.943614 21.505958-47.943614 47.941615s21.505958 47.941614 47.943614 47.941614 47.943614-21.505958 47.943613-47.941614-21.505958-47.941614-47.943613-47.941615z" fill="" /><path d="M389.775086 551.712387a8.01026 8.01026 0 0 1-7.662422-5.709334C376.119463 525.838468 357.220287 511.761042 336.150126 511.761042s-39.969337 14.077427-45.96054 34.242011c-1.257413 4.228026-5.649362 6.61691-9.941358 5.383486a8.002263 8.002263 0 0 1-5.383486-9.943357c7.998265-26.889444 33.1945-45.664678 61.287383-45.664678s53.289118 18.775233 61.287383 45.664678a8.006262 8.006262 0 0 1-5.383487 9.943357c-0.765642 0.219897-1.531285 0.325848-2.280935 0.325848zM296.120817 495.70254a7.970278 7.970278 0 0 1-5.649362-2.340907l-56.013846-56.013845a7.98827 7.98827 0 1 1 11.298725-11.298725l56.011846 56.013846a7.984272 7.984272 0 0 1 0 11.298724 7.962282 7.962282 0 0 1-5.647363 2.340907zM336.150126 671.57242a7.986271 7.986271 0 0 1-7.990269-7.992268v-79.90469a7.986271 7.986271 0 0 1 7.990269-7.992268 7.986271 7.986271 0 0 1 7.990269 7.992268v79.90469a7.986271 7.986271 0 0 1-7.990269 7.992268zM424.031091 144.194671c-39.657483 0-71.91642-32.258937-71.91642-71.914421 0-39.657483 32.258937-71.91642 71.91642-71.91642 23.806884 0 46.186434 12.14233 59.484225 31.961076H487.955243a7.986271 7.986271 0 0 1 7.990269 7.990269v63.926151A7.986271 7.986271 0 0 1 487.955243 112.231595h-4.439927c-13.303788 19.822744-35.683338 31.963075-59.484225 31.963076z m0-127.848304c-30.8396 0-55.933883 25.096282-55.933883 55.933883s25.096282 55.931884 55.933883 55.931883c19.672814 0 38.126198-10.720994 48.153516-27.982933a7.976276 7.976276 0 0 1 6.906775-3.980142h0.873592V48.309443h-0.873592a7.998265 7.998265 0 0 1-6.914772-3.980142c-10.167253-17.527816-28.160851-27.982934-48.145519-27.982934z" fill="" /><path d="M535.914849 112.233594H487.955243a7.986271 7.986271 0 0 1-7.990269-7.990269V40.317175A7.986271 7.986271 0 0 1 487.955243 32.326905h47.959606c2.123009 0 4.150062 0.843606 5.649362 2.340907l15.980538 15.980539a7.980274 7.980274 0 0 1 2.340907 5.649362v31.963075a7.980274 7.980274 0 0 1-2.340907 5.649362l-15.980538 15.980538a7.982273 7.982273 0 0 1-5.649362 2.342906z m-39.967338-15.982537h36.658883l11.298724-11.298724V59.606168l-11.298724-11.298724h-36.658883v47.943613z" fill="" /><path d="M519.934311 112.233594A7.986271 7.986271 0 0 1 511.944042 104.243325V40.317175c0-4.415938 3.574331-7.990269 7.990269-7.99027s7.990269 3.574331 7.990269 7.99027v63.92615a7.98827 7.98827 0 0 1-7.990269 7.990269zM471.974705 96.251057a7.974277 7.974277 0 0 1-5.649363-2.340907l-15.980538-15.982537a7.984272 7.984272 0 0 1 0-11.298724l15.980538-15.982537a7.98827 7.98827 0 1 1 11.298725 11.298724l-10.331176 10.331176 10.331176 10.331176a7.984272 7.984272 0 0 1 0 11.298724 7.94629 7.94629 0 0 1-5.649362 2.344905z" fill="" /><path d="M471.974705 96.251057h-47.941615a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269h47.941615a7.986271 7.986271 0 0 1 7.992268 7.990269 7.98827 7.98827 0 0 1-7.992268 7.990269zM471.974705 64.289981h-47.941615c-4.415938 0-7.990269-3.574331-7.990269-7.990269s3.574331-7.990269 7.990269-7.990269h47.941615c4.417937 0 7.992268 3.574331 7.992269 7.990269s-3.574331 7.990269-7.992269 7.990269zM631.802076 128.214133a7.984272 7.984272 0 0 1-7.990269-7.99027c0-22.035711-17.917634-39.951345-39.953345-39.951345a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269c30.8396 0 55.933883 25.096282 55.933883 55.933882a7.986271 7.986271 0 0 1-7.990269 7.99027z" fill="" /><path d="M631.802076 224.10136a7.984272 7.984272 0 0 1-7.990269-7.99027V120.223863a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269v95.887227a7.986271 7.986271 0 0 1-7.990269 7.99027zM519.934311 224.10136h-31.963076a7.986271 7.986271 0 0 1-7.990269-7.99027V184.148015a7.984272 7.984272 0 0 1 7.990269-7.990269h31.963076a7.984272 7.984272 0 0 1 7.990269 7.990269v31.961076a7.986271 7.986271 0 0 1-7.990269 7.992269z m-23.972807-15.982538H511.944042v-15.980538h-15.982538v15.980538zM935.444295 815.403261H88.443788a7.986271 7.986271 0 0 1-7.990269-7.990269V280.035242a7.986271 7.986271 0 0 1 7.990269-7.992268h847.000507a7.986271 7.986271 0 0 1 7.990269 7.992268v527.37775a7.986271 7.986271 0 0 1-7.990269 7.990269z m-839.010238-15.982537h831.019969V288.025511H96.434057v511.395213z" fill="" /><path d="M967.405371 288.025511H56.480713a7.986271 7.986271 0 0 1-7.990269-7.990269v-63.926151a7.986271 7.986271 0 0 1 7.990269-7.990269h910.924658a7.986271 7.986271 0 0 1 7.990269 7.990269v63.926151a7.986271 7.986271 0 0 1-7.990269 7.990269z m-902.934389-15.982537H959.415102v-47.943614H64.470982v47.943614z" fill="" /><path d="M919.461758 256.062436H104.426325a7.986271 7.986271 0 0 1-7.992268-7.992268 7.986271 7.986271 0 0 1 7.992268-7.990269h815.037432a7.986271 7.986271 0 0 1 7.990269 7.990269 7.986271 7.986271 0 0 1-7.992268 7.992268zM727.689303 1023.156254a7.856332 7.856332 0 0 1-3.574331-0.843606l-215.745261-107.871631a7.994267 7.994267 0 0 1-3.574331-10.720994c1.975078-3.950156 6.782833-5.571399 10.722993-3.574331l215.743262 107.871631a7.998265 7.998265 0 0 1 3.574331 10.720994 7.986271 7.986271 0 0 1-7.146663 4.417937zM791.611455 1023.156254a7.848335 7.848335 0 0 1-3.572331-0.843606l-279.669413-139.834707a7.992268 7.992268 0 0 1-3.574331-10.720994c1.975078-3.932164 6.782833-5.571399 10.722993-3.572332l279.667413 139.832708a7.990269 7.990269 0 1 1-3.574331 15.138931z" fill="" /><path d="M791.611455 1023.156254h-63.924151c-4.415938 0-7.990269-3.574331-7.990269-7.990269s3.574331-7.990269 7.990269-7.990269h63.924151c4.417937 0 7.992268 3.574331 7.992269 7.990269s-3.574331 7.990269-7.992269 7.990269zM296.206777 1023.156254a7.992268 7.992268 0 0 1-3.582328-15.138931l215.745262-107.871631c3.956153-1.997068 8.739919-0.375825 10.720994 3.574331a7.992268 7.992268 0 0 1-3.572332 10.720994l-215.747261 107.871631a7.856332 7.856332 0 0 1-3.564335 0.843606zM232.282625 1023.156254a7.992268 7.992268 0 0 1-3.582327-15.138931l279.669413-139.832708c3.956153-1.999067 8.739919-0.359832 10.720994 3.572332a7.992268 7.992268 0 0 1-3.572332 10.720994l-279.669413 139.834707a7.876322 7.876322 0 0 1-3.566335 0.843606z" fill="" /><path d="M296.19878 1023.156254H232.274629c-4.415938 0-7.990269-3.574331-7.990269-7.990269s3.574331-7.990269 7.990269-7.990269h63.924151c4.415938 0 7.992268 3.574331 7.992268 7.990269s-3.57633 7.990269-7.992268 7.990269zM495.961504 891.311817a7.986271 7.986271 0 0 1-7.990269-7.99027v-75.910554c0-4.415938 3.574331-7.990269 7.990269-7.990269s7.990269 3.574331 7.990269 7.990269v75.910554a7.984272 7.984272 0 0 1-7.990269 7.99027z" fill="" /><path d="M527.92458 891.311817a7.984272 7.984272 0 0 1-7.990269-7.99027v-75.910554a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269v75.910554a7.986271 7.986271 0 0 1-7.990269 7.99027z" fill="" /><path d="M527.92458 1023.156254a7.984272 7.984272 0 0 1-7.990269-7.990269v-99.883361a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269v99.883361a7.986271 7.986271 0 0 1-7.990269 7.990269z" fill="" /><path d="M527.92458 1023.156254h-31.963076c-4.415938 0-7.990269-3.574331-7.990269-7.990269s3.574331-7.990269 7.990269-7.990269h31.963076c4.415938 0 7.990269 3.574331 7.990269 7.990269s-3.574331 7.990269-7.990269 7.990269z" fill="" /><path d="M495.961504 1023.156254a7.986271 7.986271 0 0 1-7.990269-7.990269v-99.883361c0-4.415938 3.574331-7.990269 7.990269-7.990269s7.990269 3.574331 7.990269 7.990269v99.883361a7.984272 7.984272 0 0 1-7.990269 7.990269z" fill="" /><path d="M8.569084 479.799965a7.986271 7.986271 0 0 1-7.990269-7.992268c0-30.837601 25.094283-55.933883 55.931884-55.933882a7.986271 7.986271 0 0 1 7.990269 7.990269 7.986271 7.986271 0 0 1-7.990269 7.990269c-22.029714 0-39.951345 17.915635-39.951346 39.953344a7.986271 7.986271 0 0 1-7.990269 7.992268z" fill="" /><path d="M56.480713 527.74158c-30.837601 0-55.931884-25.096282-55.931884-55.933883a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269c0 22.035711 17.923631 39.953344 39.951346 39.953345a7.986271 7.986271 0 0 1 7.990269 7.990269 7.984272 7.984272 0 0 1-7.990269 7.990269zM168.348478 431.854353H56.512698a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269h111.83578a7.986271 7.986271 0 0 1 7.992268 7.990269 7.986271 7.986271 0 0 1-7.992268 7.990269z" fill="" /><path d="M967.373386 431.854353a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269c22.035711 0 39.953344-17.915635 39.953345-39.953345a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269c0.001999 30.8396-25.094283 55.933883-55.933883 55.933883z" fill="" /><path d="M1015.348985 383.912738a7.986271 7.986271 0 0 1-7.990269-7.992268c0-22.035711-17.917634-39.953344-39.953345-39.953344a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269c30.8396 0 55.933883 25.096282 55.933883 55.933882a7.986271 7.986271 0 0 1-7.990269 7.992268zM967.373386 431.854353h-79.872704a7.986271 7.986271 0 0 1-7.992269-7.990269 7.986271 7.986271 0 0 1 7.992269-7.990269h79.872704a7.986271 7.986271 0 0 1 7.990269 7.990269 7.984272 7.984272 0 0 1-7.990269 7.990269z" fill="" /><path d="M8.569084 719.516034a7.984272 7.984272 0 0 1-7.990269-7.990269c0-30.8396 25.094283-55.933883 55.931884-55.933883a7.986271 7.986271 0 0 1 7.990269 7.990269 7.986271 7.986271 0 0 1-7.990269 7.992268c-22.029714 0-39.951345 17.915635-39.951346 39.951346a7.986271 7.986271 0 0 1-7.990269 7.990269z" fill="" /><path d="M168.348478 671.57242H56.512698a7.986271 7.986271 0 0 1-7.990269-7.992268 7.986271 7.986271 0 0 1 7.990269-7.990269h111.83578a7.986271 7.986271 0 0 1 7.992268 7.990269 7.986271 7.986271 0 0 1-7.992268 7.992268z" fill="" /><path d="M967.373386 671.57242a7.986271 7.986271 0 0 1-7.990269-7.992268 7.986271 7.986271 0 0 1 7.990269-7.990269c22.035711 0 39.953344-17.915635 39.953345-39.951345a7.984272 7.984272 0 0 1 7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269 7.990269c0.001999 30.8396-25.094283 55.933883-55.933883 55.933882z" fill="" /><path d="M1015.348985 623.628807a7.984272 7.984272 0 0 1-7.990269-7.990269c0-22.035711-17.917634-39.953344-39.953345-39.953345a7.984272 7.984272 0 0 1-7.990269-7.98827 7.986271 7.986271 0 0 1 7.990269-7.992268c30.8396 0 55.933883 25.096282 55.933883 55.933883a7.986271 7.986271 0 0 1-7.990269 7.990269zM967.373386 671.57242h-207.723007a7.986271 7.986271 0 0 1-7.990269-7.992268 7.986271 7.986271 0 0 1 7.990269-7.990269h207.723007a7.986271 7.986271 0 0 1 7.990269 7.990269 7.986271 7.986271 0 0 1-7.990269 7.992268z" fill="" /><path d="M823.57653 431.854353H535.914849a7.986271 7.986271 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269h287.659682a7.986271 7.986271 0 0 1 7.990269 7.990269 7.982273 7.982273 0 0 1-7.98827 7.990269z" fill="" /><path d="M823.57653 479.799965H535.914849c-4.415938 0-7.990269-3.574331-7.990269-7.992268s3.574331-7.990269 7.990269-7.990269h287.659682c4.415938 0 7.990269 3.574331 7.990269 7.990269s-3.572332 7.992268-7.98827 7.992268z" fill="" /><path d="M823.57653 527.74158H535.914849a7.984272 7.984272 0 0 1-7.990269-7.990269 7.986271 7.986271 0 0 1 7.990269-7.990269h287.659682a7.986271 7.986271 0 0 1 7.990269 7.990269 7.982273 7.982273 0 0 1-7.98827 7.990269z" fill="" /><path d="M823.57653 575.699187H535.914849a7.984272 7.984272 0 0 1-7.990269-7.98827 7.986271 7.986271 0 0 1 7.990269-7.992268h287.659682a7.986271 7.986271 0 0 1 7.990269 7.992268 7.982273 7.982273 0 0 1-7.98827 7.98827z" fill="" /><path d="M823.57653 623.628807H535.914849c-4.415938 0-7.990269-3.574331-7.990269-7.990269s3.574331-7.990269 7.990269-7.990269h287.659682c4.415938 0 7.990269 3.574331 7.990269 7.990269s-3.572332 7.990269-7.98827 7.990269z" fill="" /><path d="M695.728227 671.57242h-159.811379a7.986271 7.986271 0 0 1-7.990269-7.992268 7.986271 7.986271 0 0 1 7.990269-7.990269h159.811379a7.984272 7.984272 0 0 1 7.98827 7.990269 7.984272 7.984272 0 0 1-7.98827 7.992268z" fill="" />
          </svg>
        );
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="#74b9ff">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
          </svg>
        );
    }
  };


  // Pagination functions
  const documentsPerPage = 2;
  const filteredDocuments = getDocumentsByFilter();
  const totalPages = Math.ceil(filteredDocuments.length / documentsPerPage);
  const startIndex = currentPage * documentsPerPage;
  
  // For blocks view, use pagination; for list view, show all documents
  const currentDocuments = viewMode === 'blocks' 
    ? filteredDocuments.slice(startIndex, startIndex + documentsPerPage)
    : filteredDocuments;

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
        <CommandLine 
          aiContext={aiContext}
          onAIResponse={handleAIResponse}
          onSearchChange={handleCommandSearch}
        />
        
        {/* Document Type Filter Links - Vertical Column */}
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
                  <path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M2.25 6C2.25 5.58579 2.58579 5.25 3 5.25H21C21.4142 5.25 21.75 5.58579 21.75 6C21.75 6.41421 21.4142 6.75 21 6.75H3C2.58579 6.75 2.25 6.41421 2.25 6ZM2.25 10C2.25 9.58579 2.58579 9.25 3 9.25H21C21.4142 9.25 21.75 9.58579 21.75 10C21.75 10.4142 21.4142 10.75 21 10.75H3C2.58579 10.75 2.25 10.4142 2.25 10ZM2.25 14C2.25 13.5858 2.58579 13.25 3 13.25H10C10.4142 13.25 10.75 13.5858 10.75 14C10.75 14.4142 10.4142 14.75 10 14.75H3C2.58579 14.75 2.25 14.4142 2.25 14ZM2.25 18C2.25 17.5858 2.58579 17.25 3 17.25H10C10.4142 17.25 10.75 17.5858 10.75 18C10.75 18.4142 10.4142 18.75 10 18.75H3C2.58579 18.75 2.25 18.4142 2.25 18Z" fill="#1C274C"/>
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

        {/* Documents Section */}
        <div className="documents-section" style={{ position: 'relative', zIndex: 10 }}>
          <div className="documents-header">
            <img src="/pic4.png" alt="My Documents" className="documents-header-image" />
          </div>
          
          {filteredDocuments.length > 0 && (
            <div className="pagination-info">
              <span>
                {viewMode === 'blocks' 
                  ? `Showing ${currentDocuments.length} of ${filteredDocuments.length} documents`
                  : `Showing all ${filteredDocuments.length} documents`}
                {selectedFilter !== 'all' ? ` (${selectedFilter.toUpperCase()} filter)` : ''}
                {' - '}
                <span className="view-mode-indicator">{viewMode === 'blocks' ? 'Blocks View' : 'List View'}</span>
              </span>
            </div>
          )}
          
          <div className={`documents-list ${viewMode === 'list' ? 'list-view' : 'blocks-view'}`}>
            {currentDocuments.length > 0 ? (
              currentDocuments.map((doc) => (
                <div 
                  key={doc.id} 
                  className="document-item"
                  onClick={() => window.open(doc.url, '_blank')}
                  style={{ cursor: 'pointer' }}
                  title="Click to open document"
                >
                  <div 
                    className="document-icon"
                    title="Open document"
                  >
                    {getDocumentIcon(doc.type)}
                  </div>
                  <div className="document-info">
                    <div className="document-name">
                      {doc.name}
                    </div>
                    {doc.description && (
                      <div className="document-description">
                        {doc.description}
                      </div>
                    )}
                    {viewMode === 'list' && (
                      <div className="document-meta">
                        <span className="document-type">{doc.type}</span>
                        {doc.dateAdded && <span className="document-date"> • Added {doc.dateAdded}</span>}
                      </div>
                    )}
                  </div>
                  <div className="document-actions">
                    {editMode ? (
                      <>
                        <button 
                          className="edit-document-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingDocument(doc);
                          }}
                          title="Edit document name"
                        >
                          ✏️
                        </button>
                        <button 
                          className="remove-document-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDocument(doc.id);
                          }}
                          title="Delete document"
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
            ) : (
              // Show "Coming Soon" message when no documents match the filter
              <div className="empty-state">
                <div className="empty-state-icon">
                  {selectedFilter === 'all' ? '📄' : 
                   selectedFilter === 'video' ? '🎬' : 
                   selectedFilter === 'image' ? '🖼️' : 
                   selectedFilter === 'pdf' ? '📄' : 
                   selectedFilter === 'text' ? '📝' : 
                   selectedFilter === 'ppt' ? '📊' : ' '}
                </div>
                <div className="empty-state-title">
                  {selectedFilter === 'all' ? 'Coming Soon' : `${filterLinks.find(f => f.type === selectedFilter)?.label || 'Documents'} Coming Soon`}
                </div>
                <div className="empty-state-subtitle">
                  {selectedFilter === 'all' 
                    ? 'New documents are in creation and will be available soon!' 
                    : `${filterLinks.find(f => f.type === selectedFilter)?.label || 'Documents'} are currently being prepared.`}
                </div>
              </div>
            )}
            
            {editMode && !isAddingDocument && !editingDocument && 
             (filteredDocuments.length === 0 || (viewMode === 'blocks' && currentPage === totalPages - 1) || viewMode === 'list') && (
              <div 
                className="document-item add-document-item"
                onClick={startAddingDocument}
              >
                <div className="document-icon">➕</div>
                <div className="document-info">
                  <div className="document-name">Add New Document</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Pagination Controls - Only show for blocks view */}
          {viewMode === 'blocks' && filteredDocuments.length > documentsPerPage && (
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
          
          {/* Document Form for adding or editing */}
          {(isAddingDocument || editingDocument) && (
            <div className="document-form-container">
              <div className="document-form glass-panel">
                <h3>{isAddingDocument ? 'Add New Document' : 'Edit Document'}</h3>
                <form onSubmit={handleDocumentFormSubmit}>
                  <div className="form-group">
                    <label htmlFor="type">Document Type:</label>
                    <select
                      id="type"
                      name="type"
                      value={documentFormData.type}
                      onChange={handleDocumentFormChange}
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
                    <label htmlFor="name">Document Name:</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={documentFormData.name}
                      onChange={handleDocumentFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                      id="description"
                      name="description"
                      value={documentFormData.description}
                      onChange={handleDocumentFormChange}
                      placeholder="Brief description of the document..."
                      rows="3"
                    />
                  </div>
                  {isAddingDocument && (
                    <div className="form-group">
                      <label htmlFor="url">Document URL:</label>
                      <input
                        type="text"
                        id="url"
                        name="url"
                        value={documentFormData.url}
                        onChange={handleDocumentFormChange}
                        placeholder="https://drive.google.com/file/d/... or youtube.com/..."
                        required
                      />
                    </div>
                  )}
                  <div className="form-actions">
                    <button type="submit" className="save-btn">
                      {isAddingDocument ? 'Add Document' : 'Save Changes'}
                    </button>
                    <button type="button" className="cancel-btn" onClick={cancelDocumentForm}>
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

export default Documents;
