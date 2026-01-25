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
                    <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFgwa2LDCSHruoAqzMuprzbc8sirba_1HSdA&s"
                        alt="Meal Planner Logo"
                        className="app-logo"
                    />
                    <h1>Meal Planner</h1>
                </div>

                <ul className="nav-links">
                    <li>
                        <NavLink to="/recipes" className={({ isActive }) => isActive ? 'active' : ''}>
                            📚 Recettes
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/planner" className={({ isActive }) => isActive ? 'active' : ''}>
                            📅 Planning
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/inventory" className={({ isActive }) => isActive ? 'active' : ''}>
                            📦 Stock
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to="/shopping" className={({ isActive }) => isActive ? 'active' : ''}>
                            🛒 Courses
                        </NavLink>
                    </li>
                </ul>

                <div className="sidebar-footer">
                    {user && (
                        <>
                            <p className="user-email">{user.email}</p>
                            <button onClick={signOut} className="btn-signout">
                                Déconnexion
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
