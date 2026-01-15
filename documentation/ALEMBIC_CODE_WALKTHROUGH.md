# Alembic Code Walkthrough

This document walks through each file in your Alembic setup and explains what each part does.

---

## File-by-File Breakdown

### 1. `alembic.ini` - Main Configuration

```ini
[alembic]
script_location = alembic
```
**What it does:** Tells Alembic where to find the migration environment (the `alembic/` folder).

```ini
prepend_sys_path = .
```
**What it does:** Adds the current directory to Python's path so Alembic can import your app modules (like `app.models`).

```ini
sqlalchemy.url = driver://user:pass@localhost/dbname
```
**What it does:** This is a placeholder. Your project **overrides** this in `env.py` to use the actual database URL from your config.

**Why:** This keeps your database credentials out of version control and allows different databases for dev/staging/production.

---

### 2. `alembic/env.py` - The Migration Engine

This is the most important file. Let's break it down section by section:

#### Imports and Setup (Lines 1-10)
```python
from sqlalchemy.ext.asyncio import async_engine_from_config
from app.config.database import db_config
from app.db import Base
```
**What it does:**
- Imports async SQLAlchemy (your project uses async)
- Imports your database config (to get the DATABASE_URL)
- Imports `Base` which contains all your model metadata

#### Configuration (Lines 12-23)
```python
config = context.config
target_metadata = Base.metadata
```
**What it does:**
- `config`: Gets the Alembic configuration object (reads from `alembic.ini`)
- `target_metadata`: This is **crucial** - it tells Alembic about all your models. When you run `--autogenerate`, Alembic compares `Base.metadata` (your models) with the actual database to detect changes.

#### Database URL Function (Lines 31-33)
```python
def get_url():
    return db_config.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
```
**What it does:**
- Gets the database URL from your config
- Converts `postgresql://` to `postgresql+asyncpg://` because you're using the `asyncpg` driver for async operations

**Example:**
- Input: `postgresql://user:pass@localhost/mydb`
- Output: `postgresql+asyncpg://user:pass@localhost/mydb`

#### Offline Mode (Lines 36-57)
```python
def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
```
**What it does:**
- Used when you run `alembic upgrade --sql` (generates SQL without connecting)
- Creates SQL statements that you can review or run manually
- Useful for: reviewing changes, applying to databases without direct access, or generating scripts

**When it's used:** When you pass `--sql` flag to Alembic commands.

#### Online Mode - Async Migration Runner (Lines 68-82)
```python
async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    
    connectable = async_engine_from_config(...)
    
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    
    await connectable.dispose()
```
**What it does:**
1. Gets the configuration section from `alembic.ini`
2. Overrides the database URL with your actual URL
3. Creates an async database engine
4. Connects to the database
5. Runs migrations synchronously (but within an async context)
6. Closes the connection

**Why async?** Your entire app uses async SQLAlchemy, so migrations must too.

#### Online Mode Entry Point (Lines 85-87)
```python
def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())
```
**What it does:** Wrapper that runs the async function. This is the entry point for normal migrations.

#### Main Decision Logic (Lines 90-93)
```python
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```
**What it does:** 
- Checks if you're in offline mode (using `--sql` flag)
- If offline: generates SQL files
- If online: actually runs migrations on the database

**This is the entry point** - Alembic calls this when you run any migration command.

---

### 3. `alembic/script.py.mako` - Migration Template

This is a **Mako template** (a Python templating engine). Alembic uses it to generate new migration files.

**Key variables:**
- `${up_revision}` - The revision ID (like `271f10e444ee`)
- `${down_revision}` - Previous revision (or `None` for first migration)
- `${upgrades}` - The upgrade code (creates tables, adds columns, etc.)
- `${downgrades}` - The downgrade code (drops tables, removes columns, etc.)
- `${imports}` - Any needed imports (like `from sqlalchemy.dialects import postgresql`)

**When it's used:** Every time you run `alembic revision` or `alembic revision --autogenerate`, Alembic fills in this template to create a new migration file.

---

### 4. `alembic/versions/271f10e444ee_initial_migration.py` - Your First Migration

This is an actual migration file. Let's break it down:

#### Header (Lines 1-18)
```python
revision: str = '271f10e444ee'
down_revision: Union[str, None] = None
```
**What it does:**
- `revision`: Unique ID for this migration (like a commit hash)
- `down_revision: None`: Means this is the **first** migration (no previous one)

**Migration Chain:**
```
None → 271f10e444ee → [future migrations]
```

