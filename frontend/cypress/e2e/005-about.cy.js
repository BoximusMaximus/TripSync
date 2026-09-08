describe("About Page", () => {
  const username = `aboutuser${Date.now()}`;
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

    cy.visit("/about");
  });

  it("loads the about page", () => {
    cy.url().should("include", "/about");

    cy.contains("Team 2").should("be.visible");

    cy.contains(
      "TripSync helps groups coordinate destinations and activities",
    ).should("be.visible");
  });

  it("displays all team members", () => {
    cy.contains("Cody").should("be.visible");
    cy.contains("Dom").should("be.visible");
    cy.contains("Kaylee").should("be.visible");
    cy.contains("Mohamed").should("be.visible");
    cy.contains("Simon").should("be.visible");
    cy.contains("Abdel").should("be.visible");
  });
});
