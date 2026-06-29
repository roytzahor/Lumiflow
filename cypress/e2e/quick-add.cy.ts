import { setMonthlyContributionFromSettings, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Quick Add Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('adds an expense and verifies balance updates', () => {
    const stamp = Date.now();
    const email = `quickadd+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    setMonthlyContributionFromSettings('10000');

    cy.get('body', { timeout: 20000 }).should('contain.text', '10,000');

    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');

    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('500');
    cy.get('[data-testid="quickadd-description"]').type('Groceries');

    cy.get('[data-testid="quickadd-submit"]').scrollIntoView().click({ force: true });

    cy.contains(/₪500(?!\d)/, { timeout: 20000 }).should('be.visible');
    cy.contains(/₪9[,\u202f]500/, { timeout: 20000 }).should('be.visible');
  });
});
