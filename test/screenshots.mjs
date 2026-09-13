/**
 * Regenerates the README screenshots from a real Obsidian render of
 * test/vault, so the README always shows what the current theme.css actually
 * produces. Runs once per capability: desktop writes screen.png and
 * settings.png, mobile emulation writes mobile*.png.
 */
import { browser } from '@wdio/globals';

async function openNote() {
  await browser.executeObsidian(async ({ app, obsidian }) => {
    const file = app.vault.getAbstractFileByPath('Kitchen Sink.md');
    if (!(file instanceof obsidian.TFile)) throw new Error('Kitchen Sink.md missing');
    await app.workspace.getLeaf(false).openFile(file);
  });
  await browser.$('.markdown-source-view .cm-line').waitForExist();
}

/** Scroll the editor so the line containing `text` is at the top. */
async function scrollTo(text) {
  await browser.execute((needle) => {
    const line = [...document.querySelectorAll('.markdown-source-view .cm-line')].find(
      (el) => el.textContent.includes(needle)
    );
    line?.scrollIntoView({ block: 'start' });
  }, text);
}

async function shot(name) {
  // Drop the caret so no line renders as raw markdown, then let layout settle.
  await browser.execute(() => document.activeElement?.blur());
  await browser.pause(500);
  await browser.saveScreenshot(name);
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
    await shot('screen.png');
    await openSettings();
    await shot('settings.png');
  });
});
