import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@tallytalk:onboarding_completed';
const VOICE_LANGUAGE_KEY = '@tallytalk:voice_language';
const CURRENCY_KEY = '@tallytalk:currency';

// Supported voice languages
export type VoiceLanguage = 'en' | 'hi' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ar';

export const VOICE_LANGUAGES: { code: VoiceLanguage; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ar', name: 'Arabic' },
];

// Supported currencies
export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'INR' | 'THB'
  | 'JPY' | 'CNY' | 'AUD' | 'CAD' | 'HKD'
  | 'SGD' | 'KRW' | 'MXN' | 'BRL' | 'AED';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  symbolPosition: 'before' | 'after';
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', symbolPosition: 'before', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', symbolPosition: 'before', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', symbolPosition: 'before', decimals: 2 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', symbolPosition: 'before', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', symbolPosition: 'before', decimals: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', symbolPosition: 'before', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', symbolPosition: 'before', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', symbolPosition: 'before', decimals: 0 },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', symbolPosition: 'before', decimals: 2 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', symbolPosition: 'before', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', symbolPosition: 'before', decimals: 2 },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function getCurrencyByCode(code: CurrencyCode): Currency {
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error reading onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (error) {
    console.error('Error saving onboarding status:', error);
  }
}

/**
 * Reset onboarding status (for testing)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
}

/**
 * Get voice recording language preference
 */
export async function getVoiceLanguage(): Promise<VoiceLanguage> {
  try {
    const value = await AsyncStorage.getItem(VOICE_LANGUAGE_KEY);
    return (value as VoiceLanguage) || 'en';
  } catch (error) {
    console.error('Error reading voice language:', error);
    return 'en';
  }
}

/**
 * Set voice recording language preference
 */
export async function setVoiceLanguage(language: VoiceLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(VOICE_LANGUAGE_KEY, language);
  } catch (error) {
    console.error('Error saving voice language:', error);
  }
}

/**
 * Get currency preference
 */
export async function getCurrency(): Promise<CurrencyCode> {
  try {
    const value = await AsyncStorage.getItem(CURRENCY_KEY);
    return (value as CurrencyCode) || DEFAULT_CURRENCY;
  } catch (error) {
    console.error('Error reading currency:', error);
    return DEFAULT_CURRENCY;
  }
}

/**
 * Set currency preference
 */
export async function setCurrency(currency: CurrencyCode): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENCY_KEY, currency);
  } catch (error) {
    console.error('Error saving currency:', error);
  }
}

/**
 * Format amount with the given currency
 * For whole numbers (e.g., 80.00), no decimals are shown (e.g., "$80")
 * For fractional amounts (e.g., 15.50), decimals are shown (e.g., "$15.50")
 */
export function formatCurrency(amount: number, currency: Currency, decimals?: number): string {
  // Check if the amount is a whole number
  const isWholeNumber = amount % 1 === 0;
  const decimalPlaces = decimals ?? (isWholeNumber ? 0 : currency.decimals);

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  if (currency.symbolPosition === 'after') {
    return `${formatted}${currency.symbol}`;
  }
  return `${currency.symbol}${formatted}`;
}
