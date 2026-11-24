import { describe, expect, it } from 'vitest';

import {
  cycleStatusLabel,
  isOperationalDay,
  operationalToday,
  processMark,
} from './recurring-day';

/** Martes 24 nov 2026, mediodía en Ciudad de México. */
const MARTES = new Date('2026-11-24T18:00:00Z');

describe('admin envía tarea repetitiva al gerente', () => {
  const hoy = operationalToday(MARTES);

  it('marca el martes en asignación y deja los procesos en pendiente', () => {
    expect(hoy.code).toBe('MAR');
    expect(isOperationalDay('MAR', hoy.code)).toBe(true);
    expect(isOperationalDay('LUN', hoy.code)).toBe(false);
    expect(isOperationalDay(' mar ', hoy.code)).toBe(true);

    expect(processMark('PENDING', false)).toBe('pendiente');
    expect(processMark('IN_PROGRESS', false)).toBe('pendiente');
    expect(processMark('PENDING', true)).toBe('completado');
  });

  it('el día anterior que no se hizo queda anotado y no pinta hoy de rojo', () => {
    expect(cycleStatusLabel('MISSED')).toBe('No se realizó');
    expect(processMark('PENDING', false)).not.toBe('no-completado');
  });
});

describe('gerente envía tarea repetitiva al ejecutador', () => {
  const hoy = operationalToday(MARTES);

  it('marca el mismo día de hoy en la asignación del ejecutador', () => {
    expect(hoy.code).toBe('MAR');
    expect(isOperationalDay('MAR', hoy.code)).toBe(true);
    expect(isOperationalDay('MIE', hoy.code)).toBe(false);
  });

  it('si ayer falló, hoy vuelve a pendiente y el fallo queda en el historial', () => {
    expect(cycleStatusLabel('FAILED')).toBe('Fallida');
    expect(cycleStatusLabel('COMPLETED')).toBe('Realizada');
    expect(processMark('FAILED', false)).toBe('no-completado');
    expect(processMark('PENDING', false)).toBe('pendiente');
  });
});
