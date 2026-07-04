import { openQuickAddSheet, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Recurring short month policy visibility', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (
      err.message.includes('NEXT_REDIRECT') ||
      err.message.includes('An unexpected response was received from the server.')
    ) {
      return false;
    }
    return true;
  });

  it('shows short month policy only for dates 29/30/31', () => {
    const stamp = Date.now();
    const email = `shortmonth+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);

    openQuickAddSheet();
    cy.get('[data-testid="quickadd-recurring-toggle"]').click();

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-28');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('not.exist');

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-30');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('exist');
  });
});
