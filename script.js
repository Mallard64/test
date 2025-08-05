
const CONFIG = {
    GEMINI_API_URL: '/.netlify/functions/gemini',
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
    
    const localApiKey = window.VITE_GEMINI_API_KEY;
    if (isLocal && localApiKey) {
        const response = await fetch(CONFIG.GEMINI_DIRECT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': localApiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text.trim();
        }
        
        throw new Error('No response generated from Gemini');
    }
    
    // For local testing without API key, throw error
    if (isLocal) {
        throw new Error('Local testing requires API key. Set VITE_GEMINI_API_KEY environment variable or window.VITE_GEMINI_API_KEY');
    }
    
    // For production (Netlify), use function
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
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
    }
    
    throw new Error('No response generated from Gemini');
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
}

function showError(element, message) {
    element.innerHTML = `<div style="color: #e53e3e;">${message}</div>`;
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

document.addEventListener('DOMContentLoaded', function() {
    Elements.translateBtn()?.addEventListener('click', translateToCorporate);
    
    Elements.input()?.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            translateToCorporate();
        }
    });
});