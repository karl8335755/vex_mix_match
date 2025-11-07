# Troubleshooting Guide

## If Nothing is Showing in Browser

### 1. Check Browser Console
Open Developer Tools (F12 or Cmd+Option+I) and check the Console tab for errors.

### 2. Verify Server is Running
```bash
# Check if server is running
lsof -i :19006
lsof -i :8081

# If not running, start it:
npm run web
```

### 3. Check the URL
- Web interface: http://localhost:19006
- Metro bundler: http://localhost:8081

### 4. Common Issues

#### Image Not Loading
- Check if `assets/field-background.png` exists
- Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear browser cache

#### Blank Screen
- Check browser console for JavaScript errors
- Verify React Native Web is installed
- Check if Metro bundler is running

#### Field Not Showing
- The field image should be visible
- If gray box appears, image path might be wrong
- Check browser Network tab for failed image requests

### 5. Quick Test
Add this temporary debug code to see if component renders:

```tsx
<View style={{ padding: 20, backgroundColor: 'red' }}>
  <Text>DEBUG: Component is rendering</Text>
</View>
```

If you see the red box, the component renders but the field image might not load.

### 6. Check Terminal Output
Look for errors in the terminal where you ran `npm run web`:
- Metro bundler errors
- Module resolution errors
- Build failures

### 7. Try These Commands
```bash
# Clear cache and restart
npx expo start --web --clear

# Check for errors
npm run type-check

# Verify dependencies
npm install
```