#### Upgrade Function (Lines 21-91)
```python
def upgrade() -> None:
    op.create_table('users', ...)
    op.create_table('courses', ...)
    # ... creates all tables
```
**What it does:** When you run `alembic upgrade head`, this function runs and:
1. Creates the `users` table with columns: id, email, password_hash, full_name, timestamps
2. Creates an index on `email` (for fast lookups)
3. Creates the `courses` table (linked to users via foreign key)
4. Creates all other tables in dependency order
5. Sets up all relationships and indexes

**Order matters:** Tables are created in dependency order:
- `users` first (no dependencies)
- `courses` second (depends on users)
- `documents` third (depends on courses)
- etc.

#### Downgrade Function (Lines 94-108)
```python
def downgrade() -> None:
    op.drop_table('messages')
    op.drop_table('chunks')
    # ... drops all tables in reverse order
```
**What it does:** When you run `alembic downgrade`, this reverses everything:
- Drops tables in **reverse order** (messages → chunks → documents → ... → users)
- Removes indexes
- Removes foreign key constraints

**Why reverse order?** You can't drop a table that other tables depend on. So you drop dependents first.

---

## How It All Works Together

### Scenario 1: First Time Setup

```bash
# Developer runs:
alembic upgrade head
```

**What happens:**
1. Alembic reads `alembic.ini` → finds `env.py`
2. `env.py` runs → checks if offline mode (no)
3. Calls `run_migrations_online()`
4. Creates async engine using URL from `db_config`
5. Connects to database
6. Checks `alembic_version` table (doesn't exist yet)
7. Runs `271f10e444ee_initial_migration.py` → `upgrade()` function
8. Creates all tables: users, courses, documents, chunks, conversations, messages
9. Records `271f10e444ee` in `alembic_version` table
10. Done! Database is ready.

### Scenario 2: Adding a New Column

```python
# Developer edits app/models/user.py
# Adds: phone_number = Column(String(20))
```

```bash
# Developer runs:
alembic revision --autogenerate -m "add phone number"
```

**What happens:**
1. Alembic loads `env.py`
2. Gets `Base.metadata` (all models including the new column)
3. Connects to database
4. Compares models vs. actual database schema
5. Detects: "users table is missing phone_number column"
6. Generates new migration file using `script.py.mako` template
7. Creates `alembic/versions/XXXXX_add_phone_number.py` with:
   ```python
   def upgrade():
       op.add_column('users', sa.Column('phone_number', sa.String(20)))
   
   def downgrade():
       op.drop_column('users', 'phone_number')
   ```

```bash
# Developer runs:
alembic upgrade head
```

**What happens:**
1. Alembic checks `alembic_version` table → sees `271f10e444ee` is applied
2. Finds new migration `XXXXX_add_phone_number` with `down_revision = '271f10e444ee'`
3. Runs the new migration's `upgrade()` function
4. Adds `phone_number` column to `users` table
5. Records `XXXXX_add_phone_number` in `alembic_version` table

### Scenario 3: Rolling Back

```bash
# Developer runs:
alembic downgrade -1
```

**What happens:**
1. Alembic checks `alembic_version` table → sees `XXXXX_add_phone_number` is current
2. Finds the migration file
3. Runs `downgrade()` function
4. Drops `phone_number` column from `users` table
5. Updates `alembic_version` table to `271f10e444ee`

---

## Key Concepts

### 1. Migration Chain
Migrations form a linked list:
```
None → 271f10e444ee → XXXXX_add_phone → YYYYY_add_avatar → ...
```
Each migration knows its parent (`down_revision`), so Alembic can apply them in order.

### 2. The `alembic_version` Table
Alembic creates this table in your database to track which migrations have been applied:
```sql
CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL
);
-- Contains: '271f10e444ee' (or whatever the latest is)
```

### 3. Autogenerate Detection
When you run `--autogenerate`, Alembic:
1. Imports all your models (via `Base.metadata`)
2. Connects to the database
3. Inspects the actual schema
4. Compares them
5. Generates operations for differences

**It's smart about:**
- Detecting new tables/columns
- Detecting type changes
- Detecting new indexes/foreign keys

**It's NOT smart about:**
- Renames (sees as drop + add)
- Data migrations (you must write these manually)

---

## Summary

| File | Purpose | When It Runs |
|------|---------|--------------|
| `alembic.ini` | Configuration | Read on every Alembic command |
| `env.py` | Migration engine | Executed on every migration command |
| `script.py.mako` | Template | Used when generating new migrations |
| `versions/*.py` | Actual migrations | Run when you `upgrade` or `downgrade` |

**The Flow:**
1. You run an Alembic command
2. Alembic reads `alembic.ini` → loads `env.py`
3. `env.py` connects to database and runs migrations
4. Migrations modify the database schema
5. Alembic records progress in `alembic_version` table

This ensures your database schema always matches your code models!

