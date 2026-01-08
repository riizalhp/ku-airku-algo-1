
import React, { useState, FormEvent, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Role } from './types';
import { AdminView } from './components/admin/AdminView';
import { SalesView } from './components/sales/SalesView';
import { DriverView } from './components/driver/DriverView';
import { useAppContext } from './hooks/useAppContext';
import { registerUser } from './services/userApiService';

const LoginView: React.FC<{ onSwitchToRegister: () => void }> = ({ onSwitchToRegister }) => {
    const { login } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err: any) {
            // Supabase error format
            setError(err.message || 'Login gagal. Silakan coba lagi.');
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
            <div className="text-center">
                <img src="https://pdampintar.id/wp-content/uploads/2021/12/LOGO_16.-PDAM-Tirta-Binangun-Kabupaten-Kulon-Progo.png" alt="PDAM Tirta Binangun Logo" className="mx-auto h-20 w-auto" />
                <h1 className="mt-6 text-4xl font-bold text-brand-dark">KU AIRKU</h1>
                <p className="mt-2 text-gray-600">Sistem Manajemen Distribusi</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                <div className="relative">
                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Alamat Email"/>
                </div>
                <div className="relative">
                    <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary" placeholder="Password"/>
                </div>
                <div>
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark disabled:bg-gray-400">
                        {isLoading ? (<svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>) : "Masuk"}
                    </button>
                </div>
            </form>
            <p className="text-sm text-center text-gray-600">
                Belum punya akun?{' '}
                <button onClick={onSwitchToRegister} className="font-medium text-brand-primary hover:text-brand-dark">
                    Daftar di sini
                </button>
            </p>
        </div>
    );
}

const RegistrationView: React.FC<{ onSwitchToLogin: () => void }> = ({ onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.SALES);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Password dan konfirmasi password tidak cocok.');
            return;
        }
        setIsLoading(true);
        try {
            const result = await registerUser({ name, email, password, role });
            setSuccess(result.message);
            // Optionally auto-switch to login after a delay
            setTimeout(() => onSwitchToLogin(), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registrasi gagal. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-xl">
            <div className="text-center">
                <img src="https://pdampintar.id/wp-content/uploads/2021/12/LOGO_16.-PDAM-Tirta-Binangun-Kabupaten-Kulon-Progo.png" alt="PDAM Tirta Binangun Logo" className="mx-auto h-20 w-auto" />
                <h1 className="mt-6 text-4xl font-bold text-brand-dark">Buat Akun Baru</h1>
                <p className="mt-2 text-gray-600">Daftar untuk memulai</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
                {success && <div className="p-3 bg-green-100 text-green-700 rounded-md text-sm">{success}</div>}
                <input type="text" placeholder="Nama Lengkap" required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md"/>
                <input type="email" placeholder="Alamat Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md"/>
                <select 
                    name="role"
                    value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md bg-white"
                    required
                >
                    {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
                <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md"/>
                <input type="password" placeholder="Konfirmasi Password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-md"/>
                <button type="submit" disabled={isLoading || !!success} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-dark disabled:bg-gray-400">
                    {isLoading ? 'Mendaftarkan...' : 'Daftar'}
                </button>
            </form>
            <p className="text-sm text-center text-gray-600">
                Sudah punya akun?{' '}
                <button onClick={onSwitchToLogin} className="font-medium text-brand-primary hover:text-brand-dark">
                    Masuk di sini
                </button>
            </p>
        </div>
    );
};

const AuthView: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isRegisterPage = location.pathname === '/register';

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-background">
            {isRegisterPage ? (
                <RegistrationView onSwitchToLogin={() => navigate('/login')} />
            ) : (
                <LoginView onSwitchToRegister={() => navigate('/register')} />
            )}
        </div>
    );
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: Role }> = ({ children, allowedRole }) => {
    const { currentUser } = useAppContext();
    const location = useLocation();

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
        // Redirect to appropriate dashboard based on role
        const rolePath = currentUser.role === Role.ADMIN ? '/admin' 
                      : currentUser.role === Role.SALES ? '/sales' 
                      : '/driver';
        return <Navigate to={rolePath} replace />;
    }

    return <>{children}</>;
};


const App: React.FC = () => {
    const { currentUser } = useAppContext();
    const location = useLocation();
    const navigate = useNavigate();

    // Log app version to verify correct build is deployed
    useEffect(() => {
        console.log('📦 KU AIRKU App Version: 2024.01.08.1 - Supabase Auth Only (NO RAILWAY)');
    }, []);

    // Redirect to appropriate dashboard when user logs in
    useEffect(() => {
        if (currentUser && (location.pathname === '/' || location.pathname === '/login')) {
            const rolePath = currentUser.role === Role.ADMIN ? '/admin' 
                          : currentUser.role === Role.SALES ? '/sales' 
                          : '/driver';
            navigate(rolePath, { replace: true });
        }
    }, [currentUser, location.pathname, navigate]);

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
                currentUser ? (
                    <Navigate to={
                        currentUser.role === Role.ADMIN ? '/admin' 
                        : currentUser.role === Role.SALES ? '/sales' 
                        : '/driver'
                    } replace />
                ) : (
                    <AuthView />
                )
            } />
            <Route path="/register" element={
                currentUser ? (
                    <Navigate to={
                        currentUser.role === Role.ADMIN ? '/admin' 
                        : currentUser.role === Role.SALES ? '/sales' 
                        : '/driver'
                    } replace />
                ) : (
                    <AuthView />
                )
            } />

            {/* Protected Routes */}
            <Route path="/admin/*" element={
                <ProtectedRoute allowedRole={Role.ADMIN}>
                    <AdminView />
                </ProtectedRoute>
            } />
            <Route path="/sales/*" element={
                <ProtectedRoute allowedRole={Role.SALES}>
                    <SalesView />
                </ProtectedRoute>
            } />
            <Route path="/driver/*" element={
                <ProtectedRoute allowedRole={Role.DRIVER}>
                    <DriverView />
                </ProtectedRoute>
            } />

            {/* Default Route */}
            <Route path="/" element={
                currentUser ? (
                    <Navigate to={
                        currentUser.role === Role.ADMIN ? '/admin' 
                        : currentUser.role === Role.SALES ? '/sales' 
                        : '/driver'
                    } replace />
                ) : (
                    <Navigate to="/login" replace />
                )
            } />

            {/* 404 Not Found */}
            <Route path="*" element={
                <div className="flex items-center justify-center min-h-screen bg-brand-background">
                    <div className="text-center">
                        <h1 className="text-6xl font-bold text-brand-dark">404</h1>
                        <p className="mt-4 text-xl text-gray-600">Halaman tidak ditemukan</p>
                        <button 
                            onClick={() => navigate('/')}
                            className="mt-6 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-dark"
                        >
                            Kembali ke Beranda
                        </button>
                    </div>
                </div>
            } />
        </Routes>
    );
};

export default App;
