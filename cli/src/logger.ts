import * as winston from 'winston';

const justMessageFormat = winston.format.printf(info => `${info.message}`);
const timestampLabelMessageFormat = winston.format.printf(info => 
  `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`);

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
            filename: 'combined.log',
            level: 'silly',
            format: winston.format.combine(
              winston.format.timestamp(), 
              winston.format.label({label: 'main'}),
              timestampLabelMessageFormat)
        })
    ]
});

