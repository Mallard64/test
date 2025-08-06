
const CONFIG = {
    GEMINI_API_URL: window.location.port === '5500' ? 'http://localhost:3000/api/gemini' : 
                   window.location.hostname === 'localhost' ? '/api/gemini' : 
                   '/.netlify/functions/gemini',
    GEMINI_DIRECT_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent',
    CORPORATE_BS_API_URL: 'https://corporatebs-generator.sameerkumar.website/',
    FIREBASE_DB_URL: 'https://corporatify-bdcb8-default-rtdb.firebaseio.com/'
};

const Elements = {
    input: () => document.getElementById('inputText'),
    output: () => document.getElementById('outputText'),
    translateBtn: () => document.getElementById('translateBtn')
};

async function translateToCorporate() {
    const inputText = Elements.input().value.trim();
    const outputElement = Elements.output();
    
    if (!inputText) {
        showError(outputElement, 'Please enter some text to translate');
        return;
    }
    
    setLoading(true);
    showStatus(outputElement, 'Generating corporate buzzwords...');
    
    try {
        const buzzwordPhrase = await fetchCorporateBuzzwords();
        
        if (!buzzwordPhrase) {
            throw new Error('Failed to generate corporate buzzwords');
        }
        
        showStatus(outputElement, 'Translating to corporate speak...');
        
        const corporateText = await transformWithGemini(inputText, buzzwordPhrase);
        
        showResult(outputElement, corporateText);
        
    } catch (error) {
        console.error('Translation error:', error);
        showError(outputElement, `Translation failed: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

async function fetchCorporateBuzzwords() {
    const response = await fetch(CONFIG.CORPORATE_BS_API_URL);
    
    if (!response.ok) {
        throw new Error(`Corporate BS API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.phrase || null;
}

async function transformWithGemini(inputText, buzzwordPhrase) {
    const prompt = createGeminiPrompt(inputText, buzzwordPhrase);
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    const response = await fetch(CONFIG.GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            prompt: prompt
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
    }
    
    throw new Error('No response generated');
}


function createGeminiPrompt(inputText, buzzwordPhrase) {
    return `Take this input phrase: "${inputText}"

Corporate buzzword phrase to integrate: "${buzzwordPhrase}"

Your task: Rewrite the input phrase by seamlessly incorporating the corporate buzzword phrase while preserving the original meaning. The result should sound professional and corporate but still convey the same core message.

Rules:
- Keep the original meaning intact
- Make it sound naturally corporate/business-like
- Integrate the buzzword phrase smoothly (don't just append it)
- Return ONLY the rewritten phrase, nothing else
- No explanations or additional text

Output:`;
}


function setLoading(isLoading) {
    const translateBtn = Elements.translateBtn();
    
    if (isLoading) {
        translateBtn.disabled = true;
        translateBtn.innerHTML = 'Translating...';
    } else {
        translateBtn.disabled = false;
        translateBtn.innerHTML = 'Translate';
    }
}

function showStatus(element, message) {
    element.innerHTML = `<div style="color: #a0aec0; font-style: italic;">${message}</div>`;
}

function showResult(element, text) {
    element.innerHTML = `<div style="color: #2d3748;">${text.trim()}</div>`;
    document.getElementById('saveBtn').style.display = 'inline-block';
}

function showError(element, message) {
    element.innerHTML = `<div style="color: #e53e3e;">${message}</div>`;
    document.getElementById('saveBtn').style.display = 'none';
}


function copyToClipboard() {
    const outputElement = Elements.output();
    const text = outputElement.innerText;
    
    if (text && text.trim()) {
        navigator.clipboard.writeText(text).then(() => {
            const originalContent = outputElement.innerHTML;
            outputElement.innerHTML = '<div style="color: #38a169;">Copied to clipboard!</div>';
            setTimeout(() => {
                outputElement.innerHTML = originalContent;
            }, 1500);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }
}

async function savePhrase() {
    const outputElement = Elements.output();
    const text = outputElement.innerText.trim();
    
    if (!text || text.includes('Sophisticated dialogue will appear here') || text.includes('Translation failed')) {
        showError(outputElement, 'No valid phrase to save');
        setTimeout(() => {
            outputElement.innerHTML = '<div style="color: #a0aec0; font-style: italic;">Sophisticated dialogue will appear here...</div>';
        }, 2000);
        return;
    }
    
    const newPhrase = {
        id: Date.now(),
        text: text,
        timestamp: new Date().toLocaleString()
    };

    document.getElementById('saveBtn').style.display = 'none';
    
    try {
        await saveToFirebase(newPhrase);
        
        let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        
        if (savedPhrases.some(phrase => phrase.text === text)) {
            showError(outputElement, 'Phrase already saved');
            setTimeout(() => {
                outputElement.innerHTML = `<div style="color: #2d3748;">${text}</div>`;
            }, 1500);
            return;
        }
        
        savedPhrases.unshift(newPhrase); 
        localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
        
        const originalContent = outputElement.innerHTML;
        outputElement.innerHTML = '<div style="color: #38a169;">Phrase saved to cloud!</div>';
        setTimeout(() => {
            outputElement.innerHTML = originalContent;
        }, 1500);
        
        displaySavedPhrases();
    } catch (error) {
        console.error('Failed to save to Firebase:', error);
        showError(outputElement, 'Failed to save to cloud, saving locally');
        
        let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        savedPhrases.unshift(newPhrase); 
        localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
        
        setTimeout(() => {
            outputElement.innerHTML = `<div style="color: #2d3748;">${text}</div>`;
        }, 1500);
        
        displaySavedPhrases();
    }
}

async function displaySavedPhrases() {
    const listElement = document.getElementById('savedPhrasesList');
    
    listElement.innerHTML = '<div style="color: #a0aec0; font-style: italic; text-align: center; padding: 20px;">Loading phrases...</div>';
    
    try {
        const firebasePhrases = await loadFromFirebase();
        const localPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        
        const allPhrases = [...firebasePhrases, ...localPhrases]
            .filter((phrase, index, arr) => 
                arr.findIndex(p => p.text === phrase.text) === index
            )
            .sort((a, b) => b.id - a.id);
        
        if (allPhrases.length === 0) {
            listElement.innerHTML = '<div style="color: #a0aec0; font-style: italic; text-align: center; padding: 20px;">No saved phrases yet</div>';
            return;
        }
        
        listElement.innerHTML = allPhrases.map(phrase => `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0; display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1; margin-right: 12px;">
                    <div style="color: #2d3748; line-height: 1.4; margin-bottom: 4px;">${phrase.text}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="copyPhrase('${phrase.id}')" style="background: none; border: 1px solid #e2e8f0; color: #4a5568; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Copy</button>
                    <button onclick="deletePhrase('${phrase.id}', '${phrase.firebaseId || ''}')" style="background: none; border: 1px solid #e53e3e; color: #e53e3e; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error displaying phrases:', error);
        const localPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        
        if (localPhrases.length === 0) {
            listElement.innerHTML = '<div style="color: #a0aec0; font-style: italic; text-align: center; padding: 20px;">No saved phrases yet</div>';
            return;
        }
        
        listElement.innerHTML = localPhrases.map(phrase => `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0; display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1; margin-right: 12px;">
                    <div style="color: #2d3748; line-height: 1.4; margin-bottom: 4px;">${phrase.text}</div>
                    <div style="color: #a0aec0; font-size: 12px;">${phrase.timestamp} <span style="color: #ed8936;"> • Local</span></div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onclick="copyPhrase('${phrase.id}')" style="background: none; border: 1px solid #e2e8f0; color: #4a5568; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Copy</button>
                    <button onclick="deletePhrase('${phrase.id}')" style="background: none; border: 1px solid #e53e3e; color: #e53e3e; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
                </div>
            </div>
        `).join('');
    }
}

async function copyPhrase(phraseId) {
    try {
        const firebasePhrases = await loadFromFirebase();
        const localPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        const allPhrases = [...firebasePhrases, ...localPhrases];
        const phrase = allPhrases.find(p => p.id == phraseId);
        
        if (phrase) {
            navigator.clipboard.writeText(phrase.text).then(() => {
                const copyBtn = event.target;
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✓';
                copyBtn.style.background = '#38a169';
                copyBtn.style.color = 'white';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = 'none';
                    copyBtn.style.color = '#4a5568';
                }, 1000);
            });
        }
    } catch (error) {
        console.error('Error copying phrase:', error);
    }
}

async function deletePhrase(phraseId, firebaseId = '') {
    try {
        if (firebaseId) {
            const response = await fetch(`${CONFIG.FIREBASE_DB_URL}phrases/${firebaseId}.json`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Firebase delete error: ${response.status}`);
            }
        }
        
        let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        savedPhrases = savedPhrases.filter(phrase => phrase.id != phraseId);
        localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
        
        displaySavedPhrases();
    } catch (error) {
        console.error('Error deleting phrase:', error);
        alert('Failed to delete phrase from cloud, but removed locally');
        
        let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
        savedPhrases = savedPhrases.filter(phrase => phrase.id != phraseId);
        localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
        
        displaySavedPhrases();
    }
}

async function saveToFirebase(phrase) {
    const response = await fetch(`${CONFIG.FIREBASE_DB_URL}phrases.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(phrase)
    });
    
    if (!response.ok) {
        throw new Error(`Firebase error: ${response.status}`);
    }
    
    return response.json();
}

async function loadFromFirebase() {
    try {
        const response = await fetch(`${CONFIG.FIREBASE_DB_URL}phrases.json`);
        
        if (!response.ok) {
            throw new Error(`Firebase error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data) return [];
        
        return Object.keys(data).map(key => ({
            ...data[key],
            firebaseId: key
        })).sort((a, b) => b.id - a.id);
    } catch (error) {
        console.error('Failed to load from Firebase:', error);
        return [];
    }
}

function clearSavedPhrases() {
    if (confirm('Are you sure you want to clear all saved phrases?')) {
        localStorage.removeItem('corporatePhrases');
        displaySavedPhrases();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    Elements.translateBtn()?.addEventListener('click', translateToCorporate);
    displaySavedPhrases();
});