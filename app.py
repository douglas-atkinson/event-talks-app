import os
import time
import hashlib
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION_SECONDS = 300  # 5 minutes cache

# Memory cache for updates
_cache = {
    "updates": [],
    "last_fetched": 0
}

def clean_html_to_text(html_content):
    """Converts HTML content to clean plain text for search and tweet generation."""
    soup = BeautifulSoup(html_content, 'html.parser')
    # Replace links with text (or text + link, but for snippet we just want plain text)
    # Get text and clean whitespaces
    text = soup.get_text(separator=' ')
    text = ' '.join(text.split())
    return text

def parse_feed_to_updates():
    """Fetches the RSS feed and parses it into a list of individual updates."""
    try:
        # Fetch with a timeout to prevent hanging
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        # Parse XML content
        feed = feedparser.parse(response.content)
        
        all_updates = []
        
        for entry in feed.entries:
            date_str = entry.get('title', 'Unknown Date')
            entry_url = entry.get('link', '')
            iso_date = entry.get('updated', '')
            
            # Content or summary
            content_value = ""
            if entry.get('content') and len(entry.content) > 0:
                content_value = entry.content[0].value
            elif entry.get('summary'):
                content_value = entry.summary
                
            if not content_value:
                continue
                
            # Parse HTML content into separate updates based on H3 tags
            soup = BeautifulSoup(content_value, 'html.parser')
            
            updates_in_entry = []
            current_category = None
            current_elements = []
            
            # Iterate through children
            for child in soup.contents:
                if hasattr(child, 'name') and child.name == 'h3':
                    # Save the previous update if we found one
                    if current_category is not None:
                        html_str = "".join(str(e) for e in current_elements).strip()
                        updates_in_entry.append({
                            'category': current_category,
                            'content_html': html_str
                        })
                    current_category = child.get_text(strip=True)
                    current_elements = []
                else:
                    if current_category is not None:
                        current_elements.append(child)
                        
            # Save the last update in the loop
            if current_category is not None:
                html_str = "".join(str(e) for e in current_elements).strip()
                updates_in_entry.append({
                    'category': current_category,
                    'content_html': html_str
                })
                
            # Fallback if no <h3> tags were found in the entry
            if not updates_in_entry:
                updates_in_entry.append({
                    'category': 'General',
                    'content_html': content_value
                })
                
            # Enrich and format each parsed update
            for update in updates_in_entry:
                content_html = update['content_html']
                content_text = clean_html_to_text(content_html)
                
                # Generate a unique ID based on date, category, and text content
                hasher = hashlib.md5()
                hasher.update(f"{date_str}-{update['category']}-{content_text[:100]}".encode('utf-8'))
                uid = hasher.hexdigest()
                
                # Map standard Google categories to icons/colors if needed
                # e.g. "Feature", "Bug Fix", "Change", "Deprecation", "Announcement"
                category = update['category']
                
                all_updates.append({
                    'id': uid,
                    'date': date_str,
                    'iso_date': iso_date,
                    'category': category,
                    'content_html': content_html,
                    'content_text': content_text,
                    'link': entry_url
                })
                
        return all_updates, None
    except Exception as e:
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Check if cache is expired or if we are forcing a refresh
    if force_refresh or not _cache["updates"] or (current_time - _cache["last_fetched"] > CACHE_DURATION_SECONDS):
        updates, error = parse_feed_to_updates()
        if error:
            # If fetch fails, fall back to cache if available
            if _cache["updates"]:
                return jsonify({
                    'updates': _cache["updates"],
                    'cached_at': _cache["last_fetched"],
                    'warning': f"Failed to refresh feed: {error}. Serving cached data."
                })
            else:
                return jsonify({'error': f"Failed to fetch updates: {error}"}), 500
        
        _cache["updates"] = updates
        _cache["last_fetched"] = current_time
        
    return jsonify({
        'updates': _cache["updates"],
        'cached_at': _cache["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
