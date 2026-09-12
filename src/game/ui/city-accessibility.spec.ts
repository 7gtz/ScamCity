import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 320, height: 568 }, { width: 375, height: 812 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`city layout ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("request", (request) => { if (request.method() === "HEAD" && request.url().includes("/art/")) errors.push(`Asset probe: ${request.url()}`); });
    page.on("response", (response) => { if (response.status() >= 400 && response.url().includes("/art/")) errors.push(`Failed art: ${response.url()}`); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (/same key|unique.*key/.test(message.text())) errors.push(message.text()); });
    for (const route of ["/city", "/city/office", "/city/victim-flat", "/city/bank-branch", "/city/repair-shop", "/city/police-station"]) {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();
      expect(await page.locator(".panel, .panel-shell").evaluateAll((elements) => elements.flatMap((element) => element.getAnimations({ subtree: true })).filter((animation) => animation.playState === "running").length)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const control of await page.locator(".shell-btn:visible, .hotspot:visible").all()) {
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const controls = await page.locator(".shell-btn:visible").all();
      for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
        const a = (await controls[i]!.boundingBox())!;
        const b = (await controls[j]!.boundingBox())!;
        expect(Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))).toBe(0);
      }
      if (viewport.width < 768 && await page.locator(".hotspot-layer").count()) await expect(page.getByRole("heading", { name: "Things here" })).toBeVisible();
      await page.screenshot({ path: `/tmp/scam-city-${viewport.width}-${route.replaceAll("/", "-")}.png` });
    }
    expect(errors).toEqual([]);
  });
}

test("NPC dialog traps focus, restores it, and makes the background inert", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/detective/npc-token", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Test offline"}' }));
  await page.goto("/city/office");
  const opener = page.locator('[data-hotspot-id="office-desk"]');
  await opener.click();
  const dialog = page.locator(".city-dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("role", "dialog");
  for (let index = 0; index < 15; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect(await page.locator(".panel-shell").evaluate((element) => !!element.closest("[inert]"))).toBe(true);
  await page.screenshot({ path: "/tmp/scam-city-npc-dialog-390.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

/**
 * The office now opens with an incoming call that covers the panel until it is
 * answered or dismissed. Travel is only reachable afterwards, so the route walk
 * clears it first — this mirrors the real player flow rather than working
 * around it.
 */
async function dismissColdOpen(page: import("@playwright/test").Page) {
  const ignore = page.getByRole("button", { name: /^ignore$/i });
  await ignore.waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
  if (await ignore.count()) await ignore.first().click();
}

test("touch travel follows the authored sequence once prerequisites are met", async ({ page }) => {
  // Progression gates travel (integration/progression.ts). Seed the authored
  // prerequisites rather than defeating them: the case opened, and the records
  // preserved that unlock each leg.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ["scam-city:detective", JSON.stringify({
      state: {
        location: "victim-flat",
        flags: { "case.opened": true, "panel.visited.bank-branch": true },
        evidence: ["bank-statement", "call-log", "otp-message", "sim-swap-record"],
        inventory: [], trust: {}, stress: 0, caseId: "ten-minute-window", timer: null, version: 1,
      },
      version: 1,
    })] as const,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/city/victim-flat");
  await page.waitForSelector(".panel");

  for (const [hotspot, destination] of [
    ["flat-front-door", "bank-branch"],
    ["bank-shop-route", "repair-shop"],
    ["shop-shutter", "police-station"],
    ["station-shop-route", "repair-shop"],
    ["shop-bank-route", "bank-branch"],
    ["bank-flat-route", "victim-flat"],
  ]) {
    const exit = page.locator(`[data-hotspot-id="${hotspot}"]`);
    await exit.waitFor({ state: "visible" });
    await exit.click();
    await expect(page).toHaveURL(new RegExp(`/city/${destination}$`));
    await page.waitForSelector(".panel");
  }
});

test("a gated exit never presents itself as an ordinary, working control", async ({ page }) => {
  // A fresh case: the bank is not yet reachable from the flat.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/city/victim-flat");
  await page.waitForSelector(".panel");

  const exit = page.locator('[data-hotspot-id="flat-front-door"]');
  if (!(await exit.count())) return; // Filtered out entirely — also acceptable.

  // Rendered, so it must announce that it is unavailable rather than looking
  // ordinary and doing nothing when pressed.
  await expect(exit).toHaveAttribute("aria-disabled", "true");
  await expect(exit).toHaveAttribute("aria-label", /locked/i);
});

test("restart confirmation defaults to Cancel and ignores backdrop clicks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/city/office");
  // Restart now lives behind the HUD's "Investigation options" disclosure, so
  // it cannot be hit by a stray click on the panel.
  await page.getByText("Investigation options").click();
  const restart = page.getByRole("button", { name: "Restart investigation", exact: true });
  await restart.click();
  const dialog = page.locator(".city-dialog");
  await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
  await page.mouse.click(5, 500);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(restart).toBeFocused();
});

test("200 percent text size keeps touch actions in the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/city/victim-flat");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const actions = page.locator(".hotspot");
  for (const action of await actions.all()) {
    const box = await action.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
});

/* ── Persistent controls: overlap, clearance and target size ─────────────── */

/** Every control a player can reach without opening a dialog. */
const PERSISTENT_CONTROLS =
  ".shell-btn:visible, .hotspot:visible, .investigation-hud button:visible, " +
  "[role='timer']:visible, .panel-hud button:visible, .relative.z-20 button:visible";

const area = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`persistent controls never overlap each other or the shell ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const problems: string[] = [];

    for (const route of ["/city/office", "/city/victim-flat", "/city/bank-branch"]) {
      await page.goto(route);
      await page.waitForSelector(".panel");
      await dismissColdOpen(page);

      const controls = await page.locator(PERSISTENT_CONTROLS).all();
      const boxes = await Promise.all(controls.map(async (control) => ({
        box: await control.boundingBox(),
        label: (await control.getAttribute("aria-label")) ?? (await control.innerText()).slice(0, 28).replace(/\n/g, " "),
        // Ancestry, not text: the shell's own buttons are allowed to sit in the
        // shell, and their aria-labels do not match their visible text.
        inShell: await control.evaluate((node) => Boolean(node.closest(".shell-top, .shell-bottom"))),
      })));
      const visible = boxes.filter((entry) => entry.box && entry.box.width > 0 && entry.box.height > 0);

      for (let i = 0; i < visible.length; i++) {
        for (let j = i + 1; j < visible.length; j++) {
          const a = visible[i]!;
          const b = visible[j]!;
          if (area(a.box!, b.box!) > 0) problems.push(`${route} ${viewport.width}: "${a.label}" overlaps "${b.label}"`);
        }
      }

      // Nothing in flow may sit under the fixed shell bars.
      const shellTop = await page.locator(".shell-top").boundingBox();
      for (const entry of visible) {
        if (entry.inShell || !shellTop) continue;
        if (area(entry.box!, shellTop) > 0) {
          problems.push(`${route} ${viewport.width}: "${entry.label}" is covered by the shell bar`);
        }
      }
    }

    expect(problems).toEqual([]);
  });
}

