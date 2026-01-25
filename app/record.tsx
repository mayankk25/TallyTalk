import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { parseVoiceExpenses, saveMultipleExpenses, getCategories } from '@/lib/api';
import { ParsedExpense, Category } from '@/types';

type RecordingState = 'idle' | 'recording' | 'processing' | 'confirming' | 'saving' | 'success' | 'error';

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function QuickRecordScreen() {
  const router = useRouter();
  const [state, setState] = useState<RecordingState>('idle');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const recordingRef = useRef<Audio.Recording | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Fade in on mount and fetch categories
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Fetch categories for lookup
    getCategories().then(setCategories).catch(console.error);

    // Auto-start recording after brief delay
    const startTimer = setTimeout(() => {
      startRecording();
    }, 500);

    return () => {
      clearTimeout(startTimer);
      cleanup();
    };
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [state]);

  // Duration counter (counts up)
  useEffect(() => {
    if (state === 'recording') {
      durationRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }

    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [state]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const cleanup = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      await cleanup();

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Microphone permission required');
        setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setState('recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setErrorMessage('Failed to start recording');
      setState('error');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setState('processing');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setRecording(null);

      if (!uri) {
        throw new Error('No recording URI');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Process the recording
      const result = await parseVoiceExpenses(uri);

      if (result.expenses.length === 0) {
        setErrorMessage('Could not understand. Try again.');
        setState('error');
        return;
      }

      setParsedExpenses(result.expenses);
      setState('confirming');
    } catch (error: any) {
      console.error('Failed to process:', error);
      setErrorMessage(error.message || 'Failed to process recording');
      setState('error');
    }
  };

  // Find category ID by name (case-insensitive)
  const findCategoryId = (suggestedCategory: string | undefined): string | null => {
    if (!suggestedCategory || categories.length === 0) return null;
    const category = categories.find(
      c => c.name.toLowerCase() === suggestedCategory.toLowerCase()
    );
    return category?.id || null;
  };

  const handleConfirm = async () => {
    setState('saving');

    try {
      const expensesToSave = parsedExpenses.map(exp => ({
        amount: exp.amount,
        description: exp.description,
        category_id: findCategoryId(exp.suggested_category),
        voice_transcript: '',
        type: exp.type || 'expense',
      }));

      await saveMultipleExpenses(expensesToSave);
      setState('success');

      // Auto-close after showing success (short delay to show success state)
      setTimeout(() => {
        exitApp();
      }, 800);
    } catch (error: any) {
      console.error('Failed to save:', error);
      setErrorMessage(error.message || 'Failed to save');
      setState('error');
    }
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    });
  };

  // Close screen and go to app home
  const exitApp = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      router.replace('/(tabs)');
    });
  };

  const handleRetry = () => {
    setErrorMessage('');
    setParsedExpenses([]);
    startRecording();
  };

  const formatExpenseSummary = () => {
    if (parsedExpenses.length === 0) return '';

    if (parsedExpenses.length === 1) {
      const exp = parsedExpenses[0];
      const type = exp.type === 'income' ? 'income' : 'expense';
      return `Add $${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${exp.description || type}?`;
    }

    const total = parsedExpenses.reduce((sum, e) => sum + e.amount, 0);
    return `Add ${parsedExpenses.length} items ($${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} total)?`;
  };

  const getSuccessMessage = () => {
    if (parsedExpenses.length === 0) return 'Saved!';

    const incomeCount = parsedExpenses.filter(e => e.type === 'income').length;
    const expenseCount = parsedExpenses.filter(e => e.type !== 'income').length;

    if (incomeCount > 0 && expenseCount > 0) {
      return 'Transactions added!';
    } else if (incomeCount > 0) {
      return 'Income added!';
    } else {
      return 'Expense added!';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <FontAwesome name="times" size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Recording State */}
        {state === 'recording' && (
          <View style={styles.content}>
            <Text style={styles.title}>Recording</Text>
            <Text style={styles.subtitle}>Speak your expense or income</Text>

            <Animated.View style={[styles.micContainer, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.micCircle}>
                <FontAwesome name="microphone" size={32} color="#fff" />
              </View>
            </Animated.View>

            <Text style={styles.durationText}>
              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </Text>

            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopIcon}>
                <FontAwesome name="stop" size={14} color="#fff" />
              </View>
              <Text style={styles.stopButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <View style={styles.content}>
            <Text style={styles.title}>Processing</Text>
            <Text style={styles.subtitle}>Analyzing your recording...</Text>

            <View style={styles.processingContainer}>
              <View style={styles.processingDot} />
            </View>
          </View>
        )}

        {/* Confirming State */}
        {state === 'confirming' && (
          <View style={styles.content}>
            <Text style={styles.title}>Confirm</Text>
            <Text style={styles.subtitle}>{formatExpenseSummary()}</Text>

            {/* Show parsed items */}
            <View style={styles.itemsCard}>
              {parsedExpenses.map((exp, index) => (
                <View key={index} style={[styles.itemRow, index < parsedExpenses.length - 1 && styles.itemRowBorder]}>
                  <View style={styles.itemIcon}>
                    <Text style={styles.itemEmoji}>{exp.type === 'income' ? '💰' : '📦'}</Text>
                  </View>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDescription}>{exp.description}</Text>
                    <Text style={styles.itemCategoryText}>{exp.suggested_category}</Text>
                  </View>
                  <Text style={[styles.itemAmount, exp.type === 'income' && styles.incomeAmount]}>
                    {exp.type === 'income' ? '+' : '-'}${formatCurrency(exp.amount)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Saving State */}
        {state === 'saving' && (
          <View style={styles.content}>
            <Text style={styles.title}>Saving</Text>
            <Text style={styles.subtitle}>Adding your transaction...</Text>

            <View style={styles.processingContainer}>
              <View style={styles.processingDot} />
            </View>
          </View>
        )}

        {/* Success State */}
        {state === 'success' && (
          <View style={styles.content}>
            <View style={styles.successIcon}>
              <FontAwesome name="check" size={40} color="#34C759" />
            </View>
            <Text style={styles.successTitle}>{getSuccessMessage()}</Text>
          </View>
        )}

        {/* Error State */}
        {state === 'error' && (
          <View style={styles.content}>
            <View style={styles.errorIcon}>
              <FontAwesome name="exclamation-triangle" size={32} color="#FF3B30" />
            </View>
            <Text style={styles.title}>Oops!</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <View style={styles.errorButtons}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissButton} onPress={handleClose}>
                <Text style={styles.dismissButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Idle State (brief moment before recording starts) */}
        {state === 'idle' && (
          <View style={styles.content}>
            <Text style={styles.title}>Quick Record</Text>
            <Text style={styles.subtitle}>Starting microphone...</Text>

            <View style={styles.micContainer}>
              <View style={[styles.micCircle, styles.micCircleIdle]}>
                <FontAwesome name="microphone" size={32} color="#8E8E93" />
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5E5',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },

  // Typography
  title: {
    fontSize: 32,
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Gravelo',
    letterSpacing: -1.6,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 48,
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },

  // Recording
  micContainer: {
    marginBottom: 24,
  },
  micCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  micCircleIdle: {
    backgroundColor: '#F5F5F5',
  },
  durationText: {
    fontSize: 48,
    color: '#000',
    marginBottom: 32,
    fontFamily: 'Eina01-Regular',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#000',
    borderRadius: 28,
    gap: 12,
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },

  // Processing
  processingContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },

  // Confirming - Items Card
  itemsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'transparent',
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemDetails: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  itemDescription: {
    fontSize: 15,
    color: '#000',
    marginBottom: 2,
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
  itemCategoryText: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.78,
  },
  itemAmount: {
    fontSize: 15,
    color: '#000',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
  incomeAmount: {
    color: '#34C759',
  },

  // Confirm Buttons
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 28,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#000',
    borderRadius: 28,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },

  // Success
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    color: '#34C759',
    fontFamily: 'Gravelo',
    letterSpacing: -1.2,
  },

  // Error
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
  },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#000',
    borderRadius: 28,
  },
  retryButtonText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
  dismissButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#F5F5F5',
    borderRadius: 28,
  },
  dismissButtonText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: 'Eina01-Regular',
    letterSpacing: -0.9,
  },
});
