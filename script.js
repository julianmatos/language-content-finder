const API_KEY = 'REMOVED';

const form = document.getElementById('search-form');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const savedVideosDiv = document.getElementById('saved-videos');
const recommendationsDiv = document.getElementById('recommendations');
const clearSavedBtn = document.getElementById('clear-saved');
const noSaved = document.getElementById('no-saved');
const noRecommendations = document.getElementById('no-recommendations');

// Tab switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Remove active class from all
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active to clicked
        btn.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Regenerate recommendations when switching to that tab
        if (tabName === 'recommended') {
            generateRecommendations();
        }
    });
});

// Load saved data from localStorage
let savedVideos = JSON.parse(localStorage.getItem('savedVideos')) || [];
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Display saved videos on load
displaySavedVideos();
generateRecommendations();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const language = document.getElementById('language').value;
    const level = document.getElementById('level').value;
    const interests = document.getElementById('interests').value;
    
    // Save search to history
    saveSearchHistory(language, level, interests);
    
    // Show loading
    loadingDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    
    try {
        await searchContent(language, level, interests);
    } catch (error) {
        resultsDiv.innerHTML = `<p class="error">Error finding content: ${error.message}</p>`;
    }
    
    loadingDiv.classList.add('hidden');
});

clearSavedBtn.addEventListener('click', () => {
    if (confirm('Clear all saved videos?')) {
        savedVideos = [];
        localStorage.setItem('savedVideos', JSON.stringify(savedVideos));
        displaySavedVideos();
    }
});

function saveSearchHistory(language, level, interests) {
    const search = {
        language,
        level,
        interests: interests.split(',').map(k => k.trim()),
        timestamp: Date.now()
    };
    
    searchHistory.push(search);
    
    // Keep only last 20 searches
    if (searchHistory.length > 20) {
        searchHistory = searchHistory.slice(-20);
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

async function searchContent(language, level, interests) {
    // Split interests into keywords
    const keywords = interests.split(',').map(k => k.trim());
    
    // Translate keywords to target language
    const translatedKeywords = await translateKeywords(keywords, language);
    
    // Build search query in target language
    let searchQuery = translatedKeywords.join(' ');
    
    // Add level-specific terms (in target language too)
    const levelTerms = {
        'beginner': await translateText('easy simple', language),
        'intermediate': await translateText('intermediate', language),
        'advanced': await translateText('advanced', language)
    };
    
    searchQuery += ` ${levelTerms[level]}`;
    
    // Get language code
    const languageCode = getLanguageCode(language);
    
    // YouTube API endpoint - get more results so we can filter
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=25&relevanceLanguage=${languageCode}&videoDuration=medium&key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
        // Filter and sort results intelligently
        const filteredVideos = filterVideos(data.items, language, keywords);
        
        if (filteredVideos.length > 0) {
            displayResults(filteredVideos, language, level, keywords.join(', '));
        } else {
            resultsDiv.innerHTML = '<p class="error">No relevant videos found. Try different interests!</p>';
        }
    } else {
        resultsDiv.innerHTML = '<p class="error">No videos found. Try different interests!</p>';
    }
}

// Intelligent filtering function
function filterVideos(videos, language, keywords) {
    const filterOutWords = [
        'learn', 'learning', 'lesson', 'tutorial', 'how to learn', 'study', 
        'course', 'class', 'teacher', 'grammar', 'vocabulary', 'practice',
        'for beginners', 'for students', 'textbook', 'exercise'
    ];
    
    const languageLearningWords = {
        'Korean': ['배우다', '공부', '학습', '레슨', '초급', '문법', '단어'],
        'Spanish': ['aprender', 'estudiar', 'lección', 'curso', 'gramática'],
        'French': ['apprendre', 'étudier', 'leçon', 'cours', 'grammaire'],
        'Japanese': ['学ぶ', '勉強', 'レッスン', '文法', '初級'],
        'Mandarin': ['学习', '课程', '语法', '初级'],
        'German': ['lernen', 'studieren', 'lektion', 'kurs', 'grammatik']
    };
    
    const targetLangFilters = languageLearningWords[language] || [];
    
    const filtered = videos.filter(video => {
        const title = video.snippet.title.toLowerCase();
        const description = video.snippet.description.toLowerCase();
        const combined = title + ' ' + description;
        
        const hasEnglishLearningWords = filterOutWords.some(word => 
            combined.includes(word.toLowerCase())
        );
        
        const hasTargetLangLearningWords = targetLangFilters.some(word =>
            video.snippet.title.includes(word) || video.snippet.description.includes(word)
        );
        
        return !hasEnglishLearningWords && !hasTargetLangLearningWords;
    });
    
    const sorted = filtered.sort((a, b) => {
        const aTitle = a.snippet.title.toLowerCase();
        const bTitle = b.snippet.title.toLowerCase();
        
        const aScore = keywords.reduce((score, keyword) => {
            return score + (aTitle.includes(keyword.toLowerCase()) ? 1 : 0);
        }, 0);
        
        const bScore = keywords.reduce((score, keyword) => {
            return score + (bTitle.includes(keyword.toLowerCase()) ? 1 : 0);
        }, 0);
        
        return bScore - aScore;
    });
    
    return sorted.slice(0, 12);
}

async function translateText(text, targetLanguage) {
    const langCode = getLanguageCode(targetLanguage);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.responseData.translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

async function translateKeywords(keywords, targetLanguage) {
    const translations = await Promise.all(
        keywords.map(keyword => translateText(keyword, targetLanguage))
    );
    return translations;
}

function getLanguageCode(language) {
    const codes = {
        'Korean': 'ko',
        'Spanish': 'es',
        'French': 'fr',
        'Japanese': 'ja',
        'Mandarin': 'zh',
        'German': 'de'
    };
    return codes[language] || 'en';
}

function displayResults(videos, language, level, originalSearch) {
    resultsDiv.innerHTML = `
        <h2>Results for "${originalSearch}" in ${language} (${level})</h2>
        <div class="video-grid">
            ${videos.map(video => createVideoCard(video, false)).join('')}
        </div>
    `;
    
    addSaveButtonListeners();
}

function createVideoCard(video, isSaved = false) {
    const videoId = video.id.videoId || video.id;
    const isSavedVideo = savedVideos.some(v => (v.id.videoId || v.id) === videoId);
    
    return `
        <div class="video-card" data-video-id="${videoId}">
            <img src="${video.snippet.thumbnails.medium.url}" alt="${video.snippet.title}">
            <div class="video-info">
                <h3>${video.snippet.title}</h3>
                <p class="channel">${video.snippet.channelTitle}</p>
                <p class="description">${video.snippet.description.substring(0, 100)}...</p>
                <div>
                    ${isSaved ? 
                        `<button class="save-btn remove-btn" data-video-id="${videoId}">Remove</button>` :
                        `<button class="save-btn ${isSavedVideo ? 'saved' : ''}" data-video-id="${videoId}">
                            ${isSavedVideo ? 'Saved ✓' : 'Save'}
                        </button>`
                    }
                    <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="watch-btn">Watch</a>
                </div>
            </div>
        </div>
    `;
}

function addSaveButtonListeners() {
    document.querySelectorAll('.save-btn:not(.remove-btn)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const videoId = e.target.dataset.videoId;
            const videoCard = document.querySelector(`[data-video-id="${videoId}"]`);
            const video = extractVideoData(videoCard, videoId);
            
            if (!savedVideos.some(v => (v.id.videoId || v.id) === videoId)) {
                savedVideos.push(video);
                localStorage.setItem('savedVideos', JSON.stringify(savedVideos));
                e.target.textContent = 'Saved ✓';
                e.target.classList.add('saved');
                displaySavedVideos();
            }
        });
    });
}

