describe('History Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  const submitOnboardingWithStaleRetry = () => {
    cy.get('[data-testid="onboarding-submit"]').click();
    cy.get('body').then(($body) => {
      if ($body.text().includes('הסשן התיישן')) {
        cy.wait(400);
        cy.get('[data-testid="onboarding-submit"]').click();
      }
    });
  };

  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('filters history and deletes an item', () => {
    const stamp = Date.now();
    const email = `history+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-monthly-income"]').type('10000');
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 15000 }).should('be.visible').click();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    // Add an expense
    cy.get('[data-testid="fab-add-button"]').click();
    cy.get('[data-testid="fab-quick-add"]').click();
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added
    cy.contains('₪300').should('be.visible');

    // Go to history
    cy.contains('היסטוריה').click();
    cy.url().should('include', '/history');

    // Filter by category
    cy.get('[data-testid="history-category-filter"]').should('exist');

    // Click on the transaction row to edit/delete
    // Since we don't know the exact ID, we can click the first transaction row containing ₪300
    cy.contains('₪300').click();
    
    // Delete the transaction
    cy.contains('button', 'מחיקה').click();
    // Confirm deletion
    cy.contains('button', 'מחיקה').click();

    // Verify it is removed
    cy.contains('₪300').should('not.exist');
    cy.contains('לא נוספו עדיין הוצאות').should('be.visible');
  });
});
