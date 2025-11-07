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
      
      // Only redirect if we're NOT at root (/) - this handles GitHub Pages deployment
      // If we're at root locally, don't redirect (for local testing)
      // If we're at /vex_mix_match or /vex_mix_match/, we're on GitHub Pages
      if (currentPath === basePath) {
        // At /vex_mix_match without trailing slash - redirect to /
        window.location.replace(basePath + '/');
        return;
      }
      
      // CRITICAL: If we're at /vex_mix_match/, modify the pathname to / before Expo Router loads
      // This makes Expo Router see / instead of /vex_mix_match/, so it matches the index route
      if (currentPath === basePath + '/') {
        // Use replaceState to change the pathname to / without reloading
        // This happens BEFORE Expo Router reads window.location.pathname
        window.history.replaceState(null, '', '/');
        // Also set a flag so we know we modified the path
        window.__EXPO_ROUTER_BASE_PATH_MODIFIED__ = true;
      }
      
      // Only redirect if we're not at root AND not at base path
      // This allows local testing at / to work, but redirects on GitHub Pages
      if (currentPath !== '/' && !currentPath.startsWith(basePath + '/')) {
        // Not at root and not at base path - redirect to base path
        // This handles cases where someone visits a wrong path on GitHub Pages
        window.location.replace(basePath + '/');
        return;
      }
      
      // Set base path for Expo Router before it initializes
      // This ensures Expo Router knows about the base path
      if (!window.__EXPO_ROUTER_BASE_PATH__) {
        window.__EXPO_ROUTER_BASE_PATH__ = basePath;
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

