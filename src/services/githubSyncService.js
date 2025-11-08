/**
 * GitHub Sync Service
 * 
 * This service handles automatic synchronization of GitHub repository descriptions
 * with the Firestore database. It runs periodically to check for changes in
 * repository descriptions and updates the local database accordingly.
 * 
 * Features:
 * - Periodic sync of GitHub repository descriptions
 * - Rate limiting awareness
 * - Error handling and logging
 * - Manual sync triggers
 * - Sync status monitoring
 */

import {
  initializeGithubSync,
  startGithubAutoSync,
  stopGithubAutoSync,
  getGithubSyncStatus,
  triggerManualGithubSync,
  testGithubSync,
  markProjectAsUserEdited,
  getProjectSyncStatus,
  forceSyncProject,
  removeProjectFromDatabase,
  resetAllUserEditFlags
} from '../firebase/firestoreService';

class GitHubSyncService {
  constructor() {
    this.isInitialized = false;
    this.username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir'; // Get from env or fallback
    this.syncIntervalId = null;
    this.lastSyncTime = null;
    this.syncInProgress = false;
  }

  /**
   * Initialize the GitHub sync service
   * Call this when your app starts
   */
  async initialize(username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir', autoStart = true) {
    try {
      console.log('🚀 Initializing GitHub Sync Service...');
      
      this.username = username;
      
      // Initialize the sync system
      const result = await initializeGithubSync(username, autoStart);
      
      if (result.success) {
        this.isInitialized = true;
        console.log('✅ GitHub Sync Service initialized successfully');
        
        // Set up error handling for the service
        this.setupErrorHandling();
        
        return result;
      } else {
        throw new Error(result.error || 'Failed to initialize sync service');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize GitHub Sync Service:', error);
      throw error;
    }
  }

  /**
   * Start automatic syncing
   */
  async startAutoSync(username = null) {
    try {
      const targetUsername = username || this.username;
      console.log(`🔄 Starting auto-sync for GitHub user: ${targetUsername}`);
      
      const result = await startGithubAutoSync(targetUsername);
      
      if (result.success) {
        console.log('✅ Auto-sync started successfully');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start auto-sync:', error);
      throw error;
    }
  }

  /**
   * Stop automatic syncing
   */
  async stopAutoSync() {
    try {
      console.log('🛑 Stopping auto-sync...');
      
      const result = await stopGithubAutoSync();
      
      if (result.success) {
        console.log('✅ Auto-sync stopped successfully');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to stop auto-sync:', error);
      throw error;
    }
  }

  /**
   * Trigger a manual sync
   */
  async manualSync(options = {}) {
    try {
      if (this.syncInProgress) {
        console.warn('⚠️ Sync already in progress, skipping manual sync');
        return {
          success: false,
          message: 'Sync already in progress'
        };
      }

      this.syncInProgress = true;
      console.log('🔧 Triggering manual sync...');
      
      const result = await triggerManualGithubSync({
        username: this.username,
        ...options
      });
      
      this.lastSyncTime = new Date().toISOString();
      
      return result;
      
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync all non-user-edited projects from GitHub
   * Note: User edits are ALWAYS preserved regardless of sync type
   */
  async syncAllNonEdited() {
    try {
      console.log('🔧 Syncing all non-user-edited projects...');
      
      const result = await triggerManualGithubSync({
        username: this.username
        // Note: User edits are always preserved
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed project sync status
   */
  async getProjectStatus() {
    try {
      return await getProjectSyncStatus();
    } catch (error) {
      console.error('❌ Failed to get project status:', error);
      throw error;
    }
  }

  /**
   * Force sync a specific project
   */
  async forceSyncProject(projectId) {
    try {
      return await forceSyncProject(projectId, this.username);
    } catch (error) {
      console.error('❌ Failed to force sync project:', error);
      throw error;
    }
  }

  /**
   * Remove a project from database (will be re-added from GitHub)
   */
  async removeProject(projectId) {
    try {
      return await removeProjectFromDatabase(projectId);
    } catch (error) {
      console.error('❌ Failed to remove project:', error);
      throw error;
    }
  }

  /**
   * Reset all user edit flags
   */
  async resetUserEdits() {
    try {
      return await resetAllUserEditFlags();
    } catch (error) {
      console.error('❌ Failed to reset user edits:', error);
      throw error;
    }
  }

  /**
   * Mark a project as user-edited
   */
  async markAsUserEdited(projectId, description) {
    try {
      return await markProjectAsUserEdited(projectId, description);
    } catch (error) {
      console.error('❌ Failed to mark project as user-edited:', error);
      throw error;
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus() {
    try {
      return await getGithubSyncStatus();
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      throw error;
    }
  }

  /**
   * Run sync tests
   */
  async runTests() {
    try {
      console.log('🧪 Running GitHub sync tests...');
      return await testGithubSync(this.username);
    } catch (error) {
      console.error('❌ Sync tests failed:', error);
      throw error;
    }
  }

  /**
   * Set up error handling and monitoring
   */
  setupErrorHandling() {
    // Monitor for unhandled promise rejections related to sync
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (
            event.reason &&
            event.reason.message &&
            (
                event.reason.message.includes('GitHub') ||
                event.reason.message.includes('sync')
            )
            ) {
          console.error('🚨 Unhandled GitHub sync error:', event.reason);
          
          // You could send this to an error tracking service here
          this.handleSyncError(event.reason);
        }
      });
    }
  }

  /**
   * Handle sync errors
   */
  handleSyncError(error) {
    console.error('🚨 GitHub sync error handler triggered:', error);
    
    // Log to console for debugging
    console.group('GitHub Sync Error Details');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Sync service state:', {
      isInitialized: this.isInitialized,
      username: this.username,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress
    });
    console.groupEnd();
    
    // In a production app, you might want to:
    // - Send error to monitoring service (Sentry, LogRocket, etc.)
    // - Disable auto-sync temporarily
    // - Notify administrators
    // - Store error in Firestore for later analysis
  }

  /**
   * Get service status information
   */
  getServiceInfo() {
    return {
      isInitialized: this.isInitialized,
      username: this.username,
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      version: '1.0.0'
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config = {}) {
    if (config.username) {
      this.username = config.username;
      console.log(`📝 Updated GitHub username to: ${this.username}`);
    }
    
    return this.getServiceInfo();
  }
}

// Create and export a singleton instance
const githubSyncService = new GitHubSyncService();

export default githubSyncService;

// Also export the class for testing purposes
export { GitHubSyncService };

/**
 * Convenience function to initialize the service
 * Call this in your main App.js or index.js file
 */
export const initializeGitHubSync = async (username = process.env.REACT_APP_GITHUB_USERNAME || 'DevRanbir', autoStart = true) => {
  try {
    return await githubSyncService.initialize(username, autoStart);
  } catch (error) {
    console.error('Failed to initialize GitHub sync:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Example usage functions that can be called from browser console
 */
export const debugGitHubSync = {
  // Get current status
  status: () => githubSyncService.getSyncStatus(),
  
  // Run manual sync
  sync: () => githubSyncService.manualSync(),
  
  // Sync all non-user-edited projects (user edits always preserved)
  syncNonEdited: () => githubSyncService.syncAllNonEdited(),
  
  // Start auto-sync
  start: () => githubSyncService.startAutoSync(),
  
  // Stop auto-sync
  stop: () => githubSyncService.stopAutoSync(),
  
  // Run tests
  test: () => githubSyncService.runTests(),
  
  // Get service info
  info: () => githubSyncService.getServiceInfo(),
  
  // Get detailed project status
  projects: () => githubSyncService.getProjectStatus(),
  
  // Force sync specific project
  forceSyncProject: (projectId) => githubSyncService.forceSyncProject(projectId),
  
  // Remove project (will be re-added from GitHub)
  removeProject: (projectId) => githubSyncService.removeProject(projectId),
  
  // Reset all user edit flags
  resetEdits: () => githubSyncService.resetUserEdits(),
  
  // Mark project as user-edited
  markEdited: (projectId, description) => githubSyncService.markAsUserEdited(projectId, description)
};

// Make debug functions available globally in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.debugGitHubSync = debugGitHubSync;
  console.log('🛠️ GitHub sync debug functions available at window.debugGitHubSync');
}
