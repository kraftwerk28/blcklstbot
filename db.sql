CREATE TABLE groups (
  group_id BIGINT PRIMARY KEY,
  group_username VARCHAR,
  silent BOOLEAN NOT NULL DEFAULT TRUE,
  legal BOOLEAN NOT NUll DEFAULT FALSE -- if admins can add to blacklists
);
