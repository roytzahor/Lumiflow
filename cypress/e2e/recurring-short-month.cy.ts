describe('Recurring short month policy visibility', () => {
  it('shows short month policy only for dates 29/30/31', () => {
    const stamp = Date.now();
    const email = `shortmonth+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url().should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template"]').select('אישי בלבד');
    cy.get('[data-testid="onboarding-submit"]').click();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.get('[data-testid="dashboard-open-quickadd"]').click();
    cy.get('[data-testid="quickadd-recurring-toggle"]').click();

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-28');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('not.exist');

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-30');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('exist');
  });
});
