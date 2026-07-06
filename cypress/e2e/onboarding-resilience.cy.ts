import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Welcome and dashboard resilience', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('welcome page stays usable after reload', () => {
    const stamp = Date.now();
    const email = `welcome-reload+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click({ force: true });
    cy.url({ timeout: 30000 }).should('include', '/welcome');
    cy.reload();
    cy.url().should('include', '/welcome');
    cy.get('[data-testid="welcome-continue"]', { timeout: 20000 }).should('be.visible');
  });

  it('shows income split UI in settings when a shared account exists', () => {
    const stamp = Date.now();
    const email = `split-settings+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    cy.visit('/settings');
    cy.get('[data-testid="settings-add-account"]', { timeout: 20000 }).click({ force: true });
    cy.get('[role="dialog"]', { timeout: 15000 }).within(() => {
      cy.get('select').first().select('SHARED', { force: true });
      cy.get('input[placeholder="למשל: חשבון הבית"]').clear().type('חשבון משותף בדיקה');
      cy.get('[data-testid="account-popup-monthly-contribution"]').clear().type('0');
      cy.contains('button', 'יצירת חשבון').click({ force: true });
    });
    cy.contains('חשבון משותף בדיקה', { timeout: 20000 }).should('be.visible');
    cy.contains('החשבון האישי שלי').should('be.visible');
  });

  it('shows dashboard retry state without bouncing to welcome', function () {
    // Failure injection is NODE_ENV !== "production"-gated (app/dashboard-data-loader.tsx);
    // skip under the production-build suite (scripts/cypress-e2e-prod-local.sh).
    if (Cypress.env('PROD_BUILD')) this.skip();
    const stamp = Date.now();
    const email = `retry+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visit('/?dashboardFail=1');
    cy.contains('לא הצלחנו לטעון את הדשבורד', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="dashboard-retry"]').should('be.visible').click({ force: true });
    cy.url().should('not.include', '/welcome');
  });
});
