import { expect, Page } from "@playwright/test";

import { QAAccount } from "./db";
import { getE2EEnv } from "./env";
import { sampleImage, samplePdf, sampleSignature } from "./files";

async function seedCookieConsent(page: Page) {
  const consent = { necessary: true, analytics: true, marketing: true };
  await page.context().addCookies([
    {
      name: "CC_CONSENT",
      value: encodeURIComponent(JSON.stringify(consent)),
      url: getE2EEnv().baseUrl,
    },
  ]);
  await page.addInitScript((state) => {
    window.localStorage.setItem("CC_CONSENT", JSON.stringify(state));
  }, consent);
}

async function dismissCookieBanner(page: Page) {
  const acceptAll = page.getByRole("button", { name: /accept all/i });
  if (await acceptAll.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await acceptAll.click({ force: true });
    await expect(acceptAll).toBeHidden({ timeout: 5_000 }).catch(() => undefined);
  }
}

async function waitForAppToSettle(page: Page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function modalByTestIdOrDialog(page: Page, testId: string, name: RegExp) {
  const byTestId = page.getByTestId(testId);
  if (await byTestId.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return byTestId;
  }

  const byDialog = page.getByRole("dialog", { name });
  await expect(byDialog).toBeVisible();
  return byDialog;
}

async function clickModalAction(modal: ReturnType<Page["locator"]>, testId: string, name: RegExp) {
  const byTestId = modal.getByTestId(testId);
  if (await byTestId.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await byTestId.click();
    return;
  }

  await modal.getByRole("button", { name }).last().click();
}

async function waitForRentStep(page: Page, step: string) {
  const stepLocator = page.getByTestId(`rent-modal-step-${step}`);
  await expect(stepLocator).toBeVisible({ timeout: 30_000 });
  return stepLocator;
}

export async function openUserMenu(page: Page) {
  await dismissCookieBanner(page);

  const labelledMenuButton = page.getByRole("button", { name: "Open user menu" });
  if (await labelledMenuButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await labelledMenuButton.click();
    return;
  }

  await page.getByRole("button", { name: /city date/i }).locator("xpath=following::button[1]").click();
}

export async function loginViaUi(page: Page, account: Pick<QAAccount, "email" | "password">) {
  await seedCookieConsent(page);
  await page.goto("/");
  await openUserMenu(page);
  await page.getByRole("button", { name: /login/i }).click();
  const modal = await modalByTestIdOrDialog(page, "login-modal", /^login$/i);
  await modal.getByLabel(/email address/i).fill(account.email);
  await modal.getByLabel(/password/i).fill(account.password);
  await clickModalAction(modal, "login-modal-primary-action", /continue|login/i);
  await expect(modal).toBeHidden({ timeout: 30_000 });
  await waitForAppToSettle(page);
}

export async function registerOwnerViaUi(page: Page, account: QAAccount) {
  await seedCookieConsent(page);
  await page.goto("/");
  await openUserMenu(page);
  await page.getByRole("button", { name: /sign up/i }).click();
  const registerModal = await modalByTestIdOrDialog(page, "register-modal", /^register$/i);
  await page.getByText("Register here").click();
  await expect(registerModal).toBeHidden({ timeout: 15_000 });

  const ownerModal = await modalByTestIdOrDialog(page, "owner-register-modal", /register as owner/i);
  await ownerModal.getByLabel(/email address/i).fill(account.email);
  await ownerModal.getByLabel(/full name/i).fill(account.name);
  await ownerModal.getByLabel(/phone number/i).fill(account.phone);
  await ownerModal.getByLabel(/password/i).fill(account.password);
  await clickModalAction(ownerModal, "owner-register-modal-primary-action", /register/i);
  await expect(ownerModal).toBeHidden({ timeout: 45_000 });
  await waitForAppToSettle(page);
}

export async function registerCustomerViaUi(page: Page, account: QAAccount) {
  await seedCookieConsent(page);
  await page.goto("/");
  await openUserMenu(page);
  await page.getByRole("button", { name: /sign up/i }).click();
  const modal = await modalByTestIdOrDialog(page, "register-modal", /^register$/i);
  await modal.getByLabel(/^email$/i).fill(account.email);
  await modal.getByLabel(/user name/i).fill(account.name);
  await modal.getByLabel(/password/i).fill(account.password);
  await clickModalAction(modal, "register-modal-primary-action", /continue/i);
  await expect(modal).toBeHidden({ timeout: 45_000 });
  await waitForAppToSettle(page);
}

export async function selectReactOption(page: Page, inputSelector: string, search: string, optionName = search) {
  const input = page.locator(inputSelector).first();
  const dialog = page.getByRole("dialog").filter({ has: input }).first();
  const scope = (await dialog.isVisible({ timeout: 1_000 }).catch(() => false)) ? dialog : page;
  const isReadonly = (await input.getAttribute("aria-readonly")) === "true";
  const combobox = isReadonly ? input.locator("xpath=..") : scope.getByRole("combobox").first();

  await combobox.click();
  if (!isReadonly) {
    await input.fill(search);
  }

  const option = page.getByRole("option", { name: new RegExp(optionName, "i") }).first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  await option.click();
}

export async function selectAddressOption(page: Page, search: string, optionName: RegExp | string = search) {
  const rentModal = page.getByTestId("rent-modal");
  const scope = (await rentModal.isVisible({ timeout: 1_000 }).catch(() => false)) ? rentModal : page;
  const addressInput = scope.getByRole("combobox").nth(1);
  const addressControl = addressInput.locator("xpath=..");

  await addressControl.click();
  await page.keyboard.type(search);

  const optionPattern = optionName instanceof RegExp ? optionName : new RegExp(optionName, "i");
  const option = page.getByRole("option", { name: optionPattern }).first();
  await expect(option).toBeVisible({ timeout: 20_000 });
  await option.click();

  // Allow async Google Places details fetch and React/form state update to complete
  await page.waitForTimeout(1500);
}

export async function fillRichText(page: Page, testId: string, value: string) {
  const editor = page.getByTestId(testId);
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.insertText(value);
}

export async function completeOwnerVerification(page: Page, account: QAAccount) {
  await seedCookieConsent(page);
  await page.goto("/dashboard/profile");
  await dismissCookieBanner(page);
  await page.getByRole("button", { name: /start verification/i }).click();
  const modal = page.getByTestId("verification-modal");
  await expect(modal).toBeVisible();

  await modal.locator("#email").fill(account.email);
  await modal.getByRole("button", { name: /^verify$/i }).nth(0).click();
  await expect(modal.getByRole("button", { name: /^verified$/i }).first()).toBeVisible({ timeout: 60_000 });

  await dismissCookieBanner(page);
  await modal.locator("#phone").fill(account.phone);
  await modal.getByRole("button", { name: /^verify$/i }).click();
  await expect(modal.getByRole("button", { name: /^verified$/i }).nth(1)).toBeVisible({ timeout: 30_000 });

  await modal.getByTestId("verification-modal-primary-action").click();
  await expect(page.getByTestId("verification-step-2")).toBeVisible();

  await modal.locator("#aadhaar-ocr-upload").setInputFiles([sampleImage("qa-aadhaar.png")]);
  await modal.getByTestId("verification-modal-primary-action").click();
  await expect(page.getByTestId("verification-step-3")).toBeVisible({ timeout: 60_000 });

  const env = getE2EEnv();
  await modal.locator("#accountHolderName").fill(env.bankHolder);
  await modal.locator("#accountNumber").fill(env.bankAccountNumber);
  await modal.locator("#ifscCode").fill(env.bankIfsc);
  await modal.locator("#bankName").fill(env.bankName);
  await modal.getByTestId("verification-modal-primary-action").click();
  await expect(modal).toBeHidden({ timeout: 90_000 });
}

export async function createListingViaRentModal(page: Page, title: string) {
  await seedCookieConsent(page);
  await page.goto("/");
  await openUserMenu(page);
  await page.getByText("List your space").click();
  await expect(page.getByTestId("rent-modal")).toBeVisible();
  await waitForRentStep(page, "category");

  await page.getByRole("button", { name: /indoor studio/i }).click();
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "location");

  await selectReactOption(page, "input#city-select", "Delhi", "Delhi");
  await selectAddressOption(page, "Connaught Place New Delhi", /connaught|new delhi|delhi/i);
  await page.getByTestId("rent-modal-primary-action").click();
  const imagesStep = await waitForRentStep(page, "images");

  await imagesStep.locator("input#rent-modal-upload").setInputFiles([sampleImage()]);
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "video");

  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "description");

  await page.locator("#title").fill(title);
  await fillRichText(
    page,
    "rich-text-editor",
    "QA staging listing created by enterprise E2E validation. This description proves rich text, uploads, and listing creation work end to end."
  );
  await page.locator("#price").fill("1500");
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "amenities");

  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "addons");

  await page.getByText("Continuous LED Light").click();
  await page.locator('[id="addon-price-Continuous LED Light"]').fill("250");
  await page.locator('[id="addon-qty-Continuous LED Light"]').fill("1");
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "other-details");

  const otherDetailsStep = page.getByTestId("rent-modal-step-other-details");
  await otherDetailsStep.locator("#carpetArea").fill("1200");
  await otherDetailsStep.locator("#maximumPax").fill("12");
  await otherDetailsStep.locator("#minimumBookingHours").fill("2");
  await otherDetailsStep.getByText("Fashion Shoot").click();
  await otherDetailsStep.getByText("Instant Booking").click();
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "custom-terms");

  await fillRichText(page, "rich-text-editor", "QA custom term: restore the space after the shoot.");
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "packages");

  await page.getByRole("button", { name: /add new package/i }).click();
  await page.locator("#title-0").fill("QA Basic Package");
  await page.locator("#duration-0").fill("2");
  await page.locator("#original-0").fill("3500");
  await page.locator("#offered-0").fill("3000");
  await page.locator("#new-feature-0").fill("Two hour shoot");
  await page.keyboard.press("Enter");
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "verification");

  await page.locator("input#file-upload").setInputFiles([samplePdf()]);
  await page.getByTestId("rent-modal-primary-action").click();
  await waitForRentStep(page, "terms");

  await page.locator("input#signature-upload").setInputFiles([sampleSignature()]);
  await page.getByLabel(/i agree to all terms and conditions/i).check();
  await page.getByTestId("rent-modal-primary-action").click();
  await expect(page.getByTestId("rent-modal-success")).toBeVisible({ timeout: 120_000 });
}

