import { expect, test, type Page } from "@playwright/test";

const ONBOARDED = { cookies: [], origins: [{ origin: "http://localhost:4173", localStorage: [{ name: "cft-onboarded", value: "1" }] }] };

async function noPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return () => expect(errors, "page errors").toEqual([]);
}

test.describe("first launch", () => {
  test("redirects to onboarding and walks every step to the training screen", async ({ page }) => {
    const check = await noPageErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding\/?$/);
    await page.getByRole("button", { name: "Get started" }).tap();
    await expect(page.getByRole("heading", { name: "Camera" })).toBeVisible();
    await page.getByRole("button", { name: "Allow camera access" }).tap();
    await expect(page.getByText("Camera access is on")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).tap();
    await expect(page.getByRole("heading", { name: /Where are you now/ })).toBeVisible();
    await page.getByRole("button", { name: /Advanced holds/ }).tap();
    await page.getByRole("button", { name: "Start with Tuck Planche" }).tap();
    await expect(page).toHaveURL(/\/train\/tuck-planche\/?$/);
    await expect(page.getByRole("button", { name: "Start" })).toBeEnabled({ timeout: 60_000 });
    check();
  });
});

test.describe("app shell", () => {
  test.use({ storageState: ONBOARDED });

  test("home renders and the tab bar navigates", async ({ page }) => {
    const check = await noPageErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Train" })).toBeVisible();
    await expect(page.getByText("Suggested")).toBeVisible();
    await page.getByRole("link", { name: "Paths" }).tap();
    await expect(page).toHaveURL(/\/skills\/?$/);
    await expect(page.getByRole("heading", { name: "Paths" })).toBeVisible();
    await page.getByRole("link", { name: "Progress" }).tap();
    await expect(page.getByText("No holds yet")).toBeVisible();
    await page.getByRole("link", { name: "Settings" }).tap();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    check();
  });

  test("settings toggles persist across reloads", async ({ page }) => {
    await page.goto("/settings/");
    const voice = page.getByRole("switch", { name: "Voice coach" });
    await expect(voice).toHaveAttribute("aria-checked", "false");
    await voice.tap();
    await expect(voice).toHaveAttribute("aria-checked", "true");
    await page.getByText("Default mode").tap();
    await expect(page.getByText("Perfect form — stricter criteria")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Voice coach" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Perfect form — stricter criteria")).toBeVisible();
  });

  test("training stage: model loads, Start arms the HUD, mode and back work", async ({ page }) => {
    const check = await noPageErrors(page);
    await page.goto("/train/plank-hold/");
    const start = page.getByRole("button", { name: "Start" });
    await expect(start).toBeVisible();
    await expect(start).toBeEnabled({ timeout: 60_000 });
    await expect(page.getByText(/^Best /)).toBeHidden(); // no history yet
    await start.tap();
    await expect(start).toBeHidden();
    await expect(page.getByRole("meter", { name: "Form score" })).toBeVisible();
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    // Arming must stick across re-renders (regression: reset loop).
    await page.waitForTimeout(1500);
    await expect(page.getByRole("meter", { name: "Form score" })).toBeVisible();
    await page.getByRole("button", { name: "Perfect" }).tap();
    await expect(page.getByRole("button", { name: "Perfect" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Session details" }).tap();
    await expect(page.getByRole("dialog", { name: "Session" })).toBeVisible();
    await page.getByRole("button", { name: "Done" }).tap();
    await expect(page.getByRole("dialog", { name: "Session" })).toBeHidden();
    await page.getByRole("link", { name: "Back to Paths" }).tap();
    await expect(page).toHaveURL(/\/skills\/?$/);
    check();
  });

  test("auto-detect stage arms and scans", async ({ page }) => {
    const check = await noPageErrors(page);
    await page.goto("/train/");
    const start = page.getByRole("button", { name: "Start" });
    await expect(start).toBeEnabled({ timeout: 60_000 });
    await start.tap();
    await expect(page.getByText("Scanning…")).toBeVisible();
    check();
  });
});

test.describe("history", () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: "http://localhost:4173", localStorage: [
        { name: "cft-onboarded", value: "1" },
        { name: "cft-history", value: JSON.stringify([{ id: "a", skillId: "plank-hold", mode: "hold_only", durationMs: 42300, formScore: 88, endedAt: new Date().toISOString() }]) },
      ] }],
    },
  });

  test("progress and home reflect stored holds", async ({ page }) => {
    await page.goto("/progress/");
    await expect(page.getByText("42.30s").first()).toBeVisible();
    await expect(page.getByText("Personal bests")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("Continue")).toBeVisible();
    await expect(page.getByText("Best 42.3s")).toBeVisible();
    await page.goto("/train/plank-hold/");
    await expect(page.getByText("Best 42.30s")).toBeVisible();
  });
});
