// Read-only browser regression against an already-running local preview.
// All browser /api requests are mocked; no account or server data is changed.
// Run: node scripts/check-choice-experience.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");

const origin = new URL(process.env.TEST_ORIGIN || "http://localhost:3000").origin;
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname), "Use an existing local preview only.");
const output = path.join(__dirname, "../test-results/choice-experience");
const report = { origin, viewports: [], apiRequests: [], screenshots: [] };
const optionCounts = [2, 3, 4, 5, 6, 7, 8, 9, 4];
const roundCount = optionCounts.length;
fs.mkdirSync(output, { recursive: true });

async function isolatedContext(browser, options) {
  const context = await browser.newContext({ serviceWorkers: "block", ...options });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      report.apiRequests.push({ method: request.method(), path: url.pathname });
      const json = /\/(?:auth|account)\//.test(url.pathname)
        ? { authenticated: false, isAdmin: false, userName: null, csrfToken: "choice-fixture-only" }
        : url.pathname === "/api/mottos" ? { mottos: ["按自己的节奏，做一个选择。"] }
          : { data: null };
      return route.fulfill({ status: 200, json });
    }
    if (url.origin !== origin || !["GET", "HEAD"].includes(request.method())) return route.abort();
    return route.continue();
  });
  return context;
}

async function ready(page, step) {
  await expect(page.getByTestId("choice-experience")).toHaveAttribute("data-step", String(step), { timeout: 15000 });
  if (step < roundCount) {
    await expect(page.getByTestId("choice-option")).toHaveCount(optionCounts[step]);
    await expect(page.getByTestId("choice-option").first()).toBeEnabled();
  } else {
    await expect(page.getByTestId("choice-result")).toBeVisible();
  }
}

async function optionPoint(page, index) {
  // Polygon-shaped buttons do not necessarily contain their rectangular center.
  // Find a real hit target instead of bypassing pointer events with a forced click.
  const point = await page.getByTestId("choice-option").nth(index).evaluate(button => {
    const hits = (x, y) => x > 0 && y > 0 && x < innerWidth && y < innerHeight
      && document.elementFromPoint(x, y)?.closest('[data-testid="choice-option"]') === button;
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects()) {
        const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        if (hits(x, y)) return { x, y };
      }
    }
    for (let y = 10; y < innerHeight; y += 12) {
      for (let x = 10; x < innerWidth; x += 12) {
        if (hits(x, y)) return { x, y };
      }
    }
    return null;
  });
  assert.ok(point, `Option ${index + 1} must have a visible clickable region`);
  return point;
}

async function choose(page, index, doubleClick = false) {
  const { x, y } = await optionPoint(page, index);
  if (doubleClick) await page.mouse.dblclick(x, y, { delay: 90 });
  else await page.mouse.click(x, y);
}

