import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'bowbozaa';
const REPO = 'api-weaver';
const BRANCH = 'main';

async function getToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;
  const res = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    { headers: { 'Accept': 'application/json', 'X-Replit-Token': xReplitToken! } }
  );
  const data = await res.json();
  return data?.items?.[0]?.settings?.access_token;
}

function shouldIgnore(filePath: string): boolean {
  const ignorePatterns = [
    'node_modules', '.git', 'dist', '.DS_Store', 'server/public',
    '.local', '/tmp/', '*.tar.gz', '.env', 'attached_assets',
    '.cache', '.config', '.upm', 'generated-icon.png'
  ];
  return ignorePatterns.some(p => {
    if (p.startsWith('*')) return filePath.endsWith(p.slice(1));
    return filePath.includes(p);
  });
}

function getAllFiles(dir: string, base: string = ''): { path: string; fullPath: string }[] {
  const results: { path: string; fullPath: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    const fullPath = path.join(dir, entry.name);
    if (shouldIgnore(relPath)) continue;
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, relPath));
    } else if (entry.isFile()) {
      results.push({ path: relPath, fullPath });
    }
  }
  return results;
}

async function main() {
  const token = await getToken();
  if (!token) { console.error('No token'); process.exit(1); }
  
  const octokit = new Octokit({ auth: token });
  const workspace = '/home/runner/workspace';
  
  console.log('Collecting files...');
  const files = getAllFiles(workspace);
  console.log(`Found ${files.length} files to push`);
  
  // Create blobs for all files
  const treeItems: any[] = [];
  let count = 0;
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.fullPath);
      const isBinary = content.includes(0x00);
      
      const blob = await octokit.git.createBlob({
        owner: OWNER, repo: REPO,
        content: isBinary ? content.toString('base64') : content.toString('utf8'),
        encoding: isBinary ? 'base64' : 'utf-8'
      });
      
      treeItems.push({
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.data.sha
      });
      count++;
      if (count % 50 === 0) console.log(`  Uploaded ${count}/${files.length} blobs...`);
    } catch (e: any) {
      console.error(`  Skip ${file.path}: ${e.message}`);
    }
  }
  
  console.log(`Creating tree with ${treeItems.length} files...`);
  const tree = await octokit.git.createTree({
    owner: OWNER, repo: REPO,
    tree: treeItems
  });
  
  // Get current commit SHA
  const ref = await octokit.git.getRef({ owner: OWNER, repo: REPO, ref: 'heads/main' });
  const parentSha = ref.data.object.sha;
  
  console.log('Creating commit...');
  const commit = await octokit.git.createCommit({
    owner: OWNER, repo: REPO,
    message: 'Sync from Replit: API Weaver latest updates\n\n- CSP fix for Swagger UI CDN resources\n- Auth protection improvements\n- Agent skills added',
    tree: tree.data.sha,
    parents: [parentSha]
  });
  
  console.log('Updating branch ref...');
  await octokit.git.updateRef({
    owner: OWNER, repo: REPO,
    ref: 'heads/main',
    sha: commit.data.sha,
    force: true
  });
  
  console.log(`✅ Successfully pushed to GitHub!`);
  console.log(`   Commit: ${commit.data.sha}`);
  console.log(`   URL: https://github.com/${OWNER}/${REPO}/commit/${commit.data.sha}`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
