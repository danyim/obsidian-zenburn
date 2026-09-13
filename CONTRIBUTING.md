# Contributing to Obsidian Zenburn

Thanks for your interest in improving this theme! This is a small, single-file
Obsidian theme, so the contribution process is intentionally lightweight.

## Getting started

1. Fork this repository and clone your fork.
2. In Obsidian, go to **Settings** > **Appearance** > **Themes**, enable
   **Community themes**, and use **Manage** to point Obsidian at your local
   copy of `theme.css` (or symlink it into a vault's
   `.obsidian/themes/Zenburn/` folder) so you can see your changes live.
3. See [DEBUGGING.md](DEBUGGING.md) for tips on live-reloading the theme
   while you edit.

## Making changes

- All theme styles live in `theme.css`. Shared color variables from the
  original Zenburn palette live in `zenburn-colors.css` for reference.
- Prefer CSS custom properties (`--variable-name`) over hard-coded colors so
  overrides stay easy to reason about.
- Avoid `!important` where possible. Because theme CSS loads after
  Obsidian's base styles, matching or increasing selector specificity is
  usually enough to win the cascade without it.
- Avoid duplicate selectors and duplicate property declarations within a
  rule — consolidate styles for the same selector into a single rule block.
- Test your changes against both the editor (Live Preview/Source mode) and
  reading view, since Obsidian styles many of the same elements
  differently in each.
- This theme currently targets dark mode only — if you're adding light mode
  support, please open an issue first to discuss scope.

## Linting

Before opening a pull request, run the theme through the official Obsidian
theme lint config to catch common issues (unsupported browser features,
duplicate selectors/properties, `!important` usage, and general CSS
hygiene):

```
npm install
npm run lint
```

This runs [Stylelint](https://stylelint.io/) with
[`stylelint-config-obsidianmd`](https://www.npmjs.com/package/stylelint-config-obsidianmd),
the same config the official
[obsidian-sample-theme](https://github.com/obsidianmd/obsidian-sample-theme)
uses. Note that it also flags stylistic nitpicks (hex color length,
declaration ordering, kebab-case selectors) beyond the five checks that
actually block theme submission — selectors like `.HyperMD-*` or
`.CodeMirror-*` are Obsidian's own class names and will always fail the
kebab-case rule, so don't "fix" those away.

`authorUrl` in `manifest.json` pointing at the theme's own repo (it should
point at your profile instead) isn't caught by Stylelint — that's validated
separately when a theme is submitted to
[obsidian-releases](https://github.com/obsidianmd/obsidian-releases).

You can also open the vault in Obsidian with the theme applied and check
the developer console for CSS warnings.

## Screenshots

The README images are generated, not hand-taken. After a visual change,
regenerate them so they reflect what the current `theme.css` produces:

```
npm run screenshots
```

This downloads Obsidian into `.obsidian-cache/` (gitignored) on first run,
opens `test/vault` with the theme installed, and overwrites the images in
`screenshots/`. Mobile shots use Obsidian's mobile emulation on the desktop
app at the iPhone 16 Pro's viewport and pixel ratio, so they are close to
but not identical to the real iOS app. Edit `test/vault/Kitchen Sink.md` to
change what gets captured.

## Submitting a pull request

1. Create a branch with a descriptive name (e.g. `fix/table-borders`).
2. Keep pull requests focused on a single change or fix where possible.
3. Include a screenshot or short description of the visual change, since
   theme changes are hard to review from a diff alone.
4. Do not bump the version in `manifest.json`/`versions.json` yourself —
   the maintainer handles releases via `npm run version`.

## Releasing

Maintainer only. `npm version <patch|minor|major>` bumps `package.json`,
runs `version-bump.mjs` to sync `manifest.json`, `versions.json` and the
`theme.css` header, and creates a commit and tag. Pushing the tag triggers
`.github/workflows/release.yml`, which checks the tag matches the manifest
version, attests provenance, and publishes a GitHub release with
`manifest.json` and `theme.css` attached:

```
npm version patch
git push --follow-tags
```

## Reporting issues

If you find a bug or have a suggestion but aren't sure how to fix it,
[open an issue](https://github.com/danyim/obsidian-zenburn/issues) instead.
Screenshots and the Obsidian version you're using are always helpful.
