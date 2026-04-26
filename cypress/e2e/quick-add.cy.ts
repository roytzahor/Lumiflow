describe('Quick Add Flow', () => {
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

  it('adds an expense and verifies balance updates', () => {
    const stamp = Date.now();
    const email = `quickadd+${stamp}@lumiflow.local`;
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

    cy.contains('₪10,000', { timeout: 20000 }).should('be.visible');

    // Open Quick Add (tap FAB opens sheet; long-press opens legacy menu)
    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');

    // Fill form
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('500');
    cy.get('[data-testid="quickadd-description"]').type('Groceries');
    
    // Select a category if 'כללי' is not default, but we'll use whatever is default
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added to dashboard
    cy.contains('₪500', { timeout: 20000 }).should('be.visible');
    cy.contains('₪9,500', { timeout: 20000 }).should('be.visible');
  });
});
