import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cmsConfig, cmsSettings } from '../src/lib/cms.ts';

test('CMS remains explicitly unconfigured without an auth service', () => {
  assert.equal(cmsSettings('owner/repo', ''), null);
});

test('CMS authentication accepts only HTTPS origins and valid repository coordinates', () => {
  assert.deepEqual(cmsSettings('owner/repo', 'https://auth.example.com/'), {
    repository: 'owner/repo', authOrigin: 'https://auth.example.com',
  });
  for (const value of ['http://auth.example.com', 'https://user:pass@auth.example.com', 'https://auth.example.com/path', 'https://auth.example.com/?secret=abc']) {
    assert.throws(() => cmsSettings('owner/repo', value));
  }
  assert.throws(() => cmsSettings('invalid', 'https://auth.example.com'));
});

test('CMS uses repository-relative image storage and preserves Pages base for its logo', () => {
  const config = cmsConfig({ repository: 'owner/artist', authOrigin: 'https://auth.example.com' }, '/artist/', 'https://owner.github.io/artist/');
  assert.equal(config.backend.repo, 'owner/artist');
  assert.equal(config.public_folder, 'images/uploads');
  assert.equal(config.logo_url, '/artist/images/first-light.svg');
  assert.equal(config.collections[0].files[0].file, 'src/content/site.json');
});
