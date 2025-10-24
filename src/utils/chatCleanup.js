/**
 * Chat Cleanup Utility
 * Manages automatic cleanup of expired chat messages
 */

import { cleanupExpiredMessages } from '../firebase/firestoreService';

let cleanupInterval = null;

/**
 * Initialize automatic cleanup
 * This should be called when the app starts
 */
export const initializeCleanup = () => {
  if (cleanupInterval) {
    console.log('🧹 Cleanup already initialized');
    return;
  }

  console.log('🧹 Initializing chat message cleanup...');
  
  // Run cleanup immediately
  cleanupExpiredMessages().then(result => {
    if (result && result.success === false && result.reason === 'Firebase not configured') {
      console.log('⚠️ Chat cleanup skipped - Firebase not configured');
    } else {
      console.log('🧹 Initial cleanup completed:', result);
    }
  }).catch(error => {
    console.error('❌ Initial cleanup failed:', error);
  });

  // Set up periodic cleanup every 30 minutes
  cleanupInterval = setInterval(async () => {
    try {
      console.log('🧹 Running scheduled cleanup...');
      const result = await cleanupExpiredMessages();
      if (result && result.success === false && result.reason === 'Firebase not configured') {
        console.log('⚠️ Chat cleanup skipped - Firebase not configured');
      } else {
        console.log('🧹 Scheduled cleanup completed:', result);
      }
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  console.log('✅ Chat cleanup initialized successfully');
};

/**
 * Stop automatic cleanup
 */
export const stopCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('🛑 Chat cleanup stopped');
  }
};

/**
 * Force cleanup run
 */
export const forceCleanup = async () => {
  try {
    console.log('🧹 Running forced cleanup...');
    const result = await cleanupExpiredMessages();
    console.log('🧹 Forced cleanup completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Forced cleanup failed:', error);
    throw error;
  }
};

// Initialize cleanup when this module is imported
// This ensures cleanup starts as soon as the app loads
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(initializeCleanup, 5000); // Start cleanup after 5 seconds
}
