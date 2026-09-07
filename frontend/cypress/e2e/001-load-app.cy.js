describe("Test 01", () => {
  it("will test if app loads", () => {
    cy.visit("/");
    cy.get('[data-cy="greeting"]');
    cy.contains("Welcome back");
  });
});
