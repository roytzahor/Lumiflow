import {
  signUpThroughWelcome,
  setMonthlyIncomeFromSettings,
  setMonthlyContributionFromSettings,
} from '../support/lumiflow-helpers';

/**
 * Desktop (lg+) shell: sidebar replaces the bottom tab bar, Quick Add opens from
 * the sidebar, and the header segmented control switches the dashboard scope.
 * Viewport must stay ≤1280 wide — headless Electron's window is 1280 and wider
 * viewports get cropped in screenshots (LESSONS.md 2026-07-06).
 */
describe('Desktop shell (lg+)', () => {
  it('shows the sidebar, hides mobile nav, switches scope, and opens Quick Add', () => {
    // Data setup uses the mobile-idiom helpers (bottom nav), so run it below lg.
    cy.viewport(390, 844);
    const stamp = Date.now();
    signUpThroughWelcome(`desktop+${stamp}@lumiflow.local`, 'Password123!');
    setMonthlyIncomeFromSettings('10000');
    setMonthlyContributionFromSettings('10000');

    cy.viewport(1280, 800);
    cy.visit('/');

    // Shell swap: sidebar in, mobile chrome out (still in DOM, just hidden).
    cy.get('[data-testid="sidebar-add-button"]', { timeout: 20000 }).should('be.visible');
    cy.get('[data-testid="fab-add-button"]').should('not.be.visible');
    cy.get('[data-testid="bottom-nav-settings"]').should('not.be.visible');

    // Header segmented control switches scope through the ?account= param.
    cy.get('[data-testid="dashboard-scope-selector"]').should('be.visible');
    cy.get('[data-testid="dashboard-scope-selector"]').contains('button', 'הכל').click();
    cy.url({ timeout: 10000 }).should('include', 'account=all');

    // Sidebar navigation works; going back restores the scoped dashboard URL.
    cy.get('[data-testid="sidebar-nav-settings"]').click();
    cy.url({ timeout: 20000 }).should('include', '/settings');
    cy.go('back');
    cy.url({ timeout: 20000 }).should('include', 'account=all');

    // Quick Add opens from the sidebar as a centered modal.
    cy.get('[data-testid="sidebar-add-button"]').click({ force: true });
    cy.get('[data-testid="quickadd-amount"]', { timeout: 15000 }).should('be.visible');
  });
});
