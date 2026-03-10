import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { useProfiles } from './hooks/useProfiles';
import OnboardingScreen from './components/OnboardingScreen';
import LogScreen from './components/LogScreen';
import AdminDashboard from './components/AdminDashboard';

function MainApp() {
  const { profiles, activeProfile, addProfile, switchProfile, hasProfiles } = useProfiles();
  const [addingNew, setAddingNew] = useState(false);

  if (!hasProfiles || addingNew) {
    return (
      <OnboardingScreen
        onSave={(profile) => {
          addProfile(profile);
          setAddingNew(false);
        }}
      />
    );
  }

  return (
    <LogScreen
      profile={activeProfile}
      profiles={profiles}
      activeProfileIndex={profiles.indexOf(activeProfile)}
      onSwitchProfile={switchProfile}
      onAddNew={() => setAddingNew(true)}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}
