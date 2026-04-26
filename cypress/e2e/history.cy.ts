describe('History Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  const submitOnboardingWithStaleRetry = () => {
    cy.get('[data-testid="onboarding-submit"]').click({ force: true });
    cy.get('body').then(($body) => {
      if ($body.text().includes('הסשן התיישן')) {
        cy.wait(400);
        cy.get('[data-testid="onboarding-submit"]').click({ force: true });
      }
    });
  };

  it('filters history and deletes an item', () => {
    const stamp = Date.now();
    const email = `history+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click({ force: true });

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-monthly-income"]').type('10000');
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 45000 }).should('be.visible').click({ force: true });
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    // Add an expense
    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added
    cy.contains('₪300', { timeout: 20000 }).should('be.visible');

    // Navigate directly so the bottom bar is not covered by the Quick Add sheet.
    // Quick Add defaults transaction dates to UTC calendar day; history month filter must match.
    const d = new Date();
    cy.visit(`/history?year=${d.getUTCFullYear()}&month=${d.getUTCMonth()}`);
    cy.url().should('include', '/history');

    cy.contains('פעולות אחרונות', { timeout: 20000 }).should('be.visible');

    // Click on the transaction row to edit/delete
    // Since we don't know the exact ID, we can click the first transaction row containing ₪300
    cy.contains('[data-testid^="transaction-row-"]', '₪300', { timeout: 20000 }).should('be.visible').click();

    cy.get('[data-testid="quickadd-sheet-dialog"]', { timeout: 15000 }).within(() => {
      cy.contains('button', 'מחיקת הוצאה').scrollIntoView().click({ force: true });
      cy.contains('button', 'מחיקה').scrollIntoView().click({ force: true });
    });

    // Verify it is removed
    cy.contains('₪300').should('not.exist');
    cy.contains('לא נוספו עדיין הוצאות').should('be.visible');
  });
});
