import path from "node:path";

import { expect, test } from "@playwright/test";

import { dynamicMediaMask, login, waitForVisibleMedia } from "./utils";

test.describe("投稿機能", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, "gg3i6j6");
  });

  test("テキストの投稿ができる", async ({ page }) => {
    const postText = "テスト投稿";

    // 投稿モーダルを開く
    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();

    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 30_000 });
    await textarea.fill(postText);

    // VRT: 投稿モーダル（テキスト入力後）
    await waitForVisibleMedia(page);
    await expect(page).toHaveScreenshot("posting-テキスト入力後.png", {
      mask: dynamicMediaMask(page),
    });

    // モーダル内の投稿ボタンをクリック
    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();

    // 投稿詳細に遷移する
    await page.waitForURL("**/posts/*", { timeout: 30_000 });
    await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });

    // 投稿内容が表示されていることを確認
    await expect(page.getByText(postText)).toBeVisible();
  });

  test("画像の投稿ができる", async ({ page }) => {
    const postText = "画像テスト";

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();

    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 30_000 });
    await textarea.fill(postText);

    // 画像ファイルを添付
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    const imagePath = path.resolve(
      import.meta.dirname,
      "../../public/images/737f764e-f495-4104-b6d6-8434681718d5.jpg",
    );
    await fileInput.setInputFiles(imagePath);

    // モーダル内の投稿ボタンをクリック
    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();

    // 投稿詳細に遷移する
    await page.waitForURL("**/posts/*", { timeout: 60_000 });

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 30_000 });
    await expect(article.locator("img").first()).toBeVisible({ timeout: 30_000 });

    // 投稿内容と画像が表示されていることを確認
    await expect(page.getByText(postText)).toBeVisible();
  });

  test("TIFF画像の投稿でEXIF Image DescriptionがALTとして表示される", async ({ page }) => {
    const postText = "TIFFテスト";
    const expectedAlt = "熊の形をしたアスキーアート。アナログマというキャプションがついている";

    await page.getByRole("list").getByRole("button", { name: "投稿する" }).click();

    const textarea = page.getByPlaceholder("いまなにしてる？");
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(postText);

    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    const imagePath = path.resolve(import.meta.dirname, "../../../docs/assets/analoguma.tiff");
    await fileInput.setInputFiles(imagePath);

    await page.locator("dialog").getByRole("button", { name: "投稿する" }).click();

    await page.waitForURL("**/posts/*", { timeout: 60_000 });
    const postId = page.url().split("/posts/")[1];
    expect(postId).toBeTruthy();

    const postedRes = await page.request.get(`/api/v1/posts/${postId}`);
    expect(postedRes.ok()).toBeTruthy();
    const posted = (await postedRes.json()) as {
      images?: Array<{ alt?: string }>;
    };
    expect(posted.images?.[0]?.alt).toBe(expectedAlt);

    const article = page.locator("article").first();
    await expect(article).toBeVisible({ timeout: 10_000 });
    await expect(article.locator("img").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(postText)).toBeVisible();

    await page.getByRole("button", { name: "ALT を表示する" }).first().click();
    await expect(page.getByRole("heading", { name: "画像の説明" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(expectedAlt)).toBeVisible({ timeout: 30_000 });
  });
});
