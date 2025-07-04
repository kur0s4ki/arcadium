import * as Joi from 'joi';
export default Joi.object({
  PORT: Joi.number().default(3000),
  STATION_ID: Joi.string().required(),
  MODE: Joi.string().valid('SIM', 'PROD').default('SIM'),
  API_BASE: Joi.string().uri().required(),
  GAME_ID: Joi.number().default(1),
});
