import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NuqsAdapter } from "nuqs/adapters/react-router";
import "./index.css";
import App from "./App.tsx";
import GraphPage from "./pages/GraphPage.tsx";
import Landing from "./pages/Landing.tsx";
import SignIn from "./pages/SignIn.tsx";
import BetaTest from "./pages/BetaTest.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import EmailSent from "./pages/EmailSent.tsx";
import Event from "./pages/Event.tsx";
import EventsPage from "./pages/EventsPage.tsx";
import GoalsPage from "./pages/GoalsPage.tsx";
import GoalPage from "./pages/GoalPage.tsx";
import ReportPage from "./pages/ReportPage.tsx";
import ExperimentsPage from "./pages/ExperimentsPage.tsx";
import Experiment from "./pages/Experiment.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import RecordsPage from "./pages/RecordsPage.tsx";
import NotebookEntriesPage from "./pages/NotebookEntriesPage.tsx";
import DevelopmentPage from "./pages/DevelopmentPage.tsx";
import VirtualFieldsPage from "./pages/VirtualFieldsPage.tsx";
import { NotFoundPage } from "./pages/NotFound.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import NavigationPage from "./pages/NavigationPage.tsx";

/**
 * Основная функция рендеринга приложения с маршрутами.
 * Настраивает пути для чата, графа и редирект с главной.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* NuqsAdapter необходим для работы useQueryState из библиотеки nuqs с React Router */}
      <NuqsAdapter>
        <Routes>
          <Route path="/" element={<Landing />} /> {/* Landing страница */}
          <Route path="/sign-in" element={<SignIn />} />
          {/* <Route path="/sign-up" element={<SignUp />} /> */} {/* Временно скрыта */}
          <Route path="/beta-test" element={<BetaTest />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/email-sent" element={<EmailSent />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Защищенные маршруты - доступны только авторизованным пользователям */}
          <Route path="/navigation" element={<ProtectedRoute><NavigationPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute><GraphPage /></ProtectedRoute>} />
          <Route path="/event/:id" element={<ProtectedRoute><Event /></ProtectedRoute>} />
          <Route path="/event" element={<ProtectedRoute><Event /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
          <Route path="/records/notebook/:notebookId" element={<ProtectedRoute><NotebookEntriesPage /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute><GoalsPage /></ProtectedRoute>} />
          <Route path="/development" element={<ProtectedRoute><DevelopmentPage /></ProtectedRoute>} />
          <Route path="/goals/:id" element={<ProtectedRoute><GoalPage /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/experiments" element={<ProtectedRoute><ExperimentsPage /></ProtectedRoute>} />
          <Route path="/virtual-fields" element={<ProtectedRoute><VirtualFieldsPage /></ProtectedRoute>} />
          <Route path="/experiment/:id" element={<ProtectedRoute><Experiment /></ProtectedRoute>} />
          <Route path="/experiment" element={<ProtectedRoute><Experiment /></ProtectedRoute>} />
          <Route path="/memoirs" element={<Navigate to="/report" replace />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          {/* /mbti-test убран — редирект на профиль */}
          <Route path="/mbti-test" element={<Navigate to="/profile" replace />} />

          <Route path="*" element={<NotFoundPage />} /> {/* 404 страница */}
        </Routes>
      </NuqsAdapter>
    </BrowserRouter>
  </React.StrictMode>
);
