import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('History Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('filters history and deletes an item', () => {
    const stamp = Date.now();
    const email = `history+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);

    // Add an expense
    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added
    cy.contains('₪300', { timeout: 20000 }).should('be.visible');

    const d = new Date();
    cy.visit(`/history?year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`);
    cy.url().should('include', '/history');

    cy.contains('פעולות אחרונות', { timeout: 20000 }).should('be.visible');

    cy.contains('[data-testid^="transaction-row-"]', '₪300', { timeout: 20000 }).should('be.visible').click();

    cy.get('[data-testid="quickadd-sheet-dialog"]', { timeout: 15000 }).within(() => {
      cy.contains('button', 'מחיקת הוצאה').scrollIntoView().click({ force: true });
      cy.contains('button', 'מחיקה').scrollIntoView().click({ force: true });
    });

    cy.contains('₪300').should('not.exist');
    cy.contains('לא נוספו עדיין הוצאות').should('be.visible');
  });
});
