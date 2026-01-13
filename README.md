# Content Finder - Language Learning Content Discovery

## What I Built

A tool that helps language learners find authentic YouTube videos in their target language based on their interests and skill level. It automatically translates search terms and filters out tutorial content to show real native media.

**Features:**
- 6 languages (Korean, Spanish, French, Japanese, Mandarin, German)
- Auto-translates search terms to target language
- Filters out "learn X language" tutorial videos
- Save favorite videos
- Recommends content based on search history
- Tabbed interface (Search, Saved, For You)

## Who Did What

Solo project (Julian Matos)

## What I Learned

**Technical:**
- Working with YouTube Data API and translation APIs
- Async JavaScript with async/await
- LocalStorage for saving data client-side
- Building a basic recommendation algorithm
- Filtering content across multiple languages

**Key Problems Solved:**
- Searches initially returned English videos *about* the target language, not videos *in* the target language. Fixed by translating search terms first.
- Results had too many tutorials. Added filtering to remove educational content in both English and target languages.
- Had to balance getting enough results for filtering vs. API rate limits.

## What Didn't Work

**Challenges:**
- YouTube's language filtering alone wasn't enough - needed multiple filtering layers
- Can't assess video difficulty without analyzing captions
- Translation API hits rate limits during testing
- Can't check if videos have subtitles
- Need at least 2 searches before recommendations appear

**Limitations:**
- Only searches videos (no articles)
- Proficiency level just adds keywords, doesn't deeply filter
- All data is client-side only (one device)

## How to Run

1. Clone the repo
2. Get YouTube Data API v3 key from Google Cloud Console
3. Add key to `script.js` 
4. Run: `python -m http.server 9000`
5. Open `http://localhost:9000`
