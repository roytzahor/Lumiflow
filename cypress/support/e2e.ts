Cypress.on('uncaught:exception', (err) => {
  // Ignore Next.js internal redirect errors
  if (err.message.includes('NEXT_REDIRECT')) {
    return false;
  }
  // Ignore hydration mismatch errors
  if (err.message.includes('Hydration failed') || err.message.includes('HTML didn\'t match')) {
    return false;
  }
  // Ignore React's internal DOM manipulation errors that happen during hydration recovery
  if (err.message.includes('removeChild') || err.message.includes('insertBefore')) {
    return false;
  }
  return true;
});
