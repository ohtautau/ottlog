const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Only the real API module is evaluated. Every Taro operation is an in-memory
// mock; no network, browser storage, credentials, or project data are accessed.
const filename = path.resolve(__dirname, '../src/api.ts');
const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const ok = (data, cookies = []) => ({ statusCode: 200, data, cookies });

function fixture(responses = [], cookies = {}) {
  const queue = [...responses];
  const requests = [];
  const storage = new Map([['ottlog.cookies', clone(cookies)]]);
  const taro = {
    getStorageSync: key => clone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, clone(value)),
    async request(options) {
      requests.push(clone(options));
      assert.ok(queue.length, `Unexpected mocked request: ${options.method} ${options.url}`);
      const response = queue.shift();
      if (response.reject) throw response.reject;
      return clone(response);
    },
  };
  const tested = new Module(filename, module);
  tested.require = name => {
    assert.equal(name, '@tarojs/taro', 'The unit test must not load external runtime dependencies');
    return taro;
  };
  tested._compile(`const API_BASE_URL = 'http://127.0.0.1:19999/';\n${source}`, filename);
  return {
    ...tested.exports,
    requests,
    cookies: () => clone(storage.get('ottlog.cookies')),
    done: () => assert.equal(queue.length, 0, 'Every expected mocked response should be consumed'),
  };
}

