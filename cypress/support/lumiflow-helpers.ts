/** Sign up and pass the optional welcome screen to reach the dashboard root. */
export function signUpThroughWelcome(email: string, password: string) {
  cy.visit('/auth/signup');
  cy.get('[data-testid="signup-email"]').type(email);
  cy.get('[data-testid="signup-password"]').type(password);
  cy.get('[data-testid="signup-submit"]').click({ force: true });
  cy.url({ timeout: 30000 }).should('include', '/welcome');
  cy.get('[data-testid="welcome-skip"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  cy.url({ timeout: 20000 }).should('eq', `${Cypress.config('baseUrl')}/`);
}

/** Set the default account’s monthly contribution from Settings (replaces old onboarding income step). */
export function setMonthlyContributionFromSettings(amount: string) {
  cy.get('[data-testid="bottom-nav-settings"]', { timeout: 20000 }).should('be.visible').click({ force: true });
  cy.url().should('include', '/settings');
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
