/**
 * Main Application Component
 * 
 * Sets up routing, authentication, and layout.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import {
  LoginPage,
  RecipeLibraryPage,
  WeeklyPlannerPage,
  ShoppingListPage,
  InventoryPage,
  RestockingPage,
} from './pages';

import './App.css';
import './seed'; // Makes seedSampleRecipes available in console

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect to recipes */}
            <Route index element={<Navigate to="/recipes" replace />} />

            {/* Main pages */}
            <Route path="recipes" element={<RecipeLibraryPage />} />
            <Route path="planner" element={<WeeklyPlannerPage />} />
            <Route path="shopping" element={<ShoppingListPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="restocking" element={<RestockingPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
