import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.tsx';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import { LanguageProvider } from './LanguageContext';
import './index.css';

// Fetch interceptor to attach JWT token
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const token = localStorage.getItem("token");
  let [resource, config] = args;
  if (typeof resource === "string" && resource.startsWith("/api") && token) {
    config = config || {};
    config.headers = {
      ...config.headers,
      "Authorization": `Bearer ${token}`
    };
  }
  const response = await originalFetch(resource, config);
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (window.location.pathname !== "/login" && window.location.pathname !== "/register" && window.location.pathname !== "/") {
      window.location.href = "/login";
    }
  }
  return response;
};

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <App />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
);
