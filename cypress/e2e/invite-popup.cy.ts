describe('Invite popup flow', () => {
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

  it('shows confirmation popup for invited user and accepts invite', () => {
    const ownerStamp = Date.now();
    const ownerEmail = `owner+${ownerStamp}@lumiflow.local`;
    const ownerPassword = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(ownerEmail);
    cy.get('[data-testid="signup-password"]').type(ownerPassword);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url({ timeout: 15000 }).should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template-personalShared"]').click();
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    cy.get('[data-testid="onboarding-auto-split"]').should('be.visible');
    cy.get('[data-testid="onboarding-monthly-income"]').type('11000');
    cy.get('[data-testid="onboarding-auto-split"]').check({ force: true });
    cy.get('[data-testid="onboarding-personal-split-slider"]').should('be.visible');
    cy.contains('אישי ₪').should('be.visible');
    cy.contains('button', 'המשך').click();
    cy.contains('button', 'המשך').click();
    submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 15000 }).should('be.visible').click();
    cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

    cy.visit('/settings');
    cy.get('button[aria-label^="שיתוף חשבון"]').first().click();
    cy.contains('button', 'צור קישור הזמנה').click();
    cy.get('[data-testid="settings-invite-url"]')
      .should('contain', 'http')
      .invoke('text')
      .then((text) => text.trim())
      .as('inviteUrl');
    cy.contains('button', 'סגור').click();

    cy.get('[data-testid="settings-signout"]').click();
    cy.url().should('include', '/auth/signin');

    cy.get('@inviteUrl').then((inviteText) => {
      const inviteUrl = String(inviteText).trim();
      const invitedStamp = Date.now() + 1;
      const invitedEmail = `member+${invitedStamp}@lumiflow.local`;
      const invitedPassword = 'Password123!';

      cy.visit('/auth/signup');
      cy.get('[data-testid="signup-email"]').type(invitedEmail);
      cy.get('[data-testid="signup-password"]').type(invitedPassword);
      cy.get('[data-testid="signup-submit"]').click();

      cy.url({ timeout: 15000 }).should('include', '/onboarding');
      cy.get('[data-testid="onboarding-template-personalOnly"]').click();
      cy.contains('button', 'המשך').click();
      cy.contains('button', 'המשך').click();
      cy.contains('button', 'המשך').click();
      cy.contains('button', 'המשך').click();
      submitOnboardingWithStaleRetry();
    cy.get('[data-testid="onboarding-continue-dashboard"]', { timeout: 15000 }).should('be.visible').click();
      cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

      cy.visit(inviteUrl);
      cy.url().should('include', '/settings');
      cy.get('[data-testid="invite-popup"]').should('be.visible');
      cy.get('[data-testid="invite-popup-accept"]').click();
      cy.get('[data-testid="invite-popup"]').should('not.exist');
    });
  });
});
