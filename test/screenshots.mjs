/**
 * Regenerates the README screenshots from a real Obsidian render of
 * test/vault, so the README always shows what the current theme.css actually
 * produces. Runs once per capability: desktop writes screen.png (the full
 * Kitchen Sink note), ui.png, thumbnail.png, and settings.png; mobile
 * emulation writes mobile*.png.
 */
import { browser } from '@wdio/globals';

/**
 * Installing the theme only sets `cssTheme` in appearance.json — it doesn't
 * switch Obsidian's base color scheme. Zenburn only styles `.theme-dark`, so
 * without this the vault renders in Obsidian's default light theme and none
 * of theme.css applies.
 */
async function forceDarkMode() {
  await browser.executeObsidian(({ app }) => {
    app.vault.setConfig('theme', 'obsidian');
    app.updateTheme?.();
  });
}

/**
 * Opens the Kitchen Sink note. `preview: true` switches to reading view,
 * used for mobile — Obsidian's mobile *editing* view boosts editor text to
 * 1.618x the configured font size for touch legibility, which reads as
 * badly over-zoomed in a screenshot; reading view uses the plain size and
 * is also the more realistic "someone browsing a note on their phone" shot.
 */
async function openNote({ preview = false } = {}) {
  await browser.executeObsidian(
    async ({ app, obsidian }, preview) => {
      const file = app.vault.getAbstractFileByPath('Kitchen Sink.md');
      if (!(file instanceof obsidian.TFile)) throw new Error('Kitchen Sink.md missing');
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(file);
      if (preview) await leaf.setViewState({ type: 'markdown', state: { mode: 'preview' } });
    },
    preview
  );
  await browser.$(preview ? '.markdown-rendered' : '.markdown-source-view .cm-line').waitForExist();
}

/**
 * Scroll so the heading (or line) containing `text` is at the top.
 *
 * In source view this goes through the editor API rather than searching
 * rendered `.cm-line` elements, since CodeMirror only renders lines near the
 * current viewport — a target further down the note wouldn't exist in the
 * DOM yet to search for. Reading view isn't virtualized like that for a note
 * this short, so headings can be searched for directly.
 */
async function scrollTo(text, { preview = false } = {}) {
  if (preview) {
    await browser.execute((needle) => {
      const heading = [...document.querySelectorAll('.markdown-preview-view :is(h1, h2, h3, h4, h5, h6)')].find(
        (el) => el.textContent.includes(needle)
      );
      heading?.scrollIntoView({ block: 'start' });
    }, text);
    return;
  }
  await browser.executeObsidian(({ app }, needle) => {
    const editor = app.workspace.activeEditor?.editor;
    const line = editor?.getValue().split('\n').findIndex((l) => l.includes(needle));
    if (line != null && line >= 0) {
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
    }
  }, text);
}

// screen.png and thumbnail.png stay at the repo root (not screenshots/) since
// they're referenced by URL from obsidian-releases' community-css-themes.json
// for Obsidian's in-app theme browser.
const ROOT_SHOTS = new Set(['screen.png', 'thumbnail.png']);

async function shot(name) {
  // Drop the caret so no line renders as raw markdown, then let layout settle.
  await browser.execute(() => document.activeElement?.blur());
  await browser.pause(500);
  const path = ROOT_SHOTS.has(name) ? name : `screenshots/${name}`;
  await browser.saveScreenshot(path);
}

/** Full unclipped height of the note's content, so the window can be sized to show it all. */
async function noteContentHeight() {
  return browser.execute(() => {
    const sizer = document.querySelector('.markdown-source-view .cm-sizer');
    const chrome = document.querySelector('.view-header');
    const sizerHeight = sizer?.getBoundingClientRect().height ?? 0;
    const chromeHeight = chrome?.getBoundingClientRect().height ?? 0;
    return Math.ceil(sizerHeight + chromeHeight);
  });
}

