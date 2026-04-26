import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Invite popup flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('shows confirmation popup for invited user and accepts invite', () => {
    const ownerStamp = Date.now();
    const ownerEmail = `owner+${ownerStamp}@lumiflow.local`;
    const ownerPassword = 'Password123!';

    signUpThroughWelcome(ownerEmail, ownerPassword);

    cy.visit('/settings');
    cy.get('[data-testid="settings-add-account"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.get('[role="dialog"]', { timeout: 15000 }).within(() => {
      cy.get('select').first().select('SHARED', { force: true });
      cy.get('input[placeholder="למשל: חשבון הבית"]').clear().type('חשבון בדיקה משותף');
      cy.get('[data-testid="account-popup-monthly-contribution"]').clear().type('0');
      cy.contains('button', 'יצירת חשבון').click({ force: true });
    });

    cy.get('button[aria-label="שיתוף חשבון חשבון בדיקה משותף"]', { timeout: 20000 }).click({ force: true });
    cy.contains('button', 'צור קישור הזמנה').click({ force: true });
    cy.get('[data-testid="settings-invite-url"]', { timeout: 20000 })
      .should('contain', 'http')
      .invoke('text')
      .then((text) => text.trim())
      .as('inviteUrl');
    cy.contains('button', 'סגור').click({ force: true });

    cy.get('[data-testid="settings-signout"]', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.url().should('include', '/auth/signin');

    cy.get('@inviteUrl').then((inviteText) => {
      const inviteUrl = String(inviteText).trim();
      const invitedStamp = Date.now() + 1;
      const invitedEmail = `member+${invitedStamp}@lumiflow.local`;
      const invitedPassword = 'Password123!';

      signUpThroughWelcome(invitedEmail, invitedPassword);

      cy.visit(inviteUrl);
      cy.url({ timeout: 20000 }).should('include', '/settings');
      cy.get('[data-testid="invite-popup"]', { timeout: 30000 }).should('be.visible');
      cy.get('[data-testid="invite-popup-accept"]', { timeout: 20000 }).should('be.visible').click({ force: true });
      cy.get('[data-testid="invite-popup"]', { timeout: 20000 }).should('not.exist');
    });
  });
});
