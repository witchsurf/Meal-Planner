/**
 * Layout Component
 * 
 * Main layout with navigation sidebar and content area.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function Layout() {
    const { user, signOut } = useAuth();

    return (
        <div className="app-layout">
            {/* Sidebar Navigation */}
            <nav className="sidebar">
                <div className="sidebar-header">
                    <h1>🍽️ Meal Planner</h1>
                </div>

                <ul className="nav-links">
                    <li>
                        <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
                            📚 Recipes
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''}>
                            📅 Weekly Planner
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
                            🛒 Shopping List
                        </NavLink>
                    </li>
                </ul>

                <div className="sidebar-footer">
                    {user && (
                        <>
                            <p className="user-email">{user.email}</p>
                            <button onClick={signOut} className="btn-signout">
                                Sign Out
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
