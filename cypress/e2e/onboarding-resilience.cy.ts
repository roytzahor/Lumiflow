function signUpAndLandOnOnboarding(email: string, password: string) {
  cy.visit('/auth/signup');
  cy.get('[data-testid="signup-email"]').type(email);
  cy.get('[data-testid="signup-password"]').type(password);
  cy.get('[data-testid="signup-submit"]').click({ force: true });
  cy.url({ timeout: 30000 }).should((url) => {
    expect(
      url,
      'After signup, URL should include /onboarding. If you stay on /auth/signup, /api/auth/register or sign-in failed — start Postgres (e.g. docker compose up -d postgres), run yarn prisma migrate deploy, and ensure DATABASE_URL in .env matches, or run: yarn test:e2e:onboarding-resilience:local',
    ).to.include('/onboarding');
  });
}

function completePersonalOnlyOnboarding() {
  const submitOnboardingWithStaleRetry = (attempt = 0) => {
    cy.get('[data-testid="onboarding-submit"]').click({ force: true });
    cy.get('body', { timeout: 15000 }).then(($body) => {
      if ($body.find('[data-testid="onboarding-continue-dashboard"]').length > 0) return;
      if ($body.text().includes('הסשן התיישן') && attempt < 4) {
        cy.wait(500);
        submitOnboardingWithStaleRetry(attempt + 1);
      }
    });
  };

  cy.get('[data-testid="onboarding-template-personalOnly"]').click();
  cy.contains('button', 'המשך').click({ force: true });
  cy.contains('button', 'המשך').click({ force: true });
  cy.contains('button', 'המשך').click({ force: true });
  cy.contains('button', 'המשך').click({ force: true });
  submitOnboardingWithStaleRetry();
  // Always wait for the success screen; the old body().find branch could run before the DOM
  // updated and call cy.visit('/') while still on the wizard, skipping onboarding completion.
  cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 45000 })
    .should('be.visible')
    .click({ force: true });
}

describe('Onboarding resilience', () => {
  it('shows split controls only when additional account is selected', () => {
    const stamp = Date.now();
    const email = `split-visibility+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpAndLandOnOnboarding(email, password);
    cy.get('[data-testid="onboarding-template-personalOnly"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-auto-split"]').should('not.exist');
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.contains('button', 'חזרה').click({ force: true });
    cy.contains('button', 'חזרה').click({ force: true });
    cy.get('[data-testid="onboarding-template-personalShared"]').click({ force: true });
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-account-card"]', { timeout: 15000 }).should('have.length', 2);
    cy.get('[data-testid="onboarding-account-type-1"]').should('have.value', 'SHARED');
    cy.get('[data-testid="onboarding-account-card"]')
      .eq(1)
      .find('[data-testid="onboarding-account-name"]')
      .should('have.value', 'חשבון משותף');
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-monthly-income"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="onboarding-auto-split"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-monthly-income"]').type('9000');
    cy.get('[data-testid="onboarding-auto-split"]').check({ force: true });
    cy.get('[data-testid="onboarding-personal-split-slider"]', { timeout: 15000 }).should('be.visible');
    cy.contains('אישי ₪').should('be.visible');
    cy.get('[data-testid="onboarding-auto-split"]').uncheck({ force: true });
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('not.exist');
    cy.get('[data-testid="onboarding-auto-split"]').check({ force: true });
    cy.get('[data-testid="onboarding-personal-split-slider"]', { timeout: 15000 }).should('be.visible');
  });

  it('keeps the wizard usable after reload', () => {
    const stamp = Date.now();
    const email = `draft+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpAndLandOnOnboarding(email, password);
    cy.get('[data-testid="onboarding-template-personalShared"]').click();
    cy.contains('button', 'המשך').click({ force: true });
    cy.contains('הגדרת חשבונות', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="onboarding-account-card"]', { timeout: 15000 }).should('have.length', 2);
    cy.get('[data-testid="onboarding-account-type-1"]').should('have.value', 'SHARED');
    cy.get('[data-testid="onboarding-account-card"]')
      .eq(1)
      .find('[data-testid="onboarding-account-name"]')
      .should('have.value', 'חשבון משותף');
    cy.reload();
    cy.url().should('include', '/onboarding');
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="onboarding-account-card"]').length === 0) {
        cy.contains('button', 'המשך').click({ force: true });
      }
    });
    cy.get('[data-testid="onboarding-account-card"]', { timeout: 15000 }).should('have.length.at.least', 1);
    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="onboarding-monthly-income"]', { timeout: 15000 }).should('be.visible');
  });

  it('shows dashboard retry state without bouncing to onboarding', () => {
    const stamp = Date.now();
    const email = `retry+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpAndLandOnOnboarding(email, password);
    completePersonalOnlyOnboarding();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visit('/?dashboardFail=1');
    cy.contains('לא הצלחנו לטעון את הדשבורד', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="dashboard-retry"]').should('be.visible').click({ force: true });
    cy.url().should('not.include', '/onboarding');
  });
});
