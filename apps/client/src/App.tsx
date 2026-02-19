import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { GeneratePage } from './pages/Generate';
import { PreviewPage } from './pages/Preview';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/resume/:id" element={<PreviewPage />} />
      </Route>
    </Routes>
  );
}
