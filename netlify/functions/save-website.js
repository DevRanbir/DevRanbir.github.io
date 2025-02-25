const { Octokit } = require('@octokit/rest');

exports.handler = async function(event, context) {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: 'Method Not Allowed'
    };
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  try {
    const data = JSON.parse(event.body);
    const { websiteData, category } = data;
    
    // Default to websites.json if no category provided
    const fileName = category ? `${category}.json` : 'websites.json';
    const catalogPath = 'data/catalog.json';
    
    // First, get or create the catalog
    let catalog = [];
    try {
      const { data: catalogData } = await octokit.repos.getContent({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO,
        path: catalogPath
      });
      
      const catalogContent = Buffer.from(catalogData.content, 'base64').toString();
      catalog = JSON.parse(catalogContent);
    } catch (error) {
      // If catalog doesn't exist, we'll create it
      console.log('Catalog does not exist, will create it');
    }
    
    // Add category to catalog if it doesn't exist
    if (category && !catalog.includes(category)) {
      catalog.push(category);
    }
    
    // Update catalog file
    let catalogSha = null;
    try {
      const { data: existingCatalog } = await octokit.repos.getContent({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO,
        path: catalogPath
      });
      catalogSha = existingCatalog.sha;
    } catch (error) {
      // If file doesn't exist, no SHA needed
    }
    
    await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_USERNAME,
      repo: process.env.GITHUB_REPO,
      path: catalogPath,
      message: 'Update catalog',
      content: Buffer.from(JSON.stringify(catalog, null, 2)).toString('base64'),
      sha: catalogSha
    });
    
    // Now handle the category file
    let websites = [];
    let fileSha = null;
    
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO,
        path: `data/${fileName}`
      });
      
      fileSha = fileData.sha;
      const currentContent = Buffer.from(fileData.content, 'base64').toString();
      websites = JSON.parse(currentContent);
    } catch (error) {
      // If file doesn't exist yet, that's okay
      console.log(`Category file ${fileName} does not exist, will create it`);
    }
    
    // Add new website
    websites.push(websiteData);
    
    // Update category file
    await octokit.repos.createOrUpdateFileContents({
      owner: process.env.GITHUB_USERNAME,
      repo: process.env.GITHUB_REPO,
      path: `data/${fileName}`,
      message: `Add website: ${websiteData.title} to ${fileName}`,
      content: Buffer.from(JSON.stringify(websites, null, 2)).toString('base64'),
      sha: fileSha
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Website saved successfully',
        category: category || 'general'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};