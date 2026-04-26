import { setMonthlyContributionFromSettings, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Sign in with credentials', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('returns to the dashboard after sign out and credentials sign-in', () => {
    const stamp = Date.now();
    const email = `signin+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    setMonthlyContributionFromSettings('8000');

    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('body', { timeout: 20000 }).should('contain.text', '8,000');

    cy.get('[data-testid="bottom-nav-settings"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url({ timeout: 20000 }).should('include', '/settings');
    cy.get('[data-testid="settings-signout"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url({ timeout: 15000 }).should('include', '/auth/signin');
    cy.get('[data-testid="signin-email"]', { timeout: 15000 }).should('be.visible').clear().type(email);
    cy.get('[data-testid="signin-password"]').should('be.visible').type(password);
    cy.get('[data-testid="signin-submit"]').should('be.visible').click({ force: true });

    cy.url({ timeout: 20000 }).should('eq', `${Cypress.config('baseUrl')}/`);
    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('body', { timeout: 20000 }).should('contain.text', '8,000');
  });
});
