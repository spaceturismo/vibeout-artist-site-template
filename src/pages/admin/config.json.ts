import type { APIRoute } from 'astro';
import { cmsConfig, cmsSettings } from '../../lib/cms';

export const GET: APIRoute = ({ site }) => {
  const settings = cmsSettings(import.meta.env.PUBLIC_GITHUB_REPOSITORY, import.meta.env.PUBLIC_CMS_AUTH_ORIGIN);
  const config = settings
    ? cmsConfig(settings, import.meta.env.BASE_URL, new URL(import.meta.env.BASE_URL, site).href)
    : { configured: false };
  return new Response(JSON.stringify(config), { headers: { 'Content-Type': 'application/json' } });
};
