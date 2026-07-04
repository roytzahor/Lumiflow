import { openQuickAddSheet, setMonthlyContributionFromSettings, signUpThroughWelcome } from '../support/lumiflow-helpers';

describe('Quick Add Flow', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('NEXT_REDIRECT')) {
      return false;
    }
    return true;
  });

  it('adds an expense and verifies balance updates', () => {
    const stamp = Date.now();
    const email = `quickadd+${stamp}@lumiflow.local`;
    const password = 'Password123!';

    signUpThroughWelcome(email, password);
    setMonthlyContributionFromSettings('10000');

    cy.get('body', { timeout: 20000 }).should('contain.text', '10,000');

    openQuickAddSheet();
    cy.get('[data-testid="quickadd-amount"]').clear().type('500');
    cy.get('[data-testid="quickadd-description"]').type('Groceries');

    cy.get('[data-testid="quickadd-submit"]').scrollIntoView().click({ force: true });

    // S7-7: the sheet stays open after a save; the success banner carries the saved amount.
    cy.get('[data-testid="quickadd-save-success"]', { timeout: 20000 })
      .should('be.visible')
      .within(() => {
        cy.contains(/₪500(?!\d)/).should('be.visible');
      });

    // The form resets after saving, so the sheet closes without a dismiss guard.
    cy.get('[data-testid="quickadd-open-close"]').click({ force: true });
    cy.get('[data-testid="quickadd-sheet-dialog"]').should('not.exist');
    cy.contains(/₪9[,\u202f]500/, { timeout: 20000 }).should('be.visible');
  });

  it('normalises a comma decimal amount and saves it (S7-1/S7-7)', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`quickadd-comma+${stamp}@lumiflow.local`, 'Password123!');

    openQuickAddSheet();

    // iOS Hebrew keyboard emits ',' — the input normalises it to '.' as you type.
    cy.get('[data-testid="quickadd-amount"]').clear().type('12,50').should('have.value', '12.50');
    cy.get('[data-testid="quickadd-description"]').type('קפה');

    cy.get('[data-testid="quickadd-submit"]').scrollIntoView().click({ force: true });

    // S7-7: successful save keeps the sheet open, shows a success banner, and resets the form.
    cy.get('[data-testid="quickadd-save-success"]', { timeout: 20000 }).should('be.visible');
    cy.contains('נוסף בהצלחה').should('be.visible');
    cy.get('[data-testid="quickadd-amount"]').should('have.value', '');
  });

  it('previews the installment split total (S7-2)', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`quickadd-installments+${stamp}@lumiflow.local`, 'Password123!');

    openQuickAddSheet();
    cy.get('[data-testid="quickadd-amount"]').clear().type('1000');
    cy.get('[data-testid="quickadd-installment-preview"]').should('not.exist');

    // The input is controlled and clear() snaps back to 1, so overwrite via select-all.
    cy.get('[data-testid="quickadd-installments"]').scrollIntoView().type('{selectall}5');

    cy.get('[data-testid="quickadd-installment-preview"]')
      .scrollIntoView()
      .should('be.visible')
      .invoke('text')
      .should((text) => {
        expect(text).to.include('5 תשלומים');
        expect(text).to.include('₪200');
        expect(text).to.match(/₪1[, ]000/);
        expect(text).to.include('סה״כ');
      });

    // Back to a single payment hides the preview again.
    cy.get('[data-testid="quickadd-installments"]').type('{selectall}1');
    cy.get('[data-testid="quickadd-installment-preview"]').should('not.exist');
  });

  it('guards a dirty form against dismissal but closes a clean one (S7-3)', () => {
    const stamp = Date.now();
    signUpThroughWelcome(`quickadd-dismiss+${stamp}@lumiflow.local`, 'Password123!');

    // A clean form closes immediately, without a confirmation.
    openQuickAddSheet();
    cy.get('[data-testid="quickadd-open-close"]').click({ force: true });
    cy.get('[data-testid="quickadd-dismiss-confirm"]').should('not.exist');
    cy.get('[data-testid="quickadd-sheet-dialog"]').should('not.exist');

    // A dirty form asks for confirmation; "המשך" keeps it open, "סגור" dismisses.
    openQuickAddSheet();
    cy.get('[data-testid="quickadd-amount"]').clear().type('250');
    cy.get('[data-testid="quickadd-open-close"]').click({ force: true });
    cy.get('[data-testid="quickadd-dismiss-confirm"]', { timeout: 10000 })
      .scrollIntoView()
      .should('be.visible');

    cy.contains('button', 'המשך').click({ force: true });
    cy.get('[data-testid="quickadd-dismiss-confirm"]').should('not.exist');
    cy.get('[data-testid="quickadd-amount"]').should('have.value', '250');

    cy.get('[data-testid="quickadd-open-close"]').click({ force: true });
    cy.get('[data-testid="quickadd-dismiss-confirm"]', { timeout: 10000 }).scrollIntoView().should('be.visible');
    cy.get('[data-testid="quickadd-dismiss-confirm"]').within(() => {
      cy.contains('button', 'סגור').click({ force: true });
    });
    cy.get('[data-testid="quickadd-sheet-dialog"]').should('not.exist');
  });
});
