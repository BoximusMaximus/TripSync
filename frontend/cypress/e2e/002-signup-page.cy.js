describe("Signup Page", () => {
  it("loads the signup page", () => {
    cy.visit("/signup");

    cy.contains("Create an account");
    cy.contains("Sign up to start planning your trip.");

    cy.get('input[name="username"]').should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");

    cy.contains("button", "Signup").should("be.visible");
  });

  it("allows user to fill out the signup form", () => {
    cy.visit("/signup");

    cy.get('input[name="username"]')
      .type("testuser")
      .should("have.value", "testuser");

    cy.get('input[name="email"]')
      .type("testuser@example.com")
      .should("have.value", "testuser@example.com");

    cy.get('input[name="password"]')
      .type("Password123!")
      .should("have.value", "Password123!");
  });

  it("creates an account successfully", () => {
    const username = `testuser${Date.now()}`;

    cy.visit("/signup");

    cy.get('input[name="username"]').type(username);
    cy.get('input[name="email"]').type(
      `${username}@example.com`,
    );
    cy.get('input[name="password"]').type("Password123!");

    cy.contains("button", "Signup").click();

    cy.url().should("include", "/home");
  });
});
