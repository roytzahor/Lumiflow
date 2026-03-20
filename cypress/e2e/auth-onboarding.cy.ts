describe('Auth and onboarding flow', () => {
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

  it('signs up and applies single-account full contribution from income', () => {
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
    cy.get('[data-testid="onboarding-auto-split"]').should('not.exist');
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-monthly-income"]').type('12000');
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    submitOnboardingWithStaleRetry();
    cy.visit('/');

    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);
    cy.contains('החיסכון החודשי נעול').should('not.exist');
    cy.contains('₪12,000').should('be.visible');
    cy.contains('הכרטיס נעול כי טרם הוגדרו הכנסות/הוצאות לחשבון הזה').should('not.exist');
  });

  it('locks account card when both account inflow and expenses are zero', () => {
    const stamp = Date.now();
    const email = `user-lock+${stamp}@lumiflow.local`;
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
    cy.contains('החיסכון החודשי נעול').should('be.visible');
    cy.contains('הכרטיס נעול כי טרם הוגדרו הכנסות/הוצאות לחשבון הזה').should('be.visible');
  });
});
