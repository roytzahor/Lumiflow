import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Settings Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('updates profile and theme', () => {
    const stamp = Date.now();
    const email = `settings+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);

    cy.get('[data-testid="bottom-nav-settings"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url().should('include', '/settings');

    cy.get('[data-testid="settings-theme-dark"]', { timeout: 20000 }).should('be.visible').click();
    cy.get('html').should('have.class', 'dark');

    cy.get('[data-testid="settings-theme-light"]').click();
    cy.get('html').should('not.have.class', 'dark');

    cy.get('[data-testid="settings-edit-profile"]').click();

    cy.get('[data-testid="settings-profile-name-input"]', { timeout: 10000 }).should('be.visible').clear().type('New Name User');
    cy.get('[data-testid="settings-profile-save"]').click();

    cy.contains('New Name User', { timeout: 20000 }).should('be.visible');
  });
});
