# Updating your artist website

This guide is for the site designer. The customer-facing site is public; editing requires a GitHub account with write access to the site's repository.

## Two ways to edit

**Available now: edit in GitHub.** Open the site editor and select **Edit content in GitHub**. Edit `src/content/site.json`, then commit your changes to `main`. This is the working publishing path before browser CMS authentication is configured.

**After OAuth setup: browser content editor.** Open the site editor, select **Open content editor**, and sign in with GitHub. Open **Artist website > Content & appearance**, edit the fields, and publish. If the page says **Authentication setup required**, this method is not enabled yet. Follow the authentication instructions in the repository's root README; GitHub Pages alone cannot provide that login service.

Both methods save content to GitHub and trigger validation and deployment. Do not paste passwords, GitHub tokens, or OAuth secrets into content.

## Replace the sample ArtistA content

1. Update the artist name, headline, short description, and biography.
2. Upload your own hero artwork and release cover images.
3. Replace the sample release titles and dates. Add real music URLs and streaming links.
4. Replace the Blender demonstration video with an artist-owned YouTube video.
5. Add booking email and social links, or leave those optional fields empty.
6. Preview the deployed site on a phone and desktop. Check both themes and each player.

Only publish music and imagery you own or have permission to use.

## Add music

Add an entry under **Music releases**. Give it a unique lowercase ID such as `debut-single`, a title, subtitle, date, and cover image.

Choose one player source:

| Provider | What to paste |
| --- | --- |
| Spotify | The public track, album, playlist, or artist share URL |
| Apple Music | The public album, song, or playlist URL; selected track parameters are supported |
| SoundCloud | The public track or playlist URL, not a shortened `on.soundcloud.com` link |
| Audio | A direct HTTPS audio file URL from your external media host |
| None | Leave the URL empty for a release without a player |

For example, a source field in JSON looks like:

```json
{
  "provider": "audio",
  "url": "https://your-media-host.example/debut-single.mp3"
}
```

That URL is an example, not playable media. Replace it with your own file's real URL.

**Additional streaming links** are labeled HTTPS links to listening destinations. You can offer several destinations even when the primary player uses just one.

Set **Published** to true when ready. Set **Featured** on only one published release to show it in the hero spotlight. Drag releases to control their display order.

Direct music uploads are not part of the first version. Upload audio to a media service and use its direct file URL. Do not commit large audio/video files to the site repository.

## Add YouTube videos

Add an entry under **YouTube videos** with a unique ID, title, description, YouTube URL, thumbnail artwork, and Published status.

Supported URLs include normal watch links, `youtu.be` links, Shorts links, and embed links. Paste the URL only, not iframe HTML. The video owner must permit embedding. Players load when a visitor selects **Load video player**; they do not autoplay. Every video also has a direct YouTube link.

Drag entries to set their order. Set Published to false to remove one from the public site.

## Upload artwork

In the browser CMS, use the image field to upload an image. Uploads are stored under `public/images/uploads`.

For GitHub editing, upload the image into `public/images/uploads` in the repository first. Then reference it in JSON as:

```json
"artwork": "images/uploads/debut-cover.webp"
```

Do not include `public/` or start the path with `/`. Use simple filenames with letters, numbers, hyphens, and underscores. Prefer compressed WebP/JPEG images; square covers and tall hero images work best.

## Change themes and visible sections

Set **Default theme** to `midnight` for a dark graphic presentation or `paper` for a light editorial presentation. This changes appearance without rewriting content.

The midnight accent accepts a six-digit hex color such as `#c7fa73`. Choose a light accent so dark button text remains readable. Paper uses its own dark accent. The public **Light theme / Dark theme** button only previews the alternative; it does not save your default.

In **Visible sections**, drag music, videos, and about to reorder them. Remove a section to hide it. Do not add the same section twice. Empty music/video sections are hidden automatically.

## Publish and verify

1. Save/publish in the editor or commit the JSON change in GitHub.
2. Open the repository's **Actions** tab and check **Validate and deploy artist site**.
3. Wait for the workflow to succeed, then refresh the public website.
4. Confirm titles, images, links, video loading, and mobile layout.

Deployment takes a few minutes; editing is not instant. A failed build keeps the last successful site online. Check the failed workflow for invalid URLs, dates, duplicate IDs, duplicate sections, or multiple featured releases. Correct the content and commit again.

To undo a change, revert its GitHub commit and let the workflow redeploy. Do not delete the repository or reset its history.

## Draft visibility and limitations

Published=false hides content from the website, **not from the repository**. This template uses a public repository, so do not store private or embargoed information in drafts.

Provider playback can depend on region, account status, privacy settings, or embedding permission. Test the actual links with a signed-out browser. Use the source link when an embed is unavailable.

Custom domains, CMS OAuth hosting, mailing lists, analytics, and direct audio/video storage require separate setup. The root README documents domain migration and the CMS authentication contract.
