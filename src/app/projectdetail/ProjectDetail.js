import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './ProjectDetail.css';

const ProjectDetail = () => {
  const { projectName } = useParams();
  const navigate = useNavigate();
  const [projectData, setProjectData] = useState(null);
  const [readme, setReadme] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('readme'); // 'readme' or 'thumbnail'
  const [sidebarActive, setSidebarActive] = useState(false); // For mobile sidebar
  const GITHUB_USERNAME = 'DevRanbir';

  // Function to get project image (same logic as MyProjects.js)
  const getProjectImage = (repoName) => {
    const name = repoName.toLowerCase().replace(/[-_\s]/g, '');
    
    const imageMap = {
      // Periodic Table
      'periodictable': '/Ptable.png',
      'ptable': '/Ptable.png',
      'periodicapp': '/Ptable.png',
      
      // Quicky Quizy
      'quickyquizy': '/Quicky.png',
      'quicky': '/Quicky.png',
      'quiz': '/Quicky.png',
      
      // ChocoLava / Emergency
      'chocolava': '/SCC.png',
      'scc': '/SCC.png',
      'emergency': '/SCC.png',
      'physiopluse': '/SCC.png',
      'physioplus': '/SCC.png',
      
      // SpeechViber
      'speechviber': '/Speechviber.png',
      'speech': '/Speechviber.png',
      'viber': '/Speechviber.png',
      
      // Talkify
      'talkify': '/Talkify.png',
      'talk': '/Talkify.png',
      
      // ArtGallery
      'artgallery': '/ArtGalley.png',
      'artgalley': '/ArtGalley.png',
      'art': '/ArtGalley.png',
      'nft': '/ArtGalley.png',
      'gallery': '/ArtGalley.png',
      
      // Bookmark Manager
      'bookmark': '/Bookmark-manager.png',
      'bookmarkmanager': '/Bookmark-manager.png',
      'bookmarks': '/Bookmark-manager.png',
      
      // CuSpark
      'cuspark': '/CuSpark.png',
      'sparkcu': '/CuSpark.png',
      'ideathon': '/CuSpark.png',
      'hackathon': '/CuSpark.png',
      'spark': '/CuSpark.png',
      
      // HGCR
      'hgcr': '/HGCR.png',
      'gesture': '/HGCR.png',
      'robotics': '/HGCR.png',
      'handgesture': '/HGCR.png',
      
      // RepoViewer
      'repoviewer': '/RepoViewer.png',
      'githubviewer': '/RepoViewer.png',
      'viewer': '/RepoViewer.png'
    };
    
    return imageMap[name] || null;
  };

  useEffect(() => {
    const fetchProjectDetails = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch repository details
        const repoResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${projectName}`, {
          headers: {
            'Accept': 'application/vnd.github.mercy-preview+json'
          }
        });
        
        if (!repoResponse.ok) {
          throw new Error('Repository not found');
        }
        
        const repoData = await repoResponse.json();
        
        // Fetch README
        let readmeContent = '';
        try {
          const readmeResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${projectName}/readme`, {
            headers: {
              'Accept': 'application/vnd.github.v3.raw'
            }
          });
          
          if (readmeResponse.ok) {
            readmeContent = await readmeResponse.text();
          }
        } catch (readmeError) {
          console.log('No README found');
        }
        
        // Fetch languages
        const languagesResponse = await fetch(`https://api.github.com/repos/${GITHUB_USERNAME}/${projectName}/languages`);
        const languagesData = await languagesResponse.json();
        
        setProjectData({
          ...repoData,
          languagesData
        });
        setReadme(readmeContent);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProjectDetails();
  }, [projectName]);

  // Handle mobile sidebar interactions
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    
    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };
    
    const handleSwipe = () => {
      // Swipe right to open (from left edge)
      if (touchStartX < 50 && touchEndX > touchStartX + 50) {
        setSidebarActive(true);
      }
      // Swipe left to close
      if (sidebarActive && touchStartX > touchEndX + 50) {
        setSidebarActive(false);
      }
    };
    
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('.project-info-section');
      if (sidebarActive && sidebar && !sidebar.contains(e.target)) {
        setSidebarActive(false);
      }
    };
    
    // Only add listeners on mobile
    if (window.innerWidth <= 1024) {
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [sidebarActive]);

  const formatBytes = (bytes) => {
    return (bytes / 1024).toFixed(2) + ' KB';
  };

  const getLanguagePercentages = (languagesData) => {
    const total = Object.values(languagesData).reduce((sum, val) => sum + val, 0);
    return Object.entries(languagesData).map(([lang, bytes]) => ({
      name: lang,
      percentage: ((bytes / total) * 100).toFixed(1),
      bytes
    }));
  };

  if (isLoading) {
    return (
      <div className="project-detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-detail-error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/projects')}>Back to Projects</button>
      </div>
    );
  }

  if (!projectData) {
    return null;
  }

  const languageStats = getLanguagePercentages(projectData.languagesData || {});

  return (
    <div className="project-detail-page">
      {/* Hamburger button for mobile - outside sidebar */}
      {window.innerWidth <= 1024 && (
        <div 
          className="hamburger-menu-btn"
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            width: '50px',
            height: '50px',
            background: 'rgba(132, 0, 255, 0.9)',
            color: '#fff',
            borderRadius: '50%',
            fontSize: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1002,
            boxShadow: '0 4px 12px rgba(132, 0, 255, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSidebarActive(!sidebarActive);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(132, 0, 255, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(132, 0, 255, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ☰
        </div>
      )}
      
      <div className="project-detail-container">
        {/* Left Side - Project Info */}
        <div className={`project-info-section ${sidebarActive ? 'active' : ''}`}>
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb-nav">
            <span className="breadcrumb-link" onClick={() => navigate('/projects')}>
              Projects
            </span>
            <span className="breadcrumb-separator"> &gt; </span>
            <span className="breadcrumb-current">{projectData.name}</span>
          </div>
          
          {projectData.description && (
            <p className="project-description-full">{projectData.description}</p>
          )}

          {/* Links */}
          <div className="project-links">
            <a 
              href={projectData.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="project-link-button"
            >
              View on GitHub
            </a>
            {projectData.homepage && (
              <a 
                href={projectData.homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="project-link-button"
              >
                Visit Website
              </a>
            )}
          </div>
          
          {/* Languages */}
          {languageStats.length > 0 && (
            <div className="project-languages">
              <h2>Languages</h2>
              <div className="language-bars">
                {languageStats.map((lang) => (
                  <div key={lang.name} className="language-item">
                    <div className="language-header">
                      <span className="language-name">{lang.name}</span>
                      <span className="language-percentage">{lang.percentage}%</span>
                    </div>
                    <div className="language-bar">
                      <div 
                        className="language-bar-fill" 
                        style={{ width: `${lang.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Topics */}
          {projectData.topics && projectData.topics.length > 0 && (
            <div className="project-topics">
              <h2>Topics</h2>
              <div className="topics-container">
                {projectData.topics.map((topic, idx) => (
                  <span key={idx} className="topic-tag">{topic}</span>
                ))}
              </div>
            </div>
          )}
          
          {/* Statistics */}
          <div className="project-stats">
            <h2>Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{projectData.stargazers_count}</span>
                <span className="stat-label">Stars</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{projectData.forks_count}</span>
                <span className="stat-label">Forks</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{projectData.watchers_count}</span>
                <span className="stat-label">Watchers</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{projectData.open_issues_count}</span>
                <span className="stat-label">Issues</span>
              </div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="project-metadata">
            <h2>Details</h2>
            <div className="metadata-list">
              {projectData.license && (
                <div className="metadata-item">
                  <span className="metadata-label">License:</span>
                  <span className="metadata-value">{projectData.license.name}</span>
                </div>
              )}
              {projectData.default_branch && (
                <div className="metadata-item">
                  <span className="metadata-label">Default Branch:</span>
                  <span className="metadata-value">{projectData.default_branch}</span>
                </div>
              )}
              <div className="metadata-item">
                <span className="metadata-label">Created:</span>
                <span className="metadata-value">
                  {new Date(projectData.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="metadata-item">
                <span className="metadata-label">Last Updated:</span>
                <span className="metadata-value">
                  {new Date(projectData.updated_at).toLocaleDateString()}
                </span>
              </div>
              {projectData.size && (
                <div className="metadata-item">
                  <span className="metadata-label">Size:</span>
                  <span className="metadata-value">{formatBytes(projectData.size * 1024)}</span>
                </div>
              )}
            </div>
          </div>
          
        </div>
        
        {/* Right Side - README */}
        <div className="project-readme-section">
          <h2>
            <span 
              onClick={() => setActiveView('readme')}
              style={{
                cursor: 'pointer',
                opacity: activeView === 'readme' ? 1 : 0.5,
                transition: 'opacity 0.3s'
              }}
            >
              README
            </span>
            {' | '}
            <span 
              onClick={() => setActiveView('thumbnail')}
              style={{
                cursor: 'pointer',
                opacity: activeView === 'thumbnail' ? 1 : 0.5,
                transition: 'opacity 0.3s'
              }}
            >
              THUMBNAIL
            </span>
          </h2>
          {activeView === 'readme' ? (
            readme ? (
              <div className="readme-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      return inline ? (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      ) : (
                        <pre>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      );
                    },
                    img({ node, ...props }) {
                      return (
                        <img 
                          {...props} 
                          alt={props.alt || ''}
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      );
                    }
                  }}
                >
                  {readme}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="no-readme">No README available for this project.</p>
            )
          ) : (
            <div className="readme-content">
              {getProjectImage(projectData.name) ? (
                <img 
                  src={getProjectImage(projectData.name)} 
                  alt={`${projectData.name} thumbnail`}
                  style={{
                    width: '100%',
                    maxWidth: '800px',
                    height: 'auto',
                    borderRadius: '8px',
                    display: 'block',
                    margin: '0 auto'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<p class="no-readme">No thumbnail available for this project.</p>';
                  }}
                />
              ) : (
                <p className="no-readme">No thumbnail available for this project.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
