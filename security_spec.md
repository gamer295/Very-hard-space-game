# Security Specification - Retro Void

## Data Invariants
1. A score must be positive.
2. A player name must be between 2 and 15 characters, alphanumeric.
3. Every score must be linked to a valid authenticated user (userId).
4. Users cannot modify or delete scores once submitted.
5. `createdAt` must match `request.time`.

## The Dirty Dozen (Malicious Payloads)
1. **Unauthenticated Write**: Creating a score without being logged in.
2. **Identity Spoofing**: Setting `userId` to someone else's UID.
3. **Ghost Score**: Submitting a massive negative score to break rankings.
4. **Name Poisoning**: Submitting a 1MB string as a player name.
5. **Score Injection**: Submitting a 999,999,999 score via the console.
6. **Timeline Fraud**: Setting `createdAt` to a date in the past/future.
7. **Tome Injection**: Injecting extra fields (isVerified: true) to bypass checks.
8. **HighScore Hijack**: Attempting to `update` an existing score record.
9. **History Deletion**: Attempting to `delete` a competitor's score.
10. **Query Scrape**: Attempting to list the entire collection without constraints (if sensitive).
11. **ID Poisoning**: Using a 2KB string as the document ID for the score.
12. **Anonymous Impersonation**: Forging an auth token with a fake email.

## Test Runner Logic (Draft)
The `firestore.rules` will enforce:
- `create`: `isSignedIn() && isValidScore(incoming()) && incoming().userId == request.auth.uid`.
- `update`: `false` (No updates allowed).
- `delete`: `false` (No deletes allowed).
- `list`: `isValidId(scoreId) && isSignedIn()`.
