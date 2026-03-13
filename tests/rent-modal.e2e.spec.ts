import { expect, type Page, test } from "@playwright/test";

const TEST_OWNER_EMAIL = process.env.TEST_OWNER_EMAIL ?? "e2e-owner@contcave.local";
const TEST_OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD ?? "TestOwner123!";

const pngFile = {
  name: "studio.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn6n1sAAAAASUVORK5CYII=",
    "base64"
  ),
};

const pdfFile = {
  name: "ownership-proof.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"),
};

const buildPngFiles = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...pngFile,
    name: `studio-${index + 1}.png`,
  }));

const nextStep = (page: Page) =>
  page.getByRole("button", { name: "Next", exact: true }).first();

const getAddressInput = (page: Page) =>
  page
    .getByTestId("address-autocomplete")
    .or(page.getByRole("textbox", { name: "Location search" }))
    .first();

const listYourSpaceButton = (page: Page) =>
  page.getByRole("button", { name: "List your space", exact: true }).first();

async function ensureOwnerSession(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto("/");
    await page.locator(".ai-outline-menu").click();

    if (await listYourSpaceButton(page).isVisible().catch(() => false)) {
      return;
    }

    await page.getByRole("button", { name: "Login" }).click();
    await page.getByLabel("Email Address").fill(TEST_OWNER_EMAIL);
    await page.getByLabel("Password").fill(TEST_OWNER_PASSWORD);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.waitForLoadState("networkidle");
  }

  await page.goto("/");
  await page.locator(".ai-outline-menu").click();
  await expect(listYourSpaceButton(page)).toBeVisible();
}

async function setupRentModal(page: Page) {
  await page.addInitScript(() => {
    (window as Window & { __CONTCAVE_E2E__?: boolean }).__CONTCAVE_E2E__ = true;
  });

  await page.context().addCookies([
    {
      name: "ContcavCookieConsent",
      value: "true",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.route("**/api/cloudinary/sign", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          signature: "test-signature",
          apiKey: "test-api-key",
          cloud: "test-cloud",
          timestamp: Math.floor(Date.now() / 1000),
        },
      }),
    });
  });

  await page.route("https://api.cloudinary.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: "/assets/listing-image-default.png",
      }),
    });
  });

  await page.route("**/api/agreements/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          url: "https://example.com/agreement",
          pdfUrl: "https://example.com/agreement.pdf",
        },
      }),
    });
  });

  await ensureOwnerSession(page);
  await listYourSpaceButton(page).click();
}

async function fillToOtherDetails(page: Page) {
  await page.getByRole("button", { name: "Indoor Studio" }).click();
  await nextStep(page).click();

  await page.locator("#city-select").click();
  await page.locator("#city-select").fill("Mumbai");
  await page.locator("#city-select").press("ArrowDown");
  await page.locator("#city-select").press("Enter");

  const addressInput = getAddressInput(page);
  await addressInput.fill("123 Test Street, Mumbai");
  await addressInput.press("Enter");
  await page.getByLabel("Additional Info").fill("Suite 101");
  await nextStep(page).click();

  await page.locator('input#rent-main-upload').setInputFiles(pngFile);
  await nextStep(page).click();

  const listingTitle = `E2E Rent Modal Listing ${Date.now()}`;
  await page.getByLabel("Title").fill(listingTitle);
  await page.locator('[contenteditable="true"]').first().fill(
    "A fully automated listing description for end to end verification that is comfortably longer than fifty characters."
  );
  await page.getByLabel("Price").fill("2500");
  await nextStep(page).click();

  await page.locator("#custom-amenity").fill("Fog Machine");
  await page.getByRole("button", { name: "ADD" }).click();
  await expect(page.getByText("Fog Machine")).toBeVisible();
  await nextStep(page).click();

  await nextStep(page).click();
  await expect(page.getByRole("heading", { name: "Other Details" })).toBeVisible();

  return { listingTitle };
}

async function fillRequiredOtherDetails(page: Page) {
  await page.getByRole("textbox", { name: "e.g. 2500", exact: true }).fill("1200");
  await page.getByRole("textbox", { name: "e.g. 2", exact: true }).fill("2");
  await page.getByRole("textbox", { name: "e.g. 10", exact: true }).fill("8");
  await page.getByRole("button", { name: "Portraits & Photoshoot" }).click();
}

