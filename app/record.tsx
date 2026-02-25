import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDeepLink } from './_layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import VoiceRecorder from '@/components/VoiceRecorder';
import ExpenseReview from '@/components/ExpenseReview';
import { parseVoiceExpenses, saveMultipleExpenses } from '@/lib/api';
import { getVoiceLanguage } from '@/lib/storage';
import { ParsedExpense } from '@/types';
import { useAuthContext } from '@/lib/AuthContext';

type Screen = 'record' | 'processing' | 'review' | 'saving';

/**
 * This screen handles the widget deep link (budgetapp://record).
 * Expo-router automatically navigates here when the widget is clicked.
 * Always auto-starts recording for quick expense entry.
 */
export default function RecordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, loading: authLoading } = useAuthContext();
  const { triggerDataRefresh } = useDeepLink();
  const [screen, setScreen] = useState<Screen>('record');
  const [isReady, setIsReady] = useState(false);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [transcript, setTranscript] = useState('');

  // Wait for auth to load, then redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not authenticated, redirect to login
      router.replace('/(auth)/login');
    } else {
      // Authenticated, ready to record
      setIsReady(true);
    }
  }, [authLoading, user, router]);

  // Navigate to home screen, dismissing any modals in the stack
  const navigateToHome = (shouldRefresh = false) => {
    // Trigger data refresh via context before navigating
    // This ensures the home screen will refresh when it receives focus
    if (shouldRefresh) {
      triggerDataRefresh();
    }

    // Use dismissAll to properly close the modal and go to the root
    // This prevents double navigation when deep link creates extra stack entries
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleRecordingComplete = async (uri: string) => {
    setScreen('processing');
    try {
      const language = await getVoiceLanguage();
      const result = await parseVoiceExpenses(uri, language);
      setParsedExpenses(result.expenses);
      setTranscript(result.transcript);
      setScreen('review');
    } catch (error: any) {
      console.error('Failed to parse voice:', error);
      Alert.alert('Error', error.message || 'Failed to process recording', [
        { text: 'Try Again', onPress: () => setScreen('record') },
        { text: 'Close', onPress: navigateToHome },
      ]);
    }
  };

  const handleConfirm = async (expenses: ParsedExpense[]) => {
    setScreen('saving');
    try {
      const expensesToSave = expenses.map(exp => ({
        amount: exp.amount,
        description: exp.description,
        category_id: exp.category_id || null,
        voice_transcript: transcript,
        type: exp.type || 'expense',
      }));

      await saveMultipleExpenses(expensesToSave);

      // Navigate directly to home - the updated balance confirms the save
      navigateToHome(true);
    } catch (error: any) {
      console.error('Failed to save:', error);
      Alert.alert('Error', error.message || 'Failed to save', [
        { text: 'Try Again', onPress: () => setScreen('review') },
        { text: 'Close', onPress: navigateToHome },
      ]);
    }
  };

  const handleCancel = () => {
    if (screen === 'record') {
      navigateToHome();
    } else {
      setScreen('record');
      setParsedExpenses([]);
      setTranscript('');
    }
  };

  const handleClose = () => {
    navigateToHome();
  };

  // Show loading while auth is being checked
  if (authLoading || !isReady) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Modal Handle */}
      <View style={styles.modalHandle} />

      {/* Close Button */}
      <TouchableOpacity style={[styles.closeButton, { top: insets.top + 8 }]} onPress={handleClose}>
        <FontAwesome name="times" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {/* Content */}
      {screen === 'record' && (
        <View style={styles.voiceContainer}>
          <Text style={styles.voiceTitle}>Add Transaction</Text>
          <Text style={styles.voiceSubtitle}>
            Say something like "Spent $20 on lunch" or "Received $500 salary"{'\n'}
            You can also record multiple items at once
          </Text>
          <View style={styles.recorderWrapper}>
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              isProcessing={false}
              autoStart={true}
            />
          </View>
        </View>
      )}

      {screen === 'processing' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.processingText}>Processing your voice...</Text>
        </View>
      )}

      {screen === 'review' && (
        <ExpenseReview
          expenses={parsedExpenses}
          transcript={transcript}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          isLoading={false}
        />
      )}

      {screen === 'saving' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.processingText}>Saving...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
    alignSelf: 'center',
    marginTop: 12,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  voiceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  voiceTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  voiceSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 48,
  },
  recorderWrapper: {
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
});
