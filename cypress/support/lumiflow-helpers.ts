/** Sign up and complete the welcome wizard (profile step, then "solo" mode) to reach the dashboard root. */
export function signUpThroughWelcome(email: string, password: string) {
  cy.visit('/auth/signup');
  cy.get('[data-testid="signup-email"]').type(email);
  cy.get('[data-testid="signup-password"]').type(password);
  cy.get('[data-testid="signup-submit"]').click({ force: true });
  cy.url({ timeout: 30000 }).should('include', '/welcome');
  cy.get('[data-testid="welcome-continue"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  // Profile step advances to the solo/couple mode-choice step (still on /welcome, not a navigation).
  cy.get('[data-testid="welcome-mode-solo"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  cy.url({ timeout: 20000 }).should('eq', `${Cypress.config('baseUrl')}/`);
}

/**
 * Open the Quick Add sheet via the FAB and wait for it to be usable.
 * The FAB is visible before React hydration attaches its handler, so the first click can be
 * swallowed right after signup/navigation; retry once after a grace period.
 */
export function openQuickAddSheet() {
  cy.get('[data-testid="fab-add-button"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  cy.wait(1000);
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="quickadd-sheet-dialog"]').length === 0) {
      cy.get('[data-testid="fab-add-button"]').click({ force: true });
    }
  });
  cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
}

/** Set the monthly income (budget) from Settings — unlocks the budget-gated dashboard/insights surfaces (S7-5/S7-9). */
export function setMonthlyIncomeFromSettings(amount: string) {
  cy.visit('/settings');
  cy.get('[data-testid="settings-budget-income"]', { timeout: 20000 })
    .clear()
    .type(amount)
    .should('have.value', amount);
  cy.get('[data-testid="settings-budget-save"]').click({ force: true });
  cy.contains('תקציב עודכן', { timeout: 20000 }).should('be.visible');
}

/** Set the default account’s monthly contribution from Settings (replaces old onboarding income step). */
export function setMonthlyContributionFromSettings(amount: string) {
  cy.get('[data-testid="bottom-nav-settings"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  cy.url({ timeout: 30000 }).should('include', '/settings');
  cy.get('button[aria-label^="עריכת חשבון"]').first().click({ force: true });
  cy.get('[data-testid="account-popup-monthly-contribution"]', { timeout: 15000 })
    .clear()
    .type(amount)
    .should('have.value', amount);
  cy.contains('button', 'שמירת שינויים').click({ force: true });
  // Wait for server action + close; visiting too early leaves contribution unset (stale dashboard).
  cy.get('[aria-labelledby="account-popup-title"]', { timeout: 30000 }).should('not.exist');
  cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
}
