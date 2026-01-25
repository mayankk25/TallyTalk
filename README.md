# TallyTalk

A voice-powered budget tracking app built with React Native and Expo. Simply speak your expenses and let AI handle the rest.

## Features

- **Voice Input**: Record expenses by speaking naturally in any language
- **AI-Powered Parsing**: Automatically extracts amount, description, and category from voice
- **Multi-Language Support**: Speak in any language - AI translates to English
- **Smart Categorization**: AI suggests appropriate categories for your transactions
- **Income & Expense Tracking**: Track both money in and money out
- **Monthly Analytics**: Visual breakdown of spending by category
- **Transaction History**: View, edit, and delete past transactions
- **Swipe to Delete**: Quick gesture-based deletion

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: OpenAI Whisper (speech-to-text) + GPT-4o-mini (parsing)
- **Authentication**: Supabase Auth with Google OAuth

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/TallyTalk.git
   cd TallyTalk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your environment variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. Start the development server:
   ```bash
   npx expo start
   ```

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy parse-voice
   ```
4. Set the `OPENAI_API_KEY` secret in Supabase

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab navigation
│   └── transactions.tsx   # Transaction history
├── components/            # Reusable components
│   ├── EditExpenseModal.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseReview.tsx
│   ├── OnboardingModal.tsx
│   └── VoiceRecorder.tsx
├── lib/                   # Utilities and API
│   ├── api.ts            # Supabase API functions
│   ├── storage.ts        # Local storage helpers
│   └── supabase.ts       # Supabase client
├── supabase/
│   └── functions/        # Edge Functions
│       └── parse-voice/  # Voice parsing AI
└── types/                # TypeScript types
```

## How Voice Input Works

1. User records voice message (e.g., "Spent $25 on lunch and $15 on coffee")
2. Audio sent to Supabase Edge Function
3. OpenAI Whisper transcribes audio (translating to English if needed)
4. GPT-4o-mini parses transcript into structured transactions
5. User reviews and confirms parsed expenses
6. Transactions saved to database

## License

MIT

## Author

Built by [Mayank Agrawal](https://github.com/mayankk25)
