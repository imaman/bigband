import * as winston from 'winston';

const justMessageFormat = winston.format.printf(arg => `${arg.message}`);
const timestampLabelMessageFormat = winston.format.printf(arg => 
  `${arg.timestamp} [${arg.label}] ${arg.level}: ${arg.message}`);

export const logger = winston.createLogger({
    levels: winston.config.npm.levels,
    transports: [
        new winston.transports.Console({ 
          level: 'info',
          format: winston.format.combine(
              winston.format.timestamp(), 
              winston.format.label({label: 'main'}),
              justMessageFormat)
        }),
        new winston.transports.File({
            filename: '.bigband.log',
            options: {
              flags: 'w'
            },
            level: 'silly',
            format: winston.format.combine(
              winston.format.timestamp(), 
              winston.format.label({label: 'main'}),
              timestampLabelMessageFormat)
        })
    ]
});

