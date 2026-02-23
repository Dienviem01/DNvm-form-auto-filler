# DNvm Form Auto Filler (AI Powered)🚀

build with AI

**DNvm Form Auto Filler** is a modern, AI-powered Chrome extension designed to automate form filling with surgical precision. Powered by **Google Gemini Nano**, it intelligently maps your personal presets to any form field, even when labels don't match exactly.

![Extension Preview](icons/iconv2.png)

## ✨ Key Features

- **🧠 AI Smart Mapping**: Uses Gemini Nano (Prompt API) to guess field meanings. It understands that "Full Name" and "Nama Lengkap" mean the same thing.
- **🌙 Premium Dark Mode**: High-contrast, easy-on-the eyes theme with a smooth manual toggle.
- **📂 Profile Management**: Save different sets of data (e.g., Personal, Work, Shipping) and switch between them instantly.
- **⚡ Live Auto-Fill**: Forms are filled immediately upon loading or when you switch profiles.
- **🌐 Universal Mode**: Works on Google Forms and virtually any other website with standard input fields.
- **🎨 Modern UI**: "Classic Casual" design with smooth animations and a responsive, rounded interface.
- **🛡️ Weighted Logic**: Smart dictionary matching that prioritizes primary keywords (e.g., "Address") over secondary modifiers (e.g., "Complete"), preventing incorrect auto-fills.

## 🚀 Recent Updates (2026-02-23)

- **Semantic Weighted Matching**: Introduced a dual-pass logic to distinguish between similar labels (e.g., "Nama Lengkap" vs "Alamat Lengkap"). Primary keywords now take precedence.
- **Advanced Computational Linguist AI**: Refactored the AI prompt to act as an expert linguist, improving its understanding of industrial context, synonyms (KBBI & English), and abbreviations.
- **Structured Data Mapping**: Revamped the data communication between the script and AI. Presets are now sent as clean JSON objects, ensuring 100% reliable index-to-value mapping.
- **Safety First Filtering**: Added a negative filtering layer to prevent wrong data entries in ambiguous fields.

## 🛠️ Installation

### 1. Enable Chrome AI Flags (Prerequisite)

Since this extension uses **Gemini Nano** locally on your device, you must enable these flags in Google Chrome:

1.  Open `chrome://flags`
2.  Search for and **Enable**:
    - `#prompt-api-for-gemini-nano`
    - `#optimization-guide-on-device-model` (Set to **Enabled BypassPrefRequirement**)
3.  Relaunch Chrome.

### 2. Load the Extension

1.  Download or clone this repository.
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** (top right toggle).
4.  Click **Load unpacked**.
5.  Select the project folder: `DNvm-form-auto-filler`.

## 📖 How to Use

1.  Open the extension and create a **New Profile**.
2.  Add your data (e.g., Label: `Nama`, Value: `Budi Sudarsono`).
3.  Navigate to any Google Form or webpage.
4.  Watch the AI automatically fill the fields for you!

## 🔒 Privacy & Security

- **Local Processing**: All data is stored locally in your browser using `chrome.storage.local`.
- **On-Device AI**: Gemini Nano processes your labels and mapping logic directly on your machine. **No data is sent to external servers.**

## 🛠️ Tech Stack

- **HTML5 / CSS3** (Vanilla CSS Variables & Animations)
- **JavaScript** (ES6+)
- **Chrome Extension API** (Manifest V3)
- **Google Gemini Nano** (Built-in on-device AI)

---

Build with ❤️ by **mubisa.srt** © 2026.
