-- Seed Data for CatchAbit Floor Hours Tracker

-- Settings
INSERT OR REPLACE INTO settings (key, value) VALUES
  ('daily_target_hours', '7'),
  ('auto_checkout_time', '20:00'),
  ('work_days', 'Mon,Tue,Wed,Thu,Fri,Sat');

-- Users
-- Password for admin123: e4550ee275f5a46ddd344c88f7999671b58816129f8fcd9713a58adca9d6def3
-- Password for password123: 9ab7c729e02e9847dc15d754d84ad597f55b8b490e8e9dfc9ef158afb2df84c8
INSERT OR REPLACE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('usr_admin_01', 'Admin', 'admin@catchabit.in', 'e4550ee275f5a46ddd344c88f7999671b58816129f8fcd9713a58adca9d6def3', 'admin', 1),
  ('usr_emp_01', 'Rahul Sharma', 'rahul@catchabit.in', '9ab7c729e02e9847dc15d754d84ad597f55b8b490e8e9dfc9ef158afb2df84c8', 'employee', 1),
  ('usr_emp_02', 'Priya Patel', 'priya@catchabit.in', '9ab7c729e02e9847dc15d754d84ad597f55b8b490e8e9dfc9ef158afb2df84c8', 'employee', 1),
  ('usr_emp_03', 'Amit Verma', 'amit@catchabit.in', '9ab7c729e02e9847dc15d754d84ad597f55b8b490e8e9dfc9ef158afb2df84c8', 'employee', 1);
