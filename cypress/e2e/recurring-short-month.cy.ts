describe('Recurring short month policy visibility', () => {
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

  it('shows short month policy only for dates 29/30/31', () => {
    const stamp = Date.now();
    const email = `shortmonth+${stamp}@lumiflow.local`;
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
    submitOnboardingWithStaleRetry();
    cy.visit('/');
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visit('/?quickAdd=1');
    cy.get('[data-testid="quickadd-open-close"]').should('be.visible');
    cy.get('[data-testid="quickadd-recurring-toggle"]').click();

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-28');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('not.exist');

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-30');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('exist');
  });
});
