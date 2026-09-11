describe("Login Page", () => {
  const username = `loginuser${Date.now()}`;
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

  it("logs in successfully", () => {
    cy.visit("/");

    cy.get('input[name="username"]').type(username);
    cy.get('input[name="password"]').type(password);

    cy.contains("button", "Login").click();

    cy.url().should("include", "/home");
  });
});
