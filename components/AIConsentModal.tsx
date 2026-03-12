import { StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import { Text, View } from '@/components/Themed';

interface AIConsentModalProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const PRIVACY_POLICY_URL = 'https://mayankk25.github.io/TallyTalk/privacy-policy.html';

export default function AIConsentModal({ visible, onAllow, onDeny }: AIConsentModalProps) {
  const openPrivacyPolicy = async () => {
    await WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onDeny}
    >
      <View style={styles.container}>
        {/* Modal Handle */}
        <View style={styles.modalHandle} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shield Icon */}
          <View style={styles.iconContainer}>
            <FontAwesome name="shield" size={32} color="#000" />
          </View>

          {/* Title & Subtitle */}
          <Text style={styles.title}>AI Data Sharing</Text>
          <Text style={styles.subtitle}>
            TallyTalk uses AI to convert your voice into expenses. Before we proceed, here's exactly what happens with your data.
          </Text>

          {/* Info Rows */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome name="file-audio-o" size={16} color="#007AFF" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>What data is sent</Text>
                <Text style={styles.infoDescription}>
                  Your voice audio recording (M4A format). The audio is deleted from your device immediately after processing.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome name="building-o" size={16} color="#007AFF" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Who it's sent to</Text>
                <Text style={styles.infoDescription}>
                  OpenAI, Inc. — Whisper API for speech-to-text transcription, and GPT-4o-mini for parsing expenses from the transcript.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <FontAwesome name="lock" size={16} color="#007AFF" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Purpose & protection</Text>
                <Text style={styles.infoDescription}>
                  Used solely for expense extraction. All data is transmitted over HTTPS. OpenAI does not use API data to train models and retains it for a maximum of 30 days for abuse monitoring.
                </Text>
              </View>
            </View>
          </View>

          {/* Privacy Policy Link */}
          <TouchableOpacity style={styles.privacyLink} onPress={openPrivacyPolicy}>
            <FontAwesome name="external-link" size={14} color="#007AFF" />
            <Text style={styles.privacyLinkText}>Read our Privacy Policy</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Fixed Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.allowButton} onPress={onAllow} activeOpacity={0.8}>
            <Text style={styles.allowButtonText}>Allow Voice Processing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.denyButton} onPress={onDeny} activeOpacity={0.7}>
            <Text style={styles.denyButtonText}>Don't Allow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  infoSection: {
    gap: 20,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 20,
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  privacyLinkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  bottomButtons: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  allowButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  denyButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  denyButtonText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
});
