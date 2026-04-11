# 🎵 My Vinyl Collection

A static web page for browsing your Discogs vinyl collection. Features include sorting by artist or album title, alphabetical or random ordering, and expandable track lists.

## Features

- ✨ Browse vinyl collection with album covers
- 🔄 Sort by artist name or album title
- 🎲 Alphabetical or random ordering
- 📋 Expandable track lists
- 📱 Responsive design (mobile, tablet, desktop)
- 🤖 Automated daily updates from Discogs API
- 🚀 Hosted on GitHub Pages

## Setup

### Prerequisites

- GitHub account with repository access
- [Discogs API token](https://www.discogs.com/settings/developers)
- Your Discogs username

### 1. Clone and Initial Setup

```bash
git clone <your-repo-url>
cd record-collection
```

### 2. GitHub Pages Configuration

1. Go to your repository **Settings** → **Pages**
2. Set **Source** to `Deploy from a branch`
3. Select branch: `main` (or your default branch)
4. Select folder: `/ (root)`
5. Click **Save**

Your site will be available at: `https://YOUR_USERNAME.github.io/record-collection`

### 3. Configure Discogs Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Create two new repository secrets:
   - `DISCOGS_TOKEN`: Your Discogs API token
   - `DISCOGS_USERNAME`: Your Discogs username

### 4. Trigger Initial Data Fetch

1. Go to **Actions** tab
2. Select **"Fetch Discogs Collection"** workflow
3. Click **"Run workflow"** → **"Run workflow"**
4. Wait for the workflow to complete
5. Commit and push the generated `data/collection.json` file

## Usage

### Manual Workflow Trigger

To update your collection immediately without waiting for the scheduled run:

1. Go to **Actions** tab
2. Select **"Fetch Discogs Collection"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

### Scheduled Updates

The workflow runs automatically every day at **2:00 AM UTC**. To change the schedule, edit `.github/workflows/fetch-discogs.yml` and modify the cron expression:

```yaml
schedule:
  - cron: '0 2 * * *'  # Change these numbers to adjust time
```

[Cron syntax reference](https://crontab.guru/)

### Local Testing

To test the workflow script locally:

```bash
# Set up environment variables
export DISCOGS_TOKEN="your_token_here"
export DISCOGS_USERNAME="your_username"

# Run the script
python scripts/fetch_discogs.py
```

## File Structure

```
record-collection/
├── index.html                          # Main HTML page
├── styles.css                          # Styling
├── script.js                           # Frontend logic
├── data/
│   └── collection.json                 # Generated collection data
├── scripts/
│   └── fetch_discogs.py               # Discogs API fetcher script
├── .github/
│   └── workflows/
│       └── fetch-discogs.yml          # GitHub Action workflow
└── README.md                           # This file
```

## Frontend Functionality

### Sort Options

- **Order**: Alphabetical (A-Z) or Random
- **Sort By**: Artist Name or Album Title

The selected preferences persist during your current session.

### Album Card

Click on any album card to expand/collapse the track list.

- Album cover image (left)
- Album title and artist (right)
- Track count displayed by default
- Full track list with durations (click to reveal)

## Troubleshooting

### Workflow Fails: "DISCOGS_TOKEN not set"

**Solution**: Ensure both `DISCOGS_TOKEN` and `DISCOGS_USERNAME` secrets are configured in repository settings.

### Workflow Fails: "Rate limit exceeded"

**Solution**: The Discogs API allows 240 requests/hour for authenticated users. If your collection is very large (100+ items), the script may exceed this. Wait an hour and try again, or:
1. Temporarily remove older items from your collection
2. Run the workflow manually with a smaller collection

### Images not loading

**Solution**: Discogs image CDN may be temporarily unavailable. Try:
1. Manually trigger the workflow to refresh collection data
2. Check browser console for specific image URLs that failed
3. Reload the page

### Sorting not working

**Solution**: Open browser developer console (F12) and check for JavaScript errors. Ensure `data/collection.json` is valid JSON and accessible.

## Customization

### Change Theme Colors

Edit [styles.css](styles.css) CSS variables at the top:

```css
:root {
    --primary-color: #1db954;      /* Change this for primary accent */
    --background: #121212;         /* Dark mode background */
    /* ... other colors ... */
}
```

### Change Workflow Schedule

Edit [.github/workflows/fetch-discogs.yml](.github/workflows/fetch-discogs.yml):

```yaml
schedule:
  - cron: '0 12 * * *'  # Run at noon UTC instead
```

### Add More Metadata

To include additional fields from Discogs (genres, year, condition, etc.), edit `scripts/fetch_discogs.py` in the `extract_album_info()` function.

## Data Privacy

- Your Discogs API token is stored as a GitHub Secret and never exposed in public code
- Collection data is stored as `data/collection.json` in your repository
  - If your repo is **private**: Collection is not publicly visible
  - If your repo is **public**: Collection data is publicly visible (but requires GitHub Pages to be enabled)

## API Rate Limiting

Discogs API allows:
- **240 requests/hour** for authenticated users
- Collection fetch typically uses 1-2 requests per album
- Consider your collection size when configuring workflow frequency

## Future Enhancements

- [ ] Search/filter functionality
- [ ] Genre-based filtering
- [ ] Year released sorting
- [ ] Wishlist/favorites marking
- [ ] Export to CSV
- [ ] Album ratings/reviews

## License

This project is provided as-is. Feel free to modify and distribute as needed.

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review [Discogs API Documentation](https://www.discogs.com/developers/)
3. Create a GitHub Issue in this repository

---

**Last Updated**: 2026-04-11

Happy listening! 🎵
