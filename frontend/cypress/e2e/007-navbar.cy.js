describe("Navbar", () => {
  const username = `navuser${Date.now()}`;
  const email = `${username}@example.com`;
  const password = "Password123!";

  before(() => {
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
    cy.visit("/");

    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);

    cy.contains("button", "Login").click();

    cy.url().should("include", "/home");
  });

  it("shows the full navbar when logged in", () => {
    cy.get('[data-cy="navbar"]').should("be.visible");

    cy.get('[data-cy="nav-brand"]')
      .should("be.visible")
      .and("contain", "TripSync");

    cy.get('[data-cy="nav-home"]').should("be.visible");
    cy.get('[data-cy="nav-groups"]').should("be.visible");
    cy.get('[data-cy="nav-trips"]').should("be.visible");
    cy.get('[data-cy="nav-about"]').should("be.visible");
    cy.get('[data-cy="nav-profile"]').should("be.visible");
    cy.get('[data-cy="nav-logout"]').should("be.visible");
  });

  it("navigates to the about page", () => {
    cy.get('[data-cy="nav-about"]').click();

    cy.url().should("include", "/about");
    cy.contains("Team 2").should("be.visible");
  });

  it("logs the user out", () => {
    cy.get('[data-cy="nav-logout"]').click();

    cy.url().should("eq", Cypress.config("baseUrl"));

    cy.contains("Welcome back").should("be.visible");

    cy.get('[data-cy="nav-links"]').should("not.exist");
  });
});
