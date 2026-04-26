describe('Auth and onboarding flow', () => {
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

  it('signs up and applies single-account full contribution from income', () => {
    const stamp = Date.now();
    const email = `user+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click({ force: true });

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-auto-split"]').should('not.exist');
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-monthly-income"]').type('12000');
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 45000 }).should('be.visible').click({ force: true });
    cy.url({ timeout: 15000 }).should('eq', `${Cypress.config('baseUrl')}/`);
    // Users with contribution plans default to ?account=my-money, which hides the per-account strip.
    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('[data-testid="account-locked-message"]').should('not.exist');
    cy.get('[data-testid="dashboard-per-account-section"]', { timeout: 20000 })
      .should('be.visible')
      .invoke('text')
      .should('match', /12[\s,\u202f]*000/);
    cy.get('[data-testid="account-locked-message"]').should('not.exist');
  });

  it('locks account card when both account inflow and expenses are zero', () => {
    const stamp = Date.now();
    const email = `user-lock+${stamp}@lumiflow.local`;
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
    cy.url({ timeout: 15000 }).should('eq', `${Cypress.config('baseUrl')}/`);
    cy.reload();
    cy.visit(`${Cypress.config('baseUrl')}/?account=all`);
    cy.get('[data-testid="dashboard-per-account-section"]', { timeout: 20000 }).should('be.visible').scrollIntoView();
    cy.get('[data-testid="account-locked-message"]', { timeout: 25000 }).should('be.visible');
  });
});
