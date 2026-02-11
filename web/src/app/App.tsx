import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardShell } from '@/app/layout/DashboardShell';
import { SoundboardPage } from '@/features/soundboard/SoundboardPage';
import { ManagePage } from '@/features/manage/ManagePage';
import { SettingsPage } from '@/features/settings/SettingsPage';

function DashboardRoutes() {
  return (
    <DashboardShell>
      <Routes>
        <Route path="soundboard" element={<SoundboardPage />} />
        <Route path="manage" element={<ManagePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="soundboard" replace />} />
      </Routes>
    </DashboardShell>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/soundboard" replace />} />
      <Route path="/app/*" element={<DashboardRoutes />} />
      <Route path="*" element={<Navigate to="/app/soundboard" replace />} />
    </Routes>
  );
}
