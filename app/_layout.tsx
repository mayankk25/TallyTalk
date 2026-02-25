import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useEffect, createContext, useContext, useState, useCallback, useRef } from 'react';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Suppress known react-native-svg warning that doesn't affect functionality
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout" dispatched']);

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuthContext } from '@/lib/AuthContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Deep link context for triggering recording from widget and data refresh
type DeepLinkContextType = {
  shouldOpenRecorder: boolean;
  clearRecorderFlag: () => void;
  initialDeepLink: string | null;
  clearInitialDeepLink: () => void;
  // Data refresh signal - used when expenses are added from record screen
  shouldRefreshData: boolean;
  triggerDataRefresh: () => void;
  clearRefreshFlag: () => void;
};

const DeepLinkContext = createContext<DeepLinkContextType>({
  shouldOpenRecorder: false,
  clearRecorderFlag: () => {},
  initialDeepLink: null,
  clearInitialDeepLink: () => {},
  shouldRefreshData: false,
  triggerDataRefresh: () => {},
  clearRefreshFlag: () => {},
});

export const useDeepLink = () => useContext(DeepLinkContext);

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuthContext();
  const { initialDeepLink, clearInitialDeepLink } = useDeepLink();
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);

  // Hide splash screen when auth is ready (only once)
  useEffect(() => {
    if (!loading && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  // Handle deep link navigation after auth is resolved
  // Note: 'record' deep link is handled by the home screen via shouldOpenRecorder context
  // This is intentionally left to trigger the modal in the home screen instead of navigating

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="transactions"
          options={{
            headerShown: false,
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="record"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    'Gravelo': require('../assets/fonts/Gravelo.ttf'),
    'Eina01-Light': require('../assets/fonts/Eina01-Light.ttf'),
    'Eina01-Regular': require('../assets/fonts/Eina01-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [shouldOpenRecorder, setShouldOpenRecorder] = useState(false);
  const [initialDeepLink, setInitialDeepLink] = useState<string | null>(null);
  const [shouldRefreshData, setShouldRefreshData] = useState(false);

  const clearRecorderFlag = useCallback(() => {
    setShouldOpenRecorder(false);
  }, []);

  const clearInitialDeepLink = useCallback(() => {
    setInitialDeepLink(null);
  }, []);

  const triggerDataRefresh = useCallback(() => {
    setShouldRefreshData(true);
  }, []);

  const clearRefreshFlag = useCallback(() => {
    setShouldRefreshData(false);
  }, []);

  // Deep links are now handled automatically by expo-router
  // The 'record' deep link navigates to app/record.tsx automatically
  // No custom handling needed since file name matches the deep link path

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DeepLinkContext.Provider value={{
        shouldOpenRecorder,
        clearRecorderFlag,
        initialDeepLink,
        clearInitialDeepLink,
        shouldRefreshData,
        triggerDataRefresh,
        clearRefreshFlag,
      }}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </DeepLinkContext.Provider>
    </GestureHandlerRootView>
  );
}
