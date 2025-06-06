// ===========================================
// utils/logger.js
// Configuración de Winston para logging en consola
// ===========================================
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level.toUpperCase()}] ${message}`
    )
  ),
  transports: [ new transports.Console() ]
});

module.exports = logger;
