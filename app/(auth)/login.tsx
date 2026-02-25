import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View,
  Text,
  TextInput,
  Dimensions,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Link } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuthContext } from '@/lib/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleSignInAvailable, setAppleSignInAvailable] = useState(false);
  const { signIn, signInWithGoogle, signInWithApple } = useAuthContext();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleSignInAvailable);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setEmailLoading(true);
    const { error } = await signIn(email, password);
    setEmailLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  const anyLoading = googleLoading || appleLoading || emailLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Main content */}
      <View style={styles.content}>
        {/* Wallet logo */}
        <Image
          source={require('../../assets_home/illustration.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* App title */}
        <Text style={styles.title}>TallyTalk</Text>

        {/* Tagline */}
        <Text style={styles.subtitle}>
          Record your expenses & incomes simply{'\n'}using your voice
        </Text>

        {/* Email login first */}
        <View style={styles.buttonContainer}>
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

          <TouchableOpacity
            style={styles.emailSignInButton}
            onPress={handleEmailLogin}
            disabled={anyLoading}
          >
            {emailLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.emailSignInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Social login buttons */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={anyLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonInner}>
                <View style={styles.iconContainer}>
                  <Image
                    source={require('../../assets_home/Google__G__logo.svg.webp')}
                    style={styles.googleLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {appleSignInAvailable && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleLogin}
              disabled={anyLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonInner}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="apple" size={18} color="#fff" />
                  </View>
                  <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <Link href="/(auth)/signup">
              <Text style={styles.signupLink}>Create an account</Text>
            </Link>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  logo: {
    width: width * 0.72,
    height: width * 0.72,
    marginBottom: -24,
  },
  title: {
    fontSize: 70,
    color: '#000000',
    marginBottom: 8,
    fontFamily: 'Gravelo',
    letterSpacing: -3.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Light',
    width: width * 0.70,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 12,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 16,
    fontSize: 15,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
    fontFamily: 'Eina01-Light',
    letterSpacing: -0.9,
    width: width * 0.70,
  },
  emailSignInButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: width * 0.70,
  },
  emailSignInButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Regular',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: width * 0.70,
    marginVertical: 2,
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
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: width * 0.70,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: width * 0.70,
  },
  appleButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Regular',
  },
  signupText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontFamily: 'Eina01-Light',
  },
  signupLink: {
    color: '#000000',
    fontFamily: 'Eina01-Regular',
    textDecorationLine: 'underline',
  },
});
