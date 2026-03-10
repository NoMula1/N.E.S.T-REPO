import globals from "globals"
import tsParser from "@typescript-eslint/parser"
import eslint from "@eslint/js"
import tsPlugin, { configs as tsConfigs } from "typescript-eslint"
import stylisticPlugin from "@stylistic/eslint-plugin"
import onlyWarnPlugin from "eslint-plugin-only-warn"
import importPlugin from "eslint-plugin-import"

export default tsPlugin.config(
	eslint.configs.recommended,
	...tsConfigs.recommended,
	importPlugin.flatConfigs.recommended,
	importPlugin.flatConfigs.typescript,
	{
		languageOptions : {
			parser: tsParser,
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		plugins: {
			stylistic: stylisticPlugin,
			onlyWarn: onlyWarnPlugin
		},
		settings: {
			"import/resolver": {
				typescript: true,
				node: {
					extensions: [".js", ".ts"]
				}
			}
		},
		files: [
            "**/*.ts",
			"**.*.js",
            "**.*.mjs"
        ],
		rules: {
			"import/extensions": ["warn", "never"],
			"no-console": "error",
			"stylistic/semi": ["warn", "never"],
			"no-eq-null": "warn"
		}
	}
)
