describe('Insights Flow', () => {
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

  it('loads insights data section', () => {
    const stamp = Date.now();
    const email = `insights+${stamp}@lumiflow.local`;
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

    // Add an expense so there's some data
    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added
    cy.contains('₪300', { timeout: 20000 }).should('be.visible');

    cy.visit('/insights');
    cy.url().should('include', '/insights');

    // Check that insights loaded (enough-history gate can flip once ≥2 historical months have data).
    cy.get('[data-testid="insights-data-section"]').should('exist');
    cy.contains('שינויים בולטים החודש').should('be.visible');
    cy.get('[data-testid="insights-data-section"]').should(($section) => {
      const text = $section.text();
      expect(
        text.includes('עדיין אין מספיק היסטוריה') ||
          text.includes('הכל בסדר החודש') ||
          text.includes('לא זוהו שינויים בולטים')
      ).to.eq(true);
    });
  });
});