test("owner can create a listing with a custom amenity and see it on the listing page", async ({ page }) => {
  await setupRentModal(page);

  const { listingTitle } = await fillToOtherDetails(page);
  await fillRequiredOtherDetails(page);
  await nextStep(page).click();

  await nextStep(page).click();
  await nextStep(page).click();

  await page.locator('input#file-upload').setInputFiles(pdfFile);
  await nextStep(page).click();

  await page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp"]').setInputFiles(pngFile);
  await page.getByLabel("I AGREE TO ALL TERMS AND CONDITIONS").check();

  const createListingResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/listings") &&
    response.request().method() === "POST" &&
    response.status() === 201
  );

  await page.getByRole("button", { name: "Complete Listing" }).click();

  const createListingResponse = await createListingResponsePromise;
  const createListingJson = await createListingResponse.json();
  const listingId = createListingJson?.data?.id ?? createListingJson?.id;

  expect(listingId).toBeTruthy();

  await page.goto(`/demo/${listingId}`);

  await expect(page.getByText("Demo Preview")).toBeVisible();
  await expect(page.getByRole("heading", { name: listingTitle, exact: true })).toBeVisible();
  await expect(page.getByText("Fog Machine")).toBeVisible();
});

test("when multiple sets is enabled, next from Other Details goes to Sets and back returns to Other Details", async ({ page }) => {
  await setupRentModal(page);
  await fillToOtherDetails(page);
  await fillRequiredOtherDetails(page);

  const multipleSetsSwitch = page.getByRole("switch").nth(1);
  await multipleSetsSwitch.scrollIntoViewIfNeeded();
  await multipleSetsSwitch.focus();
  await multipleSetsSwitch.press(" ");
  await expect(multipleSetsSwitch).toHaveAttribute("aria-checked", "true");
  await nextStep(page).click();

  await expect(page.getByRole("heading", { name: "Multiple Sets" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Other Details" })).toBeVisible();
});

test("when multiple sets is disabled, next from Other Details skips Sets and goes to Custom Terms", async ({ page }) => {
  await setupRentModal(page);
  await fillToOtherDetails(page);
  await fillRequiredOtherDetails(page);
  await nextStep(page).click();

  await expect(page.getByRole("heading", { name: "Custom Terms and Conditions" })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Other Details" })).toBeVisible();
});

test("location step blocks next when address is missing", async ({ page }) => {
  await setupRentModal(page);

  await page.getByRole("button", { name: "Indoor Studio" }).click();
  await nextStep(page).click();

  await page.locator("#city-select").click();
  await page.locator("#city-select").fill("Mumbai");
  await page.locator("#city-select").press("ArrowDown");
  await page.locator("#city-select").press("Enter");

  await nextStep(page).click();

  await expect(page.getByText("Please enter a complete address")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where is your space?" })).toBeVisible();
});

test("image step blocks next when more than 30 images are uploaded", async ({ page }) => {
  await setupRentModal(page);

  await page.getByRole("button", { name: "Indoor Studio" }).click();
  await nextStep(page).click();

  await page.locator("#city-select").click();
  await page.locator("#city-select").fill("Mumbai");
  await page.locator("#city-select").press("ArrowDown");
  await page.locator("#city-select").press("Enter");

  const addressInput = getAddressInput(page);
  await addressInput.fill("123 Test Street, Mumbai");
  await addressInput.press("Enter");
  await nextStep(page).click();

  await page.locator('input#rent-main-upload').setInputFiles(buildPngFiles(31));
  await nextStep(page).click();

  await expect(page.getByText("Maximum 30 images allowed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add photos" })).toBeVisible();
});

test("verification step blocks next when no documents are uploaded", async ({ page }) => {
  await setupRentModal(page);
  await fillToOtherDetails(page);
  await fillRequiredOtherDetails(page);

  await nextStep(page).click(); // Other Details -> Custom Terms
  await nextStep(page).click(); // Custom Terms -> Packages
  await nextStep(page).click(); // Packages -> Verification

  await expect(page.getByRole("heading", { name: "Space Verification" }).first()).toBeVisible();
  await nextStep(page).click();

  await expect(page.getByText("Please upload verification documents")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Space Verification" }).first()).toBeVisible();
});
