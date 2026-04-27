module.exports = {
	apps: [{
		name: "NEST",
		script: "bun run src/Core.ts",
		instances: 1,
		restart_delay: 8000,
		exp_backoff_restart_delay: 2000,
		cron_restart: '0 0 * * *',
		env: {
			NODE_ENV: 'development'
		},
		env_production: {
			NODE_ENV: 'production'
		}
	}, {
		name: "NESTAdmin",
		script: "bun run src/CoreAdmin.ts",
		instances: 1,
		restart_delay: 8000,
		exp_backoff_restart_delay: 2000,
		cron_restart: '0 0 * * *',
		env: {
			NODE_ENV: 'development'
		},
		env_production: {
			NODE_ENV: 'production'
		}
	}]
}
