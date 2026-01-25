# VoiceBudget App Store Submission Guide

## Prerequisites

1. **Apple Developer Account** ($99/year) - https://developer.apple.com
2. **Google Play Developer Account** ($25 one-time) - https://play.google.com/console
3. **Expo Account** - https://expo.dev (free)
4. **EAS CLI installed**

## Initial Setup

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Project
```bash
eas init
```
This will create a project ID - add it to `app.json` under `extra.eas.projectId`.

### 4. Set Environment Secrets
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key" --scope project
```

---

## iOS App Store Submission

### Step 1: Apple Developer Setup

1. Go to https://developer.apple.com/account
2. Go to **Certificates, IDs & Profiles**
3. Create an **App ID** with bundle identifier: `com.voicebudget.app`
4. Enable capabilities: Push Notifications (optional for future)

### Step 2: App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: VoiceBudget
   - Primary Language: English
   - Bundle ID: com.voicebudget.app
   - SKU: voicebudget-ios-001

### Step 3: Update eas.json with Apple Credentials

Edit `eas.json` and fill in:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "your-app-store-connect-app-id",
      "appleTeamId": "your-team-id"
    }
  }
}
```

### Step 4: Build for iOS
```bash
eas build --platform ios --profile production
```

### Step 5: Submit to App Store
```bash
eas submit --platform ios --profile production
```

### Step 6: Complete App Store Connect

In App Store Connect, fill in:
- **App Information**
  - Category: Finance
  - Content Rights: Does not contain third-party content

- **Pricing and Availability**
  - Price: Free
  - Availability: All countries

- **App Privacy**
  - Privacy Policy URL: https://voicebudget.app/privacy
  - Data Collection: See privacy policy details

- **Version Information**
  - Screenshots (required sizes in metadata.json)
  - Description: Use from metadata.json
  - Keywords: Use from metadata.json
  - Support URL: https://voicebudget.app/support
  - Marketing URL: https://voicebudget.app

---

## Google Play Store Submission

### Step 1: Google Play Console Setup

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - App name: VoiceBudget
   - Default language: English
   - App or game: App
   - Free or paid: Free

### Step 2: Create Service Account for Automated Uploads

1. Go to **Setup** → **API access**
2. Click **Create new service account**
3. Follow instructions to create in Google Cloud Console
4. Download JSON key file
5. Grant access in Play Console

### Step 3: Update eas.json with Google Credentials

Edit `eas.json`:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

### Step 4: Build for Android
```bash
eas build --platform android --profile production
```

### Step 5: Submit to Google Play
```bash
eas submit --platform android --profile production
```

### Step 6: Complete Play Console

In Play Console, complete:

- **Store Listing**
  - Short description: Use from metadata.json
  - Full description: Use from metadata.json
  - App icon: 512x512 PNG
  - Feature graphic: 1024x500 PNG
  - Screenshots: Phone and tablet

- **Content Rating**
  - Complete questionnaire

- **Pricing & Distribution**
  - Free
  - Countries: Select all

- **App Content**
  - Privacy Policy: https://voicebudget.app/privacy
  - Ads: No ads
  - Target audience: Not designed for children
  - Data Safety: Fill based on privacy policy

---

## Required Screenshots

### iOS Screenshots Needed
- 6.7" (iPhone 15 Pro Max): 1290 x 2796 pixels
- 6.5" (iPhone 14 Plus): 1284 x 2778 pixels
- 5.5" (iPhone 8 Plus): 1242 x 2208 pixels
- iPad Pro 12.9": 2048 x 2732 pixels

### Android Screenshots Needed
- Phone: At least 2 screenshots, 320-3840px
- 7" Tablet: Optional but recommended
- 10" Tablet: Optional but recommended

### Screens to Screenshot
1. Home screen with expense list
2. Voice recording in progress
3. Analytics dashboard (monthly view)
4. Analytics dashboard (daily view)
5. Widget on home screen (Android)

---

## Pre-Submission Checklist

### App Configuration
- [ ] app.json has correct bundle ID / package name
- [ ] Version and build numbers are set
- [ ] App icon is production-ready (replace placeholder)
- [ ] Splash screen is production-ready
- [ ] Privacy manifest configured (iOS)
- [ ] Microphone permission description is clear

### Store Requirements
- [ ] Privacy policy is hosted and accessible
- [ ] Support email/URL is set up
- [ ] App screenshots captured for all required sizes
- [ ] App description and keywords finalized
- [ ] Content rating questionnaire completed

### Testing
- [ ] App works on iOS simulator
- [ ] App works on Android emulator
- [ ] Voice recording works properly
- [ ] Authentication flows work
- [ ] All expense CRUD operations work
- [ ] Analytics display correctly

---

## Build Commands Reference

```bash
# Development build (with dev client)
eas build --platform all --profile development

# Preview build (internal testing)
eas build --platform all --profile preview

# Production build (app stores)
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## Troubleshooting

### iOS Build Fails
- Check Apple Developer membership is active
- Verify bundle ID matches App Store Connect
- Ensure provisioning profiles are created

### Android Build Fails
- Check package name is unique
- Verify keystore configuration
- Check Gradle settings

### Submission Rejected
- Review rejection reason in store console
- Common issues:
  - Missing privacy policy
  - Incomplete metadata
  - Crashes during review
  - Guideline violations

---

## Post-Launch

1. Monitor crash reports in store consoles
2. Respond to user reviews
3. Plan update with remaining features (Budget Limits, Receipt Photos)
4. Set up app analytics (optional: Firebase Analytics)
