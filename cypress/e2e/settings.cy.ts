describe('Settings Flow', () => {
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

  it('updates profile and theme', () => {
    const stamp = Date.now();
    const email = `settings+${stamp}@lumiflow.local`;
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

    // Go to settings
    cy.contains('הגדרות').click();
    cy.url().should('include', '/settings');

    // Toggle theme
    cy.get('[data-testid="settings-theme-dark"]', { timeout: 20000 }).should('be.visible').click();
    // Verify dark mode applied (HTML should have class dark)
    cy.get('html').should('have.class', 'dark');

    cy.get('[data-testid="settings-theme-light"]').click();
    cy.get('html').should('not.have.class', 'dark');

    // Click edit profile
    cy.get('[data-testid="settings-edit-profile"]').click();

    cy.get('[data-testid="settings-profile-name-input"]', { timeout: 10000 }).should('be.visible').clear().type('New Name User');
    cy.get('[data-testid="settings-profile-save"]').click();

    cy.contains('New Name User', { timeout: 20000 }).should('be.visible');
  });
});
