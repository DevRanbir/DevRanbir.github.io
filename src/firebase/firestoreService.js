import { db, ensureAuthenticated } from './config';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs
} from 'firebase/firestore';

// Document ID for homepage data
const HOMEPAGE_DOC_ID = 'homepage-data';
// Document ID for documents data
const DOCUMENTS_DOC_ID = 'documents-data';
// Document ID for projects data
const PROJECTS_DOC_ID = 'projects-data';
// Document ID for about data
const ABOUT_DOC_ID = 'about-data';
// Document ID for contacts data
const CONTACTS_DOC_ID = 'contacts-data';

// Chat collection reference
const CHAT_COLLECTION = 'chat-messages';

// GitHub sync configuration
const GITHUB_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const GITHUB_SYNC_DOC_ID = 'github-sync-metadata';

// Helper to get document references lazily (db can be null if Firebase isn't configured)
const getHomepageDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', HOMEPAGE_DOC_ID);
};

const getDocumentsDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', DOCUMENTS_DOC_ID);
};

const getProjectsDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', PROJECTS_DOC_ID);
};

const getAboutDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', ABOUT_DOC_ID);
};

const getContactsDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', CONTACTS_DOC_ID);
};

const getGithubSyncDocRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, 'website-content', GITHUB_SYNC_DOC_ID);
};

const getChatCollectionRef = () => {
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return collection(db, 'chat-history');
};

// Default data structure
const defaultData = {
  socialLinks: [
    { id: 'github', url: 'https://github.com/yourname' },
    { id: 'linkedin', url: 'https://linkedin.com/in/yourname' },
    { id: 'twitter', url: 'https://twitter.com/yourname' },
    { id: 'instagram', url: 'https://instagram.com/yourname' },
    { id: 'mail', url: 'mailto:your.email@example.com' },
  ],
  authorDescription: "Full-stack developer passionate about creating beautiful web experiences. Specializing in React, Node.js, and modern JavaScript frameworks to build responsive and intuitive applications.",
  authorSkills: ['JavaScript', 'React', 'Node.js', 'Python', 'C++', 'HTML/CSS', 'MongoDB', 'Express.js'],
  lastUpdated: new Date().toISOString()
};

// Default documents data structure
const defaultDocumentsData = {
  documents: [],
  lastUpdated: new Date().toISOString()
};

// Default projects data structure
const defaultProjectsData = {
  projects: [],
  lastUpdated: new Date().toISOString()
};

// Default about data structure
const defaultAboutData = {
  githubReadmeUrl: 'https://api.github.com/repos/DevRanbir/DevRanbir/readme',
  githubUsername: 'DevRanbir',
  repositoryName: 'DevRanbir',
  lastUpdated: new Date().toISOString()
};

// Default contacts data structure
const defaultContactsData = {
  description: "Hola, I'd love to hear from you! Whether you have a question, a project idea, or just want to connect, feel free to reach out anytime. Use the live chat to start a conversation in real-time, explore the links to my work, or see where I'm currently based. I'm always happy to talk and aim to reply promptly. Let's connect!",
  socialBubbles: [
    { id: 'email', url: 'mailto:your.email@example.com', size: 80, color: '#be00ff', x: 15, y: 20 },
    { id: 'phone', url: 'tel:+1234567890', size: 65, color: '#8b00cc', x: 70, y: 15 },
    { id: 'linkedin', url: 'https://linkedin.com/in/yourname', size: 90, color: '#e600ff', x: 25, y: 55 },
    { id: 'twitter', url: 'https://twitter.com/yourname', size: 70, color: '#d400e6', x: 75, y: 60 },
    { id: 'github', url: 'https://github.com/yourname', size: 85, color: '#be00ff', x: 50, y: 85 },
    { id: 'discord', url: 'https://discord.gg/yourserver', size: 75, color: '#cc00e6', x: 10, y: 80 }
  ],
  locationDetails: {
    location: 'Khanna City, Punjab, India',
    responseTime: 'within 24 hours',
    status: 'Available'
  },
  lastUpdated: new Date().toISOString()
};

// Function to get GitHub token from Firebase or environment variable
export const getGitHubToken = async () => {
  try {
    // First, try to get token from environment variable
    const envToken = process.env.REACT_APP_GITHUB_TOKEN;
    if (envToken) {
      console.log('Using GitHub token from environment variable');
      return envToken;
    }
    
    // If not in env, try to get from Firebase
    await ensureAuthenticated();
    const tokenDocRef = doc(db, 'github-token', 'token');
    const tokenSnap = await getDoc(tokenDocRef);
    
    if (tokenSnap.exists()) {
      const tokenData = tokenSnap.data();
      console.log('Using GitHub token from Firebase');
      return tokenData.value;
    }
    
    console.warn('No GitHub token found in environment or Firebase');
    return null;
  } catch (error) {
    console.error('Error fetching GitHub token:', error);
    // Return env token as fallback
    return process.env.REACT_APP_GITHUB_TOKEN || null;
  }
};

// Initialize the document with default data if it doesn't exist
export const initializeHomepageData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getHomepageDocRef());
    
    if (!docSnap.exists()) {
      await setDoc(getHomepageDocRef(), defaultData);
      console.log('Homepage data initialized with default values');
      return defaultData;
    } else {
      console.log('Homepage data already exists');
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error initializing homepage data:', error);
    throw error;
  }
};

// Get homepage data
export const getHomepageData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getHomepageDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // If document doesn't exist, initialize it
      return await initializeHomepageData();
    }
  } catch (error) {
    console.error('Error getting homepage data:', error);
    throw error;
  }
};

// Update social links
export const updateSocialLinks = async (socialLinks) => {
  try {
    await updateDoc(getHomepageDocRef(), {
      socialLinks: socialLinks.map(({ id, url }) => ({ id, url })), // Remove JSX icons for storage
      lastUpdated: new Date().toISOString()
    });
    console.log('Social links updated successfully');
  } catch (error) {
    console.error('Error updating social links:', error);
    throw error;
  }
};

// Update author description
export const updateAuthorDescription = async (description) => {
  try {
    await updateDoc(getHomepageDocRef(), {
      authorDescription: description,
      lastUpdated: new Date().toISOString()
    });
    console.log('Author description updated successfully');
  } catch (error) {
    console.error('Error updating author description:', error);
    throw error;
  }
};

