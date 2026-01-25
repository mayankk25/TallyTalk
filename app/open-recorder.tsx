import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';

/**
 * This screen handles the widget deep link.
 * It navigates to home with a param to trigger the recorder modal.
 */
export default function OpenRecorderScreen() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to home with openRecorder param
    const timer = setTimeout(() => {
      router.replace('/(tabs)?openRecorder=true');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  // Show nothing while redirecting
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
});
