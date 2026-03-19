describe('Auth and onboarding flow', () => {
  it('signs up a user and completes onboarding', () => {
    const stamp = Date.now();
    const email = `user+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url().should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-submit"]').click();
    cy.get('[data-testid="onboarding-continue-dashboard"]').click();

    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('החיסכון החודשי נעול').should('be.visible');
    cy.contains('כדי לראות את החסכון החודשי מומלץ לעדכן את ההכנסה בעמוד ההגדרות').should('be.visible');

    cy.visit('/settings');
    cy.contains('button', 'ארכיון').first().click();

    cy.visit('/');
    cy.contains('על מנת לצפות במאזן יש להוסיף לפחות חשבון אחד').should('be.visible');
    cy.contains('button', 'עדכון').should('be.visible');
  });
});
