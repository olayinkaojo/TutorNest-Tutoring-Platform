import { assertEquals } from 'jsr:@std/assert@1';
import { tutorMaterialFieldsChanged } from '../make-server-cbd74580/verification-helpers.tsx';

const base = {
  full_name: 'Jane Doe', qualifications: 'BSc Maths',
  subjects: ['Mathematics', 'Physics'], professional_certifications: ['QTS'],
  bio: 'I love teaching', hourly_rate: 20000, availability_note: 'Evenings',
};
const changed = (incoming: any) => tutorMaterialFieldsChanged(base, { ...base, ...incoming });

Deno.test('cosmetic edits do NOT trigger re-review', () => {
  assertEquals(changed({ bio: 'New bio text' }), false);
  assertEquals(changed({ hourly_rate: 25000 }), false);
  assertEquals(changed({ availability_note: 'Mornings' }), false);
  assertEquals(changed({ subjects: ['Physics', 'Mathematics'] }), false); // reordered, same set
  assertEquals(changed({}), false);
});

Deno.test('material edits DO trigger re-review', () => {
  assertEquals(changed({ full_name: 'Jane Smith' }), true);
  assertEquals(changed({ qualifications: 'MSc Maths' }), true);
  assertEquals(changed({ subjects: ['Mathematics', 'Physics', 'Chemistry'] }), true);
  assertEquals(changed({ subjects: ['Mathematics'] }), true);
  assertEquals(changed({ professional_certifications: ['QTS', 'PGCE'] }), true);
  assertEquals(changed({ other_subjects: 'Astronomy' }), true);
});
