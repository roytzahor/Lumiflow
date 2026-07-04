import { openQuickAddSheet, setMonthlyIncomeFromSettings, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Insights Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('shows the budget nudge instead of insights when no budget is set (S7-9)', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`insights-nobudget+${stamp}@lumiflow.local`, 'Password123!');

    cy.visit('/insights');
    cy.url().should('include', '/insights');

    cy.get('[data-testid="insights-data-section"]').within(() => {
      cy.contains('הגדירו תקציב לפני שמתחילים').should('be.visible');
      cy.contains('a', 'הגדרת תקציב חודשי')
        .should('be.visible')
        .and('have.attr', 'href', '/settings?section=budget');
    });
    cy.contains('שינויים בולטים החודש').should('not.exist');
  });

  it('loads insights data section', () => {
    const stamp = Date.now();
    const email = `insights+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    setMonthlyIncomeFromSettings('10000');
    cy.visit('/');

    openQuickAddSheet();
    cy.get('[data-testid="quickadd-amount"]').clear().type('300');
    cy.get('[data-testid="quickadd-description"]').type('Books');
    cy.get('[data-testid="quickadd-submit"]').scrollIntoView().click({ force: true });

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

  it('shows the not-enough-history empty state with example cards for a new user', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`insights-empty+${stamp}@lumiflow.local`, 'Password123!');
    setMonthlyIncomeFromSettings('10000');

    cy.visit('/insights');
    cy.url().should('include', '/insights');

    cy.contains('h1', 'תובנות').should('be.visible');
    cy.contains('שינויים בולטים החודש').should('be.visible');

    // A fresh account has no spending history, so the empty state + static
    // "this is how it will look" example anomaly cards are rendered.
    cy.get('[data-testid="insights-data-section"]').within(() => {
      cy.contains('עדיין אין מספיק היסטוריה').should('be.visible');
      cy.contains('דוגמה בלבד').should('be.visible');
      cy.contains('מזון').should('be.visible');
      cy.contains('תחבורה').should('be.visible');
      cy.contains('חשבון לדוגמה').should('exist');
    });
  });

  it('renders the example anomaly amounts and direction labels', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`insights-example+${stamp}@lumiflow.local`, 'Password123!');
    setMonthlyIncomeFromSettings('10000');

    cy.visit('/insights');

    // Static example rows from INSIGHTS_EXAMPLE_ROWS: an "up" anomaly (מזון,
    // +₪900 / 60%) and a "down" anomaly (תחבורה, -₪400 / 50%).
    cy.get('[data-testid="insights-data-section"]').within(() => {
      cy.contains('+₪900').should('be.visible');
      cy.contains('עלייה של 60%').should('be.visible');
      cy.contains('-₪400').should('be.visible');
      cy.contains('ירידה של 50%').should('be.visible');
    });
  });
});
