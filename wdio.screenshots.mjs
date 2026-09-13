/**
 * Config for regenerating the README screenshots (`npm run screenshots`).
 *
 * Runs the theme in a real Obsidian against test/vault, once on desktop and
 * once with mobile emulation. It is a documentation task, not a test, so
 * nothing is asserted.
 */
import { parseObsidianVersions } from 'wdio-obsidian-service';

const cacheDir = '.obsidian-cache';

const versions = await parseObsidianVersions(
  process.env.OBSIDIAN_VERSIONS ?? 'latest/latest',
  { cacheDir }
);

const obsidianOptions = (appVersion, installerVersion) => ({
  appVersion,
  installerVersion,
  themes: ['.'],
  vault: './test/vault',
});

export const config = {
  runner: 'local',
  framework: 'mocha',
  specs: ['./test/screenshots.mjs'],
  maxInstances: 1,
  capabilities: versions.flatMap(([appVersion, installerVersion]) => [
    {
      browserName: 'obsidian',
      'wdio:obsidianOptions': obsidianOptions(appVersion, installerVersion),
    },
    {
      browserName: 'obsidian',
      'wdio:obsidianOptions': {
        ...obsidianOptions(appVersion, installerVersion),
        emulateMobile: true,
      },
      'goog:chromeOptions': {
        // iPhone 16 Pro: 402x874 logical points at 3x device pixel ratio.
        mobileEmulation: {
          deviceMetrics: { width: 402, height: 874, pixelRatio: 3 },
        },
      },
    },
  ]),
  services: ['obsidian'],
  reporters: ['obsidian'],
  mochaOpts: { ui: 'bdd', timeout: 60 * 1000 },
  waitforTimeout: 5 * 1000,
  logLevel: 'warn',
  cacheDir,
};
