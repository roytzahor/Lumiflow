import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Auth and welcome flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('signs up, completes welcome, then sets monthly contribution in settings', () => {
    const stamp = Date.now();
    const email = `user+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);

    cy.get('[data-testid="bottom-nav-settings"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url().should('include', '/settings');

    cy.get('[data-testid="settings-add-account"]', { timeout: 20000 }).should('be.visible');
    cy.get('button[aria-label^="עריכת חשבון"]').first().click({ force: true });
    cy.get('[data-testid="account-popup-monthly-contribution"]', { timeout: 15000 })
      .clear()
      .type('12000')
      .should('have.value', '12000');
    cy.contains('button', 'שמירת שינויים').click({ force: true });
    cy.get('[aria-labelledby="account-popup-title"]', { timeout: 30000 }).should('not.exist');

    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('[data-testid="account-locked-message"]').should('not.exist');
    cy.get('[data-testid="dashboard-per-account-section"]', { timeout: 20000 })
      .should('be.visible')
      .should('contain.text', '12,000');
  });

  it('locks account card when both account inflow and expenses are zero', () => {
    const stamp = Date.now();
    const email = `user-lock+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    cy.reload();
    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('[data-testid="dashboard-per-account-section"]', { timeout: 20000 }).should('be.visible').scrollIntoView();
    cy.get('[data-testid="account-locked-message"]', { timeout: 25000 }).should('be.visible');
  });
});