/**
 * Narrowest window width that still shows the note at its full
 * readable-line-length (not squeezed narrower, which forces extra wrapping),
 * so a full-UI screenshot doesn't carry a wide band of empty background on
 * the right either. Must be called while the window is already wider than
 * the note's max-width, so the measured right edge reflects that max-width
 * rather than a width the content has been compressed into.
 */
async function minimalWindowWidth() {
  return browser.execute(() => {
    const content = document.querySelector('.markdown-source-view .cm-content');
    if (!content) return window.innerWidth;
    const margin = 60;
    return Math.ceil(content.getBoundingClientRect().right + margin);
  });
}

async function openSettings() {
  await browser.executeObsidian(({ app }) => {
    app.setting.open();
    app.setting.openTabById('appearance');
  });

  // On desktop 1.13+ settings open in their own window, so find the handle
  // whose DOM has the settings pane.
  await browser.pause(500);
  for (const handle of await browser.getWindowHandles()) {
    await browser.switchToWindow(handle);
    if (await browser.$('.vertical-tab-content').isExisting()) return;
  }
  throw new Error('No window showing the settings pane');
}

describe('README screenshots', function () {
  it('captures the kitchen sink note and settings', async function () {
    const mobile = await browser.executeObsidian(({ app }) => app.isMobile);
    await forceDarkMode();

    if (mobile) {
      await openNote({ preview: true });
      await shot('mobile.png');
      await scrollTo('H5 Heading: Tables', { preview: true });
      await shot('mobile-2.png');
      await openSettings();
      await shot('mobile-settings.png');
      return;
    }

    await browser.executeObsidian(({ app }) => {
      window.electron.remote.getCurrentWindow().setSize(1600, 1100);
      app.vault.setConfig('baseFontSize', 18);
      app.updateFontSize?.();
      app.workspace.rightSplit?.collapse?.();
    });
    await openNote();

    // Main screenshot: the note itself, grown tall enough to show all of it.
    const contentHeight = await noteContentHeight();
    await browser.executeObsidian((_, height) => {
      window.electron.remote.getCurrentWindow().setSize(1600, height);
    }, contentHeight);
    await shot('screen.png');

    // Secondary screenshot: the whole app chrome, width-trimmed so the window
    // isn't carrying a wide band of empty background down the right side.
    const uiWidth = await minimalWindowWidth();
    await browser.executeObsidian((_, width) => {
      window.electron.remote.getCurrentWindow().setSize(width, 1100);
    }, uiWidth);
    await shot('ui.png');

    // thumbnail.png: the three-pane layout (file explorer, note, backlinks +
    // calendar) used as the marketing image. The original was hand-captured
    // from a real, richly-populated vault — this minimal test vault can't
    // reproduce the file tree or journal content, so this is a best-effort
    // approximation using what's actually here, with the Calendar community
    // plugin (installed via wdio.screenshots.mjs) stacked below Backlinks
    // to match the original's bottom-right calendar panel.
    await browser.executeObsidian(({ app }) => {
      app.workspace.rightSplit?.expand?.();
      const backlinks = app.workspace.getLeavesOfType('backlink')[0];
      if (backlinks) app.workspace.revealLeaf(backlinks);
    });
    await browser.pause(300);
    await browser.executeObsidian(async ({ app }) => {
      const backlinks = app.workspace.getLeavesOfType('backlink')[0];
      const calendar = app.workspace.createLeafBySplit(backlinks, 'horizontal', false);
      await calendar.setViewState({ type: 'calendar' });
    });
    await browser.pause(300);
    const rightSidebarWidth = await browser.execute(() => {
      const right = document.querySelector('.mod-right-split');
      return right ? Math.ceil(right.getBoundingClientRect().width) : 300;
    });
    await browser.executeObsidian((_, width) => {
      window.electron.remote.getCurrentWindow().setSize(width, 1100);
    }, uiWidth + rightSidebarWidth);
    await shot('thumbnail.png');
    await browser.executeObsidian(({ app }) => {
      app.workspace.rightSplit?.collapse?.();
    });

    await openSettings();
    await shot('settings.png');
  });
});
