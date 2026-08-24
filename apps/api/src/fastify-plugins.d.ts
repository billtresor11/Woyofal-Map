/**
 * Les greffons Fastify enrichissent `request` et `reply` (cookies, jwt).
 * Les importer ici suffit à faire connaître ces ajouts à tout le projet.
 */
import '@fastify/cookie';
import '@fastify/jwt';
