
const CONFIG = {
    GEMINI_API_URL: window.location.port === '5500' ? 'http://localhost:3000/api/gemini' : 
                   window.location.hostname === 'localhost' ? '/api/gemini' : 
                   '/.netlify/functions/gemini',
    GEMINI_DIRECT_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent',
    CORPORATE_BS_API_URL: 'https://corporatebs-generator.sameerkumar.website/'
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
    // Show save button when there's a result
    document.getElementById('saveBtn').style.display = 'inline-block';
}

function showError(element, message) {
    element.innerHTML = `<div style="color: #e53e3e;">${message}</div>`;
    // Hide save button on error
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

// Saved phrases functionality
function savePhrase() {
    const outputElement = Elements.output();
    const text = outputElement.innerText.trim();
    
    if (!text || text.includes('Sophisticated dialogue will appear here') || text.includes('Translation failed')) {
        showError(outputElement, 'No valid phrase to save');
        setTimeout(() => {
            outputElement.innerHTML = '<div style="color: #a0aec0; font-style: italic;">Sophisticated dialogue will appear here...</div>';
        }, 2000);
        return;
    }
    
    // Get existing saved phrases
    let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    
    // Add new phrase with timestamp
    const newPhrase = {
        id: Date.now(),
        text: text,
        timestamp: new Date().toLocaleString()
    };
    
    // Check for duplicates
    if (savedPhrases.some(phrase => phrase.text === text)) {
        showError(outputElement, 'Phrase already saved');
        setTimeout(() => {
            outputElement.innerHTML = `<div style="color: #2d3748;">${text}</div>`;
        }, 1500);
        return;
    }
    
    savedPhrases.unshift(newPhrase); // Add to beginning
    localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
    
    // Show success message
    const originalContent = outputElement.innerHTML;
    outputElement.innerHTML = '<div style="color: #38a169;">Phrase saved!</div>';
    setTimeout(() => {
        outputElement.innerHTML = originalContent;
    }, 1500);
    
    displaySavedPhrases();
}

function displaySavedPhrases() {
    const savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    const listElement = document.getElementById('savedPhrasesList');
    
    if (savedPhrases.length === 0) {
        listElement.innerHTML = '<div style="color: #a0aec0; font-style: italic; text-align: center; padding: 20px;">No saved phrases yet</div>';
        return;
    }
    
    listElement.innerHTML = savedPhrases.map(phrase => `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 12px 0; display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1; margin-right: 12px;">
                <div style="color: #2d3748; line-height: 1.4; margin-bottom: 4px;">${phrase.text}</div>
                <div style="color: #a0aec0; font-size: 12px;">${phrase.timestamp}</div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button onclick="copyPhrase('${phrase.id}')" style="background: none; border: 1px solid #e2e8f0; color: #4a5568; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Copy</button>
                <button onclick="deletePhrase('${phrase.id}')" style="background: none; border: 1px solid #e53e3e; color: #e53e3e; font-size: 11px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
            </div>
        </div>
    `).join('');
}

function copyPhrase(phraseId) {
    const savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    const phrase = savedPhrases.find(p => p.id == phraseId);
    
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
}

function deletePhrase(phraseId) {
    let savedPhrases = JSON.parse(localStorage.getItem('corporatePhrases') || '[]');
    savedPhrases = savedPhrases.filter(phrase => phrase.id != phraseId);
    localStorage.setItem('corporatePhrases', JSON.stringify(savedPhrases));
    displaySavedPhrases();
}

function clearSavedPhrases() {
    if (confirm('Are you sure you want to clear all saved phrases?')) {
        localStorage.removeItem('corporatePhrases');
        displaySavedPhrases();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    Elements.translateBtn()?.addEventListener('click', translateToCorporate);
    displaySavedPhrases(); // Load saved phrases on page load
});