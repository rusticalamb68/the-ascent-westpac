'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { keymap, EditorView } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { TABLES } from '@/lib/dataset';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <textarea className="plain" readOnly aria-label="SQL editor loading" defaultValue="" />,
});

const schema: Record<string, string[]> = {};
for (const t of TABLES) if (!t.hidden && !t.staging) schema[t.name] = t.columns.map((c) => c.name);

const theme = EditorView.theme({
  '&': { backgroundColor: '#ffffff', color: '#0b1730' },
  '.cm-content': { fontFamily: 'var(--mono)', padding: '12px 0', minHeight: '220px' },
  '.cm-gutters': { backgroundColor: '#f6f9fc', color: '#8496a8', border: 'none' },
  '.cm-activeLine': { backgroundColor: '#f6f9fc' },
  '.cm-activeLineGutter': { backgroundColor: '#e4ecf3' },
});

export function SqlEditor({ value, onChange, onRun }: { value: string; onChange: (v: string) => void; onRun: () => void }) {
  const run = useRef(onRun);
  run.current = onRun;
  const extensions = useMemo(
    () => [
      sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true }),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { run.current(); return true; } }])),
      theme,
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' }),
    ],
    [],
  );
  return (
    <div className="editor">
      <CodeMirror value={value} onChange={onChange} extensions={extensions} basicSetup={{ foldGutter: false, highlightActiveLine: true }} />
    </div>
  );
}
