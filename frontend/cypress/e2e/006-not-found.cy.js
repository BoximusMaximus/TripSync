describe("Not Found Page", () => {
  const username = `notfounduser${Date.now()}`;
  const email = `${username}@example.com`;
  const password = "Password123!";

  before(() => {
    // Sign up test user
    cy.request({
      method: "POST",
      url: "/api/v1/users/signup/",
      body: {
        username,
        email,
        password,
      },
    });

    cy.clearCookies();
  });

  beforeEach(() => {
    // Log in
    cy.visit("/");

    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);

    cy.contains("button", "Login").click();

    cy.url().should("include", "/home");

    // Go to a route that doesn't exist
    cy.visit("/this-page-does-not-exist");
  });

  it("displays the 404 page", () => {
    cy.contains("404").should("be.visible");

    cy.contains("Looks Like You Took a Wrong Turn").should(
      "be.visible",
    );

    cy.get('img[alt="Lost traveler"]').should("be.visible");
  });

  it("returns to TripSync", () => {
    cy.get('[data-cy="notFound-btn"]').click();

    cy.url().should("include", "/home");
  });
});
