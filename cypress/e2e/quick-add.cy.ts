describe('Quick Add Flow', () => {
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

  it('adds an expense and verifies balance updates', () => {
    const stamp = Date.now();
    const email = `quickadd+${stamp}@lumiflow.local`;
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

    // Wait for the balance to show up
    cy.contains('₪10,000').should('be.visible');

    // Open Quick Add
    cy.get('[data-testid="fab-add-button"]').click();
    cy.get('[data-testid="fab-quick-add"]').click();

    // Fill form
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').type('500');
    cy.get('[data-testid="quickadd-description"]').type('Groceries');
    
    // Select a category if 'כללי' is not default, but we'll use whatever is default
    cy.get('[data-testid="quickadd-submit"]').click();

    // Verify it added to dashboard
    cy.contains('₪500').should('be.visible'); // The expense should show up in "הוצאות" tile
    cy.contains('₪9,500').should('be.visible'); // The free balance tile
  });
});
