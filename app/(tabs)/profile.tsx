import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Alert, ScrollView, ActionSheetIOS, Platform, Modal, Linking } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, View } from '@/components/Themed';
import { useAuthContext } from '@/lib/AuthContext';
import {
  getVoiceLanguage,
  setVoiceLanguage,
  VOICE_LANGUAGES,
  VoiceLanguage,
  getCurrency,
  setCurrency,
  CURRENCIES,
  CurrencyCode,
  getCurrencyByCode,
} from '@/lib/storage';

export default function SettingsScreen() {
  const { user, signOut, deleteAccount } = useAuthContext();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [voiceLanguage, setVoiceLanguageState] = useState<VoiceLanguage>('en');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    loadVoiceLanguage();
    loadCurrency();
  }, []);

  const loadVoiceLanguage = async () => {
    const lang = await getVoiceLanguage();
    setVoiceLanguageState(lang);
  };

  const loadCurrency = async () => {
    const currency = await getCurrency();
    setCurrencyCodeState(currency);
  };

  const handleLanguageSelect = async (code: VoiceLanguage) => {
    await setVoiceLanguage(code);
    setVoiceLanguageState(code);
    setShowLanguagePicker(false);
  };

  const handleCurrencySelect = async (code: CurrencyCode) => {
    await setCurrency(code);
    setCurrencyCodeState(code);
    setShowCurrencyPicker(false);
  };

  const handleVoiceLanguagePress = () => {
    if (Platform.OS === 'ios') {
      const options = [...VOICE_LANGUAGES.map(l => l.name), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Voice Recording Language',
          message: 'Select the language you speak in when recording expenses',
        },
        async (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const selected = VOICE_LANGUAGES[buttonIndex];
            await setVoiceLanguage(selected.code);
            setVoiceLanguageState(selected.code);
          }
        }
      );
    } else {
      // Android: use Modal picker
      setShowLanguagePicker(true);
    }
  };

  const getVoiceLanguageName = () => {
    return VOICE_LANGUAGES.find(l => l.code === voiceLanguage)?.name || 'English';
  };

  const getCurrencyDisplay = () => {
    const currency = getCurrencyByCode(currencyCode);
    return `${currency.symbol} ${currency.code}`;
  };

  const handleCurrencyPress = () => {
    if (Platform.OS === 'ios') {
      const options = [...CURRENCIES.map(c => `${c.symbol} ${c.name}`), 'Cancel'];
      const cancelButtonIndex = options.length - 1;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Currency',
          message: 'Select your preferred currency for displaying amounts',
        },
        async (buttonIndex) => {
          if (buttonIndex !== cancelButtonIndex) {
            const selected = CURRENCIES[buttonIndex];
            await setCurrency(selected.code);
            setCurrencyCodeState(selected.code);
          }
        }
      );
    } else {
      setShowCurrencyPicker(true);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Are you absolutely sure?',
              'All your transactions, categories, and account data will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeletingAccount(true);
                    try {
                      await deleteAccount();
                    } catch (error: any) {
                      setIsDeletingAccount(false);
                      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Account Section - removed Edit Profile, Categories, Notifications (not yet implemented) */}

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="microphone"
            label="Voice Language"
            value={getVoiceLanguageName()}
            onPress={handleVoiceLanguagePress}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="dollar"
            label="Currency"
            value={getCurrencyDisplay()}
            onPress={handleCurrencyPress}
          />
          {/* Appearance removed - not yet implemented */}
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="info-circle"
            label="Version"
            value="1.0.0"
            showArrow={false}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="shield"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://mayankk25.github.io/TallyTalk/privacy-policy.html')}
          />
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <FontAwesome name="sign-out" size={18} color="#FF3B30" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account Button */}
      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={handleDeleteAccount}
        activeOpacity={0.8}
        disabled={isDeletingAccount}
      >
        <FontAwesome name="trash-o" size={18} color="#FF3B30" />
        <Text style={styles.deleteAccountText}>
          {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Made with ❤️ by Uncommon Labs</Text>

      {/* Language Picker Modal for Android */}
      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguagePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Voice Recording Language</Text>
            <Text style={styles.modalSubtitle}>Select the language you speak in</Text>
            {VOICE_LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  voiceLanguage === lang.code && styles.languageOptionSelected,
                ]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={[
                  styles.languageOptionText,
                  voiceLanguage === lang.code && styles.languageOptionTextSelected,
                ]}>
                  {lang.name}
                </Text>
                {voiceLanguage === lang.code && (
                  <FontAwesome name="check" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowLanguagePicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Currency Picker Modal for Android */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCurrencyPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Currency</Text>
            <Text style={styles.modalSubtitle}>Select your preferred currency</Text>
            <ScrollView style={styles.currencyList} showsVerticalScrollIndicator={false}>
              {CURRENCIES.map(currency => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.languageOption,
                    currencyCode === currency.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleCurrencySelect(currency.code)}
                >
                  <View style={styles.currencyOptionContent}>
                    <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                    <View style={styles.currencyTextContainer}>
                      <Text style={[
                        styles.languageOptionText,
                        currencyCode === currency.code && styles.languageOptionTextSelected,
                      ]}>
                        {currency.name}
                      </Text>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                    </View>
                  </View>
                  {currencyCode === currency.code && (
                    <FontAwesome name="check" size={16} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  label,
  value,
  onPress,
  showArrow = true
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconContainer}>
          <FontAwesome name={icon as any} size={16} color="#8E8E93" />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {showArrow && onPress && (
          <FontAwesome name="chevron-right" size={12} color="#C7C7CC" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '700',
  },
  email: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },

  // Sections
  section: {
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 56,
  },

  // Menu Items
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'transparent',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  menuValue: {
    fontSize: 15,
    color: '#8E8E93',
  },

  // Sign Out
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },

  // Delete Account
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  deleteAccountText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },

  // Footer
  footerText: {
    textAlign: 'center',
    color: '#C7C7CC',
    fontSize: 13,
    marginTop: 32,
  },

  // Language Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#000',
  },
  languageOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },

  // Currency Picker specific
  currencyList: {
    maxHeight: 350,
  },
  currencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    width: 40,
    color: '#000',
  },
  currencyTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  currencyCode: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});