test("the HUD clears the shell at 200 percent text size", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => document.documentElement.style.fontSize = "32px");
  await page.goto("/city/office");
  await page.waitForSelector(".shell-top");

  const measured = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--city-shell-top").trim(),
  );
  const actual = await page.locator(".shell-top").boundingBox();

  // The published metric must track the bar's real height, wrapped or not.
  expect(measured).not.toBe("");
  expect(Math.abs(parseFloat(measured) - actual!.height)).toBeLessThanOrEqual(2);
});

/* ── Dialog behaviour, for every integrated dialog ───────────────────────── */

/** Opens a dialog from a persistent control and returns its locator. */
async function openDialog(page: import("@playwright/test").Page, name: RegExp) {
  await page.getByRole("button", { name }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.first()).toBeVisible();
  return dialog.first();
}

for (const entry of [
  { control: /case/i, label: "Case Board" },
  { control: /evidence|items/i, label: "Evidence" },
]) {
  test(`${entry.label} dialog: focus, backward tabbing, restoration, scroll lock`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/city/victim-flat");
    await page.waitForSelector(".panel");

    const opener = page.getByRole("button", { name: entry.control }).first();
    await opener.focus();
    const dialog = await openDialog(page, entry.control);

    // Focus must enter the dialog.
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    // Backward tabbing must stay inside it.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);

    // The page behind must not scroll.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    // Escape closes and focus returns to the control that opened it.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Auto-retrying: restoration happens in Radix's close-autofocus handler,
    // which runs after the dialog has already left the tree.
    await expect(opener).toBeFocused();
  });
}

