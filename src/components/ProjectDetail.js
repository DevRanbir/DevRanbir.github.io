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
  const GITHUB_USERNAME = 'DevRanbir';

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
        <button onClick={() => navigate('/myprojects')}>Back to Projects</button>
      </div>
    );
  }

  if (!projectData) {
    return null;
  }

  const languageStats = getLanguagePercentages(projectData.languagesData || {});

  return (
    <div className="project-detail-page">
      <div className="project-detail-container">
        {/* Left Side - Project Info */}
        <div className="project-info-section">
          {/* Breadcrumb Navigation */}
          <div className="breadcrumb-nav">
            <span className="breadcrumb-link" onClick={() => navigate('/myprojects')}>
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
          <h2>README</h2>
          {readme ? (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
