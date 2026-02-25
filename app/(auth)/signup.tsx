import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  View,
  Text,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthContext } from '@/lib/AuthContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width, height } = Dimensions.get('window');

export default function SignupNewScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
  const { signUp, signInWithGoogle, signInWithApple } = useAuthContext();

  useEffect(() => {
    // Check if Apple Sign In is available (iOS only)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
    }
  }, []);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Success',
        'Check your email for a confirmation link to complete your registration.'
      );
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  const handleAppleSignup = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top line removed */}

      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <FontAwesome name="arrow-left" size={18} color="#000000" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Start tracking your expenses with voice
          </Text>

          <View style={styles.form}>
            {/* Google Sign Up Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignup}
              disabled={googleLoading || loading || appleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Image
                    source={require('../../assets_home/Google__G__logo.svg.webp')}
                    style={styles.googleLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Sign Up Button */}
            {appleSignInAvailable && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignup}
                disabled={appleLoading || loading || googleLoading}
              >
                {appleLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <FontAwesome name="apple" size={18} color="#fff" />
                    <Text style={styles.appleButtonText}>Continue with Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or sign up with email</Text>
              <View style={styles.divider} />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleSignup}
              disabled={loading || googleLoading || appleLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <Text style={styles.linkText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topLine: {
    position: 'absolute',
    width: 279,
    height: 7,
    backgroundColor: '#000000',
    borderRadius: 3.5,
    alignSelf: 'center',
    top: height * 0.10,
    zIndex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  title: {
    fontSize: 48,
    color: '#000000',
    marginBottom: 12,
    fontFamily: 'Gravelo',
    letterSpacing: -2.4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Light',
  },
  form: {
    width: width * 0.70,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 20,
  },
  googleLogo: {
    width: 16,
    height: 16,
  },
  googleButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Regular',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 20,
  },
  appleLogo: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  appleButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 13,
    letterSpacing: -0.78,
    fontFamily: 'Eina01-Light',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
  },
  createButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Regular',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  linkText: {
    color: '#6B7280',
    fontSize: 14,
    letterSpacing: -0.84,
    fontFamily: 'Eina01-Light',
  },
  link: {
    color: '#000000',
    fontSize: 14,
    letterSpacing: -0.84,
    fontFamily: 'Eina01-Regular',
  },
});
