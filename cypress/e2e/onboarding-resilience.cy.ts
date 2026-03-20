function completePersonalOnlyOnboarding() {
  cy.get('[data-testid="onboarding-template-personalOnly"]').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  cy.contains('button', 'המשך').click();
  cy.get('[data-testid="onboarding-submit"]').click();
  cy.contains('מוכן! החשבונות נוצרו בהצלחה').should('be.visible');
  cy.visit('/');
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
    cy.get('[data-testid="onboarding-shared"]').check();
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
    cy.get('[data-testid="onboarding-shared"]').check();
    cy.get('[data-testid="onboarding-shared-name"]').clear().type('בית חכם');

    cy.reload();

    cy.contains('מצאנו טיוטת אשף קודמת').should('be.visible');
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-shared-name"]').should('have.value', 'בית חכם');
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
