-- Split users.name into firstName/lastName, preserving existing values:
-- everything before the first space becomes firstName, everything after
-- becomes lastName (empty if the original name had no space).

ALTER TABLE "users" ADD COLUMN "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

UPDATE "users" SET
  "firstName" = CASE
    WHEN POSITION(' ' IN "name") > 0 THEN SUBSTRING("name" FROM 1 FOR POSITION(' ' IN "name") - 1)
    ELSE "name"
  END,
  "lastName" = CASE
    WHEN POSITION(' ' IN "name") > 0 THEN TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1))
    ELSE ''
  END;

ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "name";
