import { useState } from 'react';
import { useTestRole } from '../../lib/testRole';
import type { Person, Project, TimesheetDay } from '../../types';
import { TimesheetDeclare } from './TimesheetDeclare';
import { TimesheetTeamView } from './TimesheetTeamView';

interface TimesheetsProps {
  people: Person[];
  projects: Project[];
  timesheets: TimesheetDay[];
}

type Mode = 'declare' | 'team';

export function Timesheets({ people, projects, timesheets }: TimesheetsProps) {
  const { role } = useTestRole();
  const canSeeTeamView = role === 'admin';
  const [mode, setMode] = useState<Mode>('declare');
  const effectiveMode = canSeeTeamView ? mode : 'declare';

  return (
    <main className="pdc-main">
      <header className="pdc-header">
        <h1>Timesheets</h1>
        <p className="text-muted">
          Déclarez le temps passé sur vos projets, heure par heure. Chaque journée compte 7 heures à affecter.
        </p>
        <div className="pdc-header-rule-thick" />
        <div className="pdc-header-rule-thin" />
      </header>

      {canSeeTeamView && (
        <div className="seg" style={{ width: 'fit-content' }}>
          <label className="seg-opt">
            <input type="radio" name="ts-mode" checked={effectiveMode === 'declare'} onChange={() => setMode('declare')} />
            Ma saisie
          </label>
          <label className="seg-opt">
            <input type="radio" name="ts-mode" checked={effectiveMode === 'team'} onChange={() => setMode('team')} />
            Vue équipe
          </label>
        </div>
      )}

      {effectiveMode === 'team' && (
        <p className="text-muted" style={{ marginTop: 0 }}>
          Réservée à l'administration.
        </p>
      )}

      {effectiveMode === 'declare' ? (
        <TimesheetDeclare people={people} projects={projects} timesheets={timesheets} />
      ) : (
        <TimesheetTeamView people={people} projects={projects} timesheets={timesheets} />
      )}
    </main>
  );
}
