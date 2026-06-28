import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Detail from "@/pages/Detail";
import Glossary from "@/pages/Glossary";
import Log from "@/pages/Log";
import "./index.css";

// HashRouter：GitHub Pages サブパスで 404.html 不要（#/paper/<id>）
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/paper/:id" element={<Detail />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/log" element={<Log />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
