# Trans Allal Workspace

This workspace is organized as:

- one root repository that contains the full workspace
- `backend-trans-allal`
- `dashboard-trans-allal`
- `app-trans-allal`

The full workspace is now managed by the root Git repository only. The child project folders are normal directories inside the root repository and do not have their own `.git` directories.

## Repository Layout

- Root repo: workspace scripts, shared docs, and Git workflow files
- `backend-trans-allal`: backend source repository
- `dashboard-trans-allal`: dashboard source repository
- `app-trans-allal`: mobile app source repository

## Scripts

### `./status-all.sh`

Shows `git status` for the single root workspace repository.

### `./pull-all.sh`

Runs `git pull origin main` for the single root workspace repository.

### `./push-all.sh`

Commits and pushes the single root workspace repository.

Examples:

```bash
./push-all.sh
./push-all.sh "chore: update workspace"
```

If no commit message is passed, the script uses:

```text
update workspace repository
```

## Notes

- The root repository is the only Git repository in this workspace.
- Run Git commands from the root when you want to update the whole project.
- Use `GIT_WORKFLOW.md` for the daily workflow.
