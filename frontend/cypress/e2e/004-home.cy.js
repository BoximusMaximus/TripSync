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
    // Log in before each Home test
    cy.visit("/");

    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);

    cy.contains("button", "Login").click();

    cy.url().should("include", "/home");
  });

  it("loads the home dashboard", () => {
    cy.contains("Loading your dashboard").should("exist");

    cy.contains("Loading your dashboard").should(
      "not.exist",
    );

    cy.contains("View Trip Details").should("be.visible");
  });

  it("shows the group and trip cards", () => {
    // These come from mockHomeData
    cy.get("body").should("not.contain", "No group yet");
    cy.get("body").should("not.contain", "No active trip");
  });

  it("can navigate to trip details", () => {
    cy.contains("button", "View Trip Details").click();

    cy.url().should("include", "/trips/");
  });
});
