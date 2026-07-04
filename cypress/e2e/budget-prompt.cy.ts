import { setMonthlyIncomeFromSettings, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Dashboard budget setup prompt (S7-5)', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('shows the prompt without a budget and hides it once income is set', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`budget-prompt+${stamp}@lumiflow.local`, 'Password123!');

    cy.get('[data-testid="dashboard-budget-prompt"]', { timeout: 20000 })
      .scrollIntoView()
      .should('be.visible')
      .within(() => {
        cy.contains('הגדרת תקציב חודשי').should('be.visible');
        cy.contains('a', 'הגדרת תקציב').should('have.attr', 'href', '/settings?section=budget');
      });

    setMonthlyIncomeFromSettings('12000');

    cy.visit('/');
    // Budget-gated cards render now, and the prompt is gone.
    cy.get('[data-testid="dashboard-budget-prompt"]').should('not.exist');
  });
});
