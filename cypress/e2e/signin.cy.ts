describe('Sign in with credentials', () => {
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

  it('returns to the dashboard after sign out and credentials sign-in', () => {
    const stamp = Date.now();
    const email = `signin+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click({ force: true });

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-monthly-income"]').type('8000');
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    submitOnboardingWithStaleRetry();
    // Full-page navigation on click; avoid detached-node actionability wait.
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 45000 }).should('be.visible').click({ force: true });
    cy.url({ timeout: 15000 }).should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('₪8,000', { timeout: 15000 }).should('be.visible');

    cy.contains('הגדרות', { timeout: 20000 }).should('be.visible').click();
    cy.url({ timeout: 20000 }).should('include', '/settings');
    cy.get('[data-testid="settings-signout"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url({ timeout: 15000 }).should('include', '/auth/signin');
    cy.get('[data-testid="signin-email"]', { timeout: 15000 }).should('be.visible').clear().type(email);
    cy.get('[data-testid="signin-password"]').should('be.visible').type(password);
    // Submit triggers loading + full-page redirect; default actionability checks can lose the node mid-flight.
    cy.get('[data-testid="signin-submit"]').should('be.visible').click({ force: true });

    cy.url({ timeout: 20000 }).should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('₪8,000', { timeout: 15000 }).should('be.visible');
  });
});
