import React from "react";
import { Routes, Route } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import VerifyEmail from "./VerifyEmail";
import Home from "./Home";
import Candidates from "./Candidates"; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/candidates" element={<Candidates />} />
      <Route path="/vote" element={<Candidates />} />
    </Routes>
  );
}

export default App;
