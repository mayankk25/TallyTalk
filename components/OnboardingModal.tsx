import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Text, View } from './Themed';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

interface OnboardingCard {
  icon: string;
  title: string;
  description: string;
}

const ONBOARDING_CARDS: OnboardingCard[] = [
  {
    icon: 'microphone',
    title: 'Welcome to TallyTalk',
    description: 'Just speak your expenses naturally. Say things like "Spent $20 on lunch" or "Got $500 salary"',
  },
  {
    icon: 'th-large',
    title: 'Quick Access Widget',
    description: Platform.OS === 'ios' 
      ? 'Add our widget to your home screen for one-tap expense recording. Long press on your home screen and tap the + button.'
      : 'Add our widget to your home screen for one-tap expense recording. Long press on your home screen and select Widgets.',
  },
  {
    icon: 'check-circle',
    title: "You're all set!",
    description: 'Start tracking your expenses with just your voice. Tap the microphone button to begin.',
  },
];

export default function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / width);
    setCurrentPage(page);
  };

  const goToNextPage = () => {
    if (currentPage < ONBOARDING_CARDS.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * width,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const isLastPage = currentPage === ONBOARDING_CARDS.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Skip Button */}
        {!isLastPage && (
          <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Cards */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {ONBOARDING_CARDS.map((card, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.iconContainer}>
                <FontAwesome name={card.icon as any} size={48} color="#000" />
              </View>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.description}>{card.description}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Dot Indicators */}
          <View style={styles.dotsContainer}>
            {ONBOARDING_CARDS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentPage === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Next / Get Started Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={goToNextPage}
            activeOpacity={0.9}
          >
            <Text style={styles.nextButtonText}>
              {isLastPage ? 'Get Started' : 'Next'}
            </Text>
            {!isLastPage && (
              <FontAwesome name="arrow-right" size={16} color="#fff" style={styles.nextIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  card: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    backgroundColor: 'transparent',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
  },
  dotActive: {
    backgroundColor: '#000000',
    width: 24,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextIcon: {
    marginLeft: 4,
  },
});
