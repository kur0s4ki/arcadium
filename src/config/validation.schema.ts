import * as Joi from 'joi';
export default Joi.object({
  PORT: Joi.number().default(3000),
  STATION_ID: Joi.string().required(),
  ACTIVE_GAME: Joi.string()
    .valid('pinball', 'roller-skate', 'plinko', 'spiral', 'fortress', 'skee-ball', 'skyscraper')
    .required(),
  MODE: Joi.string().valid('SIM', 'PROD').default('SIM'),
  API_BASE: Joi.string().uri().required(),
});