function extractVideoData(videoCard, videoId) {
    const title = videoCard.querySelector('h3').textContent;
    const channel = videoCard.querySelector('.channel').textContent;
    const description = videoCard.querySelector('.description').textContent;
    const thumbnail = videoCard.querySelector('img').src;
    
    return {
        id: { videoId },
        snippet: {
            title,
            channelTitle: channel,
            description,
            thumbnails: {
                medium: { url: thumbnail }
            }
        }
    };
}

function displaySavedVideos() {
    if (savedVideos.length === 0) {
        savedVideosDiv.innerHTML = '';
        noSaved.style.display = 'block';
        return;
    }
    
    noSaved.style.display = 'none';
    savedVideosDiv.innerHTML = savedVideos.map(video => createVideoCard(video, true)).join('');
    
    // Add remove button listeners
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const videoId = e.target.dataset.videoId;
            savedVideos = savedVideos.filter(v => (v.id.videoId || v.id) !== videoId);
            localStorage.setItem('savedVideos', JSON.stringify(savedVideos));
            displaySavedVideos();
        });
    });
}

async function generateRecommendations() {
    if (searchHistory.length < 2) {
        recommendationsDiv.innerHTML = '';
        noRecommendations.style.display = 'block';
        return;
    }
    
    // Analyze search history to find patterns
    const interestCounts = {};
    const languageCounts = {};
    
    searchHistory.forEach(search => {
        search.interests.forEach(interest => {
            const normalized = interest.toLowerCase().trim();
            interestCounts[normalized] = (interestCounts[normalized] || 0) + 1;
        });
        
        languageCounts[search.language] = (languageCounts[search.language] || 0) + 1;
    });
    
    // Find most common interest and language
    const topInterest = Object.keys(interestCounts).sort((a, b) => 
        interestCounts[b] - interestCounts[a]
    )[0];
    
    const topLanguage = Object.keys(languageCounts).sort((a, b) => 
        languageCounts[b] - languageCounts[a]
    )[0];
    
    try {
        const translatedInterest = await translateText(topInterest, topLanguage);
        const langCode = getLanguageCode(topLanguage);
        
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(translatedInterest)}&type=video&maxResults=12&relevanceLanguage=${langCode}&videoDuration=medium&key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const filtered = filterVideos(data.items, topLanguage, [topInterest]);
            
            if (filtered.length > 0) {
                noRecommendations.style.display = 'none';
                recommendationsDiv.innerHTML = filtered.slice(0, 6).map(video => createVideoCard(video, false)).join('');
                addSaveButtonListeners();
            } else {
                recommendationsDiv.innerHTML = '';
                noRecommendations.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Recommendation error:', error);
        recommendationsDiv.innerHTML = '';
        noRecommendations.style.display = 'block';
    }
}