export async function completeCashfreeCheckout(page: Page) {
  const method = getE2EEnv().cashfreePaymentMethod;
  await page.waitForURL(/cashfree|payments\/cashfree/i, { timeout: 60_000 });

  if (/payments\/cashfree\/return/i.test(page.url())) return;

  if (method.type === "upi") {
    await page.getByRole("link", { name: /pay by upi id/i }).click({ timeout: 30_000 });
    await page.waitForURL(/payment-method\/upi/i, { timeout: 30_000 });
    let input = page.getByRole("textbox", { name: /upi id|phone number/i }).first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      input = page.getByPlaceholder(/upi|vpa|phone/i).or(page.getByLabel(/upi|vpa|phone/i)).first();
    }
    await expect(input).toBeVisible({ timeout: 30_000 });
    await input.fill(method.vpa);
    const proceed = page.getByRole("button", { name: /^proceed to pay$/i });
    await expect(proceed).toBeEnabled({ timeout: 30_000 });
    await proceed.click();
  } else {
    await page.getByText(/card/i).first().click({ timeout: 30_000 });
    await page.getByLabel(/card number/i).fill(method.number);
    await page.getByLabel(/expiry|valid thru/i).fill(method.expiry);
    await page.getByLabel(/cvv|security/i).fill(method.cvv);
    await page.getByLabel(/name/i).fill(method.name);
    await page.getByRole("button", { name: /pay|continue/i }).first().click();
  }

  await page.waitForURL((url) => {
    if (/payments\/cashfree\/return/i.test(url.pathname)) return true;
    return url.pathname === "/" && url.searchParams.has("callbackUrl") && url.searchParams.has("tid");
  }, { timeout: 180_000 });

  const returnedUrl = new URL(page.url());
  if (returnedUrl.pathname === "/" && returnedUrl.searchParams.has("tid")) {
    await page.goto(`/payments/cashfree/return?tid=${encodeURIComponent(returnedUrl.searchParams.get("tid") || "")}`);
  }
}
