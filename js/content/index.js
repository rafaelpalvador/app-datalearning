import { SQL_COURSE } from './sql-course.js';
import { PYTHON_COURSE } from './python-course.js';

export const COURSES = [SQL_COURSE, PYTHON_COURSE];

export function findLesson(lessonId) {
  for (const course of COURSES) {
    for (const unit of course.units) {
      const idx = unit.lessons.findIndex((l) => l.id === lessonId);
      if (idx >= 0) return { course, unit, lesson: unit.lessons[idx] };
    }
  }
  return null;
}

export function allLessons(course) {
  return course.units.flatMap((u) => u.lessons.map((l) => ({ ...l, unitId: u.id })));
}