// Update author skills
export const updateAuthorSkills = async (skills) => {
  try {
    await updateDoc(getHomepageDocRef(), {
      authorSkills: skills,
      lastUpdated: new Date().toISOString()
    });
    console.log('Author skills updated successfully');
  } catch (error) {
    console.error('Error updating author skills:', error);
    throw error;
  }
};

// Listen to real-time updates
export const subscribeToHomepageData = (callback) => {
  return onSnapshot(getHomepageDocRef(), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      console.log('No such document!');
    }
  }, (error) => {
    console.error('Error listening to homepage data:', error);
  });
};

// Update all homepage data at once
export const updateHomepageData = async (data) => {
  try {
    const updateData = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    // Remove JSX icons from social links before storing
    if (updateData.socialLinks) {
      updateData.socialLinks = updateData.socialLinks.map(({ id, url }) => ({ id, url }));
    }
    
    await updateDoc(getHomepageDocRef(), updateData);
    console.log('Homepage data updated successfully');
  } catch (error) {
    console.error('Error updating homepage data:', error);
    throw error;
  }
};

// Documents Related Functions

// Initialize documents data
export const initializeDocumentsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getDocumentsDocRef());
    
    if (!docSnap.exists()) {
      await setDoc(getDocumentsDocRef(), defaultDocumentsData);
      console.log('Documents data initialized with default values');
      return defaultDocumentsData;
    } else {
      console.log('Documents data already exists');
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error initializing documents data:', error);
    throw error;
  }
};

// Get documents data
export const getDocumentsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getDocumentsDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // If document doesn't exist, initialize it
      return await initializeDocumentsData();
    }
  } catch (error) {
    console.error('Error getting documents data:', error);
    throw error;
  }
};

// Update documents
export const updateDocuments = async (documents) => {
  try {
    await updateDoc(getDocumentsDocRef(), {
      documents: documents,
      lastUpdated: new Date().toISOString()
    });
    console.log('Documents updated successfully');
  } catch (error) {
    console.error('Error updating documents:', error);
    throw error;
  }
};

// Listen to real-time updates for documents
export const subscribeToDocumentsData = (callback) => {
  return onSnapshot(getDocumentsDocRef(), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    } else {
      console.log('No documents data document!');
    }
  }, (error) => {
    console.error('Error listening to documents data:', error);
  });
};

// Projects Related Functions

// Initialize projects data
export const initializeProjectsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getProjectsDocRef());
    
    if (!docSnap.exists()) {
      await setDoc(getProjectsDocRef(), defaultProjectsData);
      console.log('Projects data initialized with default values');
      return defaultProjectsData;
    } else {
      console.log('Projects data already exists');
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error initializing projects data:', error);
    throw error;
  }
};

// Get projects data
export const getProjectsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getProjectsDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // If document doesn't exist, initialize it
      return await initializeProjectsData();
    }
  } catch (error) {
    console.error('Error getting projects data:', error);
    throw error;
  }
};

// Update projects with automatic user edit tracking
export const updateProjects = async (projects) => {
  try {
    // Get current projects to compare for user edits
    const currentProjectsData = await getProjectsData();
    const currentProjects = currentProjectsData.projects || [];
    
    // Track user edits for GitHub projects
    const updatedProjects = projects.map(project => {
      const currentProject = currentProjects.find(p => p.id === project.id);
      
      // If this is a GitHub project and description changed, mark as user-edited
      if (currentProject && currentProject.isFromGitHub && project.isFromGitHub) {
        const oldDescription = currentProject.description || '';
        const newDescription = project.description || '';
        
        // Only mark as user-edited if description actually changed and it's not a sync operation
        if (oldDescription !== newDescription && !project.lastGithubSync) {
          console.log(`📝 User edit detected for ${project.name}: marking as user-edited`);
          return {
            ...project,
            userEdited: true,
            lastUserEdit: new Date().toISOString()
          };
        } else if (project.lastGithubSync && oldDescription !== newDescription) {
          // This is a sync operation - preserve existing user edit status but update sync info
          return {
            ...project,
            userEdited: currentProject.userEdited || false,
            lastUserEdit: currentProject.lastUserEdit || null
          };
        }
      }
      
      return project;
    });
    
    await updateDoc(getProjectsDocRef(), {
      projects: updatedProjects,
      lastUpdated: new Date().toISOString()
    });
    console.log('Projects updated successfully with edit tracking');
  } catch (error) {
    console.error('Error updating projects:', error);
    throw error;
  }
};

// Listen to real-time updates for projects
export const subscribeToProjectsData = (callback) => {
  return onSnapshot(getProjectsDocRef(), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// === ABOUT DATA MANAGEMENT ===

// Initialize about data
export const initializeAboutData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getAboutDocRef());
    
    if (!docSnap.exists()) {
      await setDoc(getAboutDocRef(), defaultAboutData);
      console.log('About data initialized with default values');
      return defaultAboutData;
    } else {
      console.log('About data already exists');
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error initializing about data:', error);
    throw error;
  }
};

// Get about data
export const getAboutData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getAboutDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // If document doesn't exist, initialize it
      return await initializeAboutData();
    }
  } catch (error) {
    console.error('Error getting about data:', error);
    throw error;
  }
};

// Update about data
export const updateAboutData = async (aboutData) => {
  try {
    await updateDoc(getAboutDocRef(), {
      ...aboutData,
      lastUpdated: new Date().toISOString()
    });
    console.log('About data updated successfully');
  } catch (error) {
    console.error('Error updating about data:', error);
    throw error;
  }
};

// Listen to real-time updates for about data
export const subscribeToAboutData = (callback) => {
  return onSnapshot(getAboutDocRef(), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// Contacts Related Functions

// Initialize contacts data with default values if document doesn't exist
export const initializeContactsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getContactsDocRef());
    
    if (!docSnap.exists()) {
      await setDoc(getContactsDocRef(), defaultContactsData);
      console.log('Contacts data initialized with default values');
      return defaultContactsData;
    } else {
      console.log('Contacts data already exists');
      return docSnap.data();
    }
  } catch (error) {
    console.error('Error initializing contacts data:', error);
    throw error;
  }
};

// Get contacts data from Firestore
export const getContactsData = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getContactsDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // If document doesn't exist, initialize it
      return await initializeContactsData();
    }
  } catch (error) {
    console.error('Error getting contacts data:', error);
    throw error;
  }
};

