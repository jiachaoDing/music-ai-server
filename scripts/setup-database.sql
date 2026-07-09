-- 使用 postgres 超级用户执行此脚本，创建项目所需的数据库和用户
-- 示例：psql -U postgres -h localhost -f scripts/setup-database.sql

CREATE USER music_ai WITH PASSWORD 'music_ai';
CREATE DATABASE music_ai OWNER music_ai;
GRANT ALL PRIVILEGES ON DATABASE music_ai TO music_ai;
