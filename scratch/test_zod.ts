import { z } from 'zod';

const base = z.object({
  foo: z.string().refine(v => v.length > 0)
});

const partial = base.partial();
console.log('Partial works on object with refined field');

const refined = base.refine(v => !!v.foo);
try {
  // @ts-ignore
  refined.partial();
} catch (e) {
  console.log('Partial fails on refined object');
}
