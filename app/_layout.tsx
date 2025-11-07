import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useEffect } from 'react';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Web-specific: Handle base path for GitHub Pages
  // Expo Router should handle basePath automatically, but if it doesn't match,
  // force redirect to root route
  useEffect(() => {
    if (Platform.OS === 'web') {
      const basePath = '/vex_mix_match';
      const currentPath = window.location.pathname;
      
      // If we're at the base path and router shows unmatched route,
      // redirect to root route
      if ((currentPath === basePath || currentPath === basePath + '/') && pathname === null) {
        // Router hasn't matched - force redirect to root
        router.replace('/');
      }
    }
  }, [pathname, router]);
  
  // Web-specific: Catch className.split errors from React Native Web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const originalErrorHandler = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        // Suppress className.split errors from React Native Web PanResponder
        if (typeof message === 'string' && (
          message.includes('className.split') || 
          message.includes('split is not a function') ||
          (message.includes('is not a function') && message.includes('className'))
        )) {
          console.warn('Suppressed React Native Web className error');
          return true; // Suppress error
        }
        // Call original handler for other errors
        if (originalErrorHandler) {
          return originalErrorHandler.call(this, message, source, lineno, colno, error);
        }
        return false;
      };

      return () => {
        window.onerror = originalErrorHandler;
      };
    }
    return undefined;
  }, []);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2563eb',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Mix & Match Planner',
            headerShown: false, // Hide header when viewing the field
          }} 
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
