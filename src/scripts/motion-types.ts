import type { gsap } from 'gsap';

/** The GSAP instance, passed in once the library has been lazily loaded so figure modules never import it eagerly. */
export type Gsap = typeof gsap;
