import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  View,
  Text,
  Dimensions,
  Image,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthContext } from '@/lib/AuthContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuthContext();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Line positioned 30% from top */}
      <View style={styles.topLine} />

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

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
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
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={styles.signupButton} disabled={googleLoading}>
              <Text style={styles.signupButtonText}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

    </View>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  logo: {
    width: width * 0.9,
    height: width * 0.9,
    marginBottom: -30,
  },
  title: {
    fontSize: 70,
    color: '#000000',
    marginBottom: 12,
    fontFamily: 'Gravelo',
    letterSpacing: -3.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Light',
    width: width * 0.70,
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 14,
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
    width: width * 0.70,
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
  signupButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#000000',
    width: width * 0.70,
  },
  signupButtonText: {
    fontSize: 15,
    color: '#000000',
    letterSpacing: -0.9,
    fontFamily: 'Eina01-Light',
  },
});
