import { useEffect, useState } from "react";
import { Landing } from "./components/Landing";
import { StudentActivity } from "./components/student/StudentActivity";
import { TeacherConsole } from "./components/TeacherConsole";
import type { ViewKey } from "./lib/types";

declare global {
  interface Window {
    __LAB_BOOT_MODE__?: "student" | "teacher";
  }
}

function viewFromHash(): ViewKey {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  if (["docente", "teacher", "consola"].includes(hash)) return "teacher";
  if (["estudiante", "student", "actividad"].includes(hash)) return "student";
  return "home";
}

function readInitialView(): ViewKey {
  const fromHash = viewFromHash();
  if (fromHash !== "home") return fromHash;
  if (window.__LAB_BOOT_MODE__ === "teacher") return "teacher";
  if (window.__LAB_BOOT_MODE__ === "student") return "student";
  return fromHash;
}

export default function App() {
  const [view, setView] = useState<ViewKey>(readInitialView);

  useEffect(() => {
    const titles: Record<ViewKey, string> = {
      home: "GASLAB 9° · Leyes de los gases y difusión",
      student: "Actividad del estudiante · GASLAB 9°",
      teacher: "Consola docente · GASLAB 9°",
    };
    document.title = titles[view];
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    const handleHash = () => setView(readInitialView());
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  function navigate(next: ViewKey) {
    setView(next);
    const hash = next === "home" ? "" : next === "student" ? "#estudiante" : "#docente";
    try {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    } catch {
      /* algunos entornos embebidos restringen el historial */
    }
  }

  function openStudentTab() {
    try {
      const url = new URL(window.location.href);
      url.hash = "estudiante";
      const opened = window.open(url.toString(), "_blank");
      if (opened) opened.opener = null;
      if (!opened) navigate("student");
    } catch {
      navigate("student");
    }
  }

  if (view === "student") {
    return <StudentActivity onExit={() => navigate("home")} onOpenTeacher={() => navigate("teacher")} />;
  }

  if (view === "teacher") {
    return <TeacherConsole onExit={() => navigate("home")} onOpenStudent={openStudentTab} />;
  }

  return <Landing onStartStudent={() => navigate("student")} onOpenTeacher={() => navigate("teacher")} />;
}
