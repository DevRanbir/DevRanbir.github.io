import React, { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import './StaggeredMenu.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/atom-one-dark.css';
import AITextLoading from './kokonutui/ai-text-loading';

// Import services
import { getHomepageData, getProjectsData, getDocumentsData } from '../firebase/firestoreService';
import githubRepoService from '../services/githubRepoService';

// Import AI services dynamically to avoid circular dependencies
let processAICommand, isAIQuery;

// AI state management
let aiCooldownUntil = null;
const AI_COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const AI_STATE_KEY = 'staggeredmenu_ai_enabled';

// Initialize AI state from localStorage (default to true for menu)
let isAIEnabled = (() => {
  try {
    const savedState = localStorage.getItem(AI_STATE_KEY);
    return savedState === null ? true : savedState === 'true'; // Default to enabled
  } catch (error) {
    console.warn('Could not access localStorage:', error);
    return true; // Default to enabled
  }
})();

// Check if AI is enabled
const getAIEnabled = () => isAIEnabled;

// Set AI enabled state and save to localStorage
const setAIEnabled = (enabled) => {
  isAIEnabled = enabled;
  try {
    localStorage.setItem(AI_STATE_KEY, enabled.toString());
  } catch (error) {
    console.warn('Could not save AI state to localStorage:', error);
  }
  
  if (enabled) {
    console.log('✅ AI has been enabled in menu');
  } else {
    console.log('🚫 AI has been disabled in menu');
  }
};

// Check if AI is in cooldown
const isAIInCooldown = () => {
  if (!aiCooldownUntil) return false;
  
  const now = Date.now();
  if (now < aiCooldownUntil) {
    const remainingMinutes = Math.ceil((aiCooldownUntil - now) / 60000);
    console.log(`⏳ AI is in cooldown. Retry in ${remainingMinutes} minute(s)`);
    return true;
  }
  
  // Cooldown expired, reset
  aiCooldownUntil = null;
  return false;
};

// Set AI cooldown and disable AI
const setAICooldown = () => {
  aiCooldownUntil = Date.now() + AI_COOLDOWN_DURATION;
  const cooldownEnd = new Date(aiCooldownUntil).toLocaleTimeString();
  console.log(`🚫 AI cooldown activated. AI disabled until ${cooldownEnd}`);
  setAIEnabled(false); // Automatically disable AI when rate limited
};

// Get remaining cooldown time in minutes
const getRemainingCooldownTime = () => {
  if (!aiCooldownUntil) return 0;
  const remaining = Math.ceil((aiCooldownUntil - Date.now()) / 60000);
  return Math.max(0, remaining);
};

// Lazy load AI services
const loadAIServices = async () => {
  if (!processAICommand) {
    const aiModule = await import('../services/aiCommandProcessor');
    processAICommand = aiModule.processAICommand;
    isAIQuery = aiModule.isAIQuery;
  }
};

// Helper function to fetch context data from Firebase/GitHub
const fetchContextData = async (query) => {
  try {
    const lowerQuery = query.toLowerCase();
    let context = {
      currentPage: window.location.pathname,
      projects: [],
      documents: [],
      socialLinks: [],
      filteredProjects: [],
      searchQuery: query,
      authorDescription: '',
      authorSkills: [],
      aboutData: ''
    };

    // Always fetch projects for any query (GitHub + Firebase)
    const promises = [];
    
    // Fetch Firebase projects
    promises.push(
      getProjectsData().then(data => {
        if (data && data.projects) {
          context.projects = data.projects;
          context.filteredProjects = data.projects;
          console.log(`📦 Loaded ${data.projects.length} projects from Firebase`);
        }
      }).catch(err => {
        console.warn('Failed to fetch Firebase projects:', err);
      })
    );

    // Fetch GitHub repositories
    promises.push(
      githubRepoService.getUserRepositories('DevRanbir').then(repos => {
        if (repos && repos.length > 0) {
          console.log(`📦 Loaded ${repos.length} repositories from GitHub`);
          // Merge with existing projects, avoiding duplicates
          const existingNames = new Set(context.projects.map(p => p.name?.toLowerCase()));
          const githubProjects = repos
            .filter(repo => !existingNames.has(repo.name?.toLowerCase()))
            .map(repo => ({
              id: `github-${repo.id}`,
              name: repo.name,
              description: repo.description || 'No description available',
              technologies: repo.language ? [repo.language] : [],
              githubUrl: repo.html_url,
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              source: 'github'
            }));
          context.projects = [...context.projects, ...githubProjects];
        }
      }).catch(err => {
        console.warn('Failed to fetch GitHub repos:', err);
      })
    );

    // Fetch documents if query mentions documents
    const needsDocuments = lowerQuery.includes('document') || lowerQuery.includes('doc') || 
                           lowerQuery.includes('article') || lowerQuery.includes('blog') ||
                           lowerQuery.includes('write') || lowerQuery.includes('post');
    
    if (needsDocuments) {
      promises.push(
        getDocumentsData().then(data => {
          if (data && data.documents) {
            context.documents = data.documents;
            console.log(`📦 Loaded ${data.documents.length} documents from Firebase`);
          }
        }).catch(err => {
          console.warn('Failed to fetch documents:', err);
        })
      );
    }

    // ALWAYS fetch homepage data for author information (needed for "who is ranbir" queries)
    promises.push(
      getHomepageData().then(data => {
        if (data) {
          if (data.socialLinks) {
            context.socialLinks = data.socialLinks;
            console.log(`📦 Loaded ${data.socialLinks.length} social links from Firebase`);
          }
          if (data.authorDescription) {
            context.authorDescription = data.authorDescription;
            console.log(`📦 Loaded author description from Firebase`);
          }
          if (data.authorSkills) {
            context.authorSkills = data.authorSkills;
            console.log(`📦 Loaded ${data.authorSkills.length} author skills from Firebase`);
          }
        }
      }).catch(err => {
        console.warn('Failed to fetch homepage data:', err);
      })
    );

    await Promise.all(promises);
    
    console.log(`✅ Total context loaded: ${context.projects.length} projects, ${context.documents.length} documents, ${context.socialLinks.length} social links`);
    
    return context;
  } catch (error) {
    console.error('Error fetching context data:', error);
    return {
      currentPage: window.location.pathname,
      projects: [],
      documents: [],
      socialLinks: [],
      filteredProjects: [],
      searchQuery: query
    };
  }
};

export const StaggeredMenu = ({
  position = 'right',
  colors = ['#ffffffff', '#ffffffff'],
  items = [],
  socialItems = [],
  displaySocials = true,
  displayItemNumbering = true,
  className,
  logoUrl = '/pic3.png',
  menuButtonColor = '#fff',
  openMenuButtonColor = '#fff',
  accentColor = '#ffffffff',
  changeMenuColorOnOpen = true,
  isFixed = false,
  onMenuOpen,
  onMenuClose
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const textWrapRef = useRef(null);
  const [textLines, setTextLines] = useState(['Chat', 'Close']);

  // AI-powered chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiEnabled, setAiEnabledState] = useState(getAIEnabled());
  const [isInitialized, setIsInitialized] = useState(false);
  const chatMessagesRef = useRef(null);

  // Initialize with AI greeting
  useEffect(() => {
    if (!isInitialized) {
      const greetingMessage = {
        id: 1,
        from: 'bot',
        text: `👋 Hello! I'm your AI assistant. I can help you with:

Finding projects from GitHub and Firebase, Searching through documents, Answering questions about the portfolio, Navigation and general queries etc.. bla bla..

What would you like to know?`,
        isError: false
      };
      setChatMessages([greetingMessage]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const sendMessage = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = (chatInput || '').trim();
    if (!text) return;

    const userMsg = { id: Date.now(), from: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    // Load AI services
    await loadAIServices();

    // Check for AI toggle commands
    const lowerCommand = text.toLowerCase();
    if (lowerCommand === 'turn on ai' || lowerCommand === 'enable ai' || 
        lowerCommand === 'ai on' || lowerCommand === 'start ai') {
      setAIEnabled(true);
      setAiEnabledState(true);
      const confirmMessage = {
        id: Date.now() + 1,
        from: 'bot',
        text: '✅ AI has been enabled. You can now use AI commands and ask questions!',
        isError: false
      };
      setChatMessages(prev => [...prev, confirmMessage]);
      return;
    }

    if (lowerCommand === 'turn off ai' || lowerCommand === 'disable ai' || 
        lowerCommand === 'ai off' || lowerCommand === 'stop ai') {
      setAIEnabled(false);
      setAiEnabledState(false);
      const confirmMessage = {
        id: Date.now() + 1,
        from: 'bot',
        text: '🚫 AI has been disabled. Only basic commands will work. Type "turn on ai" to re-enable.',
        isError: false
      };
      setChatMessages(prev => [...prev, confirmMessage]);
      return;
    }

    // Check AI status command
    if (lowerCommand === 'ai status' || lowerCommand === 'ai state') {
      const statusMessage = {
        id: Date.now() + 1,
        from: 'bot',
        text: aiEnabled 
          ? '✅ AI is currently ENABLED and ready to help!' 
          : '🚫 AI is currently DISABLED. Type "turn on ai" to enable it.',
        isError: false
      };
      setChatMessages(prev => [...prev, statusMessage]);
      return;
    }

    // Check if it's an AI query
    if (!isAIQuery || !isAIQuery(text)) {
      // Not an AI query, provide helpful response
      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        text: `I can help with questions like:

• "Show me React projects"
• "What documents do you have?"
• "Tell me about your latest work"
• "Find Python repositories"
• "Show me social links"

Try asking a specific question, and I'll fetch the data from GitHub and Firebase!`,
        isError: false
      };
      setChatMessages(prev => [...prev, botMsg]);
      return;
    }

    // Check if AI is disabled
    if (!aiEnabled) {
      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        text: 'AI is currently disabled. Type "turn on ai" to enable it, or try basic commands.',
        isError: true
      };
      setChatMessages(prev => [...prev, botMsg]);
      return;
    }

    // Check if AI is in cooldown
    if (isAIInCooldown()) {
      const remainingTime = getRemainingCooldownTime();
      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        text: `AI is temporarily unavailable (retry in ${remainingTime} min). Type "turn on ai" when ready.`,
        isError: true
      };
      setChatMessages(prev => [...prev, botMsg]);
      return;
    }

    // Process with AI
    setIsProcessingAI(true);
    
    // Add AI loading message
    const fetchingMsg = {
      id: Date.now() + 0.5,
      from: 'bot',
      text: 'AI_LOADING', // Special marker for AI loading component
      isLoading: true,
      isError: false
    };
    setChatMessages(prev => [...prev, fetchingMsg]);
    
    try {
      // Fetch relevant context data from Firebase/GitHub based on the query
      console.log('🔍 Fetching context data for query:', text);
      const contextData = await fetchContextData(text);
      console.log('📦 Context data fetched:', {
        projects: contextData.projects.length,
        documents: contextData.documents.length,
        socialLinks: contextData.socialLinks.length
      });

      // Remove the "fetching data" message
      setChatMessages(prev => prev.filter(m => m.id !== fetchingMsg.id));

      const response = await processAICommand(text, contextData);

      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        text: response.message,
        action: response.action,
        isError: false
      };
      setChatMessages(prev => [...prev, botMsg]);

      // Execute action if present
      if (response.action) {
        const { action, target } = response;
        
        if (action === 'navigate' && target) {
          // Navigate to the specified page
          setTimeout(() => {
            const path = `/${target.toLowerCase()}`;
            window.location.href = path;
          }, 500); // Small delay to show the message first
        }
      }
    } catch (error) {
      console.error('AI Processing Error:', error);
      
      const isRateLimitError = error.message && error.message.includes('rate-limited');
      
      if (isRateLimitError) {
        setAICooldown();
        setAiEnabledState(false);
      }

      const errorMessage = {
        id: Date.now() + 1,
        from: 'bot',
        text: isRateLimitError 
          ? "AI has been disabled due to rate limiting. Type 'turn on ai' to re-enable when ready."
          : "Sorry, I encountered an error. Please try again.",
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingAI(false);
    }
  }, [chatInput, aiEnabled]);

  const resetChat = useCallback(() => {
    setChatMessages([
      { 
        id: 1, 
        from: 'bot', 
        text: `👋 Hello! I'm your AI assistant. I can help you with:

• Finding projects from GitHub and Firebase
• Searching through documents
• Answering questions about the portfolio
• Navigation and general queries

What would you like to know?`, 
        isError: false 
      }
    ]);
    setChatInput('');
  }, []);

  // Animate new chat messages when they appear and auto-scroll to latest
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const messages = Array.from(panel.querySelectorAll('.sm-chat-message'));
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && chatMessages.length > 1) {
      // Only animate if there's more than the initial message
      gsap.fromTo(
        lastMessage,
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
      );
    }

    // Auto-scroll to the latest message
    if (chatMessagesRef.current) {
      setTimeout(() => {
        chatMessagesRef.current.scrollTo({
          top: chatMessagesRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [chatMessages, open]);


  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  const colorTweenRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen });
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
    const chatMessages = Array.from(panel.querySelectorAll('.sm-chat-message'));
    const chatInput = panel.querySelector('.sm-chat-input');

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--sm-num-opacity': 0 });
    }
    if (socialTitle) {
      gsap.set(socialTitle, { opacity: 0 });
    }
    if (socialLinks.length) {
      gsap.set(socialLinks, { y: 25, opacity: 0 });
    }
    if (chatMessages.length) {
      gsap.set(chatMessages, { y: 25, opacity: 0 });
    }
    if (chatInput) {
      gsap.set(chatInput, { y: 25, opacity: 0 });
    }

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--sm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    // Animate chat messages with the same stagger effect as socials
    if (chatMessages.length || chatInput) {
      const chatStart = panelInsertTime + panelDuration * 0.25;
      if (chatMessages.length) {
        tl.to(
          chatMessages,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(chatMessages, { clearProps: 'opacity' });
            }
          },
          chatStart
        );
      }
      if (chatInput) {
        tl.to(
          chatInput,
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out'
          },
          chatStart + (chatMessages.length * 0.08) + 0.05
        );
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) {
        tl.to(
          socialTitle,
          {
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out'
          },
          socialsStart
        );
      }
      if (socialLinks.length) {
        tl.to(
          socialLinks,
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            ease: 'power3.out',
            stagger: { each: 0.08, from: 'start' },
            onComplete: () => {
              gsap.set(socialLinks, { clearProps: 'opacity' });
            }
          },
          socialsStart + 0.04
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        }
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) {
          gsap.set(numberEls, { '--sm-num-opacity': 0 });
        }
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      }
    });
  }, [position]);

  const animateIcon = useCallback(opening => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  const animateColor = useCallback(
    opening => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      if (changeMenuColorOnOpen) {
        const targetColor = opening ? openMenuButtonColor : menuButtonColor;
        colorTweenRef.current = gsap.to(btn, {
          color: targetColor,
          delay: 0.18,
          duration: 0.3,
          ease: 'power2.out'
        });
      } else {
        gsap.set(btn, { color: menuButtonColor });
      }
    },
    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
  );

  React.useEffect(() => {
    if (toggleBtnRef.current) {
      if (changeMenuColorOnOpen) {
        const targetColor = openRef.current ? openMenuButtonColor : menuButtonColor;
        gsap.set(toggleBtnRef.current, { color: targetColor });
      } else {
        gsap.set(toggleBtnRef.current, { color: menuButtonColor });
      }
    }
  }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

  const animateText = useCallback(opening => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Chat' : 'Close';
    const targetLabel = opening ? 'Close' : 'Chat';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Chat' ? 'Close' : 'Chat';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  return (
    <div
      className={(className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
      style={accentColor ? { '--sm-accent': accentColor } : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
          let arr = [...raw];
          if (arr.length >= 3) {
            const mid = Math.floor(arr.length / 2);
            arr.splice(mid, 1);
          }
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>
      <header className="staggered-menu-header" aria-label="Main navigation header">
        <div className="sm-logo" aria-label="Logo">
          <img
            src={logoUrl || '/logo.png'}
            alt="Logo"
            className="sm-logo-img"
            draggable={false}
            width={110}
            height={24}
          />
        </div>
        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span ref={textWrapRef} className="sm-toggle-textWrap" aria-hidden="true">
            <span ref={textInnerRef} className="sm-toggle-textInner">
              {textLines.map((l, i) => (
                <span className="sm-toggle-line" key={i}>
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
          </span>
        </button>
      </header>

      <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
        <div className="sm-panel-inner">
          {/* AI Chat box replaces the link list. Socials below are preserved. */}
          <div className="sm-chat" role="region" aria-label="AI assistant chat" style={{ position: 'relative' }}>
            <button 
              onClick={resetChat}
              aria-label="Reset chat"
              style={{ 
                position: 'absolute', 
                top: '8px', 
                right: '8px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px',
                borderRadius: '4px',
                opacity: '0.7',
                transition: 'opacity 0.2s',
                zIndex: '10'
              }}
              onMouseEnter={e => e.target.style.opacity = '1'}
              onMouseLeave={e => e.target.style.opacity = '0.7'}
              title="Reset chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <div ref={chatMessagesRef} className="sm-chat-messages">
              {chatMessages.map(m => (
                <div key={m.id} className={`sm-chat-message ${m.from === 'user' ? 'user' : 'bot'} ${m.isError ? 'error' : ''} ${m.isLoading ? 'loading' : ''}`}>
                  <div className="sm-chat-text">
                    {m.isLoading ? (
                      <AITextLoading 
                        texts={[
                          "Fetching data from GitHub...",
                          "Searching Firebase...",
                          "Analyzing projects...",
                          "Processing documents...",
                          "Almost there..."
                        ]}
                        className="text-sm"
                        interval={1200}
                      />
                    ) : m.from === 'bot' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        components={{
                          // Customize rendering for better styling
                          a: ({node, children, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>,
                          code: ({node, inline, className, children, ...props}) => {
                            return !inline ? (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            ) : (
                              <code className="inline-code" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    ) : (
                      <span>{m.text}</span>
                    )}
                  </div>
                  {m.action && (
                    <span className="sm-chat-action" style={{ fontSize: '0.75em', opacity: 0.7, marginTop: '4px', display: 'block' }}>
                      Action: {m.action}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <form className="sm-chat-input" onSubmit={sendMessage}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={isProcessingAI ? "AI is thinking..." : aiEnabled ? "Ask me anything..." : "Ask me anything... (AI off)"}
                aria-label="Chat input"
                disabled={isProcessingAI}
              />
              <button 
                type="submit" 
                className="sm-chat-send" 
                aria-label="Send message"
                disabled={isProcessingAI}
                style={{ opacity: isProcessingAI ? 0.5 : 1 }}
              >
                {isProcessingAI ? '...' : 'Send'}
              </button>
            </form>
          </div>
          {displaySocials && socialItems && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;
