import { openQuickAddSheet, signUpThroughWelcome } from '../support/lumiflow-helpers';

function addExpenseFromDashboard(amount: string, description: string) {
  openQuickAddSheet();
  cy.get('[data-testid="quickadd-amount"]').clear().type(amount);
  cy.get('[data-testid="quickadd-description"]').type(description);
  cy.get('[data-testid="quickadd-submit"]').scrollIntoView().click({ force: true });
  // S7-7: the sheet stays open and shows a success banner with the saved amount.
  cy.contains(`₪${amount}`, { timeout: 20000 }).should('be.visible');
}

function visitCurrentMonthHistory() {
  const d = new Date();
  cy.visit(`/history?year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`);
  cy.url().should('include', '/history');
  cy.contains('פעולות אחרונות', { timeout: 20000 }).should('be.visible');
}

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
    addExpenseFromDashboard('300', 'Books');
    visitCurrentMonthHistory();

    cy.contains('[data-testid^="transaction-row-"]', '₪300', { timeout: 20000 }).should('be.visible').click();

    cy.get('[data-testid="quickadd-sheet-dialog"]', { timeout: 15000 }).within(() => {
      cy.contains('button', 'מחיקת הוצאה').scrollIntoView().click({ force: true });
      cy.contains('button', 'מחיקה').scrollIntoView().click({ force: true });
    });

    cy.contains('₪300').should('not.exist');
    // S7-8: HistoryView renders its own no-expenses empty state instead of TransactionFeed's.
    cy.contains('אין הוצאות החודש').should('be.visible');
    cy.contains('button', 'הוספת הוצאה').should('be.visible');
  });

  it('shows a search empty state and restores results on clear (S7-8)', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`history-search+${stamp}@lumiflow.local`, 'Password123!');
    addExpenseFromDashboard('300', 'Books');
    visitCurrentMonthHistory();

    cy.contains('[data-testid^="transaction-row-"]', '₪300', { timeout: 20000 }).should('be.visible');

    cy.get('[data-testid="history-search-input"]').type('אין-כזה-פריט');
    cy.contains('אין תוצאות עבור', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'נקה חיפוש').click();

    cy.get('[data-testid="history-search-input"]').should('have.value', '');
    cy.contains('[data-testid^="transaction-row-"]', '₪300').should('be.visible');
  });
});
