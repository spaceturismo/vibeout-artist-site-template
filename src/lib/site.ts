import rawSite from '../content/site.json';
import { siteSchema } from './content';

export const site = siteSchema.parse(rawSite);
