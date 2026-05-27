const MAP = {
  abierto:              { cls: 'pb', label: 'Abierto' },
  pendiente_conciliar:  { cls: 'pa', label: 'Pend. Conciliar' },
  en_conciliacion:      { cls: 'pt', label: 'En Conciliación' },
  pendiente_pago:       { cls: 'pp', label: 'Pend. Pago' },
  cerrado:              { cls: 'pg', label: 'Cerrado' },
  abierta:              { cls: 'pa', label: 'ABIERTO' },
  cerrada:              { cls: 'pg', label: 'CERRADO' },
  sencillo:             { cls: 'pgr', label: 'SENCILLO' },
  full:                 { cls: 'pp', label: 'FULL' },
  admin:                { cls: 'pr', label: 'Admin' },
  contador:             { cls: 'pb', label: 'Contador' },
  aux_contador:         { cls: 'pt', label: 'Aux. Contador' },
  checador:             { cls: 'pa', label: 'Checador' },
  supervisor:           { cls: 'pgr', label: 'Supervisor' },
}

export default function Pill({ s }) {
  const { cls, label } = MAP[s] || { cls: 'pgr', label: s }
  return <span className={`pill ${cls}`}>{label}</span>
}
