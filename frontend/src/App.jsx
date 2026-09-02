import "./App.css";
import { Outlet, useLoaderData } from "react-router-dom";
import { useState } from "react";
import NavBar from "./components/NavBar/NavBar";

function App() {
  const loaderUser = useLoaderData();
  const [user, setUser] = useState(loaderUser);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <NavBar />
        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}

export default App;
