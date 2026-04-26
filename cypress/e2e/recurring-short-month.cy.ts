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

  const submitOnboardingWithStaleRetry = () => {
    cy.get('[data-testid="onboarding-submit"]').click({ force: true });
    cy.get('body').then(($body) => {
      if ($body.text().includes('הסשן התיישן')) {
        cy.wait(400);
        cy.get('[data-testid="onboarding-submit"]').click({ force: true });
      }
    });
  };

  it('shows short month policy only for dates 29/30/31', () => {
    const stamp = Date.now();
    const email = `shortmonth+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click({ force: true });

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 45000 }).should('be.visible').click({ force: true });
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quickadd-recurring-toggle"]').click();

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-28');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('not.exist');

    cy.get('[data-testid="quickadd-date"]').clear().type('2026-04-30');
    cy.get('[data-testid="quickadd-short-month-policy"]').should('exist');
  });
});
