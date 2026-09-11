import { useState } from 'react';
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
  const [mode, setMode] = useState<Mode>('declare');

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

      <div className="seg" style={{ width: 'fit-content' }}>
        <label className="seg-opt">
          <input type="radio" name="ts-mode" checked={mode === 'declare'} onChange={() => setMode('declare')} />
          Ma saisie
        </label>
        <label className="seg-opt">
          <input type="radio" name="ts-mode" checked={mode === 'team'} onChange={() => setMode('team')} />
          Vue équipe
        </label>
      </div>

      {mode === 'team' && (
        <p className="text-muted" style={{ marginTop: 0 }}>
          Réservée à la direction de production — voir le README concernant les droits d'accès, pas encore appliqués
          côté serveur.
        </p>
      )}

      {mode === 'declare' ? (
        <TimesheetDeclare people={people} projects={projects} timesheets={timesheets} />
      ) : (
        <TimesheetTeamView people={people} projects={projects} timesheets={timesheets} />
      )}
    </main>
  );
}
