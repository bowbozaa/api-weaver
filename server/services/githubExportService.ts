import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export async function getAuthenticatedUser() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listUserRepos() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

export async function createRepo(name: string, description: string, isPrivate: boolean = false) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: false
  });
  return data;
}

export async function getRepoInfo(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return data;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

import * as fs from 'fs';
import * as path from 'path';

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.replit',
  '.cache',
  'dist',
  '.npm',
  '.config',
  'replit.nix',
  '.upm',
  'generated-icon.png',
  '.breakpoints',
  '.local'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dirPath: string, basePath: string = ''): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;
      
      if (shouldIgnore(relativePath)) continue;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getAllFiles(fullPath, relativePath));
      } else if (stat.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          files.push({ path: relativePath, content });
        } catch (e) {
          console.log(`Skipping binary file: ${relativePath}`);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

export async function pushToGitHub(owner: string, repo: string, message: string = 'Update from API Weaver') {
  const octokit = await getUncachableGitHubClient();
  const projectRoot = process.cwd();
  
  // Get all project files
  const files = getAllFiles(projectRoot);
  console.log(`Found ${files.length} files to push`);
  
  // Get or create the default branch
  let defaultBranch = 'main';
  let baseSha: string | undefined;
  let isEmptyRepo = false;
  
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    defaultBranch = repoData.default_branch;
    
    // Get the latest commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });
    baseSha = refData.object.sha;
  } catch (error: any) {
    // Repository might be empty
    console.log('Repository is empty, will initialize with README first');
    isEmptyRepo = true;
  }
  
  // If empty repo, create initial README using contents API first
  if (isEmptyRepo) {
    console.log('Creating initial README.md to initialize repository...');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: 'Initial commit',
      content: Buffer.from('# API Weaver\n\nMCP Architecture Monorepo - Initializing...').toString('base64')
    });
    
    // Now get the base SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`
    });
    baseSha = refData.object.sha;
    console.log('Repository initialized, base SHA:', baseSha);
  }
  
  // Create blobs for all files
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  
  for (const file of files) {
    try {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
    } catch (error) {
      console.error(`Failed to create blob for ${file.path}:`, error);
    }
  }
  
  console.log(`Created ${treeItems.length} blobs`);
  
  // Create tree with base_tree
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    base_tree: baseSha
  });
  
  // Create commit
  const { data: commit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: tree.sha,
    parents: baseSha ? [baseSha] : []
  });
  
  // Update reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
    sha: commit.sha
  });
  
  return {
    success: true,
    commitSha: commit.sha,
    filesCount: treeItems.length,
    message: `Successfully pushed ${treeItems.length} files to ${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}/commit/${commit.sha}`
  };
}
