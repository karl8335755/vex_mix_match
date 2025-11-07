# Testing Expo/React Native Apps in Browser

## How Expo Web Works

**Expo Web** automatically converts your React Native code to run in the browser. You don't need special emulation - it renders natively using React DOM under the hood.

## Testing Steps

### 1. **Start the Web Server**
```bash
npm run web
# or
npx expo start --web
```

The server will start and automatically open your browser at `http://localhost:19006` (or similar port).

### 2. **Testing Different Screen Sizes**

#### Option A: Browser DevTools Device Mode (Recommended)
1. Open your browser's Developer Tools (F12 or Cmd+Option+I on Mac)
2. Click the **Device Toolbar** icon (phone/tablet icon) or press:
   - **Chrome/Edge**: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows)
   - **Firefox**: `Cmd+Shift+M` (Mac) or `Ctrl+Shift+M` (Windows)
   - **Safari**: Enable Develop menu first, then `Cmd+Option+R`

3. **Select a device preset**:
   - iPhone SE (375x667) - Small phone
   - iPhone 12/13/14 (390x844) - Standard phone
   - iPhone 14 Pro Max (430x932) - Large phone
   - iPad (768x1024) - Tablet
   - Or create custom dimensions

4. **Test interactions**:
   - Click/tap works as mouse clicks
   - Scroll works normally
   - Touch events are simulated

#### Option B: Manual Window Resizing
- Simply resize your browser window to test different widths
- The app will adapt responsively

### 3. **What Works in Browser**

✅ **Works:**
- All React Native components (View, Text, ScrollView, etc.)
- Styling (StyleSheet, Flexbox)
- Navigation (Expo Router)
- State management (useState, useEffect)
- AsyncStorage (uses localStorage on web)
- Most React Native APIs

⚠️ **Limited/Missing:**
- Native device features (camera, GPS, accelerometer)
- Native modules not ported to web
- Some gesture handlers may behave differently
- Performance may differ from native

### 4. **Mobile-Specific Testing**

For a more accurate mobile experience:

1. **Use Device Mode** with a phone preset
2. **Set viewport** to mobile size (e.g., 375x667)
3. **Test touch interactions** - tap instead of click
4. **Check scroll behavior** - ensure it feels natural
5. **Test portrait/landscape** by rotating device preset

### 5. **Tips for Better Testing**

- **Keep DevTools open** to see console logs
- **Use Network tab** to monitor API calls
- **Check Console** for any warnings/errors
- **Test responsive behavior** by resizing window
- **Clear cache** if styles don't update: `Cmd+Shift+R` (hard refresh)

## Current App Status

Your app should now be running at: **http://localhost:19006**

The interface will work just like a mobile app, but rendered in your browser. You can:
- Create routes with waypoints
- Save/load routes (stored in browser localStorage)
- Create strategies
- Test all functionality

No special emulation needed - Expo handles the conversion automatically!






