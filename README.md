# Vibeout artist site template

A reusable, static artist website built with Astro and TypeScript. ArtistA is the first configuration, with original sample artwork, sample release titles, and an explicitly labeled YouTube player demo. No sample release claims to be real artist music.

## Run locally

Requires Node.js 22.23.4 or newer.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env` to configure a production preview or browser CMS. Never put tokens or OAuth client secrets in the site, public environment variables, or repository.

```sh
npm run check
npm test
npm run build
npm run preview
```

Browser checks (after building):

```sh
npx playwright install chromium
npm run test:browser
```

Use the same `BASE_PATH` environment value for build and browser checks. Checks cover desktop/mobile layouts, the theme switch, on-demand players, image paths, and the unconfigured editor.

## Create another artist site

1. Select **Use this template** on GitHub and create a separate repository.
2. Edit `src/content/site.json`: artist name, descriptions, artwork, links, release information, and videos. Replace all sample content before a real launch.
3. Pick `midnight` (dark, graphic) or `paper` (light, editorial). Rearrange or remove entries in `sections` to reorder or hide sections. Sections with no published music/videos are automatically omitted.
4. Enable GitHub Pages with **GitHub Actions** as the source in Settings > Pages.
5. Run the deployment workflow or push a commit to `main`.
6. Configure the optional CMS authentication service below if browser editing is needed.

All artist-specific content is in one JSON file. Shared components and CSS are not copied per artist. Each independent site has its own repository, deployment, and editor permissions.

## Music and video content

For a release's `source`, select a provider and paste a public share URL:

| Provider | Supported input |
| --- | --- |
| `none` | Empty URL; no player |
| `spotify` | `open.spotify.com` track, album, playlist, or artist URL |
| `apple` | `music.apple.com` country/album, playlist, or song URL; track selection `i` is retained |
| `soundcloud` | Public `soundcloud.com` track or playlist URL |
| `audio` | Direct HTTPS audio file hosted on your media storage |

`streamingLinks` can include additional HTTPS destinations. Videos accept YouTube watch, short-link, Shorts, and embed URLs. Paste URLs, not HTML. Players load only after user interaction, never autoplay, and include source links when embedding is blocked or unavailable. Providers may impose region, login, privacy, or embedding restrictions.

Images live under `public/images`; content paths use `images/...`, not root-relative `/images/...`. This keeps images portable between GitHub Pages subpaths and custom domains. Use compressed JPEG/WebP for real photography. Large audio/video uploads are intentionally not stored in Git; use external media hosting. The image editor uploads to `public/images/uploads`.

Set `published: false` to keep a release/video off the public page. Only one published release can be featured. Array order controls release/video order. GitHub history provides rollback: revert a content commit, rather than replacing the whole repository.

Invalid URLs, dates, duplicate IDs, duplicate sections, and malformed settings fail the build explicitly. The last successful deployment remains live. Review failed Actions runs when edits do not appear.

## Browser administration

Visit `<site URL>/admin/`. It includes Decap CMS integration for content, images, and appearance.

The designer's [administration README](docs/admin/README.md) is also published at `<site URL>/admin/guide/`, linked from the editor. It covers replacing sample content, adding music/videos, uploading artwork, changing themes, and checking deployments.

**The browser CMS is not usable for sign-in until you provide a GitHub OAuth proxy.** GitHub Pages cannot host that service. Until then, the editor page clearly reports the missing setup and provides a GitHub JSON-edit link. There are no embedded credentials and no pretend save operation.

Authentication setup:

1. Deploy a trusted, Decap-compatible GitHub OAuth proxy on a server/serverless host. Review the implementation before granting it repository access; do not use an arbitrary public proxy.
2. Register a GitHub OAuth application with the callback URL required by that proxy. Store its client secret only in that service's secret manager.
3. The proxy must implement Decap's `/auth` initiation route and callback/popup messaging contract. Restrict allowed frontend origins to your exact site origin, validate OAuth state, and use the least repository scopes that support your public/private repository. Only accounts with write permission should edit.
4. Set the GitHub Actions repository variable `PUBLIC_CMS_AUTH_ORIGIN` to the proxy's HTTPS origin, such as `https://auth.example.com` (no path). `PUBLIC_GITHUB_REPOSITORY` is supplied automatically by the workflow.
5. Redeploy, open `/admin/`, and select **Open content editor**. Sign in, make an edit, and verify its commit and successful deployment.

CMS authentication reference: https://decapcms.org/docs/authentication-backends/

Empty optional text and list fields may be omitted; the schema normalizes those to empty strings/arrays. The build is the authoritative validation gate. The CMS saves to `main`; `published` is a content visibility toggle, not a private preview environment. Unpublished content is still visible to anyone with repository read access.

The CMS script is pinned to Decap 3.17.1 and loads from unpkg only when the editor is opened. Do not add public account tokens to bypass OAuth.

## Theme design

`src/styles/themes.css` defines semantic tokens for backgrounds, text, borders, fonts, shapes, and accent colors. `src/styles/global.css` defines shared layouts. Add a theme by defining those tokens and adding its name to the schema and CMS options; do not duplicate the page.

The artist accent applies to the midnight theme. Paper uses a fixed dark accent for legibility. Choose a light midnight accent and verify button contrast (at least 4.5:1 for normal text). The public theme switcher previews the alternate theme; it does not save the designer's default. Set the default in content/CMS.

## GitHub Pages and custom domains

The included workflow validates types and content, runs tests, builds, and deploys only from `main`. Pull requests validate without publishing.

By default the workflow derives:

- `SITE_URL`: `https://<owner>.github.io`
- `BASE_PATH`: `/<repository>/`
- `PUBLIC_GITHUB_REPOSITORY`: the current repository

For a custom domain, configure the domain and DNS in Settings > Pages and set repository variables `SITE_URL=https://your-domain.example` and `BASE_PATH=/`. Redeploy. For an `<owner>.github.io` root repository, also set `BASE_PATH=/`. Update the OAuth proxy's allowed origins when the domain changes.

A custom domain does not require leaving GitHub Pages. To move to another static host later, build with those same environment variables and publish `dist`. No database migration is required.

## Current scope

Included: responsive artist pages, two themes, validated content, on-demand music/YouTube players, externally hosted audio support, image management configuration, Git-backed editor integration, and automated Pages deployment.

Not provisioned: OAuth proxy/client credentials, real ArtistA music or biography, custom domain, direct audio/video upload storage, private staging previews, newsletter backend, or analytics. These require real accounts/content or a separate service decision.
