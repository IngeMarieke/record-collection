#!/usr/bin/env python3
"""
Fetch Spotify URLs for vinyl collection albums.

Enriches collection.json with Spotify album URLs by searching for each album
using artist name, album title, and year. Implements Spotify's Retry-After
backoff strategy for rate limiting.

Requires environment variables:
  - SPOTIFY_CLIENT_ID: Your Spotify API client ID
  - SPOTIFY_CLIENT_SECRET: Your Spotify API client secret
"""

import os
import json
import sys
import time
import requests
from pathlib import Path
from typing import Optional

# Configuration
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token"
COLLECTION_FILE = "data/collection.json"

REQUEST_TIMEOUT = 10


def get_access_token(client_id: str, client_secret: str) -> str:
    """
    Obtain Spotify API access token using Client Credentials flow.

    Args:
        client_id: Spotify client ID
        client_secret: Spotify client secret

    Returns:
        Access token string

    Raises:
        SystemExit: If authentication fails
    """
    try:
        token_response = requests.post(
            SPOTIFY_AUTH_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=REQUEST_TIMEOUT
        )
        token_response.raise_for_status()
        return token_response.json()["access_token"]
    except requests.exceptions.RequestException as e:
        print(f"Error obtaining Spotify access token: {e}", file=sys.stderr)
        sys.exit(1)


def search_spotify_album(
    access_token: str, artist: str, title: str, year: int
) -> str:
    """
    Search for an album on Spotify using artist, title, and year.

    Implements Spotify's Retry-After backoff strategy for rate limiting.

    Args:
        access_token: Valid Spotify API access token
        artist: Album artist name
        title: Album title
        year: Album release year

    Returns:
        Spotify URL of the first matching album, or empty string if not found
    """
    query = f"album:{title} artist:{artist} year:{year}"
    url = f"{SPOTIFY_API_BASE}/search"
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "q": query,
        "type": "album",
        "limit": 5
    }

    try:
        while True:
            response = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=REQUEST_TIMEOUT
            )

            # Handle rate limiting with Retry-After backoff
            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 1))
                print(
                    f"  Rate limited. Waiting {retry_after} second(s) "
                    f"before retrying...",
                    file=sys.stderr
                )
                time.sleep(retry_after)
                continue

            response.raise_for_status()
            break

        data = response.json()
        albums = data.get("albums", {}).get("items", [])

        if albums:
            return albums[0]["external_urls"]["spotify"]
        return ""

    except requests.exceptions.RequestException as e:
        print(
            f"  Warning: Failed to search Spotify for {artist} - {title}: {e}",
            file=sys.stderr
        )
        return ""


def load_collection() -> list:
    """
    Load album collection from JSON file.

    Returns:
        List of album dictionaries

    Raises:
        SystemExit: If file cannot be read or parsed
    """
    try:
        with open(COLLECTION_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Collection file not found: {COLLECTION_FILE}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Failed to parse JSON from {COLLECTION_FILE}: {e}", file=sys.stderr)
        sys.exit(1)


def save_collection(albums: list) -> None:
    """
    Save enriched album collection back to JSON file.

    Args:
        albums: List of album dictionaries to save

    Raises:
        SystemExit: If file cannot be written
    """
    try:
        output_path = Path(COLLECTION_FILE)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(albums, f, indent=2, ensure_ascii=False)

        print(f"Saved {len(albums)} albums to {COLLECTION_FILE}")
    except Exception as e:
        print(f"Error saving collection: {e}", file=sys.stderr)
        sys.exit(1)


def enrich_collection(albums: list, access_token: str) -> list:
    """
    Enrich each album in the collection with a Spotify URL.

    Adds or updates the 'spotify_link' field for each album.

    Args:
        albums: List of album dictionaries
        access_token: Valid Spotify API access token

    Returns:
        Enriched list of albums (modified in-place)
    """
    total = len(albums)

    for index, album in enumerate(albums, 1):
        artist = album.get("artist", "Unknown")
        title = album.get("title", "Unknown")
        year = album.get("year")

        print(f"[{index}/{total}] Searching: {artist} - {title} ({year})")

        spotify_link = search_spotify_album(access_token, artist, title, year)
        album["spotify_link"] = spotify_link

        if spotify_link:
            print(f"  ✓ Found: {spotify_link}")
        else:
            print(f"  ✗ No match found")

    return albums


def main():
    """Main entry point."""
    print("Starting Spotify URL enrichment...")

    # Validate credentials
    if not CLIENT_ID or not CLIENT_SECRET:
        print(
            "Error: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set",
            file=sys.stderr
        )
        sys.exit(1)

    # Get Spotify access token
    print("Authenticating with Spotify...")
    access_token = get_access_token(CLIENT_ID, CLIENT_SECRET)

    # Load collection
    print(f"Loading collection from {COLLECTION_FILE}...")
    albums = load_collection()
    print(f"Loaded {len(albums)} albums")

    # Enrich with Spotify URLs
    print("\nEnriching albums with Spotify URLs...")
    albums = enrich_collection(albums, access_token)

    # Save updated collection
    print("\nSaving enriched collection...")
    save_collection(albums)
    print("Done!")


if __name__ == "__main__":
    main()