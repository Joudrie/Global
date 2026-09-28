// Lets Node import the app's TypeScript data files, which use extensionless
// relative imports ("./codex") the way Vite expects. Retries such imports
// with ".ts" appended.
import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (err) {
      if (err?.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.\w+$/.test(specifier)) {
        return next(specifier + '.ts', context)
      }
      throw err
    }
  },
})
