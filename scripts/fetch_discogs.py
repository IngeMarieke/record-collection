#!/usr/bin/env python3
"""
Fetch vinyl collection from Discogs API and save to JSON.

Requires environment variables:
  - DISCOGS_TOKEN: Your Discogs API token
  - DISCOGS_USERNAME: Your Discogs username
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

import requests

# Configuration
DISCOGS_TOKEN = os.getenv('DISCOGS_TOKEN')
DISCOGS_USERNAME = os.getenv('DISCOGS_USERNAME')
DISCOGS_API_BASE = 'https://api.discogs.com'
OUTPUT_FILE = 'data/collection.json'

REQUEST_TIMEOUT = 10
REQUEST_INTERVAL = 1.1
MAX_429_RETRIES = 4
RETRY_AFTER_DEFAULT = 10

SESSION = requests.Session()


def get_headers() -> dict:
    """Get request headers with authentication."""
    headers = {
        'User-Agent': 'VinylCollectionFetcher/1.0 +https://github.com',
        'Accept': 'application/json',
    }
    if DISCOGS_TOKEN:
        headers['Authorization'] = f'Discogs token={DISCOGS_TOKEN}'
    return headers


def load_existing_collection() -> Dict[int, dict]:
    """Load the existing collection file and index albums by release ID."""
    path = Path(OUTPUT_FILE)
    if not path.exists():
        return {}

    try:
        with open(path, 'r', encoding='utf-8') as f:
            albums = json.load(f)
        return {album['id']: album for album in albums if isinstance(album, dict) and 'id' in album}
    except Exception as e:
        print(f'Warning: Failed to load existing collection: {e}', file=sys.stderr)
        return {}


def make_request(url: str, params: Optional[dict] = None) -> requests.Response:
    """Perform a Discogs request with minimal 429 retry handling."""
    for attempt in range(1, MAX_429_RETRIES + 1):
        response = SESSION.get(
            url,
            headers=get_headers(),
            params=params,
            timeout=REQUEST_TIMEOUT,
        )

        if response.status_code == 429:
            retry_after = response.headers.get('Retry-After')
            wait = RETRY_AFTER_DEFAULT
            if retry_after:
                try:
                    wait = float(retry_after)
                except ValueError:
                    pass

            print(
                f'Warning: received 429 from Discogs for {url}. '
                f'Waiting {wait:.1f}s before retry {attempt}/{MAX_429_RETRIES}.',
                file=sys.stderr,
            )
            time.sleep(wait)
            continue

        response.raise_for_status()

        remaining = response.headers.get('x-discogs-ratelimit-remaining')
        used = response.headers.get('x-discogs-ratelimit-used')
        if remaining is not None:
            print(f'Discogs rate limit remaining: {remaining}, used: {used or "unknown"}', file=sys.stderr)

        time.sleep(REQUEST_INTERVAL)
        return response

    response.raise_for_status()
    return response


def fetch_collection_releases() -> List[dict]:
    """Fetch all release entries from the user's Discogs collection."""
    releases: List[dict] = []
    page = 1

    while True:
        url = f'{DISCOGS_API_BASE}/users/{DISCOGS_USERNAME}/collection/folders/0/releases'
        params = {'page': page, 'per_page': 100, 'sort': 'artist', 'sort_order': 'asc'}

        print(f'Fetching collection page {page}...')
        response = make_request(url, params=params)
        data = response.json()
        page_releases = data.get('releases', [])
        releases.extend(page_releases)

        pagination = data.get('pagination', {})
        if not page_releases or page >= pagination.get('pages', 0):
            break

        page += 1

    return releases


def fetch_tracklist(release_id: int) -> List[dict]:
    """Fetch detailed tracklist for a given release."""
    url = f'{DISCOGS_API_BASE}/releases/{release_id}'
    response = make_request(url)
    data = response.json()
    tracklist = data.get('tracklist', [])

    tracks: List[dict] = []
    for track in tracklist:
        if track.get('type_') == 'heading':
            continue

        tracks.append({
            'name': track.get('title', 'Unknown').strip(),
            'duration': track.get('duration', '').strip() or None,
        })

    return tracks


def extract_album_info(release: dict, existing_album: Optional[dict] = None) -> dict:
    """Build the album object for storage."""
    basic_info = release.get('basic_information', {})
    release_id = basic_info.get('id')
    title = basic_info.get('title', 'Unknown').strip()
    artists = basic_info.get('artists', [])
    artist_name = ', '.join([a.get('name', 'Unknown') for a in artists]) if artists else 'Unknown'

    album = {
        'id': release_id,
        'title': title,
        'artist': artist_name.strip(),
        'year': basic_info.get('year'),
        'cover': basic_info.get('cover_image') or None,
        'tracks': fetch_tracklist(release_id),
    }

    if existing_album:
        for key, value in existing_album.items():
            if key not in album:
                album[key] = value

    return album


def save_collection(albums: List[dict]) -> None:
    """Save albums to the output JSON file."""
    output_path = Path(OUTPUT_FILE)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(albums, f, indent=2, ensure_ascii=False)
    print(f'Saved {len(albums)} albums to {OUTPUT_FILE}')


def validate_environment() -> None:
    if not DISCOGS_USERNAME:
        print('Error: DISCOGS_USERNAME not set', file=sys.stderr)
        sys.exit(1)
    if not DISCOGS_TOKEN:
        print('Error: DISCOGS_TOKEN not set', file=sys.stderr)
        sys.exit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Fetch Discogs collection and enrich album info.')
    parser.add_argument(
        '--refresh-all',
        action='store_true',
        help='Refresh all album information instead of only new albums.',
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    validate_environment()

    existing_albums = load_existing_collection()
    releases = fetch_collection_releases()

    discovered = len(releases)
    covered = len(existing_albums)
    print(f'Found {discovered} albums in the Discogs collection.')
    if args.refresh_all:
        print('Refreshing all album information.')
    else:
        print(f'{covered} albums already covered in {OUTPUT_FILE}.')

    albums: List[dict] = []
    processed = 0
    for index, release in enumerate(releases, start=1):
        release_id = release.get('basic_information', {}).get('id')
        if release_id is None:
            print(f'Warning: skipping release with missing id at position {index}.', file=sys.stderr)
            continue

        if not args.refresh_all and release_id in existing_albums:
            albums.append(existing_albums[release_id])
            print(f'[{index}/{discovered}] Already covered album {release_id}, skipping.')
            continue

        print(f'[{index}/{discovered}] Extracting album info for release {release_id}...')
        album = extract_album_info(release, existing_album=existing_albums.get(release_id))
        albums.append(album)
        processed += 1

    print(f'Processed {processed} album(s).')
    save_collection(albums)


if __name__ == '__main__':
    main()
