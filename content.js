/**
 * Google Form Auto Filler Plus - UNIVERSAL EDITION
 * Implements support for Dropdowns, Radio Buttons, Checkboxes, and Dates.
 */

let hasAutoFilled = false;
let isFilling = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillForm' || request.action === 'presetsUpdated') {
        fillFormUltraSmart().then(() => {
            sendResponse({ status: 'success' });
        }).catch(err => {
            console.error('Fill error:', err);
            sendResponse({ status: 'error', message: err.message });
        });
        return true;
    }
});

const observer = new MutationObserver((mutations, obs) => {
    const isGoogleForm = window.location.href.includes('docs.google.com/forms');
    const hasFields = isGoogleForm ?
        document.querySelectorAll('[role="listitem"], .geEnpc, .Qr7Oae').length > 0 :
        document.querySelectorAll('input, textarea, select').length > 0;

    if (hasFields && !hasAutoFilled) {
        hasAutoFilled = true;
        setTimeout(() => {
            fillFormUltraSmart().catch(e => console.error('Auto-fill error:', e));
        }, 1500);
        // We might want to keep observing for SPAs, but for now we disconnect to prevent loops
        obs.disconnect();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Persistent Watermark Logic
function injectWatermark() {
    const watermarkId = 'dnvm-watermark-root';
    if (document.getElementById(watermarkId)) return;

    const host = document.createElement('div');
    host.id = watermarkId;
    host.style.all = 'initial'; // Reset styles
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    const watermark = document.createElement('div');
    watermark.innerText = 'made by DNvm logo credit 2026';

    // Styling the watermark
    Object.assign(watermark.style, {
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '6px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: '10px',
        fontFamily: 'sans-serif',
        borderRadius: '4px',
        zIndex: '2147483647',
        pointerEvents: 'none',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        backdropFilter: 'blur(2px)',
        userSelect: 'none',
        transition: 'opacity 0.3s'
    });

    shadow.appendChild(watermark);
}

// Anti-Delete Protection
const watermarkProtector = new MutationObserver(() => {
    injectWatermark();
});

// Initial injection and start monitoring
if (document.body) {
    injectWatermark();
    watermarkProtector.observe(document.body, { childList: true });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        injectWatermark();
        watermarkProtector.observe(document.body, { childList: true });
    });
}

async function fillFormUltraSmart() {
    if (isFilling) return;

    try {
        const result = await chrome.storage.local.get(['profiles', 'activeProfile', 'presets', 'extensionActive', 'fillMode']);

        // 1. Check if extension is active
        if (result.extensionActive === false) return;

        // 2. Check Fill Mode
        const fillMode = result.fillMode || 'google';
        const isGoogleForm = window.location.href.includes('docs.google.com/forms');
        if (fillMode === 'google' && !isGoogleForm) return;

        isFilling = true;

        let presets = [];
        if (result.profiles && result.activeProfile) {
            presets = result.profiles[result.activeProfile] || [];
        } else if (result.presets) {
            presets = result.presets; // Fallback
        }

        if (presets.length === 0) return;

        // 3. Detect Fields
        let fields = [];
        let containers = [];

        if (isGoogleForm) {
            containers = document.querySelectorAll('[role="listitem"], .geEnpc, .Qr7Oae');
            containers.forEach((container, index) => {
                const labelEl = container.querySelector('[role="heading"], .M7e6ce, .w77S9, .HoXo9e');
                if (labelEl) {
                    const options = Array.from(container.querySelectorAll('[role="radio"], [role="checkbox"], [role="option"]'))
                        .map(opt => opt.getAttribute('aria-label') || opt.innerText);

                    fields.push({
                        index: index,
                        label: labelEl.innerText.trim(),
                        labelText: labelEl.innerText.toLowerCase().trim(),
                        options: options,
                        container: container
                    });
                }
            });
        } else {
            // Generic Mode - Enhanced for Industrial Forms
            const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
            inputs.forEach((input, index) => {
                // Hierarchical Detection
                let contextParts = [];
                let parent = input.parentElement;
                let depth = 0;
                while (parent && depth < 5) {
                    // Look for headers, legends, or parent labels
                    const header = parent.querySelector('h1, h2, h3, h4, h5, h6, legend, .parent-label, .card-header');
                    if (header && !contextParts.includes(header.innerText.trim())) {
                        contextParts.unshift(header.innerText.trim());
                    }
                    parent = parent.parentElement;
                    depth++;
                }

                const shortLabel = (
                    input.getAttribute('aria-label') ||
                    input.getAttribute('placeholder') ||
                    (input.id && document.querySelector(`label[for="${input.id}"]`)?.innerText) ||
                    input.closest('.form-group')?.querySelector('label')?.innerText ||
                    input.closest('label')?.innerText ||
                    input.getAttribute('name') ||
                    ''
                ).trim();

                // Capture "Standard" hint (common in report forms)
                const hintEl = input.closest('.form-group, .col-md-3, .col-md-6')?.querySelector('small, .text-muted');
                const hintText = hintEl ? hintEl.innerText.trim() : '';

                if (shortLabel) {
                    const fullLabel = [...contextParts, shortLabel].join(' > ');
                    fields.push({
                        index: index,
                        label: fullLabel,
                        shortLabel: shortLabel.toLowerCase(),
                        labelText: fullLabel.toLowerCase(),
                        hint: hintText,
                        options: input.tagName === 'SELECT' ? Array.from(input.options).map(o => o.text) : [],
                        element: input
                    });
                }
            });
        }

        if (fields.length === 0) return;

        const mapping = new Map();

        // Layer 1: Dictionary
        fields.forEach(field => {
            const match = findDictionaryMatch(field.labelText, presets);
            if (match) mapping.set(field.index, match.value);
        });

        // Layer 2: AI
        const unfilledFields = fields.filter(f => !mapping.has(f.index));
        if (unfilledFields.length > 0 && typeof window.ai !== 'undefined' && window.ai.languageModel) {
            try {
                const aiMapping = await runAIMapping(unfilledFields, presets);
                for (const [idx, val] of Object.entries(aiMapping)) {
                    const i = parseInt(idx);
                    if (!mapping.has(i)) mapping.set(i, val);
                }
            } catch (e) { }
        }

        // Layer 3: Fuzzy
        fields.forEach(field => {
            if (!mapping.has(field.index)) {
                const match = findFuzzyMatch(field.labelText, presets);
                if (match) mapping.set(field.index, match.value);
            }
        });

        // Filling
        for (const [index, value] of mapping) {
            const field = fields[index];
            if (isGoogleForm) {
                await fillField(field.container, value);
            } else {
                await fillGenericField(field.element, value);
            }
        }

    } finally {
        isFilling = false;
    }
}

function findDictionaryMatch(labelText, presets) {
    const dictionary = [
        { key: 'nama', synonyms: ['nama', 'lengkap', 'peserta', 'name', 'identitas', 'panggilan', 'customer', 'pelanggan'] },
        { key: 'telepon', synonyms: ['telepon', 'phone', 'wa', 'whatsapp', 'kontak', 'hp', 'telp', 'aktif', 'emergency', 'darurat', 'no aktif'] },
        { key: 'alamat', synonyms: ['alamat', 'address', 'domisili', 'ktp', 'tinggal', 'rumah', 'lokasi', 'location'] },
        { key: 'nik', synonyms: ['nik', 'nomer induk keluarga', 'nomer induk kependudukan', 'nomor induk keluarga', 'nomor induk kependudukan', 'id card', 'identitas diri', 'nomor induk', 'identity'] },
        { key: 'kk', synonyms: ['kk', 'kartu keluarga', 'no kk', 'nomor kartu keluarga', 'nomer kartu keluarga'] },
        { key: 'email', synonyms: ['email', 'surel', 'pos-el', 'mail'] },
        { key: 'tgl', synonyms: ['tanggal', 'lahir', 'date', 'birth'] },
        { key: 'kelamin', synonyms: ['jenis kelamin', 'gender', 'sex', 'pria', 'wanita', 'laki-laki', 'perempuan', 'lk', 'pr'] },
        { key: 'agama', synonyms: ['agama', 'religion', 'faith'] },
        { key: 'status', synonyms: ['kondisi', 'keadaan', 'status', 'keterangan', 'bocor', 'fungsi', 'normal', 'good'] }
    ];

    const exactMatch = presets.find(p => p.label.toLowerCase().trim() === labelText);
    if (exactMatch) return exactMatch;

    const labelCategory = dictionary.find(d =>
        labelText === d.key || d.synonyms.some(s => labelText.includes(s))
    );

    if (!labelCategory) return null;

    return presets.find(p => {
        const pLabel = p.label.toLowerCase().trim();
        return pLabel === labelCategory.key || labelCategory.synonyms.some(s => pLabel.includes(s));
    });
}

function findFuzzyMatch(labelText, presets) {
    return presets.find(p => {
        const pLabel = p.label.toLowerCase().trim();
        if (pLabel.length <= 3 || labelText.length <= 3) {
            return labelText.split(/\s+/).includes(pLabel) || pLabel.split(/\s+/).includes(labelText);
        }
        return labelText.includes(pLabel) || pLabel.includes(labelText);
    });
}

async function runAIMapping(fields, presets) {
    try {
        const aiProvider = window.ai?.languageModel || window.ai?.assistant;
        if (!aiProvider) return {};

        const caps = await aiProvider.capabilities();
        const status = caps.available || caps;
        if (status === 'no' || status === 'unavailable') return {};

        const session = await aiProvider.create({
            systemPrompt: `You are a professional industrial form-filling AI. 
            SKILLS:
            - Map "Form Labels" to "User Presets" using cross-language synonyms (Indonesian/KBBI & English).
            - Handle Industrial Context: e.g., "Tidak Bocor" = "Normal", "Good", "Safe", "Aman".
            - Use MULTI-LAYER labels: If you see "Regulator > Pressure Gauge", use both for context.
            - HINT SUPPORT: If a field says "Standard: X", use X as the logical mapping for "Normal" or "Good".

            RULES:
            - Return ONLY a JSON object mapping field INDEX to the FINAL mapped value.
            - Format: {"idx": "mapped_value"}`
        });

        const fieldsInfo = fields.map(f => {
            let info = `${f.index}: Label="${f.label}"`;
            if (f.hint) info += ` | Hint="${f.hint}"`;
            if (f.options && f.options.length > 0) info += ` | Options: [${f.options.join(', ')}]`;
            return info;
        }).join('\n');

        const prompt = `Form Fields:\n${fieldsInfo}\n\nUser Presets:\n${presets.map(p => `"${p.label}": "${p.value}"`).join('\n')}\n\nTask: Map field index to value. Return JSON:`;

        const response = await session.prompt(prompt);
        session.destroy();
        return JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) { return {}; }
}

async function fillField(container, value) {
    if (!value) return;

    // 1. Dropdown (ListBox)
    const dropdown = container.querySelector('[role="listbox"], .vR739e');
    if (dropdown) {
        await fillDropdown(dropdown, value);
        return;
    }

    // 2. Radio & Checkbox
    const options = container.querySelectorAll('[role="radio"], [role="checkbox"]');
    if (options.length > 0) {
        fillOptions(options, value);
        return;
    }

    // 3. Date Inputs
    const dateInputs = container.querySelectorAll('input[type="date"], input[aria-label*="Day"], input[aria-label*="Month"], input[aria-label*="Year"]');
    if (dateInputs.length > 0) {
        fillDate(container, value);
        return;
    }

    // 4. Standard Inputs (Text, Email, Textarea)
    const inputs = container.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], textarea');
    inputs.forEach(input => {
        if (input.value !== value) {
            input.value = value;
            ['input', 'change', 'blur'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
        }
    });
}

async function fillDropdown(dropdown, value) {
    // Click dropdown to open
    dropdown.click();

    // Wait for options to appear
    await new Promise(r => setTimeout(r, 300));

    // Find options. Google Forms options are usually in a different div at the bottom of body
    // but we can try to find them by text content or role.
    const allOptions = document.querySelectorAll('[role="option"]');
    for (const opt of allOptions) {
        const optText = opt.innerText.toLowerCase().trim();
        const valText = value.toLowerCase().trim();

        if (optText.includes(valText) || valText.includes(optText)) {
            opt.click();
            break;
        }
    }
}

function fillOptions(options, value) {
    const valText = value.toLowerCase().trim();

    // Synonym clusters
    const synonyms = [
        ['pria', 'laki-laki', 'laki laki', 'lk', 'male'],
        ['wanita', 'perempuan', 'pr', 'female']
    ];

    const targetSyns = synonyms.find(s => s.includes(valText)) || [valText];

    options.forEach(opt => {
        const optLabel = (opt.getAttribute('aria-label') || opt.innerText).toLowerCase().trim();

        // Exact match or synonym match
        const isMatch = optLabel === valText ||
            targetSyns.some(s => optLabel.includes(s) || s.includes(optLabel));

        if (isMatch) {
            if (opt.getAttribute('aria-checked') !== 'true') {
                opt.click();
            }
        }
    });
}

async function fillGenericField(element, value) {
    if (!element || !value) return;

    if (element.tagName === 'SELECT') {
        const valText = value.toLowerCase().trim();
        for (let i = 0; i < element.options.length; i++) {
            const optText = element.options[i].text.toLowerCase().trim();
            if (optText.includes(valText) || valText.includes(optText)) {
                element.selectedIndex = i;
                break;
            }
        }
    } else if (element.type === 'radio' || element.type === 'checkbox') {
        // Bootstrap Button Groups or standard choices
        const valText = value.toLowerCase().trim();
        const parent = element.parentElement;
        const labelText = (element.getAttribute('aria-label') || parent.innerText || '').toLowerCase().trim();

        // Smart Check: Only click if it's the right choice and not already checked
        if (labelText === valText || labelText.includes(valText) || valText.includes(labelText)) {
            if (!element.checked) {
                element.click();
            }
        }
    } else {
        // Text, Date, Number, etc.
        element.value = value;
    }

    ['input', 'change', 'blur'].forEach(ev => element.dispatchEvent(new Event(ev, { bubbles: true })));
}

function fillDate(container, value) {
    if (!value) return;

    // Handle formats: "DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "DD.MM.YYYY"
    const parts = value.split(/[-/.]/);
    if (parts.length < 3) return;

    let day, month, year;
    if (parts[0].length === 4) { // YYYY-MM-DD
        [year, month, day] = parts;
    } else if (parts[2].length === 4) { // DD/MM/YYYY
        [day, month, year] = parts;
    } else {
        return;
    }

    const subInputs = container.querySelectorAll('input');
    subInputs.forEach(input => {
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();

        // Match by aria-label or placeholder (Indonesian & English)
        if (ariaLabel.includes('day') || ariaLabel.includes('hari') || ariaLabel.includes('tanggal')) {
            input.value = day;
        } else if (ariaLabel.includes('month') || ariaLabel.includes('bulan')) {
            input.value = month;
        } else if (ariaLabel.includes('year') || ariaLabel.includes('tahun')) {
            input.value = year;
        } else if (placeholder.includes('dd')) {
            input.value = day;
        } else if (placeholder.includes('mm')) {
            input.value = month;
        } else if (placeholder.includes('yyyy')) {
            input.value = year;
        } else if (input.type === 'date') {
            input.value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        ['input', 'change', 'blur'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
    });
}
