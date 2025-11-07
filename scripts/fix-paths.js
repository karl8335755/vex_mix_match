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
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed paths in: ${path.relative(process.cwd(), filePath)}`);
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
console.log('✅ Path fixing complete!');

