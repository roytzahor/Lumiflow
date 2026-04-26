import { signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Insights Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('loads insights data section', () => {
    const stamp = Date.now();
    const email = `insights+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);

    cy.get('[data-testid="fab-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
    cy.get('[data-testid="quickadd-amount"]').should('be.visible').clear().type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').click();

    cy.contains('₪300', { timeout: 20000 }).should('be.visible');

    cy.visit('/insights');
    cy.url().should('include', '/insights');

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
