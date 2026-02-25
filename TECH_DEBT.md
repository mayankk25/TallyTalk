# Tech Debt & Future Improvements

Last updated: January 2026

## Overview

This document tracks code redundancies and potential refactoring opportunities identified during a code audit. These are **not urgent** - they improve maintainability, not performance.

---

## 1. Dead Code to Remove

### DeepLinkContext (`app/_layout.tsx`)
- **Lines:** 26-145
- **Issue:** Context is created but never used - `shouldOpenRecorder` is never set to `true`
- **Why it exists:** Was used before expo-router handled deep links automatically
- **Action:** Remove DeepLinkContext and its usage in `app/(tabs)/index.tsx` (lines 32, 53, 76-81)

---

## 2. Duplicated Functions

### `formatCurrency`
- `app/(tabs)/index.tsx:37-42`
- `app/transactions.tsx:27-32`
- **Action:** Extract to `lib/utils.ts`

### `handleSwipeDelete`
- `app/(tabs)/index.tsx:176-198`
- `app/transactions.tsx:128-149`
- **Action:** Extract to custom hook `useSwipeDelete`

### `renderRightActions`
- `app/(tabs)/index.tsx:281-288`
- `app/transactions.tsx:218-225`
- **Action:** Include in `useSwipeDelete` hook or create shared component

### `handleExpenseUpdated` / `handleExpenseDeleted`
- `app/(tabs)/index.tsx:201-209`
- `app/transactions.tsx:152-158`
- **Action:** Extract to custom hook `useExpenseActions`

### Date Formatting (Today/Yesterday logic)
- `app/(tabs)/index.tsx:268-279` (`formatDateHeader`)
- `app/transactions.tsx:202-216` (`formatDayHeader`)
- **Action:** Extract to `lib/utils.ts`

---

## 3. Duplicated Components

### Transaction Card
- `app/(tabs)/index.tsx:renderExpense` (lines 290-325)
- `app/transactions.tsx:renderExpense` (lines 227-255)
- `app/transactions.tsx:renderDailyExpense` (lines 257-285)
- **Action:** Create `components/TransactionCard.tsx`

### Voice Recording Flow
- `app/record.tsx` (widget flow)
- `app/(tabs)/index.tsx` (in-app modal, lines 450-490)
- **Shared logic:** `parsedExpenses`, `transcript`, `handleRecordingComplete`, `handleConfirm`
- **Action:** Create `hooks/useVoiceRecording.ts`

---

## 4. Duplicated Styles (~300 lines)

### Transaction Card Styles
- `app/(tabs)/index.tsx:644-702`
- `app/transactions.tsx:688-760`

### Modal Handle
- `app/(tabs)/index.tsx:755-762`
- `app/record.tsx:161-168`
- `app/transactions.tsx:483-490`

### Close Button
- `app/(tabs)/index.tsx:763-774`
- `app/record.tsx:169-179`
- `app/transactions.tsx:510-517`

### Loading Container
- `app/(tabs)/index.tsx:514-525`
- `app/transactions.tsx:469-480`

### Delete Action
- `app/(tabs)/index.tsx:693-702`
- `app/transactions.tsx:752-760`

**Action:** Create `styles/shared.ts` with common styles

---

## 5. Inconsistent Patterns

### Voice Flow State Management
- `app/record.tsx` uses single `screen` state: `'record' | 'processing' | 'review' | 'saving'`
- `app/(tabs)/index.tsx` uses `voiceScreen` + separate `isProcessing` and `isSaving` booleans
- **Action:** Standardize when creating shared hook

---

## Suggested File Structure After Refactor

```
lib/
  utils.ts              # formatCurrency, formatDateHeader

hooks/
  useSwipeDelete.ts     # Swipe-to-delete logic
  useExpenseActions.ts  # Update/delete callbacks
  useVoiceRecording.ts  # Voice recording flow

components/
  TransactionCard.tsx   # Reusable transaction card

styles/
  shared.ts             # Common styles
```

---

## Priority

1. **Low effort, high value:** Remove dead DeepLinkContext code
2. **Medium effort:** Extract `formatCurrency` and date utils
3. **Higher effort:** Create TransactionCard component
4. **Largest effort:** Extract voice recording hook

---

## Notes

- These changes improve **maintainability**, not runtime performance
- Bundle size reduction: ~10-15KB (negligible)
- Main benefit: Fix bugs once, consistent behavior, easier feature development

---

## Future Feature Ideas

### True Multi-Currency Support

**Current state:** Display preference only - user picks one currency, all amounts show in that symbol.

**Future enhancement:** Track expenses in multiple currencies simultaneously.

**Requirements:**
1. Add `currency` field to each transaction in database
2. Store original currency + amount per transaction
3. Define a "base currency" for totals/summaries
4. Integrate exchange rate API (e.g., Open Exchange Rates, Fixer.io)
5. Convert transactions to base currency for charts/totals
6. Show original currency on transaction details

**Database changes:**
```sql
ALTER TABLE expenses ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE expenses ADD COLUMN original_amount DECIMAL(10,2);
```

**UI changes:**
- Currency picker per transaction (default to user's preference)
- Summary shows converted totals with "Converted to [base currency]" note
- Transaction list shows original currency: "€15.00 (~$16.50)"

**Use cases:**
- Travelers tracking expenses across countries
- Expats with income in one currency, expenses in another
- Business users with international transactions
