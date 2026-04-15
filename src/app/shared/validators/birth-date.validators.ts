import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_HUMAN_AGE_YEARS = 120;
const MAX_HUMAN_AGE_DAYS = Math.floor(MAX_HUMAN_AGE_YEARS * 365.25);

function normalizeIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function getTodayIsoDate(): string {
  return startOfToday().toISOString().split('T')[0];
}

export function getLatestBirthDateBeforeYears(years: number): string {
  const latestValidDate = startOfToday();
  latestValidDate.setFullYear(latestValidDate.getFullYear() - years);
  latestValidDate.setDate(latestValidDate.getDate() - 1);
  return latestValidDate.toISOString().split('T')[0];
}

export const realBirthDateValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const rawValue = control.value;
  if (!rawValue) {
    return null;
  }

  if (typeof rawValue !== 'string') {
    return { invalidBirthDate: true };
  }

  const birthDate = normalizeIsoDate(rawValue);
  if (!birthDate) {
    return { invalidBirthDate: true };
  }

  const today = startOfToday();
  if (birthDate > today) {
    return { futureBirthDate: true };
  }

  const ageInDays = Math.floor((today.getTime() - birthDate.getTime()) / MS_PER_DAY);
  if (ageInDays > MAX_HUMAN_AGE_DAYS) {
    return { unrealisticBirthDate: true };
  }

  return null;
};

export function olderThanYearsValidator(years: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rawValue = control.value;
    if (!rawValue) {
      return null;
    }

    if (typeof rawValue !== 'string') {
      return { minimumAge: { years } };
    }

    const birthDate = normalizeIsoDate(rawValue);
    if (!birthDate) {
      return { minimumAge: { years } };
    }

    const cutoff = startOfToday();
    cutoff.setFullYear(cutoff.getFullYear() - years);

    return birthDate >= cutoff ? { minimumAge: { years } } : null;
  };
}
