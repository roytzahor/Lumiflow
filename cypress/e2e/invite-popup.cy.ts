describe('Invite popup flow', () => {
  it('shows confirmation popup for invited user and accepts invite', () => {
    const ownerStamp = Date.now();
    const ownerEmail = `owner+${ownerStamp}@lumiflow.local`;
    const ownerPassword = 'Password123!';

    cy.visit('/auth/signup');
    cy.get('[data-testid="signup-email"]').type(ownerEmail);
    cy.get('[data-testid="signup-password"]').type(ownerPassword);
    cy.get('[data-testid="signup-submit"]').click();

    cy.url().should('include', '/onboarding');
    cy.get('[data-testid="onboarding-template"]').select('אישי + משותף');
    cy.get('[data-testid="onboarding-submit"]').click();
    cy.get('[data-testid="onboarding-continue-dashboard"]').click();

    cy.visit('/settings');
    cy.get('[data-testid="settings-invite-account"]').select(1);
    cy.get('[data-testid="settings-create-invite"]').click();
    cy.get('[data-testid="settings-invite-url"]')
      .should('contain', 'http')
      .invoke('text')
      .then((text) => text.trim())
      .as('inviteUrl');

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

      cy.url().should('include', '/onboarding');
      cy.get('[data-testid="onboarding-template"]').select('אישי בלבד');
      cy.get('[data-testid="onboarding-submit"]').click();
      cy.url().should('eq', `${Cypress.config('baseUrl')}/`);

      cy.visit(inviteUrl);
      cy.url().should('include', '/settings');
      cy.get('[data-testid="invite-popup"]').should('be.visible');
      cy.get('[data-testid="invite-popup-accept"]').click();
      cy.get('[data-testid="invite-popup"]').should('not.exist');
    });
  });
});
