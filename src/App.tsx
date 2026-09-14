import { AuthGate } from './features/auth/AuthGate';
import { PlanningApp } from './features/planning/PlanningApp';
import { TestRoleProvider } from './lib/testRole';

function App() {
  return (
    <TestRoleProvider>
      <AuthGate>
        <PlanningApp />
      </AuthGate>
    </TestRoleProvider>
  );
}

export default App;
