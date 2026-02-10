import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import FormList from './pages/admin/FormList';
import FormDesigner from './pages/admin/FormDesigner';
import Submissions from './pages/admin/Submissions';
import ChartBuilder from './pages/admin/ChartBuilder';
import Dashboard from './pages/admin/Dashboard';
import PublicForm from './pages/PublicForm';

function Protected({ children, adminOnly }) {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/form/:slug" element={<PublicForm />} />
      <Route path="/admin" element={<Protected><Layout /></Protected>}>
        <Route index element={<Navigate to="/admin/forms" replace />} />
        <Route path="forms" element={<FormList />} />
        <Route path="forms/:id" element={<Protected adminOnly><FormDesigner /></Protected>} />
        <Route path="submissions/:formId" element={<Submissions />} />
        <Route path="charts" element={<ChartBuilder />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