// Update contacts description
export const updateContactsDescription = async (description) => {
  try {
    await updateDoc(getContactsDocRef(), {
      description: description,
      lastUpdated: new Date().toISOString()
    });
    console.log('Contacts description updated successfully');
  } catch (error) {
    console.error('Error updating contacts description:', error);
    throw error;
  }
};

// Update social media bubbles
export const updateSocialBubbles = async (socialBubbles) => {
  try {
    await updateDoc(getContactsDocRef(), {
      socialBubbles: socialBubbles,
      lastUpdated: new Date().toISOString()
    });
    console.log('Social bubbles updated successfully');
  } catch (error) {
    console.error('Error updating social bubbles:', error);
    throw error;
  }
};

// Update location details
export const updateLocationDetails = async (locationDetails) => {
  try {
    await updateDoc(getContactsDocRef(), {
      locationDetails: locationDetails,
      lastUpdated: new Date().toISOString()
    });
    console.log('Location details updated successfully');
  } catch (error) {
    console.error('Error updating location details:', error);
    throw error;
  }
};

// Listen to real-time updates for contacts data
export const subscribeToContactsData = (callback) => {
  return onSnapshot(getContactsDocRef(), (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// ====================== CHAT FUNCTIONS ======================

// Generate anonymous user ID
export const generateAnonymousUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Generate message ID
const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

// Create or get chat document reference using a combination of userName and userId
const getChatDocRef = (userName, userId) => {
  // Use combination of userName and userId to ensure uniqueness
  // This prevents users with same name from seeing each other's chats
  const safeUserName = userName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Extract timestamp from userId for uniqueness
  const userIdSuffix = userId.split('_')[1] || Date.now();
  const safeDocId = `${safeUserName}_${userIdSuffix}`;
  
  console.log('🔑 Document ID for userName:', userName, 'userId:', userId, '→', safeDocId);
  
  if (!db) throw new Error('Firebase is not configured. Check your environment variables.');
  return doc(db, CHAT_COLLECTION, safeDocId);
};

// Send a message to chat (creates or updates user's chat document)
export const sendChatMessage = async (message, userId, userName = null) => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    
    if (!userName) {
      throw new Error('Username is required for chat messages');
    }
    
    // Get chat document reference using both userName and userId for uniqueness
    const chatDocRef = getChatDocRef(userName, userId);
    const chatDoc = await getDoc(chatDocRef);
    
    const messageId = generateMessageId();
    const newMessage = {
      sender: 'user',
      message: message.trim(),
      timestamp: now,
      expiresAt: expiresAt
    };
    
    if (chatDoc.exists()) {
      // Update existing chat document
      const chatData = chatDoc.data();
      
      console.log('📝 Adding message to existing chat document for:', userName);
      console.log('🔍 Current messages count:', Object.keys(chatData.messages || {}).length);
      
      // Add new message to the messages map
      await updateDoc(chatDocRef, {
        [`messages.${messageId}`]: newMessage,
        lastUpdated: now
      });
      
      console.log('✅ Message added to existing chat for user:', userName, 'message ID:', messageId);
    } else {
      // Create new chat document with the structure from your image
      console.log('📄 Creating new chat document for:', userName);
      
      const newChatData = {
        userName: userName,
        userId: userId,
        supportAgentName: 'Support Team',
        createdAt: now,
        lastUpdated: now,
        messages: {
          [messageId]: newMessage
        }
      };
      
      await setDoc(chatDocRef, newChatData);
      console.log('✅ New chat document created for user:', userName, 'message ID:', messageId);
    }
    
    return { 
      success: true, 
      messageId, 
      userName,
      chatDocId: chatDocRef.id 
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Send response from support (adds to existing chat document)
export const sendSupportResponse = async (message, userName, userId = null) => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    
    if (!userName) {
      throw new Error('Username is required for support responses');
    }
    
    if (!userId) {
      throw new Error('User ID is required for support responses');
    }
    
    // Get chat document reference using both userName and userId
    const chatDocRef = getChatDocRef(userName, userId);
    const chatDoc = await getDoc(chatDocRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat document not found for user: ' + userName + ' with ID: ' + userId);
    }
    
    const messageId = generateMessageId();
    const newMessage = {
      sender: 'support',
      message: message.trim(),
      timestamp: now,
      expiresAt: expiresAt
    };
    
    // Add support message to the messages map
    await updateDoc(chatDocRef, {
      [`messages.${messageId}`]: newMessage,
      lastUpdated: now
    });
    
    console.log('Support response sent to chat for user:', userName, 'userId:', userId, 'message ID:', messageId);
    return { 
      success: true, 
      messageId, 
      userName,
      userId,
      chatDocId: chatDocRef.id 
    };
  } catch (error) {
    console.error('Error sending support response:', error);
    throw error;
  }
};

// Subscribe to chat messages for a user (document-based using userName and userId)
export const subscribeToChatMessages = (userId, callback) => {
  try {
    // Get userName from localStorage since we need it for the document ID
    const userName = localStorage.getItem('chatUserName');
    
    if (!userName) {
      console.log('❌ No userName found in localStorage, returning empty messages');
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
    
    if (!userId) {
      console.log('❌ No userId provided, returning empty messages');
      callback([]);
      return () => {}; // Return empty unsubscribe function
    }
    
    console.log('👂 Subscribing to chat messages for userName:', userName, 'userId:', userId);
    const chatDocRef = getChatDocRef(userName, userId);

    return onSnapshot(chatDocRef, (doc) => {
      console.log('🔄 Firestore snapshot received for:', userName);
      
      if (doc.exists()) {
        console.log('📄 Document exists, processing messages...');
        const chatData = doc.data();
        const messages = [];
        
        console.log('🔍 Raw chat data:', {
          userName: chatData.userName,
          userId: chatData.userId,
          messagesCount: Object.keys(chatData.messages || {}).length
        });
        
        // Convert messages map to array and sort by timestamp
        if (chatData.messages) {
          Object.entries(chatData.messages).forEach(([msgId, msgData]) => {
            console.log('🔍 Processing message:', msgId, msgData);
            
            // Check if message has expired
            const expiresAt = msgData.expiresAt?.toDate ? msgData.expiresAt.toDate() : new Date(msgData.expiresAt);
            if (expiresAt > new Date()) {
              // Handle timestamp conversion properly
              let messageTimestamp;
              if (msgData.timestamp?.toDate) {
                messageTimestamp = msgData.timestamp.toDate();
              } else if (msgData.timestamp) {
                messageTimestamp = new Date(msgData.timestamp);
              } else {
                messageTimestamp = new Date();
              }
              
              const processedMessage = {
                id: msgId,
                sender: msgData.sender,
                message: msgData.message,
                timestamp: messageTimestamp,
                userName: msgData.sender === 'support' ? chatData.supportAgentName : chatData.userName,
                userId: chatData.userId
              };
              
              console.log('✅ Adding message to array:', processedMessage);
              messages.push(processedMessage);
            } else {
              console.log('⏰ Message expired, skipping:', msgId);
            }
          });
          
          // Sort messages by timestamp (oldest first)
          messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        
        console.log(`📨 Final messages array for ${userName} (${userId}):`, messages.length, 'messages');
        callback(messages);
      } else {
        console.log(`❌ No chat document found for user: ${userName} with userId: ${userId}`);
        callback([]);
      }
    }, (error) => {
      console.error('❌ Error subscribing to chat messages:', error);
      callback([]);
    });
  } catch (error) {
    console.error('Error subscribing to chat messages:', error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

// Subscribe to all chat documents (for admin/support)
export const subscribeToAllChatThreads = (callback) => {
  try {
    const q = query(
      getChatCollectionRef(),
      orderBy('lastUpdated', 'desc'),
      limit(100)
    );

    return onSnapshot(q, (querySnapshot) => {
      const chats = [];
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        const messages = [];
        
        // Convert messages map to array
        if (chatData.messages) {
          Object.entries(chatData.messages).forEach(([msgId, msgData]) => {
            // Check if message has expired
            const expiresAt = msgData.expiresAt?.toDate ? msgData.expiresAt.toDate() : new Date(msgData.expiresAt);
            if (expiresAt > new Date()) {
              messages.push({
                id: msgId,
                sender: msgData.sender,
                message: msgData.message,
                timestamp: msgData.timestamp?.toDate ? msgData.timestamp.toDate() : new Date(msgData.timestamp),
                userName: msgData.sender === 'support' ? chatData.supportAgentName : chatData.userName
              });
            }
          });
          
          // Sort messages by timestamp
          messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        
        chats.push({
          id: doc.id,
          userName: chatData.userName,
          userId: chatData.userId,
          supportAgentName: chatData.supportAgentName,
          createdAt: chatData.createdAt,
          lastUpdated: chatData.lastUpdated,
          messages: messages
        });
      });
      
      callback(chats);
    });
  } catch (error) {
    console.error('Error subscribing to all chat threads:', error);
    throw error;
  }
};

// Delete a user's chat document (for reset functionality)
export const deleteChatThread = async (userName, userId = null) => {
  try {
    if (!userName) {
      console.log('No userName provided for deletion');
      return { success: true, message: 'No userName provided' };
    }
    
    if (!userId) {
      console.log('No userId provided for deletion');
      return { success: true, message: 'No userId provided' };
    }
    
    const chatDocRef = getChatDocRef(userName, userId);
    
    console.log('🗑️ Deleting chat document for user:', userName, 'userId:', userId);
    
    // Check if document exists before deleting
    const chatDoc = await getDoc(chatDocRef);
    if (chatDoc.exists()) {
      await deleteDoc(chatDocRef);
      console.log('✅ Chat document deleted successfully');
      return { success: true, userName, userId, chatDocId: chatDocRef.id };
    } else {
      console.log('ℹ️ No chat document found to delete for user:', userName, 'userId:', userId);
      return { success: true, userName, userId, message: 'No chat document found' };
    }
  } catch (error) {
    console.error('❌ Error deleting chat document:', error);
    throw error;
  }
};

/**
 * Test function to verify the chat system with new structure
 */
export const testChatFlow = async (testUserId = 'test-user-flow') => {
  try {
    console.log('🧪 Starting chat flow test with new structure...');
    
    const testUserName = 'Test_User';
    
    // Step 1: Send a user message
    console.log('📤 Step 1: Sending user message...');
    const userResult = await sendChatMessage(
      'This is a test message from the website', 
      testUserId, 
      testUserName
    );
    console.log('✅ User message sent:', userResult);
    
    // Step 2: Send a support response
    console.log('📤 Step 2: Sending support response...');
    const supportResult = await sendSupportResponse(
      'This is a test response from support',
      testUserName,
      testUserId
    );
    console.log('✅ Support response sent:', supportResult);
    
    // Step 3: Subscribe to messages and verify both appear
    console.log('👂 Step 3: Listening for messages...');
    
    // Temporarily store userName in localStorage for the test
    const originalUserName = localStorage.getItem('chatUserName');
    localStorage.setItem('chatUserName', testUserName);
    
    const unsubscribe = subscribeToChatMessages(testUserId, (messages) => {
      console.log(`📨 Received ${messages.length} messages for user ${testUserName}:`);
      messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.sender}] ${msg.message}`);
        console.log(`     - ID: ${msg.id}`);
        console.log(`     - Timestamp: ${msg.timestamp}`);
      });
      
      if (messages.length >= 2) {
        console.log('✅ Both messages found! Flow test successful.');
        // Restore original userName
        if (originalUserName) {
          localStorage.setItem('chatUserName', originalUserName);
        } else {
          localStorage.removeItem('chatUserName');
        }
        unsubscribe(); // Stop listening after verification
      }
    });
    
    // Stop test after 10 seconds if not completed
    setTimeout(() => {
      unsubscribe();
      // Restore original userName
      if (originalUserName) {
        localStorage.setItem('chatUserName', originalUserName);
      } else {
        localStorage.removeItem('chatUserName');
      }
      console.log('⏰ Test timeout reached');
    }, 10000);
    
    return {
      success: true,
      testUserId,
      testUserName,
      userResult,
      supportResult
    };
    
  } catch (error) {
    console.error('❌ Chat flow test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete expired chat messages (older than 2 hours)
 * This function should be called periodically to clean up old messages
 */
export const cleanupExpiredMessages = async () => {
  // Skip cleanup if Firebase is not configured
  if (!db) {
    console.warn('⚠️ Skipping chat cleanup - Firebase is not configured');
    return { success: false, reason: 'Firebase not configured', deletedMessages: 0, deletedChats: 0 };
  }

  try {
    console.log('🧹 Starting cleanup of expired chat messages...');
    
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    
    const q = query(
      getChatCollectionRef(),
      where('lastUpdated', '<', cutoffTime)
    );
    
    const querySnapshot = await getDocs(q);
    const processedChats = [];
    let totalDeletedMessages = 0;
    
    // Process each chat document
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const chatData = docSnapshot.data();
        const messages = chatData.messages || {};
        let deletedMessagesCount = 0;
        let updatedMessages = {};
        
        // Check each message for expiration
        Object.entries(messages).forEach(([msgId, msgData]) => {
          const expiresAt = msgData.expiresAt?.toDate ? msgData.expiresAt.toDate() : new Date(msgData.expiresAt);
          if (expiresAt > now) {
            // Keep non-expired messages
            updatedMessages[msgId] = msgData;
          } else {
            // Count expired messages for deletion
            deletedMessagesCount++;
          }
        });
        
        if (deletedMessagesCount > 0) {
          if (Object.keys(updatedMessages).length === 0) {
            // Delete entire document if no messages remain
            await deleteDoc(docSnapshot.ref);
            console.log(`🗑️ Deleted entire chat document: ${docSnapshot.id} (${deletedMessagesCount} expired messages)`);
          } else {
            // Update document with remaining messages
            await updateDoc(docSnapshot.ref, {
              messages: updatedMessages,
              lastUpdated: now
            });
            console.log(`🧹 Cleaned ${deletedMessagesCount} expired messages from chat: ${docSnapshot.id}`);
          }
          
          totalDeletedMessages += deletedMessagesCount;
          processedChats.push({
            id: docSnapshot.id,
            userName: chatData.userName,
            deletedMessages: deletedMessagesCount,
            remainingMessages: Object.keys(updatedMessages).length
          });
        }
      } catch (deleteError) {
        console.error(`❌ Error processing chat ${docSnapshot.id}:`, deleteError);
      }
    }
    
    console.log(`✅ Cleanup completed. Processed ${processedChats.length} chats, deleted ${totalDeletedMessages} expired messages.`);
    
    return {
      success: true,
      deletedCount: totalDeletedMessages,
      processedChats: processedChats
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Start automatic cleanup interval
 * This will run cleanup every 30 minutes
 */
export const startAutoCleanup = () => {
  console.log('🕒 Starting automatic cleanup interval (every 30 minutes)...');
  
  // Run cleanup immediately
  cleanupExpiredMessages();
  
  // Set up interval to run every 30 minutes
  const cleanupInterval = setInterval(() => {
    cleanupExpiredMessages();
  }, 30 * 60 * 1000); // 30 minutes in milliseconds
  
  // Return the interval ID so it can be cleared if needed
  return cleanupInterval;
};

/**
 * Stop automatic cleanup
 */
export const stopAutoCleanup = (intervalId) => {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('🛑 Automatic cleanup stopped.');
  }
};

/**
 * Manual cleanup function for testing
 * This will delete all messages older than the specified hours
 */
export const manualCleanup = async (hoursOld = 2) => {
  try {
    const cutoffTime = new Date(Date.now() - (hoursOld * 60 * 60 * 1000));
    console.log(`🧹 Manual cleanup: Deleting messages older than ${hoursOld} hours...`);
    
    const q = query(
      getChatCollectionRef(),
      where('lastUpdated', '<', cutoffTime)
    );
    
    const querySnapshot = await getDocs(q);
    const processedChats = [];
    let totalDeletedMessages = 0;
    
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const chatData = docSnapshot.data();
        const messages = chatData.messages || {};
        let deletedMessagesCount = 0;
        let updatedMessages = {};
        
        // Check each message against cutoff time
        Object.entries(messages).forEach(([msgId, msgData]) => {
          const messageTime = msgData.timestamp?.toDate ? msgData.timestamp.toDate() : new Date(msgData.timestamp);
          if (messageTime > cutoffTime) {
            // Keep newer messages
            updatedMessages[msgId] = msgData;
          } else {
            // Count older messages for deletion
            deletedMessagesCount++;
          }
        });
        
        if (deletedMessagesCount > 0) {
          if (Object.keys(updatedMessages).length === 0) {
            // Delete entire document if no messages remain
            await deleteDoc(docSnapshot.ref);
            console.log(`🗑️ Deleted entire chat document: ${docSnapshot.id}`);
          } else {
            // Update document with remaining messages
            await updateDoc(docSnapshot.ref, {
              messages: updatedMessages,
              lastUpdated: new Date()
            });
            console.log(`🧹 Cleaned old messages from chat: ${docSnapshot.id}`);
          }
          
          totalDeletedMessages += deletedMessagesCount;
          processedChats.push({
            id: docSnapshot.id,
            userName: chatData.userName,
            deletedMessages: deletedMessagesCount,
            remainingMessages: Object.keys(updatedMessages).length,
            createdAt: chatData.createdAt
          });
        }
      } catch (deleteError) {
        console.error(`❌ Error processing chat ${docSnapshot.id}:`, deleteError);
      }
    }
    
    console.log(`✅ Manual cleanup completed. Processed ${processedChats.length} chats, deleted ${totalDeletedMessages} old messages.`);
    
    return {
      success: true,
      deletedCount: totalDeletedMessages,
      cutoffTime: cutoffTime.toISOString(),
      processedChats: processedChats
    };
    
  } catch (error) {
    console.error('❌ Error during manual cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ====================== GITHUB SYNC FUNCTIONS ======================

/**
 * Get GitHub sync metadata
 */
export const getGithubSyncMetadata = async () => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    const docSnap = await getDoc(getGithubSyncDocRef());
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Initialize with default metadata
      const defaultMetadata = {
        lastSyncTime: null,
        lastSyncSuccess: null,
        syncErrors: [],
        syncedProjects: {},
        isAutoSyncEnabled: false,
        syncIntervalId: null
      };
      await setDoc(getGithubSyncDocRef(), defaultMetadata);
      return defaultMetadata;
    }
  } catch (error) {
    console.error('Error getting GitHub sync metadata:', error);
    throw error;
  }
};

/**
 * Update GitHub sync metadata
 */
export const updateGithubSyncMetadata = async (metadata) => {
  try {
    // Ensure user is authenticated before making Firestore calls
    await ensureAuthenticated();
    
    await updateDoc(getGithubSyncDocRef(), {
      ...metadata,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating GitHub sync metadata:', error);
    throw error;
  }
};

/**
 * Smart sync GitHub repository descriptions with Firestore
 * This function respects user edits and only syncs when appropriate
 * RULE: User edits are NEVER overwritten
 */
export const syncGithubDescriptions = async (username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir') => {
  try {
    console.log('🔄 Starting smart GitHub description sync...');
    
    // Get current projects from Firestore first
    const projectsData = await getProjectsData();
    const currentProjects = projectsData.projects || [];
    
    // Filter GitHub projects only
    const githubProjects = currentProjects.filter(project => project.isFromGitHub);
    
    console.log(`📊 Current state: ${githubProjects.length} GitHub projects in database`);
    
    // Check if we need to fetch from GitHub
    const userEditedProjects = githubProjects.filter(p => p.userEdited === true);
    const nonUserEditedProjects = githubProjects.filter(p => p.userEdited !== true);
    
    console.log(`🔒 ${userEditedProjects.length} projects are user-edited (will be preserved)`);
    console.log(`📝 ${nonUserEditedProjects.length} projects can be synced from GitHub`);
    
    // Only fetch from GitHub if we have projects to sync OR if we have no projects yet
    let latestRepos = [];
    let shouldFetchFromGitHub = nonUserEditedProjects.length > 0;
    
    // Also check if we might have new repositories (do a lightweight check first)
    if (!shouldFetchFromGitHub && githubProjects.length === 0) {
      console.log('📡 No GitHub projects in database, fetching to check for new repositories...');
      shouldFetchFromGitHub = true;
    }
    
    if (shouldFetchFromGitHub) {
      console.log('📡 Fetching latest repository data from GitHub...');
      // Import GitHub service
      const { default: githubRepoService } = await import('../services/githubRepoService');
      
      latestRepos = await githubRepoService.getRepositoriesAsProjects(username, {
        excludeForks: true,
        excludePrivate: false
      });
      console.log(`📡 Found ${latestRepos.length} repositories on GitHub`);
    } else {
      console.log('ℹ️ Skipping GitHub fetch - all projects are user-edited');
      return {
        success: true,
        updatedCount: 0,
        addedCount: 0,
        totalChecked: githubProjects.length,
        totalRepos: 0,
        errors: [],
        message: `No sync needed - all ${githubProjects.length} GitHub projects are user-edited`
      };
    }
    
    let updatedCount = 0;
    let addedCount = 0;
    const updatedProjects = [...currentProjects];
    const syncErrors = [];
    const syncedProjectsMetadata = {};
    
    // First, add any new GitHub repos that aren't in the database
    for (const latestRepo of latestRepos) {
      const existingProject = currentProjects.find(p => 
        p.isFromGitHub && (
          p.name === latestRepo.name || 
          p.id === latestRepo.id ||
          p.repoUrl === latestRepo.repoUrl
        )
      );
      
      if (!existingProject) {
        console.log(`➕ Adding new GitHub project: ${latestRepo.name}`);
        updatedProjects.push({
          ...latestRepo,
          lastGithubSync: new Date().toISOString(),
          userEdited: false // Flag to track if user has edited this project
        });
        addedCount++;
        
        syncedProjectsMetadata[latestRepo.name] = {
          lastSyncTime: new Date().toISOString(),
          githubUpdatedAt: latestRepo.githubData?.updated_at,
          action: 'added',
          descriptionSynced: true
        };
      }
    }
    
    // Then, sync existing GitHub projects intelligently
    for (const githubProject of githubProjects) {
      try {
        // Find corresponding repo in latest GitHub data
        const latestRepo = latestRepos.find(repo => 
          repo.name === githubProject.name || 
          repo.id === githubProject.id ||
          repo.repoUrl === githubProject.repoUrl
        );
        
        if (latestRepo) {
          const currentDescription = githubProject.description || '';
          const latestDescription = latestRepo.description || '';
          const hasUserEdit = githubProject.userEdited === true;
          
          // Determine if we should sync from GitHub
          let shouldSync = false;
          let syncReason = '';
          
          // RULE: If user has edited, NEVER update from GitHub (even with force sync)
          if (hasUserEdit) {
            console.log(`🔒 ${githubProject.name}: User edit preserved (never overwritten)`);
            shouldSync = false;
            syncReason = 'user edit preserved';
          } else {
            // RULE: If no user edit, update from GitHub if description changed
            if (currentDescription !== latestDescription) {
              shouldSync = true;
              syncReason = 'GitHub description changed';
            }
          }
          
          if (shouldSync) {
            console.log(`📝 Syncing ${githubProject.name}: ${syncReason}`);
            console.log(`   Old: "${currentDescription}"`);
            console.log(`   New: "${latestDescription}"`);
            
            // Find and update the project in the array
            const projectIndex = updatedProjects.findIndex(p => 
              (p.isFromGitHub && p.name === githubProject.name) ||
              p.id === githubProject.id
            );
            
            if (projectIndex !== -1) {
              updatedProjects[projectIndex] = {
                ...updatedProjects[projectIndex],
                description: latestDescription,
                lastGithubSync: new Date().toISOString(),
                userEdited: false, // Reset user edit flag when syncing from GitHub
                lastUserEdit: null, // Clear user edit timestamp
                githubData: {
                  ...updatedProjects[projectIndex].githubData,
                  updated_at: latestRepo.githubData?.updated_at || new Date().toISOString()
                }
              };
              updatedCount++;
            }
          }
          
          // Store sync metadata for this project
          syncedProjectsMetadata[githubProject.name] = {
            lastSyncTime: new Date().toISOString(),
            githubUpdatedAt: latestRepo.githubData?.updated_at,
            userEdited: hasUserEdit,
            shouldSync: shouldSync,
            syncReason: syncReason,
            descriptionSynced: shouldSync,
            action: shouldSync ? 'synced' : 'preserved'
          };
          
        } else {
          console.warn(`⚠️ GitHub project ${githubProject.name} not found in latest GitHub data`);
          syncErrors.push(`Project ${githubProject.name} not found in GitHub`);
        }
        
      } catch (projectError) {
        console.error(`❌ Error syncing project ${githubProject.name}:`, projectError);
        syncErrors.push(`Error syncing ${githubProject.name}: ${projectError.message}`);
      }
    }
    
    // Update Firestore if any changes were made
    if (updatedCount > 0 || addedCount > 0) {
      await updateProjects(updatedProjects);
      console.log(`✅ Updated ${updatedCount} and added ${addedCount} projects in Firestore`);
    } else {
      console.log('ℹ️ No changes needed - all projects are up to date or user-edited');
    }
    
    // Update sync metadata
    await updateGithubSyncMetadata({
      lastSyncTime: new Date().toISOString(),
      lastSyncSuccess: syncErrors.length === 0,
      syncErrors: syncErrors,
      syncedProjects: syncedProjectsMetadata
    });
    
    return {
      success: true,
      updatedCount,
      addedCount,
      totalChecked: githubProjects.length,
      totalRepos: latestRepos.length,
      errors: syncErrors,
      message: `Smart sync completed. Updated ${updatedCount}, added ${addedCount} out of ${latestRepos.length} GitHub repos.`
    };
    
  } catch (error) {
    console.error('❌ GitHub sync failed:', error);
    
    // Update metadata with error
    try {
      await updateGithubSyncMetadata({
        lastSyncTime: new Date().toISOString(),
        lastSyncSuccess: false,
        syncErrors: [error.message]
      });
    } catch (metadataError) {
      console.error('Error updating sync metadata:', metadataError);
    }
    
    return {
      success: false,
      error: error.message,
      message: `Sync failed: ${error.message}`
    };
  }
};

/**
 * Mark a project as user-edited to prevent GitHub sync overwriting
 */
export const markProjectAsUserEdited = async (projectId, description) => {
  try {
    console.log(`🔒 Marking project ${projectId} as user-edited`);
    
    const projectsData = await getProjectsData();
    const projects = projectsData.projects || [];
    
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        description: description,
        userEdited: true,
        lastUserEdit: new Date().toISOString()
      };
      
      await updateProjects(projects);
      console.log(`✅ Project ${projectId} marked as user-edited`);
      
      return { success: true };
    } else {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
  } catch (error) {
    console.error('❌ Error marking project as user-edited:', error);
    throw error;
  }
};



/**
 * Start automatic GitHub description sync
 * This will run the sync periodically based on GITHUB_SYNC_INTERVAL
 */
export const startGithubAutoSync = async (username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir') => {
  try {
    console.log('🚀 Starting automatic GitHub description sync...');
    
    // Stop any existing interval first
    await stopGithubAutoSync();
    
    // Run initial sync
    await syncGithubDescriptions(username);
    
    // Set up periodic sync
    const intervalId = setInterval(async () => {
      try {
        console.log('⏰ Running scheduled GitHub description sync...');
        await syncGithubDescriptions(username);
      } catch (error) {
        console.error('❌ Scheduled sync failed:', error);
      }
    }, GITHUB_SYNC_INTERVAL);
    
    // Update metadata with interval info
    await updateGithubSyncMetadata({
      isAutoSyncEnabled: true,
      autoSyncStartedAt: new Date().toISOString(),
      syncInterval: GITHUB_SYNC_INTERVAL
    });
    
    console.log(`✅ Auto-sync started. Will run every ${GITHUB_SYNC_INTERVAL / 1000 / 60} minutes.`);
    
    // Store interval ID globally (in a real app, you'd want to manage this better)
    if (typeof window !== 'undefined') {
      window.githubSyncIntervalId = intervalId;
    }
    
    return {
      success: true,
      intervalId,
      message: `Auto-sync started. Interval: ${GITHUB_SYNC_INTERVAL / 1000 / 60} minutes.`
    };
    
  } catch (error) {
    console.error('❌ Failed to start auto-sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Stop automatic GitHub description sync
 */
export const stopGithubAutoSync = async () => {
  try {
    // Clear interval if it exists
    if (typeof window !== 'undefined' && window.githubSyncIntervalId) {
      clearInterval(window.githubSyncIntervalId);
      window.githubSyncIntervalId = null;
    }
    
    // Update metadata
    await updateGithubSyncMetadata({
      isAutoSyncEnabled: false,
      autoSyncStoppedAt: new Date().toISOString()
    });
    
    console.log('🛑 Auto-sync stopped.');
    
    return {
      success: true,
      message: 'Auto-sync stopped successfully.'
    };
    
  } catch (error) {
    console.error('❌ Failed to stop auto-sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get GitHub sync status and statistics
 */
export const getGithubSyncStatus = async () => {
  try {
    const metadata = await getGithubSyncMetadata();
    const projectsData = await getProjectsData();
    const githubProjects = (projectsData.projects || []).filter(p => p.isFromGitHub);
    
    return {
      isAutoSyncEnabled: metadata.isAutoSyncEnabled || false,
      lastSyncTime: metadata.lastSyncTime,
      lastSyncSuccess: metadata.lastSyncSuccess,
      syncErrors: metadata.syncErrors || [],
      totalGithubProjects: githubProjects.length,
      syncedProjects: metadata.syncedProjects || {},
      syncInterval: GITHUB_SYNC_INTERVAL,
      nextSyncTime: metadata.lastSyncTime ? 
        new Date(new Date(metadata.lastSyncTime).getTime() + GITHUB_SYNC_INTERVAL).toISOString() : 
        null
    };
  } catch (error) {
    console.error('Error getting sync status:', error);
    throw error;
  }
};

/**
 * Manual sync trigger with custom options
 */
export const triggerManualGithubSync = async (options = {}) => {
  const {
    username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir'
  } = options;
  
  console.log('🔧 Manual GitHub sync triggered for username:', username);
  
  // User edits are always preserved - no forceSync option
  return await syncGithubDescriptions(username, false);
};

/**
 * Initialize GitHub sync on app startup
 * Call this function when your app starts to begin automatic syncing
 */
export const initializeGithubSync = async (username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir', autoStart = true) => {
  try {
    console.log('🔄 Initializing GitHub sync system...');
    
    // Get current sync status
    const status = await getGithubSyncStatus();
    
    if (autoStart && !status.isAutoSyncEnabled) {
      // Start auto-sync if not already running
      const result = await startGithubAutoSync(username);
      console.log('✅ GitHub sync initialized and auto-sync started');
      return result;
    } else if (status.isAutoSyncEnabled) {
      console.log('ℹ️ Auto-sync already running');
      return {
        success: true,
        message: 'Auto-sync already running',
        status
      };
    } else {
      console.log('ℹ️ GitHub sync initialized but auto-sync not started (autoStart=false)');
      return {
        success: true,
        message: 'Sync initialized without auto-start',
        status
      };
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize GitHub sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Test function to verify GitHub sync functionality
 * Use this to test the sync system
 */
export const testGithubSync = async (username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir') => {
  try {
    console.log('🧪 Testing GitHub sync functionality...');
    
    // Test 1: Check GitHub API connectivity
    console.log('📡 Testing GitHub API connectivity...');
    const { default: githubRepoService } = await import('../services/githubRepoService');
    // eslint-disable-next-line
    const testRepos = await githubRepoService.getUserRepositories(username, { per_page: 1 });
    console.log('✅ GitHub API connectivity: OK');
    
    // Test 2: Check Firestore connectivity
    console.log('💾 Testing Firestore connectivity...');
    // eslint-disable-next-line
    const projectsData = await getProjectsData();
    console.log('✅ Firestore connectivity: OK');
    
    // Test 3: Run a sync test
    console.log('🔄 Running sync test...');
    const syncResult = await syncGithubDescriptions(username);
    console.log('✅ Sync test completed:', syncResult);
    
    // Test 4: Check sync status
    console.log('📊 Checking sync status...');
    const status = await getGithubSyncStatus();
    console.log('✅ Sync status retrieved:', status);
    
    return {
      success: true,
      tests: {
        githubAPI: true,
        firestore: true,
        sync: syncResult.success,
        status: true
      },
      syncResult,
      status,
      message: 'All tests passed successfully!'
    };
    
  } catch (error) {
    console.error('❌ GitHub sync test failed:', error);
    return {
      success: false,
      error: error.message,
      message: `Test failed: ${error.message}`
    };
  }
};

// ====================== PROJECT MANAGEMENT UTILITIES ======================

/**
 * Reset user edit flags for all GitHub projects
 * This will allow all projects to be synced from GitHub again
 */
export const resetAllUserEditFlags = async () => {
  try {
    console.log('🔄 Resetting all user edit flags...');
    
    const projectsData = await getProjectsData();
    const projects = projectsData.projects || [];
    
    const resetProjects = projects.map(project => {
      if (project.isFromGitHub) {
        return {
          ...project,
          userEdited: false,
          lastUserEdit: null
        };
      }
      return project;
    });
    
    await updateDoc(getProjectsDocRef(), {
      projects: resetProjects,
      lastUpdated: new Date().toISOString()
    });
    
    console.log('✅ All user edit flags reset');
    return { success: true, message: 'All user edit flags reset successfully' };
    
  } catch (error) {
    console.error('❌ Error resetting user edit flags:', error);
    throw error;
  }
};

/**
 * Get project sync status for debugging
 */
export const getProjectSyncStatus = async () => {
  try {
    const projectsData = await getProjectsData();
    const projects = projectsData.projects || [];
    const githubProjects = projects.filter(p => p.isFromGitHub);
    
    const status = githubProjects.map(project => ({
      name: project.name,
      id: project.id,
      description: project.description,
      userEdited: project.userEdited || false,
      lastUserEdit: project.lastUserEdit || null,
      lastGithubSync: project.lastGithubSync || null,
      repoUrl: project.repoUrl
    }));
    
    return {
      total: githubProjects.length,
      userEdited: status.filter(p => p.userEdited).length,
      notEdited: status.filter(p => !p.userEdited).length,
      projects: status
    };
    
  } catch (error) {
    console.error('❌ Error getting project sync status:', error);
    throw error;
  }
};

/**
 * Force sync a specific project from GitHub (ignoring user edits)
 */
export const forceSyncProject = async (projectId, username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir') => {
  try {
    console.log(`🔧 Force syncing project ${projectId}...`);
    
    // Import GitHub service
    const { default: githubRepoService } = await import('../services/githubRepoService');
    
    // Get current projects
    const projectsData = await getProjectsData();
    const projects = projectsData.projects || [];
    
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    const project = projects[projectIndex];
    
    if (!project.isFromGitHub) {
      throw new Error(`Project ${project.name} is not a GitHub project`);
    }
    
    // Get latest data from GitHub
    const latestRepos = await githubRepoService.getRepositoriesAsProjects(username, {
      excludeForks: true,
      excludePrivate: false
    });
    
    const latestRepo = latestRepos.find(repo => 
      repo.name === project.name || 
      repo.id === project.id ||
      repo.repoUrl === project.repoUrl
    );
    
    if (!latestRepo) {
      throw new Error(`GitHub repository for ${project.name} not found`);
    }
    
    // Update the project with latest GitHub data
    projects[projectIndex] = {
      ...project,
      description: latestRepo.description,
      lastGithubSync: new Date().toISOString(),
      userEdited: false,
      lastUserEdit: null,
      githubData: {
        ...project.githubData,
        ...latestRepo.githubData,
        updated_at: latestRepo.githubData?.updated_at || new Date().toISOString()
      }
    };
    
    await updateDoc(getProjectsDocRef(), {
      projects: projects,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Project ${project.name} force synced from GitHub`);
    
    return {
      success: true,
      project: projects[projectIndex],
      message: `Project ${project.name} successfully synced from GitHub`
    };
    
  } catch (error) {
    console.error('❌ Error force syncing project:', error);
    throw error;
  }
};

/**
 * Remove a project from the database (it will be re-added from GitHub on next sync)
 */
export const removeProjectFromDatabase = async (projectId) => {
  try {
    console.log(`🗑️ Removing project ${projectId} from database...`);
    
    const projectsData = await getProjectsData();
    const projects = projectsData.projects || [];
    
    const filteredProjects = projects.filter(p => p.id !== projectId);
    
    if (filteredProjects.length === projects.length) {
      throw new Error(`Project with ID ${projectId} not found`);
    }
    
    await updateDoc(getProjectsDocRef(), {
      projects: filteredProjects,
      lastUpdated: new Date().toISOString()
    });
    
    console.log(`✅ Project removed from database. It will be re-added from GitHub on next sync.`);
    
    return {
      success: true,
      message: 'Project removed successfully. It will be re-synced from GitHub.'
    };
    
  } catch (error) {
    console.error('❌ Error removing project:', error);
    throw error;
  }
};



