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
  
  // Fix asset paths (images, fonts, etc.) in HTML attributes
  content = content.replace(/src="\/assets\//g, `src="${basePath}/assets/`);
  content = content.replace(/href="\/assets\//g, `href="${basePath}/assets/`);
  content = content.replace(/url\("\/assets\//g, `url("${basePath}/assets/`);
  content = content.replace(/url\('\/assets\//g, `url('${basePath}/assets/`);
  
  // Fix asset paths in JavaScript code (for require() and import statements)
  // This fixes paths like: uri:"/assets/..." in JS bundles
  content = content.replace(/uri:"\/assets\//g, `uri:"${basePath}/assets/`);
  content = content.replace(/uri:'\/assets\//g, `uri:'${basePath}/assets/`);
  
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
    // Immediate redirect - no delay
    window.location.replace('/vex_mix_match/');
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
  
  // Disable hydration to prevent React hydration errors
  // This is safe for static exports since we're not doing SSR
  indexContent = indexContent.replace(
    /globalThis\.__EXPO_ROUTER_HYDRATE__=true/g,
    'globalThis.__EXPO_ROUTER_HYDRATE__=false'
  );
  
  // Add a script at the VERY beginning to handle base path routing
  // This runs IMMEDIATELY before React/Expo Router initializes
  // Use synchronous check and immediate redirect
  const basePathScript = `<script>
    // IMMEDIATE redirect - check synchronously before any other scripts run
    // This prevents React hydration errors by redirecting before React loads
    (function() {
      const basePath = '/vex_mix_match';
      const currentPath = window.location.pathname;
      
      // If we're at /vex_mix_match without trailing slash, redirect IMMEDIATELY
      if (currentPath === basePath) {
        window.location.replace(basePath + '/');
        return;
      }
      
      // If we're not at the base path at all, redirect IMMEDIATELY
      if (!currentPath.startsWith(basePath + '/')) {
        window.location.replace(basePath + '/');
        return;
      }
    })();
  </script>`;
  
  // Insert the script right after <head> - this ensures it runs first
  // Check if script already exists to avoid duplicates
  if (!indexContent.includes('basePath = \'/vex_mix_match\'')) {
    indexContent = indexContent.replace('<head>', `<head>${basePathScript}`);
  }
  
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('Added base path handling to index.html and disabled hydration');
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