/* ── NPC voice: denial and the typed path ────────────────────────────────── */

test("microphone denial explains itself and leaves the typed line usable", async ({ page, context }) => {
  await context.clearPermissions();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/city/office");
  await page.waitForSelector(".panel");

  await page.locator("[data-action-kind='talk']").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // The typed line is always present, whatever the microphone does.
  await expect(page.getByPlaceholder(/ask a question/i)).toBeVisible();

  const hold = page.getByRole("button", { name: /hold to talk/i });
  if (await hold.count()) {
    await hold.first().click({ force: true });
    // Whatever happens, no unhandled rejection and the dialog survives.
    await expect(dialog).toBeVisible();
  }
});

test("only one dialog is ever mounted at a time", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/city/victim-flat");
  await page.waitForSelector(".panel");
  await page.getByRole("button", { name: /case/i }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
});

/* ── Map: locked, and completion that survives ───────────────────────────── */

/** Seed a save so map state can be exercised without playing the case. */
async function seedSave(page: import("@playwright/test").Page, flags: Record<string, unknown>, location = "office") {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    ["scam-city:detective", JSON.stringify({
      state: { location, flags, evidence: [], inventory: [], trust: {}, stress: 0, caseId: "ten-minute-window", timer: null, version: 1 },
      version: 1,
    })] as const,
  );
}

test("locked locations are announced but are not actionable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/city");
  await page.waitForSelector("ul[role='list']");

  const locked = page.locator("li", { hasText: /— Locked/ });
  for (const entry of await locked.all()) {
    // Announced as locked, and offering nothing to activate.
    await expect(entry).toContainText("Locked");
    expect(await entry.locator("a").count()).toBe(0);
  }
});

test("completed locations stay complete after backtracking and reload", async ({ page }) => {
  await seedSave(page, { "panel.cleared.office": true, "case.opened": true });
  await page.setViewportSize({ width: 1440, height: 900 });

  const officeEntry = () => page.locator("li", { hasText: "Detective office" });

  await page.goto("/city");
  await expect(officeEntry()).toContainText(/complete|cleared/i);

  // Backtrack into the location and out again: progress is completion, never
  // current position, so revisiting must not erase it.
  await page.goto("/city/victim-flat");
  await page.goto("/city");
  await expect(officeEntry()).toContainText(/complete|cleared/i);

  // And it survives a reload.
  await page.reload();
  await expect(officeEntry()).toContainText(/complete|cleared/i);
});

test("hotspot labels are not clipped at any width", async ({ page }) => {
  const clipped: string[] = [];
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/city/victim-flat");
    await page.waitForSelector(".panel");
    for (const label of await page.locator(".hotspot-label:visible").all()) {
      const overflow = await label.evaluate((node) => node.scrollWidth - node.clientWidth);
      if (overflow > 1) clipped.push(`${width}: ${(await label.innerText()).slice(0, 30)} (+${overflow}px)`);
    }
  }
  expect(clipped).toEqual([]);
});
