// netlify/functions/save-website.js
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const websiteData = JSON.parse(event.body);
    
    // Get current file content
    const { data: fileData } = await octokit.repos.getContent({
      owner: 'YOUR_GITHUB_USERNAME',
      repo: 'YOUR_REPO_NAME',
      path: 'data/websites.json'
    });

    // Decode current content
    const currentContent = Buffer.from(fileData.content, 'base64').toString();
    const websites = JSON.parse(currentContent);
    
    // Add new website
    websites.push(websiteData);
    
    // Update file in repository
    await octokit.repos.createOrUpdateFileContents({
      owner: 'YOUR_GITHUB_USERNAME',
      repo: 'YOUR_REPO_NAME',
      path: 'data/websites.json',
      message: `Add website: ${websiteData.title}`,
      content: Buffer.from(JSON.stringify(websites, null, 2)).toString('base64'),
      sha: fileData.sha
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Website saved successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
