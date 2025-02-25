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
    const websiteData = JSON.parse(event.body);
    const category = websiteData.category || 'websites'; // Default to 'websites' if no category
    
    // Determine file path based on category
    const filePath = `data/${category}.json`;
    
    try {
      // Get current file content
      const { data: fileData } = await octokit.repos.getContent({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO,
        path: filePath
      });

      // Decode current content
      const currentContent = Buffer.from(fileData.content, 'base64').toString();
      const websites = JSON.parse(currentContent);
      
      // Add new website
      websites.push(websiteData);
      
      // Update file in repository
      await octokit.repos.createOrUpdateFileContents({
        owner: process.env.GITHUB_USERNAME,
        repo: process.env.GITHUB_REPO,
        path: filePath,
        message: `Add website: ${websiteData.title} to ${category} collection`,
        content: Buffer.from(JSON.stringify(websites, null, 2)).toString('base64'),
        sha: fileData.sha
      });
    } catch (error) {
      // If file doesn't exist yet, create it
      if (error.status === 404) {
        await octokit.repos.createOrUpdateFileContents({
          owner: process.env.GITHUB_USERNAME,
          repo: process.env.GITHUB_REPO,
          path: filePath,
          message: `Create ${category} collection with first website: ${websiteData.title}`,
          content: Buffer.from(JSON.stringify([websiteData], null, 2)).toString('base64')
        });
      } else {
        throw error;
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Website saved successfully',
        category: category 
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