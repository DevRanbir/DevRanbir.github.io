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
    
    // Get current file content
    const { data: fileData } = await octokit.repos.getContent({
      owner: process.env.GITHUB_USERNAME,
      repo: process.env.GITHUB_REPO,
      path: 'data/websites.json'
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
      path: 'data/websites.json',
      message: `Add website: ${websiteData.title}`,
      content: Buffer.from(JSON.stringify(websites, null, 2)).toString('base64'),
      sha: fileData.sha
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Website saved successfully' })
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