async function inspectLayout(page, step) {
  const layout = await page.evaluate(() => {
    const root = document.querySelector('[data-testid="choice-experience"]');
    const box = root.getBoundingClientRect();
    const options = [...document.querySelectorAll('[data-testid="choice-option"]')];
    let samples = 0, covered = 0;
    if (options.length) {
      for (let row = 0; row < 20; row++) {
        for (let column = 0; column < 32; column++) {
          const x = (column + 0.47) * innerWidth / 32;
          const y = (row + 0.43) * innerHeight / 20;
          samples++;
          if (document.elementsFromPoint(x, y).some(element => element.closest('[data-testid="choice-option"]'))) covered++;
        }
      }
    }
    return {
      viewport: [innerWidth, innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      offset: [scrollX, scrollY],
      root: { x: box.x, y: box.y, width: box.width, height: box.height },
      coverage: samples ? covered / samples : null,
      optionLabels: options.map(option => option.getAttribute("aria-label") || option.textContent.trim()),
      optionTags: options.map(option => option.tagName),
    };
  });
  const [width, height] = layout.viewport;
  assert.ok(layout.scroll[0] <= width + 1, `Round ${step + 1}: horizontal overflow ${layout.scroll[0]} > ${width}`);
  assert.ok(layout.scroll[1] <= height + 1, `Round ${step + 1}: vertical overflow ${layout.scroll[1]} > ${height}`);
  assert.deepEqual(layout.offset, [0, 0], "Page must stay at the viewport origin");
  assert.ok(Math.abs(layout.root.x) <= 1 && Math.abs(layout.root.y) <= 1, "Experience starts at the viewport origin");
  assert.ok(Math.abs(layout.root.width - width) <= 1 && Math.abs(layout.root.height - height) <= 1, "Experience fills the viewport");
  if (step < roundCount) {
    assert.equal(layout.optionLabels.length, optionCounts[step]);
    assert.ok(layout.optionLabels.every(Boolean), "Every option has a readable label");
    assert.ok(layout.optionTags.every(tag => tag === "BUTTON"), "Options use native keyboard-accessible buttons");
    assert.ok(layout.coverage >= 0.97, `Round ${step + 1}: option regions cover only ${(layout.coverage * 100).toFixed(1)}% of the viewport`);
    for (let index = 0; index < optionCounts[step]; index++) await optionPoint(page, index);
  }
  return { step, ...layout };
}

async function screenshot(page, name) {
  const destination = path.join(output, `${name}.png`);
  await page.screenshot({ path: destination, animations: "disabled" });
  report.screenshots.push(destination);
}

async function inspectResultControls(page, viewport) {
  const result = page.getByTestId("choice-result");
  await expect(result).not.toHaveText("");
  await expect(page.getByTestId("choice-option")).toHaveCount(0);
  await expect(result.getByRole("button", { name: /^回到第 \d 题$/ })).toHaveCount(roundCount);
  const controls = await result.getByRole("button").evaluateAll(buttons => buttons.map(button => {
    const box = button.getBoundingClientRect();
    return { label: button.textContent.trim(), left: box.left, top: box.top, right: box.right, bottom: box.bottom };
  }));
  for (const [index, control] of controls.entries()) {
    assert.ok(control.left >= 0 && control.top >= 0 && control.right <= viewport.width && control.bottom <= viewport.height, `${control.label} stays fully in view`);
    for (const other of controls.slice(index + 1)) {
      const overlapWidth = Math.min(control.right, other.right) - Math.max(control.left, other.left);
      const overlapHeight = Math.min(control.bottom, other.bottom) - Math.max(control.top, other.top);
      assert.ok(overlapWidth <= 0 || overlapHeight <= 0, `${control.label} and ${other.label} must not overlap`);
    }
  }
}

async function inspectCustomAnswer(page, viewport) {
  // The first eight answers stay intact while the final answer is edited.
  await page.getByRole("button", { name: "返回上一步", exact: true }).click();
  await ready(page, roundCount - 1);
  await choose(page, optionCounts.at(-1) - 1);
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("textbox");
  const submit = dialog.getByRole("button", { name: "用这句话", exact: true });
  const cancel = dialog.getByRole("button", { name: "取消", exact: true });
  await expect(dialog).toBeVisible();
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("maxlength", "40");
  await expect(submit).toBeDisabled();
  await input.fill("   \n  ");
  await expect(submit).toBeDisabled();
  await cancel.click();
  await expect(dialog).not.toBeVisible();
  await ready(page, roundCount - 1);

  await choose(page, optionCounts.at(-1) - 1);
  await expect(dialog).toBeVisible();
  await input.fill("留给自己的一句话");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await ready(page, roundCount - 1);
  await expect(page.getByTestId("choice-option").last()).toBeFocused();

  await choose(page, optionCounts.at(-1) - 1);
  await expect(dialog).toBeVisible();
  const customAnswer = "让想法在这里慢慢栖息和生长，带着好奇继续前进。".repeat(3).slice(0, 40);
  await input.fill("");
  await input.pressSequentially(customAnswer + "多余的文字");
  await expect(input).toHaveValue(customAnswer);
  await expect(submit).toBeEnabled();
  const dialogLayout = await dialog.evaluate(element => {
    const box = element.getBoundingClientRect();
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
  });
  assert.ok(dialogLayout.left >= 0 && dialogLayout.top >= 0 && dialogLayout.right <= viewport.width && dialogLayout.bottom <= viewport.height, "Custom-answer dialog stays in view");
  assert.ok(dialogLayout.scrollWidth <= dialogLayout.clientWidth + 1, "Custom-answer dialog has no horizontal overflow");
  await screenshot(page, `${viewport.width}x${viewport.height}-custom-dialog`);
  await submit.click();
  await ready(page, roundCount);
  await expect(page.getByTestId("choice-result-quote")).toContainText(customAnswer);
  await inspectLayout(page, roundCount);
  await inspectResultControls(page, viewport);
  const quoteBox = await page.getByTestId("choice-result-quote").boundingBox();
  assert.ok(quoteBox.x >= 0 && quoteBox.y >= 0 && quoteBox.x + quoteBox.width <= viewport.width && quoteBox.y + quoteBox.height <= viewport.height, "Forty-character result quote stays in view");
  await screenshot(page, `${viewport.width}x${viewport.height}-custom-result`);

  await page.getByTestId("choice-result").getByRole("button", { name: `回到第 ${roundCount} 题`, exact: true }).click();
  await ready(page, roundCount - 1);
  await choose(page, optionCounts.at(-1) - 1);
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue(customAnswer);
  await cancel.click();
  await choose(page, 2);
  await ready(page, roundCount);
  await expect(page.getByTestId("choice-result")).not.toContainText(customAnswer);

  await page.getByRole("button", { name: "重来一次", exact: true }).click();
  await ready(page, 0);
  for (let step = 0; step < roundCount - 1; step++) {
    await choose(page, 0);
    await ready(page, step + 1);
  }
  await choose(page, optionCounts.at(-1) - 1);
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue("");
  await cancel.click();
  await choose(page, 0);
  await ready(page, roundCount);
}

async function inspectViewport(browser, viewport) {
  const context = await isolatedContext(browser, { viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const result = { ...viewport, rounds: [] };
  report.viewports.push(result);
  try {
    await page.goto(`${origin}/choose`, { waitUntil: "networkidle" });
    await ready(page, 0);
    result.rounds.push(await inspectLayout(page, 0));
    await screenshot(page, `${viewport.width}x${viewport.height}-round-1`);

    await choose(page, 0, true);
    await ready(page, 1);
    await page.waitForTimeout(650);
    await expect(page.getByTestId("choice-experience")).toHaveAttribute("data-step", "1");
    await page.getByRole("button", { name: "返回上一步", exact: true }).click();
    await ready(page, 0);
    await choose(page, 1);
    await ready(page, 1);
    await page.getByRole("button", { name: "回到第 1 题", exact: true }).click();
    await ready(page, 0);
    await choose(page, 0);
    await ready(page, 1);

    for (let step = 1; step < roundCount; step++) {
      result.rounds.push(await inspectLayout(page, step));
      if ([3, 7, 8].includes(step)) await screenshot(page, `${viewport.width}x${viewport.height}-round-${step + 1}`);
      await choose(page, step === roundCount - 1 ? 0 : optionCounts[step] - 1);
      await ready(page, step + 1);
    }
    result.rounds.push(await inspectLayout(page, roundCount));
    await inspectResultControls(page, viewport);
    const originalResult = await page.getByTestId("choice-result").innerText();
    await screenshot(page, `${viewport.width}x${viewport.height}-result`);
    await page.getByRole("button", { name: "返回上一步", exact: true }).click();
    await ready(page, roundCount - 1);
    await choose(page, 0);
    await ready(page, roundCount);
    assert.equal(await page.getByTestId("choice-result").innerText(), originalResult, "Repeating a route produces the same result");
    await page.getByRole("button", { name: "返回上一步", exact: true }).click();
    await ready(page, roundCount - 1);
    await choose(page, 1);
    await ready(page, roundCount);
    assert.notEqual(await page.getByTestId("choice-result").innerText(), originalResult, "Changing an answer updates the result");
    await inspectCustomAnswer(page, viewport);
    await page.getByRole("button", { name: "重来一次", exact: true }).click();
    await ready(page, 0);
    await inspectLayout(page, 0);
    const home = page.getByRole("link", { name: "返回首页", exact: true });
    const homeBox = await home.boundingBox();
    // Next's development indicator may cover the left half of the mobile link.
    // Its right edge is still a real, unoccluded pointer target.
    await home.click({ position: { x: homeBox.width - 7, y: homeBox.height / 2 } });
    await expect(page).toHaveURL(`${origin}/`);
    assert.deepEqual(errors, [], "No browser runtime errors");
    result.passed = true;
    console.log(`PASS ${viewport.width}x${viewport.height}: nine rounds, 2–9 options plus fixed/custom finale, blank/length constraints, cancel/Escape, retained/reset draft, no scroll, all regions clickable, back/edit/result/reset/home`);
  } catch (error) {
    await screenshot(page, `${viewport.width}x${viewport.height}-failure`).catch(() => {});
    result.failure = error.message;
    throw error;
  } finally {
    await context.close();
  }
}

async function inspectKeyboardAndMotion(browser) {
  const context = await isolatedContext(browser, { viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/choose`, { waitUntil: "networkidle" });
    await ready(page, 0);
    await choose(page, 0, true);
    await page.waitForTimeout(250);
    await expect(page.getByTestId("choice-experience")).toHaveAttribute("data-step", "1");
    await page.getByRole("button", { name: "返回上一步", exact: true }).click();
    await ready(page, 0);
    let optionFocused = false;
    for (let presses = 0; presses < 20; presses++) {
      await page.keyboard.press("Tab");
      optionFocused = await page.evaluate(() => document.activeElement?.matches('[data-testid="choice-option"]'));
      if (optionFocused) break;
    }
    assert.ok(optionFocused, "Tab can reach an option");
    assert.ok(await page.evaluate(() => document.activeElement.matches(":focus-visible")), "Keyboard option receives visible-focus state");
    const focusedIndex = await page.getByTestId("choice-option").evaluateAll(buttons => buttons.indexOf(document.activeElement));
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("choice-option").nth((focusedIndex + 1) % 2)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("choice-option").nth(focusedIndex)).toBeFocused();
    await page.keyboard.press("Enter");
    await ready(page, 1);
    await page.getByTestId("choice-option").first().focus();
    await page.keyboard.press("Space");
    await ready(page, 2);
    await page.getByRole("button", { name: "返回上一步", exact: true }).focus();
    await page.keyboard.press("Enter");
    await ready(page, 1);
    const motion = await page.getByTestId("choice-experience").evaluate(root => {
      const seconds = value => value.split(",").map(part => part.trim().endsWith("ms") ? parseFloat(part) / 1000 : parseFloat(part));
      const elements = [root, ...root.querySelectorAll("*")];
      return elements.flatMap(element => {
        const style = getComputedStyle(element);
        return [...seconds(style.transitionDuration), ...seconds(style.animationDuration)];
      }).filter(Number.isFinite);
    });
    assert.ok(Math.max(...motion) <= 0.1, `Reduced motion removes long animations (maximum duration ${Math.max(...motion)}s)`);
    await inspectLayout(page, 1);
    await screenshot(page, "390-keyboard-reduced-motion");
    report.keyboardAndReducedMotion = "passed";
    console.log("PASS keyboard Tab/arrows/Enter/Space/back, reduced-motion durations and reduced-motion double-click guard");
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (!process.argv.includes("--motion-only")) {
      const viewports = process.argv.includes("--short-only")
        ? [{ width: 390, height: 667 }]
        : [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }];
      for (const viewport of viewports) {
        await inspectViewport(browser, viewport);
      }
    }
    await inspectKeyboardAndMotion(browser);
    assert.ok(report.apiRequests.every(request => ["GET", "HEAD"].includes(request.method)), "Choice experience should not issue API writes");
    report.passed = true;
    console.log(`PASS all choice-experience checks; screenshots: ${output}`);
  } finally {
    fs.writeFileSync(path.join(output, process.argv.includes("--motion-only") ? "report-motion.json" : process.argv.includes("--short-only") ? "report-short.json" : "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
