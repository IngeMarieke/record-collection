#!/usr/bin/env python3
"""
Fetch vinyl collection from Discogs API and save to JSON.

Requires environment variables:
  - DISCOGS_TOKEN: Your Discogs API token
  - DISCOGS_USERNAME: Your Discogs username
"""

import os
import json
import sys
import requests
from pathlib import Path
from typing import Optional

# Configuration
DISCOGS_TOKEN = os.getenv('DISCOGS_TOKEN')
DISCOGS_USERNAME = os.getenv('DISCOGS_USERNAME')
DISCOGS_API_BASE = 'https://api.discogs.com'
OUTPUT_FILE = 'data/collection.json'

# Request timeout
REQUEST_TIMEOUT = 10

def get_headers() -> dict:
    """Get request headers with authentication."""
    headers = {
        'User-Agent': 'VinylCollectionFetcher/1.0 +https://github.com',
    }
    if DISCOGS_TOKEN:
        headers['Authorization'] = f'Discogs token={DISCOGS_TOKEN}'
    return headers

def fetch_collection() -> list:
    """
    Fetch all releases from authenticated user's collection.
    Returns list of albums with cover, title, artist, and tracks.
    """
    if not DISCOGS_USERNAME:
        print('Error: DISCOGS_USERNAME not set', file=sys.stderr)
        sys.exit(1)
    
    if not DISCOGS_TOKEN:
        print('Error: DISCOGS_TOKEN not set', file=sys.stderr)
        sys.exit(1)
    
    albums = []
    page = 1
    
    try:
        while True:
            # Fetch collection page
            url = f'{DISCOGS_API_BASE}/users/{DISCOGS_USERNAME}/collection/folders/0/releases'
            params = {'page': page, 'per_page': 100}
            
            print(f'Fetching page {page}...')
            response = requests.get(
                url, 
                headers=get_headers(),
                params=params,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            
            data = response.json()
            releases = data.get('releases', [])
            
            if not releases:
                break
            
            # Process each release
            for release in releases:
                album = extract_album_info(release)
                if album:
                    albums.append(album)
            
            # Check if there are more pages
            pagination = data.get('pagination', {})
            if pagination.get('page', 0) >= pagination.get('pages', 1):
                break
            
            page += 1
        
        print(f'Successfully fetched {len(albums)} albums')
        return albums
    
    except requests.exceptions.RequestException as e:
        print(f'Error fetching collection: {e}', file=sys.stderr)
        sys.exit(1)

def extract_album_info(release: dict) -> Optional[dict]:
    """Extract relevant information from a Discogs release."""
    try:
        basic_info = release.get('basic_information', {})
        
        # Extract basic info
        album_id = basic_info.get('id')
        title = basic_info.get('title', 'Unknown')
        cover_image = basic_info.get('cover_image', '')
        
        # Extract artist(s)
        artists = basic_info.get('artists', [])
        artist_name = ', '.join([a.get('name', 'Unknown') for a in artists]) if artists else 'Unknown'
        
        # Fetch detailed tracklist
        tracks = fetch_tracklist(album_id)
        
        return {
            'id': album_id,
            'title': title.strip(),
            'artist': artist_name.strip(),
            'cover': cover_image if cover_image else None,
            'tracks': tracks
        }
    
    except Exception as e:
        print(f'Warning: Failed to extract info from release: {e}', file=sys.stderr)
        return None

def fetch_tracklist(release_id: int) -> list:
    """Fetch detailed tracklist for a release."""
    try:
        url = f'{DISCOGS_API_BASE}/releases/{release_id}'
        response = requests.get(
            url,
            headers=get_headers(),
            timeout=REQUEST_TIMEOUT
        )
        response.raise_for_status()
        
        data = response.json()
        tracklist = data.get('tracklist', [])
        
        tracks = []
        for track in tracklist:
            # Skip non-playable tracks (like headings, notes)
            if track.get('type_') == 'heading':
                continue
            
            track_name = track.get('title', 'Unknown')
            duration = track.get('duration', '')
            
            tracks.append({
                'name': track_name.strip(),
                'duration': duration.strip() if duration else None
            })
        
        return tracks
    
    except requests.exceptions.RequestException as e:
        print(f'Warning: Failed to fetch tracklist for release {release_id}: {e}', file=sys.stderr)
        return []

def save_collection(albums: list) -> None:
    """Save albums to JSON file."""
    try:
        # Ensure directory exists
        output_path = Path(OUTPUT_FILE)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(albums, f, indent=2, ensure_ascii=False)
        
        print(f'Saved {len(albums)} albums to {OUTPUT_FILE}')
    
    except Exception as e:
        print(f'Error saving collection: {e}', file=sys.stderr)
        sys.exit(1)

def main():
    """Main entry point."""
    print('Starting Discogs collection fetch...')
    albums = fetch_collection()
    save_collection(albums)
    print('Done!')

if __name__ == '__main__':
    main()
