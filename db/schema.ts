import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
// Bounded pilot aggregate. CAS makes a financial operation atomic.
export const stores = sqliteTable('stores', {
  owner: text('owner').primaryKey(),
  revision: integer('revision').notNull().default(0),
  payload: text('payload').notNull(),
});
