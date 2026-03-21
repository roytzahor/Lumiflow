function completePersonalOnlyOnboarding() {
  const submitOnboardingWithStaleRetry = () => {
    cy.get('[data-testid="onboarding-submit"]').click();
    cy.get('body').then(($body) => {
      if ($body.text().includes('הסשן התיישן')) {
        cy.wait(400);
        cy.get('[data-testid="onboarding-submit"]').click();
      }
    });
  };

  cy.get('[data-testid="onboarding-template-personalOnly"]').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  submitOnboardingWithStaleRetry();
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="onboarding-continue-dashboard"]').length > 0) {
      cy.get('[data-testid="onboarding-continue-dashboard"]').click();
      return;
    }
    cy.visit('/');
  });
}

describe('Onboarding resilience', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('shows split controls only when additional account is selected', () => {
    const stamp = Date.now();
    const email = `split-visibility+${stamp}@lumiflow.local`;
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
    cy.contains('button', 'חזרה').click();
    cy.get('[data-testid="onboarding-add-account"]').click();
    cy.get('[data-testid="onboarding-account-type"]').last().select('משותף');
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-auto-split"]').should('be.visible');
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-monthly-income"]').type('9000');
    cy.get('[data-testid="onboarding-auto-split"]').check({ force: true });
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('be.visible');
    cy.contains('אישי ₪').should('be.visible');
    cy.get('[data-testid="onboarding-auto-split"]').uncheck();
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-auto-split"]').check();
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('be.visible');
  });

  it('restores wizard draft after reload', () => {
    const stamp = Date.now();
    const email = `draft+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url().should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-custom"]').click();
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-add-account"]').click();
    cy.get('[data-testid="onboarding-account-type"]').last().select('משותף');
    cy.get('[data-testid="onboarding-account-name"]').last().clear().type('בית חכם');

    cy.reload();

    cy.contains('מצאנו טיוטת אשף קודמת').should('be.visible');
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-account-name"]').last().should('have.value', 'בית חכם');
  });

  it('shows dashboard retry state without bouncing to onboarding', () => {
    const stamp = Date.now();
    const email = `retry+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(email);
    cy.get('[data-testid="signup-password"]').type(password);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url().should('include', '/onboarding');
    completePersonalOnlyOnboarding();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visit('/?dashboardFail=1');
    cy.contains('לא הצלחנו לטעון את הדשבורד').should('be.visible');
    cy.get('[data-testid="dashboard-retry"]').should('be.visible').click();
    cy.url().should('not.include', '/onboarding');
  });
});
