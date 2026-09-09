describe("Home Page", () => {
  const username = `homeuser${Date.now()}`;
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

  it("navigates to the home page", () => {
    cy.url().should("include", "/home");
  });

  it("shows the page", () => {
    cy.get("body").should("be.visible");
  });

  it("shows the TripSync navigation", () => {
    cy.contains("TripSync").should("be.visible");
  });
});
