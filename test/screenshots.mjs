/**
 * Regenerates the README screenshots from a real Obsidian render of
 * test/vault, so the README always shows what the current theme.css actually
 * produces. Runs once per capability: desktop writes screen.png (the full
 * Kitchen Sink note) and ui.png and settings.png, mobile emulation writes
 * mobile*.png.
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

async function openNote() {
  await browser.executeObsidian(async ({ app, obsidian }) => {
    const file = app.vault.getAbstractFileByPath('Kitchen Sink.md');
    if (!(file instanceof obsidian.TFile)) throw new Error('Kitchen Sink.md missing');
    await app.workspace.getLeaf(false).openFile(file);
  });
  await browser.$('.markdown-source-view .cm-line').waitForExist();
}

/**
 * Scroll the editor so the line containing `text` is at the top. Goes
 * through the editor API rather than searching rendered `.cm-line` elements,
 * since CodeMirror only renders lines near the current viewport — a target
 * further down the note wouldn't exist in the DOM yet to search for.
 */
async function scrollTo(text) {
  await browser.executeObsidian(({ app }, needle) => {
    const editor = app.workspace.activeEditor?.editor;
    const line = editor?.getValue().split('\n').findIndex((l) => l.includes(needle));
    if (line != null && line >= 0) {
      editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
    }
  }, text);
}

async function shot(name) {
  // Drop the caret so no line renders as raw markdown, then let layout settle.
  await browser.execute(() => document.activeElement?.blur());
  await browser.pause(500);
  await browser.saveScreenshot(name);
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
      await openNote();
      await shot('mobile.png');
      await scrollTo('H5 Heading: Tables');
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

    await openSettings();
    await shot('settings.png');
  });
});
