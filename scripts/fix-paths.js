#!/usr/bin/env node

/**
 * Post-build script to fix asset paths for GitHub Pages
 * Replaces absolute paths with relative paths for GitHub Pages deployment
 */

const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const basePath = '/vex_mix_match';

function fixPathsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace absolute paths with base path
  content = content.replace(/src="\/_expo\//g, `src="${basePath}/_expo/`);
  content = content.replace(/href="\/_expo\//g, `href="${basePath}/_expo/`);
  content = content.replace(/url\("\/_expo\//g, `url("${basePath}/_expo/`);
  content = content.replace(/url\('\/_expo\//g, `url('${basePath}/_expo/`);
  
  // Fix router base path references
  content = content.replace(/\/vex_mix_match\/vex_mix_match\//g, '/vex_mix_match/');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed paths in: ${path.relative(process.cwd(), filePath)}`);
}

function create404Redirect() {
  // Create a 404.html that redirects to index.html (GitHub Pages requirement)
  // This handles all unmatched routes and redirects them to the app entry point
  const redirect404 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Get the base path from the current location
    const basePath = '/vex_mix_match';
    const currentPath = window.location.pathname;
    
    // If we're at the base path without trailing slash, add it
    if (currentPath === basePath) {
      window.location.replace(basePath + '/');
    } else {
      // Otherwise redirect to base path
      window.location.replace(basePath + '/');
    }
  </script>
  <meta http-equiv="refresh" content="0; url=/vex_mix_match/">
</head>
<body>
  <p>Redirecting to <a href="/vex_mix_match/">home page</a>...</p>
</body>
</html>`;
  
  fs.writeFileSync(path.join(distDir, '404.html'), redirect404, 'utf8');
  console.log('Created 404.html redirect');
  
  // Also create index.html redirect for the base path without trailing slash
  // This ensures /vex_mix_match redirects to /vex_mix_match/
  const indexPath = path.join(distDir, 'index.html');
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Add a script at the beginning to handle base path routing
  const basePathScript = `<script>
    // Ensure we're at the correct base path
    if (window.location.pathname === '/vex_mix_match' && !window.location.pathname.endsWith('/')) {
      window.location.replace('/vex_mix_match/');
    }
  </script>`;
  
  // Insert the script right after <head>
  indexContent = indexContent.replace('<head>', `<head>${basePathScript}`);
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('Added base path handling to index.html');
}

function fixPathsInDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directory not found: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixPathsInDirectory(filePath);
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      fixPathsInFile(filePath);
    }
  }
}

console.log('Fixing asset paths for GitHub Pages...');
console.log(`Looking in: ${distDir}`);
fixPathsInDirectory(distDir);
create404Redirect();
console.log('✅ Path fixing complete!');

