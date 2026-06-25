# Google BigQuery Release Notes Hub

A premium, responsive dashboard that fetches the official Google Cloud BigQuery Release Notes feed, categorizes and splits updates into individual timeline entries, lets you search/filter them in real time, and features a built-in Tweet composer to share updates on X/Twitter.

Built using **Python Flask** on the backend and **vanilla HTML5, CSS3, and JavaScript** on the frontend.

---

## ✨ Features

*   **Granular Timeline Cards**: Automatically splits daily updates into separate timeline entries based on categories (e.g. *Feature, Bug Fix, Change, Deprecation*).
*   **Aesthetic Dark Theme**: Designed with an ultra-modern dark glassmorphic UI, glowing ambient backgrounds, smooth micro-interactions, and a custom animated SVG brand logo.
*   **Search & Filtering**: Search through titles and description keywords in real time, or filter updates by clicking category pills in the sidebar.
*   **Tweet Composer Drawer**: Click on any release card to slide up a tweet composer panel. It automatically formats the tweet structure, estimates character count (with `t.co` URL replacement simulation), and posts directly via Twitter Web Intent.
*   **Resilient API Caching**: Local memory cache updates every 5 minutes to avoid rate-limiting. Bypassing is available via the manual **Refresh** button with a loading spinner.

---

## 📂 Project Structure

```
bq-releases-notes/
├── templates/
│   └── index.html      # UI layout, SVG logo, and elements structure
├── static/
│   ├── css/
│   │   └── styles.css  # Layout, glassmorphism, responsive styles, animations
│   └── js/
│   │   └── main.js    # Client-side state, API calls, filter logic, tweet compiler
├── app.py              # Flask server, Atom feed parsing, BeautifulSoup scraper, API endpoints
├── run.bat             # Startup automation script for Windows environment
├── .gitignore          # Ignores byte-caches, log outputs, virtual envs, and IDE settings
└── README.md           # This project guide documentation
```

---

## 🚀 Getting Started

### 📋 Prerequisites
*   Python 3.8+ installed on your system.

### 🔌 Run Using Windows Shortcut (Recommended)
Simply double-click the **`run.bat`** file in the project folder, or run it in your terminal:
```powershell
.\run.bat
```
*The script will automatically detect if a virtual environment exists, install missing dependencies (`Flask`, `requests`, `feedparser`, `beautifulsoup4`), and start the local development server.*

### 🛠️ Manual Installation (Alternative)
1.  **Create and activate the virtual environment**:
    *   **Windows**:
        ```powershell
        python -m venv venv
        .\venv\Scripts\Activate.ps1
        ```
    *   **Linux/macOS**:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```
2.  **Install dependencies**:
    ```bash
    pip install Flask requests feedparser beautifulsoup4
    ```
3.  **Run the Flask application**:
    ```bash
    python app.py
    ```

Once running, navigate to **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)** in your web browser.

---

## 🐦 Twitter Integration Details

*   When you select an update card, a tweet template is generated:
    `[Emoji] BigQuery Update (Date): "[Truncated text body]" Details: [Link]`
*   URLs are counted as 23 characters matching Twitter's `t.co` shortener logic.
*   Clicking **Tweet Now** compiles the text and opens a secure browser window pointing to `https://twitter.com/intent/tweet`.
