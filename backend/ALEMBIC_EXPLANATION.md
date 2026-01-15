# Understanding Alembic and Database Migrations

## What is Alembic?

**Alembic** is a database migration tool for SQLAlchemy (Python's most popular ORM). Think of it as a version control system for your database schema.

### The Problem It Solves

Imagine you're building an application with a database. As your app evolves, you need to:
- Add new tables (e.g., you add a "notifications" feature)
- Add new columns to existing tables (e.g., add "avatar_url" to users)
- Remove columns (e.g., remove deprecated fields)
- Change data types (e.g., change a string to an integer)
- Add indexes for performance
- Modify relationships between tables

**Without migrations**, you'd have to:
- Manually write SQL scripts
- Keep track of what changes were made
- Apply them in the correct order on different environments (dev, staging, production)
- Hope everyone on your team applies the same changes

**With Alembic**, you:
- Define changes in Python code
- Track all changes in versioned files
- Apply them automatically in the correct order
- Roll back changes if needed
- Keep all environments in sync

---

## What is a Migration?

A **migration** is a script that describes how to change your database schema from one version to another. Each migration has:

1. **An upgrade function** - applies the change (e.g., creates a table)
2. **A downgrade function** - reverses the change (e.g., drops the table)

Think of it like Git commits for your database:
- Each migration is a "commit" that changes the database
- You can "checkout" any version of your database
- You can see the history of all changes

---

## How Alembic Works in This Project

### 1. Configuration Files

#### `alembic.ini` (Main Configuration)
This file tells Alembic:
- Where to find migration scripts: `script_location = alembic`
- Where to store new migrations: `alembic/versions/`
- Database connection settings (though this project overrides it)

**Key settings:**
```ini
script_location = alembic          # Migration scripts are in the "alembic" folder
prepend_sys_path = .                # Add current directory to Python path
```

#### `alembic/env.py` (Environment Setup)
This is the **brain** of Alembic. It:
- Connects to your database
- Loads your SQLAlchemy models
- Runs migrations in the correct mode (online/offline, async/sync)

**Key parts:**

```python
# Line 23: Tells Alembic about your models
target_metadata = Base.metadata
# This lets Alembic "see" all your models (User, Course, Document, etc.)

# Line 31-33: Gets database URL from your config
def get_url():
    return db_config.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
# Converts regular PostgreSQL URL to async version

# Line 85-87: Entry point - decides how to run migrations
if context.is_offline_mode():
    run_migrations_offline()  # Generates SQL without connecting
else:
    run_migrations_online()   # Actually runs migrations on database
```

**Why async?** Your project uses async SQLAlchemy, so migrations need to run asynchronously too.

#### `alembic/script.py.mako` (Migration Template)
This is a **template** that Alembic uses to generate new migration files. Every new migration file follows this structure.

---

### 2. Migration Files

#### `alembic/versions/271f10e444ee_initial_migration.py`

This is your **initial migration** - it creates all your database tables from scratch.

**Structure:**

```python
# Revision identifiers (like Git commit hashes)
revision: str = '271f10e444ee'        # Unique ID for this migration
down_revision: Union[str, None] = None  # Previous migration (None = first one)

def upgrade() -> None:
    # Creates all tables: users, courses, documents, chunks, conversations, messages
    op.create_table('users', ...)
    op.create_table('courses', ...)
    # ... etc

def downgrade() -> None:
    # Reverses everything - drops all tables in reverse order
    op.drop_table('messages')
    op.drop_table('chunks')
    # ... etc
```

**What it does:**
- Creates 6 tables: `users`, `courses`, `documents`, `chunks`, `conversations`, `messages`
- Sets up relationships (foreign keys)
- Creates indexes for performance
- Sets up timestamps and defaults

---

## When Are Migrations Used?

### 1. **Initial Setup** (First Time)
```bash
# Create the initial migration from your models
alembic revision --autogenerate -m "initial migration"

# Apply it to create all tables
alembic upgrade head
```

### 2. **When You Change Models**
If you modify a model (e.g., add a column to `User`):

```bash
# 1. Edit your model file (e.g., app/models/user.py)
#    Add: phone_number = Column(String(20))

# 2. Generate a new migration
alembic revision --autogenerate -m "add phone number to users"

# 3. Review the generated migration file
#    (Check alembic/versions/XXXXX_add_phone_number_to_users.py)

# 4. Apply it
alembic upgrade head
```

### 3. **Deploying to Production**
```bash
# On production server, just run:
alembic upgrade head
# This applies all migrations that haven't been run yet
```

### 4. **Rolling Back** (If Something Goes Wrong)
```bash
# Go back one migration
alembic downgrade -1

# Go back to a specific version
alembic downgrade 271f10e444ee

# Go back to the beginning (drops everything!)
alembic downgrade base
```

---

## Common Alembic Commands

| Command | What It Does |
|---------|-------------|
| `alembic current` | Shows current database version |
| `alembic history` | Shows all migrations (past and future) |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic upgrade +1` | Apply next migration |
| `alembic downgrade -1` | Roll back one migration |
| `alembic revision --autogenerate -m "message"` | Auto-generate migration from model changes |
| `alembic revision -m "message"` | Create empty migration (manual) |

---

## How Autogenerate Works

Alembic can automatically detect changes by comparing:
1. **Your SQLAlchemy models** (in `app/models/`)
2. **The current database schema**

**It detects:**
- ✅ New tables
- ✅ New columns
- ✅ Column type changes
- ✅ New indexes
- ✅ New foreign keys

**It might NOT detect:**
- ❌ Column renames (it sees it as delete + add)
- ❌ Table renames (it sees it as drop + create)
- ❌ Data migrations (moving data around)

**Always review autogenerated migrations!**

---

## The Migration Workflow

```
┌─────────────────┐
│  Edit Models    │  (e.g., add column to User)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Mig    │  alembic revision --autogenerate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review Mig File │  Check the upgrade/downgrade functions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Apply Migration │  alembic upgrade head
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │  Schema is now updated!
│  Updated        │
└─────────────────┘
```

---

## Important Notes for This Project

1. **Async Support**: Your `env.py` is configured for async SQLAlchemy, which is why it uses `async_engine_from_config` and `asyncio.run()`.

2. **Model Discovery**: Alembic finds your models through `Base.metadata` in `app/db.py`. Make sure all models are imported in `app/models/__init__.py` so Alembic can see them.

3. **Database URL**: The URL comes from `app/config/database.py`, not from `alembic.ini`. This is good - it keeps your config centralized.

4. **Version Tracking**: Alembic creates an `alembic_version` table in your database to track which migrations have been applied.

---

## Example: Adding a New Feature

Let's say you want to add a "preferences" table:

**Step 1:** Create the model
```python
# app/models/preference.py
class Preference(Base):
    __tablename__ = "preferences"
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    theme = Column(String(20))
```

**Step 2:** Import it
```python
# app/models/__init__.py
from app.models.preference import Preference
```

**Step 3:** Generate migration
```bash
alembic revision --autogenerate -m "add preferences table"
```

**Step 4:** Review the generated file
```python
# alembic/versions/XXXXX_add_preferences_table.py
def upgrade():
    op.create_table('preferences', ...)

def downgrade():
    op.drop_table('preferences')
```

**Step 5:** Apply it
```bash
alembic upgrade head
```

Done! Your database now has the preferences table.

---

## Summary

- **Alembic** = Version control for your database
- **Migrations** = Scripts that change your database schema
- **When to use**: Whenever you change your models or need to modify the database
- **Workflow**: Edit models → Generate migration → Review → Apply
- **Your setup**: Async SQLAlchemy with PostgreSQL, models in `app/models/`, migrations in `alembic/versions/`

Migrations ensure your database schema stays in sync with your code and can be versioned, reviewed, and rolled back just like your code!

