import { expect, test } from '@playwright/test';

test.setTimeout(45_000);

async function completeRun(page) {
  await page.getByRole('button', { name: /开始冒险/ }).click();
  await expect(page.locator('#gameover-modal')).toBeVisible({ timeout: 35_000 });
}

async function installLocalPosterStubs(page) {
  await page.addInitScript(() => {
    const clipboardWrites = [];

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          clipboardWrites.push(value);
        }
      }
    });
    window.__posterClipboardWrites = clipboardWrites;
  });
}

test.beforeEach(async ({ page }) => {
  await installLocalPosterStubs(page);
});

test('renders the result card and prepares its local PNG download', async ({ page }) => {
  await page.goto('/');
  await completeRun(page);

  await expect(page.locator('#btn-copy-share')).toHaveCount(0);
  await expect(page.locator('#poster-modal')).toHaveCount(0);
  await expect(page.locator('#result-poster-card')).toBeVisible();
  await expect(page.locator('#result-poster-card')).toHaveCSS(
    'background-image',
    /morning-mist-pond\.jpg/
  );
  await expect(page.locator('.result-metric')).toHaveCount(3);
  await expect(page.getByRole('button', { name: '下载战绩卡' })).toBeEnabled();
  await page.getByRole('button', { name: '复制挑战地址' }).click();
  await expect(page.locator('#result-poster-status')).toContainText('地址已复制');
  await expect.poll(() => page.evaluate(() => window.__posterClipboardWrites)).toEqual([
    'http://127.0.0.1:4173/?challenge=0'
  ]);
});

test('replaying from the result card clears the prepared download state', async ({ page }) => {
  await page.goto('/');
  await completeRun(page);

  await page.getByRole('button', { name: '再来一局' }).click();
  await expect(page.locator('#gameover-modal')).toHaveClass(/hidden/);
  await expect(page.getByRole('button', { name: '战绩卡准备中…' })).toBeDisabled();
  await expect(page.locator('#start-modal')).toHaveClass(/hidden/);
});

test('a valid challenge prompt is dismissible and invalid forms stay silent', async ({ page }) => {
  await page.goto('/?challenge=320');
  await expect(page.locator('#challenge-prompt')).toBeVisible();
  await expect(page.locator('#challenge-prompt')).toContainText('320 分');
  await page.getByRole('button', { name: '知道了' }).click();
  await expect(page.locator('#challenge-prompt')).toBeHidden();
  await page.getByRole('button', { name: /开始冒险/ }).click();
  await expect(page.locator('#start-modal')).toHaveClass(/hidden/);

  for (const query of [
    '?challenge=-1',
    '?challenge=1.0',
    '?challenge=1000000',
    '?challenge=320&challenge=321'
  ]) {
    await page.goto(`/${query}`);
    await expect(page.locator('#challenge-prompt')).toBeHidden();
  }
});