async function main() {
  const images = fixture();
  assert.equal(images.origin, 'http://127.0.0.1:19999');
  assert.equal(images.imageUrl('https://images.unsplash.com/photo-123?w=800'), 'https://images.unsplash.com/photo-123?w=800');
  assert.equal(images.imageUrl(' HTTP://images.example.test/a.jpg '), 'HTTP://images.example.test/a.jpg');
  assert.equal(images.imageUrl('//images.example.test/a.jpg'), 'https://images.example.test/a.jpg');
  assert.equal(images.imageUrl('/uploads/local.png'), `${images.origin}/uploads/local.png`);
  assert.equal(images.imageUrl('uploads/local.png'), `${images.origin}/uploads/local.png`);
  assert.equal(images.imageUrl('/images/quiet-hills.svg'), `${images.origin}/images/default-cover.png`);
  for (const input of ['', ' ', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:image/svg+xml,test', 'file:///private/file', '#fragment']) {
    assert.equal(images.imageUrl(input), '', `Unsupported image source: ${input}`);
  }
  assert.equal(images.requests.length, 0);

  const get = fixture([ok([{ slug: 'hello' }])], { session: 'session=test-only' });
  assert.deepEqual(await get.api('/posts?q=hello'), [{ slug: 'hello' }]);
  assert.equal(get.requests.length, 1, 'A GET must not fetch a CSRF session');
  assert.equal(get.requests[0].url, `${get.origin}/api/posts?q=hello&channel=mini`);
  assert.equal(get.requests[0].method, 'GET');
  assert.equal(get.requests[0].timeout, 10000);
  assert.equal(get.requests[0].header.Cookie, 'session=test-only');
  get.done();

  const post = fixture([
    ok({ authenticated: false, csrfToken: 'csrf-token-test-only' }, ['csrf=encoded-value==; Path=/; HttpOnly']),
    ok({ authenticated: true, userName: 'fixture-reader' }, ['session=new-session-test-only; Path=/; HttpOnly']),
  ], { session: 'session=old-session-test-only' });
  const login = { userName: 'fixture-reader', password: 'fake-test-password' };
  assert.deepEqual(await post.api('/account/login', 'POST', login), { authenticated: true, userName: 'fixture-reader' });
  assert.equal(post.requests.length, 2);
  assert.equal(post.requests[0].url, `${post.origin}/api/account/session?channel=mini`);
  assert.equal(post.requests[0].method, 'GET');
  assert.equal(post.requests[1].url, `${post.origin}/api/account/login?channel=mini`);
  assert.equal(post.requests[1].method, 'POST');
  assert.equal(post.requests[1].header['X-CSRF-TOKEN'], 'csrf-token-test-only');
  assert.equal(post.requests[1].header.Cookie, 'session=old-session-test-only; csrf=encoded-value==', 'Mutation must use the cookies just set by its CSRF session');
  assert.deepEqual(post.requests[1].data, login);
  assert.deepEqual(post.cookies(), { session: 'session=new-session-test-only', csrf: 'csrf=encoded-value==' });
  post.done();

  for (const method of ['PUT', 'DELETE']) {
    const mutation = fixture([ok({ csrfToken: 'mutation-token' }), ok({ saved: true })]);
    await mutation.api('/favorites/hello', method, { note: 'fixture' });
    assert.equal(mutation.requests[1].method, method);
    assert.equal(mutation.requests[1].header['X-CSRF-TOKEN'], 'mutation-token');
    mutation.done();
  }

  const comments = fixture([ok({ id: 'fixture-comment' })]);
  const switchedAccount = fixture([ok({ authenticated: true, userName: 'another-reader', csrfToken: 'test-token' })]);
  await assert.rejects(() => switchedAccount.api('/personal-tools/todos', 'PUT', { data: { tasks: [] } }, 'reader:first-reader'), /账号已切换/);
  assert.equal(switchedAccount.requests.length, 1, 'A mismatched account must never receive the pending tool write');
  switchedAccount.done();
  await comments.api('/posts/hello/comments', 'POST', { name: '访客', text: '测试评论' });
  assert.equal(comments.requests.length, 1, 'Anonymous comments use their public endpoint without an account-session mutation');
  comments.done();

  const serviceError = fixture([{ statusCode: 401, data: { title: '用户名或密码错误' } }]);
  await assert.rejects(() => serviceError.api('/account/session'), { message: '用户名或密码错误' });
  serviceError.done();

  const guestFavorites = fixture([{ statusCode: 401, data: {} }]);
  await assert.rejects(() => guestFavorites.favorites(), { message: '请到「我的」登录账号' });
  assert.equal(guestFavorites.requests[0].url, `${guestFavorites.origin}/api/favorites?channel=mini`);
  guestFavorites.done();
  for (const [status, message] of [[404, '内容不存在或尚未公开'], [429, '操作过于频繁，请稍后重试'], [500, '请求失败，请稍后重试']]) {
    const failure = fixture([{ statusCode: status, data: {} }]);
    await assert.rejects(() => failure.api('/posts/missing'), { message });
    failure.done();
  }

  const blockedDomain = fixture([{ reject: { errMsg: 'request:fail url not in domain list' } }]);
  await assert.rejects(() => blockedDomain.api('/posts'), error => /域名校验/.test(error.message) && /开发者工具/.test(error.message));
  blockedDomain.done();
  const disconnected = fixture([{ reject: { errMsg: 'request:fail connect ECONNREFUSED' } }]);
  await assert.rejects(() => disconnected.api('/posts'), error => /VS 后端/.test(error.message) && /局域网/.test(error.message));
  disconnected.done();

  const logout = fixture([
    ok({ authenticated: true, csrfToken: 'logout-token' }),
    { statusCode: 204, data: '', cookies: ['session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT', 'reader=expired; Max-Age=0; Path=/', 'theme=dark; Path=/'] },
    ok({ authenticated: false, csrfToken: 'after-logout-token' }),
  ], { session: 'session=signed-in-test-only', reader: 'reader=reader-test-only', csrf: 'csrf=csrf-cookie-test-only' });
  assert.equal(await logout.api('/account/logout', 'POST'), '', 'A successful empty logout response is accepted');
  assert.deepEqual(logout.cookies(), { csrf: 'csrf=csrf-cookie-test-only', theme: 'theme=dark' }, 'Both empty cookies and Max-Age=0 cookies must be deleted');
  await logout.api('/account/session');
  assert.equal(logout.requests[2].header.Cookie, 'csrf=csrf-cookie-test-only; theme=dark', 'Deleted login cookies must not reappear in subsequent requests');
  logout.done();

  console.log('Mini API checks passed: image URLs, query channel, CSRF/cookie ordering, mutations, service errors, guest favorites, network guidance, empty logout and cookie deletion.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });

