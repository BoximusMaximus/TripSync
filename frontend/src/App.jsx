import "./App.css";

import { Outlet, useLoaderData } from "react-router-dom";

import { useState } from "react";

import NavBar from "./components/Navbar/NavBar";


function App() {
  const loaderUser = useLoaderData();

  const [user, setUser] = useState(loaderUser);

  return (
    <>
      <NavBar user={user} setUser={setUser} />

      <Outlet
        context={{
          user,
          setUser,
        }}
      />
    </>
  );
}

export default App;
