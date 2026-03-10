export enum Scope {
	/** Central bot with most features. */
	Default,
	/** A bot running wioth Administrator permission. */
	Admin
}

/** The bot scope. */
export let scope = Scope.Default

/**
 * Should be called in the Core to set the global scope.
 * @param newScope The scope to use.
 */
export function setScope(newScope: Scope) {
	scope = newScope
}

/**
 * Returns the scope for a user supplied string.
 * @param scope The case-insensitivescope string.
 * @returns The scope.
 */
export function fromString(scope: string): Scope {
	switch (scope.toLowerCase()) {
		case 'admin':
			return Scope.Admin
		default:
			return Scope.Default
	}
}

/**
 * Returns a display friendly string for the scope.
 * @param scope The scope.
 * @returns The display friendly string.
 */
export function toString(scope: Scope): string {
	switch (scope) {
		case Scope.Admin:
			return 'Admin'
		default:
			return 'Default'
	}
}
