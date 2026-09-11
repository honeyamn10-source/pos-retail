CREATE TABLE `stores` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`payload` text NOT NULL
);
